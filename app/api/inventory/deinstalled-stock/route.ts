import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Destination = 'client' | 'soltrack';

const getStringValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const sanitizeCategoryCode = (value: string): string => {
  const cleaned = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return cleaned || 'DEINSTALL_MISC';
};

const deriveCategoryCode = (item: Record<string, unknown>): string => {
  const raw =
    getStringValue(item.code) ||
    getStringValue(item.category) ||
    getStringValue(item.type) ||
    getStringValue(item.product) ||
    getStringValue(item.name) ||
    'DEINSTALL_MISC';

  return sanitizeCategoryCode(raw);
};

const deriveCategoryDescription = (item: Record<string, unknown>, fallbackCode: string): string => (
  getStringValue(item.name) ||
  getStringValue(item.product) ||
  getStringValue(item.description) ||
  getStringValue(item.category) ||
  getStringValue(item.type) ||
  fallbackCode
);

const deriveSerialNumber = (
  item: Record<string, unknown>,
  jobNumber: string,
  itemIndex: number
): string => {
  const existing =
    getStringValue(item.serial_number) ||
    getStringValue(item.serial) ||
    getStringValue(item.item_serial) ||
    getStringValue(item.id);

  if (existing) return existing;

  const safeJob = sanitizeCategoryCode(jobNumber || 'JOB');
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  return `DEI_${safeJob}_${itemIndex + 1}_${suffix}`;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const jobId = getStringValue(body.job_id);
    const destination = getStringValue(body.destination) as Destination;
    const requestedCostCode = getStringValue(body.cost_code).toUpperCase();
    const itemIndex = Number.isFinite(Number(body.item_index)) ? Number(body.item_index) : 0;
    const item = (body.item || {}) as Record<string, unknown>;

    if (!jobId) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
    }

    if (destination !== 'client' && destination !== 'soltrack') {
      return NextResponse.json({ error: 'destination must be client or soltrack' }, { status: 400 });
    }

    const { data: job, error: jobError } = await supabase
      .from('job_cards')
      .select('id, job_number, customer_name, new_account_number')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    const categoryCode = deriveCategoryCode(item);
    const categoryDescription = deriveCategoryDescription(item, categoryCode);
    const serialNumber = deriveSerialNumber(item, getStringValue(job.job_number), itemIndex);
    const itemName = getStringValue(item.name) || getStringValue(item.product) || categoryDescription;
    const notes = `De-installed from job ${job.job_number || job.id}: ${itemName}`;

    const { data: existingCategory } = await supabase
      .from('inventory_categories')
      .select('code')
      .eq('code', categoryCode)
      .maybeSingle();

    if (!existingCategory) {
      const { error: createCategoryError } = await supabase
        .from('inventory_categories')
        .insert({
          code: categoryCode,
          description: categoryDescription,
          company: getStringValue(job.customer_name) || null,
        });

      if (createCategoryError) {
        return NextResponse.json({ error: createCategoryError.message }, { status: 500 });
      }
    }

    if (destination === 'soltrack') {
      const { data: existingItem } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('serial_number', serialNumber)
        .maybeSingle();

      if (existingItem) {
        return NextResponse.json(
          { error: `Item already exists in Soltrack stock with serial ${serialNumber}` },
          { status: 409 }
        );
      }

      const { data: insertedItem, error: insertError } = await supabase
        .from('inventory_items')
        .insert({
          category_code: categoryCode,
          serial_number: serialNumber,
          status: 'IN STOCK',
          notes,
          company: getStringValue(job.customer_name) || null,
        })
        .select('*')
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        destination: 'soltrack',
        item: insertedItem,
      });
    }

    const costCode = requestedCostCode || getStringValue(job.new_account_number).toUpperCase();
    if (!costCode) {
      return NextResponse.json(
        { error: 'Cannot add to client stock: this job has no cost code (new_account_number)' },
        { status: 400 }
      );
    }

    // Use cost_code as the stable client_code key for client stock linkage.
    const clientCode = costCode;

    const { error: upsertCategoryError } = await supabase
      .from('client_inventory_categories')
      .upsert(
        {
          client_code: clientCode,
          cost_code: costCode,
          category_code: categoryCode,
          company: getStringValue(job.customer_name) || null,
        },
        { onConflict: 'client_code,cost_code,category_code' }
      );

    if (upsertCategoryError) {
      return NextResponse.json({ error: upsertCategoryError.message }, { status: 500 });
    }

    const { data: existingClientItem } = await supabase
      .from('client_inventory_items')
      .select('id')
      .eq('client_code', clientCode)
      .eq('cost_code', costCode)
      .eq('serial_number', serialNumber)
      .maybeSingle();

    if (existingClientItem) {
      return NextResponse.json(
        { error: `Item already exists in client stock with serial ${serialNumber}` },
        { status: 409 }
      );
    }

    const { data: insertedClientItem, error: insertClientError } = await supabase
      .from('client_inventory_items')
      .insert({
        client_code: clientCode,
        cost_code: costCode,
        category_code: categoryCode,
        serial_number: serialNumber,
        status: 'IN STOCK',
        notes,
        company: getStringValue(job.customer_name) || null,
      })
      .select('*')
      .single();

    if (insertClientError) {
      return NextResponse.json({ error: insertClientError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      destination: 'client',
      item: insertedClientItem,
    });
  } catch (error) {
    console.error('Error in deinstalled stock POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
