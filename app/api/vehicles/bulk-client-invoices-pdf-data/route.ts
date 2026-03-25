import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('new_account_number')
      .not('new_account_number', 'is', null);

    if (vehiclesError) {
      throw vehiclesError;
    }

    const accountNumbers = Array.from(
      new Set(
        (vehicles || [])
          .map((row) => String(row?.new_account_number || '').trim().toUpperCase())
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
    const billingMonth = new Date();
    billingMonth.setDate(1);
    const billingMonthKey = billingMonth.toISOString().slice(0, 10);
    const invoices: Array<{ accountNumber: string; invoiceData: Record<string, unknown> }> = [];

    const { data: existingBulkInvoices, error: existingBulkInvoicesError } = await supabase
      .from('bulk_account_invoices')
      .select('*')
      .in('account_number', accountNumbers)
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

    for (const accountNumber of accountNumbers) {
      const existingInvoice = existingBulkInvoiceByAccount.get(accountNumber);
      const existingLineItems = Array.isArray(existingInvoice?.line_items) ? existingInvoice.line_items : [];
      if (!existingInvoice || existingLineItems.length === 0) continue;

      invoices.push({
        accountNumber,
        invoiceData: {
          ...existingInvoice,
          invoice_number: existingInvoice.invoice_number || '',
          invoice_date: existingInvoice.invoice_date || new Date().toISOString(),
          billing_month: existingInvoice.billing_month || billingMonthKey,
          subtotal: existingInvoice.subtotal ?? 0,
          vat_amount: existingInvoice.vat_amount ?? 0,
          total_amount: existingInvoice.total_amount ?? 0,
          notes: existingInvoice.notes ?? '',
          invoiceItems: existingLineItems,
          invoice_items: existingLineItems,
        },
      });
    }

    const missingAccountNumbers = accountNumbers.filter(
      (accountNumber) => !existingBulkInvoiceByAccount.has(accountNumber),
    );

    const headers = {
      Cookie: request.headers.get('Cookie') || '',
      Authorization: request.headers.get('Authorization') || '',
    };

    const processAccountNumber = async (accountNumber: string) => {
      try {
        const draftResponse = await fetch(
          `${origin}/api/vehicles/invoice?accountNumber=${encodeURIComponent(accountNumber)}`,
          {
            headers,
            cache: 'no-store',
          },
        );

        if (!draftResponse.ok) {
          return null;
        }

        const result = await draftResponse.json();
        const draftInvoiceData = result?.invoiceData;
        const invoiceItems = Array.isArray(draftInvoiceData?.invoiceItems)
          ? draftInvoiceData.invoiceItems
          : Array.isArray(draftInvoiceData?.invoice_items)
            ? draftInvoiceData.invoice_items
            : [];

        if (!draftInvoiceData || invoiceItems.length === 0) {
          return null;
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
            companyName: draftInvoiceData?.company_name || accountNumber,
            clientAddress: draftInvoiceData?.client_address || null,
            customerVatNumber: draftInvoiceData?.customer_vat_number || null,
            invoiceDate: draftInvoiceData?.invoice_date || new Date().toISOString(),
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

        return {
          accountNumber,
          invoiceData: {
            ...draftInvoiceData,
            invoice_number: persistedInvoice?.invoice_number || draftInvoiceData?.invoice_number || '',
            invoice_date: persistedInvoice?.invoice_date || draftInvoiceData?.invoice_date,
            billing_month: persistedInvoice?.billing_month || draftInvoiceData?.billing_month || billingMonthKey,
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
    for (let index = 0; index < missingAccountNumbers.length; index += batchSize) {
      const batch = missingAccountNumbers.slice(index, index + batchSize);
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
