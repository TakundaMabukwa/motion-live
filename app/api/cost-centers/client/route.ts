import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const normalizeCode = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase();

const toBoolean = (value: unknown) => value === true;

type CostCenterRow = {
  total_amount_locked_by?: string | null;
  [key: string]: unknown;
};

type UserRow = {
  id: string;
  email: string | null;
};

const getOperationalCode = (row: CostCenterRow) => normalizeCode(row?.cost_center_code);

const getEffectiveCode = (row: CostCenterRow) => {
  const operationalCode = getOperationalCode(row);
  if (toBoolean(row?.operational) && operationalCode) {
    return operationalCode;
  }
  return normalizeCode(row?.cost_code);
};

async function attachLockedByEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: CostCenterRow[] = [],
) {
  if (!Array.isArray(rows) || rows.length === 0) return rows || [];

  const userIds = [
    ...new Set(
      rows
        .map((row) => row?.total_amount_locked_by)
        .filter((value) => typeof value === 'string' && value.trim().length > 0),
    ),
  ];

  if (userIds.length === 0) {
    return rows.map((row) => ({
      ...row,
      total_amount_locked_by_email: null,
    }));
  }

  const { data: userRows, error } = await supabase
    .from('users')
    .select('id, email')
    .in('id', userIds);

  if (error) {
    console.error('Error fetching cost center lock owner emails:', error);
    return rows.map((row) => ({
      ...row,
      total_amount_locked_by_email: null,
    }));
  }

  const emailMap = Object.fromEntries(
    ((userRows || []) as UserRow[]).map((user) => [user.id, user.email || null]),
  );

  return rows.map((row) => ({
    ...row,
    total_amount_locked_by_email: row?.total_amount_locked_by
      ? emailMap[row.total_amount_locked_by] || null
      : null,
  }));
}

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

    let prefixCostCenters: CostCenterRow[] = [];

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

    const rowsByAccountCode = new Map<string, CostCenterRow[]>();
    for (const center of [...(exactCostCenters || []), ...prefixCostCenters]) {
      const normalizedCode = normalizeCode(center?.cost_code);
      if (!normalizedCode) continue;
      if (!accountNumbers.includes(normalizedCode)) continue;
      const existing = rowsByAccountCode.get(normalizedCode) || [];
      existing.push(center);
      rowsByAccountCode.set(normalizedCode, existing);
    }

    const costCenters: CostCenterRow[] = [];
    for (const accountCode of accountNumbers) {
      const rowsForCode = rowsByAccountCode.get(accountCode) || [];
      if (rowsForCode.length === 0) continue;

      const operationalRows = rowsForCode.filter(
        (row) => toBoolean(row?.operational) && getOperationalCode(row),
      );

      if (operationalRows.length > 0) {
        const seenOperationalCodes = new Set<string>();
        for (const row of operationalRows.sort((a, b) =>
          getEffectiveCode(a).localeCompare(getEffectiveCode(b)),
        )) {
          const opCode = getOperationalCode(row);
          if (!opCode || seenOperationalCodes.has(opCode)) continue;
          seenOperationalCodes.add(opCode);
          costCenters.push(row);
        }
        continue;
      }

      const fallback = rowsForCode
        .slice()
        .sort((a, b) => {
          const aTime = new Date(String(a?.created_at || 0)).getTime();
          const bTime = new Date(String(b?.created_at || 0)).getTime();
          return aTime - bTime;
        })[0];

      if (fallback) {
        costCenters.push(fallback);
      }
    }

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
        total_amount_locked: false,
        total_amount_locked_value: null,
        total_amount_locked_by: null,
        total_amount_locked_at: null,
        total_amount_locked_by_email: null,
      });
    }

    const enrichedCostCenters = await attachLockedByEmails(supabase, filledCostCenters);
    const finalCostCenters = enrichedCostCenters.map((row) => ({
      ...row,
      effective_cost_code: getEffectiveCode(row),
    }));

    console.log(`Found ${costCenters?.length || 0} real cost centers and ${missingCodes.length} fallback cost centers for account numbers:`, accountNumbers);

    return NextResponse.json({ 
      success: true,
      costCenters: finalCostCenters,
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
