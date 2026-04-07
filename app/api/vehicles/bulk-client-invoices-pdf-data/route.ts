import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOperationalBillingMonthKey } from '@/lib/server/account-invoice-payments';

export const dynamic = 'force-dynamic';

const getBillingInvoiceDate = (billingMonth: unknown) => {
  if (!billingMonth) {
    return new Date().toISOString();
  }

  const normalized = String(billingMonth).slice(0, 7) + '-01T00:00:00';
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  const year = parsed.getFullYear();
  const month = parsed.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const invoiceDay = Math.min(30, lastDay);
  return new Date(year, month, invoiceDay).toISOString();
};

const buildAddress = (source?: Record<string, unknown> | null) =>
  [
    source?.physical_address_1,
    source?.physical_address_2,
    source?.physical_address_3,
    source?.physical_area,
    source?.physical_province,
    source?.physical_code,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('\n');

const fetchAllCostCenters = async (supabase: Awaited<ReturnType<typeof createClient>>) => {
  const allCostCenters: Array<Record<string, unknown>> = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('cost_centers')
      .select(
        'cost_code, company, legal_name, vat_number, registration_number, physical_address_1, physical_address_2, physical_address_3, physical_area, physical_code',
      )
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    allCostCenters.push(...data);

    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allCostCenters;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const allVehicles: Array<Record<string, unknown>> = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('new_account_number, account_number')
        .range(from, from + pageSize - 1);

      if (vehiclesError) {
        throw vehiclesError;
      }

      if (!vehicles || vehicles.length === 0) {
        break;
      }

      allVehicles.push(...vehicles);

      if (vehicles.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    const accountNumbers = Array.from(
      new Set(
        allVehicles
          .map((row) =>
            String(row?.new_account_number || row?.account_number || '')
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean),
      ),
    );

    if (accountNumbers.length === 0) {
      return NextResponse.json({
        invoices: [],
        count: 0,
      });
    }

    const origin = new URL(request.url).origin;
    const billingMonthKey = getOperationalBillingMonthKey();
    const invoices: Array<{ accountNumber: string; invoiceData: Record<string, unknown> }> = [];
    const costCenterByAccount = new Map<string, Record<string, unknown>>();

    const costCenters = await fetchAllCostCenters(supabase);

    for (const row of costCenters || []) {
      const key = String(row?.cost_code || '').trim().toUpperCase();
      if (key && !costCenterByAccount.has(key)) {
        costCenterByAccount.set(key, row);
      }
    }

    const matchedAccountNumbers = accountNumbers.filter((accountNumber) =>
      costCenterByAccount.has(accountNumber),
    );

    if (matchedAccountNumbers.length === 0) {
      return NextResponse.json({
        invoices: [],
        count: 0,
      });
    }

    const { data: existingBulkInvoices, error: existingBulkInvoicesError } = await supabase
      .from('bulk_account_invoices')
      .select('*')
      .in('account_number', matchedAccountNumbers)
      .eq('billing_month', billingMonthKey)
      .order('created_at', { ascending: false });

    if (existingBulkInvoicesError) {
      throw existingBulkInvoicesError;
    }

    const existingBulkInvoiceByAccount = new Map<string, Record<string, unknown>>();
    for (const row of existingBulkInvoices || []) {
      const key = String(row?.account_number || '').trim().toUpperCase();
      if (!key || existingBulkInvoiceByAccount.has(key)) continue;
      existingBulkInvoiceByAccount.set(key, row);
    }

    const headers = {
      Cookie: request.headers.get('Cookie') || '',
      Authorization: request.headers.get('Authorization') || '',
    };

    const processAccountNumber = async (accountNumber: string) => {
      try {
        const existingInvoice = existingBulkInvoiceByAccount.get(accountNumber);
        const existingLineItems = Array.isArray(existingInvoice?.line_items) ? existingInvoice.line_items : [];
        const costCenter = costCenterByAccount.get(accountNumber);

        const draftResponse = await fetch(
          `${origin}/api/vehicles/invoice?accountNumber=${encodeURIComponent(accountNumber)}&billingMonth=${encodeURIComponent(billingMonthKey)}`,
          {
            headers,
            cache: 'no-store',
          },
        );

        if (!draftResponse.ok) {
          if (!existingInvoice || existingLineItems.length === 0) {
            return null;
          }

          const fallbackCompanyName = String(
            costCenter?.legal_name ||
              costCenter?.company ||
              existingInvoice?.company_name ||
              accountNumber,
          ).trim();
          const fallbackClientAddress = String(
            buildAddress(costCenter) || existingInvoice?.client_address || '',
          ).trim();
          const fallbackCustomerVatNumber = String(
            costCenter?.vat_number || existingInvoice?.customer_vat_number || '',
          ).trim();
          const fallbackCompanyRegistrationNumber = String(
            costCenter?.registration_number || existingInvoice?.company_registration_number || '',
          ).trim();

          return {
            accountNumber,
            invoiceData: {
              ...existingInvoice,
              company_name: fallbackCompanyName,
              invoice_number: existingInvoice?.invoice_number || '',
              invoice_date: existingInvoice?.invoice_date || getBillingInvoiceDate(existingInvoice?.billing_month || billingMonthKey),
              billing_month: existingInvoice?.billing_month || billingMonthKey,
              client_address: fallbackClientAddress,
              customer_vat_number: fallbackCustomerVatNumber,
              company_registration_number: fallbackCompanyRegistrationNumber,
              subtotal: existingInvoice?.subtotal ?? 0,
              vat_amount: existingInvoice?.vat_amount ?? 0,
              total_amount: existingInvoice?.total_amount ?? 0,
              notes: existingInvoice?.notes ?? '',
              invoiceItems: existingLineItems,
              invoice_items: existingLineItems,
            },
          };
        }

        const result = await draftResponse.json();
        const draftInvoiceData = result?.invoiceData;
        const invoiceItems = Array.isArray(draftInvoiceData?.invoiceItems)
          ? draftInvoiceData.invoiceItems
          : Array.isArray(draftInvoiceData?.invoice_items)
            ? draftInvoiceData.invoice_items
            : [];

        if (!draftInvoiceData || invoiceItems.length === 0) {
          if (!existingInvoice || existingLineItems.length === 0) {
            return null;
          }

          const fallbackCompanyName = String(
            costCenter?.legal_name ||
              costCenter?.company ||
              existingInvoice?.company_name ||
              accountNumber,
          ).trim();
          const fallbackClientAddress = String(
            buildAddress(costCenter) || existingInvoice?.client_address || '',
          ).trim();
          const fallbackCustomerVatNumber = String(
            costCenter?.vat_number || existingInvoice?.customer_vat_number || '',
          ).trim();
          const fallbackCompanyRegistrationNumber = String(
            costCenter?.registration_number || existingInvoice?.company_registration_number || '',
          ).trim();

          return {
            accountNumber,
            invoiceData: {
              ...existingInvoice,
              company_name: fallbackCompanyName,
              invoice_number: existingInvoice?.invoice_number || '',
              invoice_date: existingInvoice?.invoice_date || getBillingInvoiceDate(existingInvoice?.billing_month || billingMonthKey),
              billing_month: existingInvoice?.billing_month || billingMonthKey,
              client_address: fallbackClientAddress,
              customer_vat_number: fallbackCustomerVatNumber,
              company_registration_number: fallbackCompanyRegistrationNumber,
              subtotal: existingInvoice?.subtotal ?? 0,
              vat_amount: existingInvoice?.vat_amount ?? 0,
              total_amount: existingInvoice?.total_amount ?? 0,
              notes: existingInvoice?.notes ?? '',
              invoiceItems: existingLineItems,
              invoice_items: existingLineItems,
            },
          };
        }

        const lineItems = invoiceItems.map((item: Record<string, unknown>) => ({
          previous_reg: item.previous_reg || item.reg || '-',
          new_reg: item.new_reg || item.fleetNumber || item.reg || '-',
          item_code: item.item_code || '-',
          description: item.description || '-',
          comments: item.company || '',
          units: item.units || 1,
          quantity: item.quantity || item.units || 1,
          unit_price_without_vat:
            item.unit_price_without_vat ??
            item.amountExcludingVat ??
            item.unit_price ??
            0,
          amountExcludingVat:
            item.amountExcludingVat ??
            item.unit_price_without_vat ??
            item.unit_price ??
            0,
          vat_amount: item.vat_amount ?? 0,
          total_incl_vat:
            item.total_incl_vat ??
            item.total_including_vat ??
            item.totalRentalSub ??
            0,
          total_including_vat:
            item.total_including_vat ??
            item.total_incl_vat ??
            item.totalRentalSub ??
            0,
          reg: item.reg || null,
          fleetNumber: item.fleetNumber || null,
          company: item.company || '',
        }));

        const persistResponse = await fetch(`${origin}/api/invoices/bulk-account`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            accountNumber,
            billingMonth: draftInvoiceData?.billing_month || billingMonthKey,
            companyName:
              costCenter?.legal_name ||
              costCenter?.company ||
              draftInvoiceData?.company_name ||
              accountNumber,
            companyRegistrationNumber:
              costCenter?.registration_number ||
              draftInvoiceData?.company_registration_number ||
              null,
            clientAddress:
              buildAddress(costCenter) ||
              draftInvoiceData?.client_address ||
              null,
            customerVatNumber:
              costCenter?.vat_number ||
              draftInvoiceData?.customer_vat_number ||
              null,
            invoiceDate: draftInvoiceData?.invoice_date || getBillingInvoiceDate(draftInvoiceData?.billing_month || billingMonthKey),
            subtotal: draftInvoiceData?.subtotal || 0,
            vatAmount: draftInvoiceData?.vat_amount || 0,
            discountAmount: 0,
            totalAmount: draftInvoiceData?.total_amount || 0,
            lineItems,
            notes: draftInvoiceData?.notes || null,
          }),
        });

        if (!persistResponse.ok) {
          return null;
        }

        const persistedResult = await persistResponse.json();
        const persistedInvoice = persistedResult?.invoice;
        const companyName = String(
          costCenter?.legal_name ||
            costCenter?.company ||
            persistedInvoice?.company_name ||
            draftInvoiceData?.company_name ||
            accountNumber,
        ).trim();
        const clientAddress = String(
          buildAddress(costCenter) ||
            persistedInvoice?.client_address ||
            draftInvoiceData?.client_address ||
            '',
        ).trim();
        const customerVatNumber = String(
          costCenter?.vat_number ||
            persistedInvoice?.customer_vat_number ||
            draftInvoiceData?.customer_vat_number ||
            '',
        ).trim();
        const companyRegistrationNumber = String(
          costCenter?.registration_number ||
            persistedInvoice?.company_registration_number ||
            draftInvoiceData?.company_registration_number ||
            '',
        ).trim();

        return {
          accountNumber,
          invoiceData: {
            ...draftInvoiceData,
            company_name: companyName,
            invoice_number: persistedInvoice?.invoice_number || draftInvoiceData?.invoice_number || '',
            invoice_date: persistedInvoice?.invoice_date || draftInvoiceData?.invoice_date,
            billing_month: persistedInvoice?.billing_month || draftInvoiceData?.billing_month || billingMonthKey,
            client_address: clientAddress,
            customer_vat_number: customerVatNumber,
            company_registration_number: companyRegistrationNumber,
            subtotal: persistedInvoice?.subtotal ?? draftInvoiceData?.subtotal ?? 0,
            vat_amount: persistedInvoice?.vat_amount ?? draftInvoiceData?.vat_amount ?? 0,
            total_amount: persistedInvoice?.total_amount ?? draftInvoiceData?.total_amount ?? 0,
            notes: persistedInvoice?.notes ?? draftInvoiceData?.notes ?? '',
            invoiceItems: Array.isArray(persistedInvoice?.line_items) ? persistedInvoice.line_items : invoiceItems,
            invoice_items: Array.isArray(persistedInvoice?.line_items) ? persistedInvoice.line_items : invoiceItems,
          },
        };
      } catch (error) {
        console.error(`Failed to build bulk client PDF invoice data for ${accountNumber}:`, error);
        return null;
      }
    };

    const batchSize = 8;
    for (let index = 0; index < matchedAccountNumbers.length; index += batchSize) {
      const batch = matchedAccountNumbers.slice(index, index + batchSize);
      const batchResults = await Promise.all(batch.map(processAccountNumber));
      invoices.push(
        ...batchResults.filter(
          (entry): entry is { accountNumber: string; invoiceData: Record<string, unknown> } => Boolean(entry),
        ),
      );
    }

    invoices.sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));

    return NextResponse.json({
      invoices,
      count: invoices.length,
    });
  } catch (error) {
    console.error('Bulk client invoice PDF data error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare bulk client invoice PDF data' },
      { status: 500 },
    );
  }
}
