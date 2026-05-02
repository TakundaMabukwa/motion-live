import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  applyOutstandingPaymentToBuckets,
  buildCurrentPaymentAllocationRows,
  buildOutstandingPaymentAllocationRows,
  defaultDueDate,
  buildDraftPaymentsFromVehicles,
  buildInvoiceFinancials,
  getTotalOutstandingDue,
  insertPaymentAllocations,
  normalizeBillingMonth,
  resolveAccountInvoice,
  upsertPaymentsMirror,
} from "@/lib/server/account-invoice-payments";
import {
  allocateTrackedInvoiceNumber,
  markTrackedInvoiceFailed,
  markTrackedInvoicePersisted,
} from "@/lib/server/invoice-number-audit";

const TOTAL_BILLING_COLUMNS = new Set([
  "total_rental_sub",
  "total_rental",
  "total_sub",
]);

const SERVICE_ONLY_COLUMNS = new Set([
  "consultancy",
  "roaming",
  "maintenance",
  "after_hours",
  "controlroom",
  "software",
  "eps_software_development",
  "maysene_software_development",
  "waterford_software_development",
  "klaver_software_development",
  "advatrans_software_development",
  "tt_linehaul_software_development",
  "tt_express_software_development",
  "tt_fmcg_software_development",
  "rapid_freight_software_development",
  "remco_freight_software_development",
  "vt_logistics_software_development",
  "epilite_software_development",
  "additional_data",
  "driver_app",
]);

const formatColumnLabel = (value: string) =>
  value
    .replace(/^_+/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeBillingLabel = (value: string) =>
  formatColumnLabel(value)
    .replace(/\bSub\b/gi, "Subscription")
    .replace(/\bRental\b/gi, "Rental");

const toAmount = (value: unknown) => {
  const amount = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(amount) ? amount : 0;
};

const buildAddress = (source?: Record<string, unknown> | null) =>
  [
    source?.physical_address_1,
    source?.physical_address_2,
    source?.physical_address_3,
    source?.physical_area,
    source?.physical_code,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");

const isBillableVehicleColumn = (key: string) =>
  key.endsWith("_rental") ||
  key.endsWith("_sub") ||
  SERVICE_ONLY_COLUMNS.has(key) ||
  TOTAL_BILLING_COLUMNS.has(key);

const buildDetailedInvoiceItems = (
  vehicles: Array<Record<string, unknown>>,
  companyName: string,
) => {
  const invoiceItems: Array<Record<string, unknown>> = [];

  vehicles.forEach((vehicle) => {
    let regFleetDisplay = "";
    if (vehicle.reg && vehicle.fleet_number) {
      regFleetDisplay = `${vehicle.reg} / ${vehicle.fleet_number}`;
    } else {
      regFleetDisplay = vehicle.reg || vehicle.fleet_number || "";
    }

    const billedItemLabels = Object.keys(vehicle)
      .filter((key) => isBillableVehicleColumn(key) && !TOTAL_BILLING_COLUMNS.has(key))
      .filter((key) => toAmount(vehicle[key]) > 0)
      .map((key) => normalizeBillingLabel(key))
      .filter(Boolean);

    const monthlyRental = toAmount(vehicle.total_rental);
    const monthlySub = toAmount(vehicle.total_sub);
    const totalExVat = Number((monthlyRental + monthlySub).toFixed(2));
    if (totalExVat <= 0) {
      return;
    }

    const uniqueLabels = Array.from(new Set(billedItemLabels));
    if (uniqueLabels.length === 0) {
      if (monthlyRental > 0) uniqueLabels.push("Monthly Rental");
      if (monthlySub > 0) uniqueLabels.push("Monthly Subscription");
    }

    const vatAmount = Number((totalExVat * 0.15).toFixed(2));
    const totalInclVat = Number((totalExVat + vatAmount).toFixed(2));

    invoiceItems.push({
      previous_reg: vehicle.previous_reg || null,
      reg: vehicle.reg || null,
      fleetNumber: vehicle.fleet_number || null,
      regFleetDisplay,
      item_code: "MULTI BILLING",
      description: uniqueLabels.join(", "),
      comments: vehicle.company || companyName,
      company: vehicle.company || companyName,
      account_number: vehicle.account_number || vehicle.new_account_number || "",
      units: 1,
      unit_price: totalExVat.toFixed(2),
      unit_price_without_vat: totalExVat.toFixed(2),
      amountExcludingVat: totalExVat.toFixed(2),
      total_excl_vat: totalExVat.toFixed(2),
      vat_amount: vatAmount.toFixed(2),
      vatAmount: vatAmount.toFixed(2),
      vat_percentage: "15",
      total_incl_vat: totalInclVat.toFixed(2),
      total_including_vat: totalInclVat.toFixed(2),
      totalRentalSub: totalInclVat.toFixed(2),
    });
  });

  const subtotal = Number(
    invoiceItems
      .reduce((sum, item) => sum + Number(item.amountExcludingVat || 0), 0)
      .toFixed(2),
  );
  const vatAmount = Number(
    invoiceItems
      .reduce((sum, item) => sum + Number(item.vat_amount || 0), 0)
      .toFixed(2),
  );
  const totalAmount = Number(
    invoiceItems
      .reduce((sum, item) => sum + Number(item.total_including_vat || 0), 0)
      .toFixed(2),
  );

  return {
    invoiceItems,
    subtotal,
    vatAmount,
    totalAmount,
  };
};

const formatUnknownError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const errorObject = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      error?: unknown;
    };

    const parts = [
      errorObject.message,
      errorObject.error,
      errorObject.code,
      errorObject.details,
      errorObject.hint,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join(" | ");
    }
  }

  return "Unknown error";
};

const isUuidLike = (value: unknown) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  );

const normalizePaymentTimestamp = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return new Date().toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T12:00:00.000Z`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid payment date");
  }

  return parsed.toISOString();
};

const buildOutstandingInvoiceItems = (agingRow: Record<string, unknown>) => {
  const rows = [
    { description: "Current Due", amount: Number(agingRow.current_due || 0) },
    { description: "30 Days Outstanding", amount: Number(agingRow.overdue_30_days || 0) },
    { description: "60 Days Outstanding", amount: Number(agingRow.overdue_60_days || 0) },
    { description: "90 Days Outstanding", amount: Number(agingRow.overdue_90_days || 0) },
    { description: "120+ Days Outstanding", amount: Number(agingRow.overdue_120_plus_days || 0) },
  ].filter((item) => item.amount > 0);

  return rows.map((item) => ({
    item_code: "OUTSTANDING",
    description: item.description,
    comments: "Aged balance payment snapshot",
    units: 1,
    unit_price: item.amount.toFixed(2),
    unit_price_without_vat: item.amount.toFixed(2),
    amountExcludingVat: item.amount.toFixed(2),
    total_excl_vat: item.amount.toFixed(2),
    vat_amount: "0.00",
    vatAmount: "0.00",
    vat_percentage: "0",
    total_incl_vat: item.amount.toFixed(2),
    total_including_vat: item.amount.toFixed(2),
    totalRentalSub: item.amount.toFixed(2),
  }));
};

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const {
      accountNumber,
      accountInvoiceId,
      billingMonth,
      paymentReference,
      amount,
      paymentMethod,
      notes,
      paymentType,
      paymentPeriodType,
      paymentDate,
    } = requestBody;
    const normalizedPaymentPeriodType =
      String(paymentPeriodType || "").trim().toLowerCase() === "outstanding"
        ? "outstanding"
        : "current";

    const numericAmount = Number(amount);
    let normalizedPaymentDate: string;
    try {
      normalizedPaymentDate = normalizePaymentTimestamp(paymentDate);
    } catch (error) {
      return NextResponse.json(
        { error: formatUnknownError(error) },
        { status: 400 },
      );
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    if (numericAmount > 1000000) {
      return NextResponse.json(
        { error: "Amount seems unreasonably high. Please verify the payment amount." },
        { status: 400 },
      );
    }

    if (paymentType !== "cost_center_payment") {
      return NextResponse.json(
        { error: "Unsupported payment type" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let invoice = await resolveAccountInvoice(supabase, {
      accountInvoiceId:
        accountInvoiceId && isUuidLike(accountInvoiceId)
          ? String(accountInvoiceId)
          : null,
      accountNumber: accountNumber ? String(accountNumber).trim() : null,
      billingMonth: normalizeBillingMonth(billingMonth),
    });

    let outstandingAgingRow: Record<string, unknown> | null = null;

    if (accountNumber && normalizedPaymentPeriodType === "outstanding") {
      const normalizedAccountNumber = String(accountNumber).trim().toUpperCase();
      const { data: agingRows, error: agingError } = await supabase
        .from("payments_")
        .select(
          `
            id,
            cost_code,
            company,
            account_invoice_id,
            invoice_number,
            reference,
            due_amount,
            paid_amount,
            balance_due,
            current_due,
            overdue_30_days,
            overdue_60_days,
            overdue_90_days,
            overdue_120_plus_days,
            outstanding_balance,
            billing_month,
            credit_amount,
            payment_status,
            last_updated
          `,
        )
        .eq("cost_code", normalizedAccountNumber)
        .order("billing_month", { ascending: true })
        .order("last_updated", { ascending: false })
        .limit(12);

      if (agingError) {
        return NextResponse.json(
          { error: agingError.message || "Failed to load outstanding age analysis" },
          { status: 500 },
        );
      }

      const requestedAccountInvoiceId =
        accountInvoiceId && isUuidLike(accountInvoiceId) ? String(accountInvoiceId) : null;
      const requestedBillingMonth = normalizeBillingMonth(billingMonth);

      outstandingAgingRow =
        (agingRows || []).find(
          (row) =>
            requestedAccountInvoiceId &&
            String(row.account_invoice_id || "") === requestedAccountInvoiceId &&
            getTotalOutstandingDue(row) > 0,
        ) ||
        (agingRows || []).find(
          (row) =>
            requestedBillingMonth &&
            normalizeBillingMonth(row.billing_month) === requestedBillingMonth &&
            getTotalOutstandingDue(row) > 0,
        ) ||
        (agingRows || []).find((row) => getTotalOutstandingDue(row) > 0) ||
        null;

      if (outstandingAgingRow) {
        const outstandingBillingMonth =
          normalizeBillingMonth(outstandingAgingRow.billing_month) ||
          normalizeBillingMonth(billingMonth);

        if (!invoice && outstandingBillingMonth) {
          invoice = await resolveAccountInvoice(supabase, {
            accountNumber: normalizedAccountNumber,
            billingMonth: outstandingBillingMonth,
          });
        }
      }
    }

    if (!invoice && accountNumber) {
      const normalizedAccountNumber = String(accountNumber).trim().toUpperCase();
      const normalizedBillingMonth = normalizeBillingMonth(billingMonth) || (() => {
        const currentMonth = new Date();
        currentMonth.setDate(1);
        return currentMonth.toISOString().slice(0, 10);
      })();

      const { data: costCenterRow, error: costCenterError } = await supabase
        .from("cost_centers")
        .select("company, legal_name, vat_number, physical_address_1, physical_address_2, physical_address_3, physical_area, physical_code")
        .eq("cost_code", normalizedAccountNumber)
        .maybeSingle();

      if (costCenterError) {
        return NextResponse.json(
          { error: costCenterError.message || "Failed to prepare payment invoice" },
          { status: 500 },
        );
      }

      if (
        normalizedPaymentPeriodType === "outstanding" &&
        outstandingAgingRow &&
        getTotalOutstandingDue(outstandingAgingRow) > 0
      ) {
        let allocatedInvoiceNumber = "";
        let allocationAuditId: string | null = null;

        try {
          const allocation = await allocateTrackedInvoiceNumber(supabase, {
            source: "api/payments/process-payments:outstanding-auto-invoice",
            userId: user?.id || null,
            requestKey: `${normalizedAccountNumber}|${
              normalizeBillingMonth(outstandingAgingRow.billing_month) ||
              normalizedBillingMonth
            }|outstanding`,
            context: {
              accountNumber: normalizedAccountNumber,
              billingMonth:
                normalizeBillingMonth(outstandingAgingRow.billing_month) ||
                normalizedBillingMonth,
            },
          });
          allocatedInvoiceNumber = allocation.invoiceNumber;
          allocationAuditId = allocation.auditId;
        } catch {
          return NextResponse.json(
            { error: "Failed to allocate invoice number" },
            { status: 500 },
          );
        }

        const invoiceDate = new Date().toISOString();
        const companyName =
          costCenterRow?.legal_name ||
          costCenterRow?.company ||
          outstandingAgingRow.company ||
          normalizedAccountNumber;
        const clientAddress = buildAddress(costCenterRow);
        const totalOutstanding = getTotalOutstandingDue(outstandingAgingRow);
        const invoiceItems = buildOutstandingInvoiceItems(outstandingAgingRow);

        const { data: insertedInvoice, error: insertError } = await supabase
          .from("account_invoices")
          .insert({
            account_number: normalizedAccountNumber,
            billing_month:
              normalizeBillingMonth(outstandingAgingRow.billing_month) ||
              normalizedBillingMonth,
            invoice_number: allocatedInvoiceNumber,
            company_name: companyName,
            client_address: clientAddress || null,
            customer_vat_number: costCenterRow?.vat_number || null,
            invoice_date: invoiceDate,
            due_date: defaultDueDate(invoiceDate),
            subtotal: totalOutstanding,
            vat_amount: 0,
            discount_amount: 0,
            total_amount: totalOutstanding,
            paid_amount: 0,
            balance_due: totalOutstanding,
            payment_status: "pending",
            line_items: invoiceItems,
            notes: "Auto-created during payment from outstanding age analysis snapshot",
            created_by: user?.id || null,
          })
          .select("*")
          .single();

        if (insertError) {
          await markTrackedInvoiceFailed(supabase, {
            auditId: allocationAuditId,
            invoiceNumber: allocatedInvoiceNumber,
            errorMessage:
              insertError.message ||
              "Failed to create invoice snapshot for payment",
          });
          return NextResponse.json(
            { error: insertError.message || "Failed to create invoice snapshot for payment" },
            { status: 500 },
          );
        }

        await markTrackedInvoicePersisted(supabase, {
          auditId: allocationAuditId,
          invoiceNumber: allocatedInvoiceNumber,
          persistedTable: "account_invoices",
          persistedInvoiceId: insertedInvoice.id,
        });
        invoice = insertedInvoice;
      } else {
        const [
          { data: vehiclesByNewAccount, error: vehiclesByNewAccountError },
          { data: vehiclesByAccount, error: vehiclesByAccountError },
        ] = await Promise.all([
          supabase
            .from("vehicles")
            .select("*")
            .eq("new_account_number", normalizedAccountNumber),
          supabase
            .from("vehicles")
            .select("*")
            .eq("account_number", normalizedAccountNumber),
        ]);

        if (vehiclesByNewAccountError || vehiclesByAccountError) {
          const message =
            vehiclesByNewAccountError?.message ||
            vehiclesByAccountError?.message ||
            "Failed to prepare draft invoice";
          return NextResponse.json({ error: message }, { status: 500 });
        }

        const vehicleMap = new Map<string, Record<string, unknown>>();
        [...(vehiclesByNewAccount || []), ...(vehiclesByAccount || [])].forEach((vehicle) => {
          const key =
            String(vehicle?.id || "").trim() ||
            String(vehicle?.reg || "").trim().toUpperCase() ||
            JSON.stringify([
              String(vehicle?.new_account_number || "").trim().toUpperCase(),
              String(vehicle?.account_number || "").trim().toUpperCase(),
              vehicle?.company || "",
              vehicle?.total_rental || "",
              vehicle?.total_sub || "",
            ]);
          if (!vehicleMap.has(key)) {
            vehicleMap.set(key, vehicle);
          }
        });

        const draft = buildDraftPaymentsFromVehicles(Array.from(vehicleMap.values())).get(normalizedAccountNumber);

        if (draft && Number(draft.due_amount || 0) > 0) {
          let allocatedInvoiceNumber = "";
          let allocationAuditId: string | null = null;

          try {
            const allocation = await allocateTrackedInvoiceNumber(supabase, {
              source: "api/payments/process-payments:current-auto-invoice",
              userId: user?.id || null,
              requestKey: `${normalizedAccountNumber}|${normalizedBillingMonth}|current`,
              context: {
                accountNumber: normalizedAccountNumber,
                billingMonth: normalizedBillingMonth,
              },
            });
            allocatedInvoiceNumber = allocation.invoiceNumber;
            allocationAuditId = allocation.auditId;
          } catch {
            return NextResponse.json(
              { error: "Failed to allocate invoice number" },
              { status: 500 },
            );
          }

          const invoiceDate = new Date().toISOString();
          const companyName =
            costCenterRow?.legal_name ||
            costCenterRow?.company ||
            draft.company ||
            normalizedAccountNumber;
          const clientAddress = buildAddress(costCenterRow);
          const { invoiceItems, subtotal, vatAmount, totalAmount } =
            buildDetailedInvoiceItems(Array.from(vehicleMap.values()), companyName);

          const { data: insertedInvoice, error: insertError } = await supabase
            .from("account_invoices")
            .insert({
              account_number: normalizedAccountNumber,
              billing_month: normalizedBillingMonth,
              invoice_number: allocatedInvoiceNumber,
              company_name: companyName,
              client_address: clientAddress || null,
              customer_vat_number: costCenterRow?.vat_number || null,
              invoice_date: invoiceDate,
              due_date: defaultDueDate(invoiceDate),
              subtotal: subtotal,
              vat_amount: vatAmount,
              discount_amount: 0,
              total_amount: totalAmount,
              paid_amount: 0,
              balance_due: totalAmount,
              payment_status: "pending",
              line_items: invoiceItems,
              notes: "Auto-created during payment from current vehicle billing draft with full vehicle detail",
              created_by: user?.id || null,
            })
            .select("*")
            .single();

          if (insertError) {
            await markTrackedInvoiceFailed(supabase, {
              auditId: allocationAuditId,
              invoiceNumber: allocatedInvoiceNumber,
              errorMessage:
                insertError.message ||
                "Failed to create invoice snapshot for payment",
            });
            return NextResponse.json(
              { error: insertError.message || "Failed to create invoice snapshot for payment" },
              { status: 500 },
            );
          }

          await markTrackedInvoicePersisted(supabase, {
            auditId: allocationAuditId,
            invoiceNumber: allocatedInvoiceNumber,
            persistedTable: "account_invoices",
            persistedInvoiceId: insertedInvoice.id,
          });

          await upsertPaymentsMirror(supabase, insertedInvoice);
          invoice = insertedInvoice;
        }
      }
    }

    if (!invoice) {
      return NextResponse.json(
        { error: "No invoice found for this account and billing month" },
        { status: 404 },
      );
    }

    const finalPaymentReference =
      String(paymentReference || "").trim() ||
      `AUTO-${invoice.account_number}-${invoice.invoice_number || "INV"}-${new Date().toISOString().slice(0, 10)}`;

    const paymentInsert = {
      account_invoice_id: invoice.id,
      account_number: invoice.account_number,
      billing_month: invoice.billing_month,
      invoice_number: invoice.invoice_number,
      payment_reference: finalPaymentReference,
      amount: numericAmount,
      payment_date: normalizedPaymentDate,
      payment_method: paymentMethod ? String(paymentMethod).trim() : null,
      notes: notes ? String(notes).trim() : null,
      created_by: user?.id || null,
      created_by_email: user?.email || null,
    };

    const { data: insertedPayment, error: insertError } = await supabase
      .from("account_invoice_payments")
      .insert(paymentInsert)
      .select("*")
      .single();

    if (insertError) {
      console.error("Failed to insert account invoice payment:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to record payment" },
        { status: 500 },
      );
    }

    try {
      const allocationRows =
        normalizedPaymentPeriodType === "outstanding" && outstandingAgingRow
          ? buildOutstandingPaymentAllocationRows({
              source: outstandingAgingRow,
              paymentAmount: numericAmount,
              common: {
                paymentId: insertedPayment.id,
                accountNumber: invoice.account_number,
                accountInvoiceId: invoice.id,
                billingMonth:
                  normalizeBillingMonth(outstandingAgingRow.billing_month) ||
                  invoice.billing_month,
                paymentDate: insertedPayment.payment_date,
                reference: insertedPayment.payment_reference,
                notes: insertedPayment.notes,
                createdBy: user?.id || null,
                createdByEmail: user?.email || null,
              },
            })
          : buildCurrentPaymentAllocationRows({
              paymentAmount: numericAmount,
              invoiceTotal: invoice.total_amount,
              invoicePaidAmount: invoice.paid_amount,
              common: {
                paymentId: insertedPayment.id,
                accountNumber: invoice.account_number,
                accountInvoiceId: invoice.id,
                billingMonth: invoice.billing_month,
                paymentDate: insertedPayment.payment_date,
                reference: insertedPayment.payment_reference,
                notes: insertedPayment.notes,
                createdBy: user?.id || null,
                createdByEmail: user?.email || null,
              },
            });

      await insertPaymentAllocations(supabase, allocationRows);
    } catch (allocationError) {
      console.error("Failed to write payment allocation ledger:", allocationError);
    }

    const { data: paymentRows, error: paymentsError } = await supabase
      .from("account_invoice_payments")
      .select("amount")
      .eq("account_invoice_id", invoice.id);

    if (paymentsError) {
      console.error("Failed to total account invoice payments:", paymentsError);
      return NextResponse.json(
        { error: paymentsError.message || "Failed to total payments" },
        { status: 500 },
      );
    }

    const totalPaid = (paymentRows || []).reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0,
    );
    const invoiceTotal = Number(invoice.total_amount || 0);
    const appliedPaidAmount = Math.min(totalPaid, invoiceTotal);
    const creditAmount = Math.max(0, Number((totalPaid - invoiceTotal).toFixed(2)));

    const financials = buildInvoiceFinancials({
      totalAmount: invoiceTotal,
      paidAmount: appliedPaidAmount,
      dueDate: invoice.due_date,
    });

    const invoiceUpdatePayload = {
      paid_amount: financials.paidAmount,
      balance_due: financials.balanceDue,
      payment_status: financials.paymentStatus,
      last_payment_at: insertedPayment.payment_date,
      last_payment_reference: insertedPayment.payment_reference,
      fully_paid_at:
        financials.balanceDue <= 0
          ? invoice.fully_paid_at || normalizedPaymentDate
          : null,
    };

    const { data: updatedInvoice, error: updateInvoiceError } = await supabase
      .from("account_invoices")
      .update(invoiceUpdatePayload)
      .eq("id", invoice.id)
      .select("*")
      .single();

    if (updateInvoiceError) {
      console.error("Failed to update account invoice payment state:", updateInvoiceError);
      return NextResponse.json(
        { error: updateInvoiceError.message || "Failed to update invoice" },
        { status: 500 },
      );
    }

    if (normalizedPaymentPeriodType === "outstanding" && outstandingAgingRow) {
      const agedAllocation = applyOutstandingPaymentToBuckets(outstandingAgingRow, numericAmount);
      const currentCreditAmount = Number(outstandingAgingRow.credit_amount || 0);
      const outstandingDueAmount = getTotalOutstandingDue(outstandingAgingRow);
      const nextPaidAmount = Math.min(
        outstandingDueAmount,
        Number(outstandingAgingRow.paid_amount || 0) + agedAllocation.appliedToOutstanding,
      );

      const { error: paymentsMirrorUpdateError } = await supabase
        .from("payments_")
        .update({
          account_invoice_id: updatedInvoice.id,
          invoice_number: updatedInvoice.invoice_number,
          reference: updatedInvoice.invoice_number,
          paid_amount: nextPaidAmount,
          balance_due: agedAllocation.outstanding_balance,
          amount_due: agedAllocation.outstanding_balance,
          current_due: agedAllocation.current_due,
          overdue_30_days: agedAllocation.overdue_30_days,
          overdue_60_days: agedAllocation.overdue_60_days,
          overdue_90_days: agedAllocation.overdue_90_days,
          overdue_120_plus_days: agedAllocation.overdue_120_plus_days,
          outstanding_balance: agedAllocation.outstanding_balance,
          credit_amount: Number(
            (currentCreditAmount + Math.max(0, creditAmount)).toFixed(2),
          ),
              payment_status:
                agedAllocation.outstanding_balance <= 0 && agedAllocation.current_due <= 0
                  ? "paid"
                  : nextPaidAmount > 0
                    ? "partial"
                    : "pending",
              last_updated: insertedPayment.payment_date,
            })
            .eq("id", outstandingAgingRow.id);

      if (paymentsMirrorUpdateError) {
        return NextResponse.json(
          { error: paymentsMirrorUpdateError.message || "Failed to update outstanding age analysis" },
          { status: 500 },
        );
      }
    } else {
      await upsertPaymentsMirror(supabase, {
        ...updatedInvoice,
        credit_amount: creditAmount,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Payment processed successfully",
      payment: {
        ...updatedInvoice,
        account_invoice_id: updatedInvoice.id,
        invoice_number: updatedInvoice.invoice_number,
      },
      creditAmount,
      paymentEntry: insertedPayment,
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    return NextResponse.json(
      { error: formatUnknownError(error) },
      { status: 500 },
    );
  }
}
