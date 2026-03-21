import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const normalizeCode = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase();

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const allNewAccountNumbers = searchParams.get('all_new_account_numbers');

    if (!allNewAccountNumbers) {
      return NextResponse.json({ error: 'all_new_account_numbers parameter is required' }, { status: 400 });
    }

    console.log('Fetching cost centers for account numbers:', allNewAccountNumbers);

    // Parse, deduplicate and normalize account numbers
    const accountNumbers = [...new Set(
      allNewAccountNumbers
        .split(',')
        .map(num => num.trim().toUpperCase())
        .filter(num => num)
    )];
    
    if (accountNumbers.length === 0) {
      return NextResponse.json({ 
        success: true,
        costCenters: [],
        accountNumbers: []
      });
    }

    console.log('Deduplicated account numbers:', accountNumbers);

    const { data: exactCostCenters, error } = await supabase
      .from('cost_centers')
      .select('*')
      .in('cost_code', accountNumbers)
      .order('cost_code', { ascending: true });

    if (error) {
      console.error('Error fetching cost centers:', error);
      return NextResponse.json({ error: 'Failed to fetch cost centers' }, { status: 500 });
    }

    const prefixes = [...new Set(
      accountNumbers
        .map((code) => code.split('-')[0]?.trim())
        .filter(Boolean),
    )];

    let prefixCostCenters: any[] = [];

    if (prefixes.length > 0) {
      const prefixQueries = prefixes.map((prefix) => `cost_code.ilike.${prefix}-%`);
      const { data: prefixRows, error: prefixError } = await supabase
        .from('cost_centers')
        .select('*')
        .or(prefixQueries.join(','))
        .order('cost_code', { ascending: true });

      if (prefixError) {
        console.error('Error fetching cost centers by prefix:', prefixError);
      } else {
        prefixCostCenters = prefixRows || [];
      }
    }

    const costCentersByCode = new Map<string, any>();
    for (const center of [...(exactCostCenters || []), ...prefixCostCenters]) {
      const normalizedCode = normalizeCode(center?.cost_code);
      if (!normalizedCode) continue;
      if (!accountNumbers.includes(normalizedCode)) continue;
      if (!costCentersByCode.has(normalizedCode)) {
        costCentersByCode.set(normalizedCode, center);
      }
    }

    const costCenters = accountNumbers
      .map((code) => costCentersByCode.get(code))
      .filter(Boolean);

    const normalizedFoundCodes = new Set(
      (costCenters || [])
        .map((center) => normalizeCode(center?.cost_code))
        .filter(Boolean),
    );

    const missingCodes = accountNumbers.filter((code) => !normalizedFoundCodes.has(code));

    let fallbackCompany = '';
    let fallbackLegalName = '';

    if (missingCodes.length > 0) {
      const { data: groupedRows, error: groupedError } = await supabase
        .from('customers_grouped')
        .select('company_group, legal_names, all_new_account_numbers');

      if (groupedError) {
        console.error('Error fetching grouped customers for missing cost centers:', groupedError);
      } else if (Array.isArray(groupedRows)) {
        const matchingGroup = groupedRows.find((group) => {
          const codes = String(group?.all_new_account_numbers || '')
            .split(',')
            .map((value) => normalizeCode(value))
            .filter(Boolean);
          return missingCodes.some((code) => codes.includes(code));
        });

        fallbackCompany = String(
          matchingGroup?.company_group ||
            costCenters?.[0]?.company ||
            '',
        ).trim();
        fallbackLegalName = String(matchingGroup?.legal_names || '').trim();
      }
    }

    const filledCostCenters = [...(costCenters || [])];

    for (const missingCode of missingCodes) {
      filledCostCenters.push({
        id: null,
        created_at: null,
        company: fallbackCompany || fallbackLegalName || '',
        cost_code: missingCode,
        validated: false,
        legal_name: fallbackLegalName || fallbackCompany || '',
      });
    }

    console.log(`Found ${costCenters?.length || 0} real cost centers and ${missingCodes.length} fallback cost centers for account numbers:`, accountNumbers);

    return NextResponse.json({ 
      success: true,
      costCenters: filledCostCenters,
      accountNumbers: accountNumbers,
      matchedCount: costCenters?.length || 0,
      requestedCount: accountNumbers.length,
      missingCodes,
    });

  } catch (error) {
    console.error('Error in cost centers client GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
