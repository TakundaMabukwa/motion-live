import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface ProcessedStockItem {
  id: string;
  quantity: string;
  technician_email: string;
  code: string;
  description: string;
  supplier: string;
  cost_excl_vat_zar: number;
  usd: number;
  stock_type: string;
  serial_number?: string;
  ip_address?: string;
}

const normalizeEmail = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase();

const isValidSingleTechnicianEmail = (value: unknown) => {
  const email = normalizeEmail(value);
  if (!email) return false;
  if (email.includes(',') || email.includes(' ')) return false;
  return /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email);
};

const toSafeQuantity = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
};

const resolveSerial = (value: Record<string, unknown>) =>
  String(
    value?.serial_number ??
      value?.serial ??
      value?.serialNumber ??
      value?.ip_address ??
      '',
  ).trim();

const getStockTypeFromSupplier = (supplier: string): string => {
  const typeMap: Record<string, string> = {
    VISIONWORKS: 'Tracking Equipment',
    METTAX: 'Tracking Equipment',
    NANOTECH: 'Accessories',
    'SUNFIELD NEW ENERGY': 'Hardware',
    SANJI: 'Electronics',
  };
  return typeMap[supplier] || 'General';
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const email = normalizeEmail(searchParams.get('email'));

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }
    if (!isValidSingleTechnicianEmail(email)) {
      return NextResponse.json(
        { error: 'Email must be a single valid technician email' },
        { status: 400 },
      );
    }

    const { data: technicianRows, error } = await supabase
      .from('tech_stock')
      .select('id, technician_email, assigned_parts')
      .ilike('technician_email', email)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching technician stock:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = Array.isArray(technicianRows) ? technicianRows : [];
    const processedStock: ProcessedStockItem[] = [];

    rows.forEach((row) => {
      const rowId = Number(row?.id);
      const technicianEmail = normalizeEmail(row?.technician_email) || email;
      const assignedParts = Array.isArray(row?.assigned_parts) ? row.assigned_parts : [];

      assignedParts.forEach((rawPart, index) => {
        const part =
          rawPart && typeof rawPart === 'object' && !Array.isArray(rawPart)
            ? (rawPart as Record<string, unknown>)
            : {};
        const serial = resolveSerial(part);
        const quantity = toSafeQuantity(part.quantity ?? part.count ?? 1);
        const supplier = String(part.supplier || 'JOB_PARTS').trim() || 'JOB_PARTS';
        const code = String(part.code || part.category_code || 'N/A').trim() || 'N/A';
        const description =
          String(part.description || part.name || part.item_description || code).trim() ||
          'No description available';

        processedStock.push({
          id: String(part.row_id || `${rowId}-assigned-${index}`),
          quantity: String(quantity),
          technician_email: technicianEmail,
          code,
          description,
          supplier,
          cost_excl_vat_zar: Number(part.cost_per_unit || 0),
          usd: 0,
          stock_type: getStockTypeFromSupplier(supplier),
          serial_number: serial || undefined,
          ip_address: String(part.ip_address || '').trim() || undefined,
        });
      });
    });

    return NextResponse.json({
      stock: processedStock,
      total_items: processedStock.length,
    });
  } catch (error) {
    console.error('Error in technician stock GET:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
