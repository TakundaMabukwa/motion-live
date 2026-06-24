import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const creditNoteNumber = searchParams.get("credit_note_number") || "N/A";
    const accountNumber = searchParams.get("account_number") || "N/A";
    const clientName = searchParams.get("client_name") || "N/A";
    const amount = searchParams.get("amount") || "0";
    const billingMonth = searchParams.get("billing_month") || "";
    const date = searchParams.get("date") || "";
    const reason = searchParams.get("reason") || "";
    const reference = searchParams.get("reference") || "";

    const formatDate = (d: string) => {
      if (!d) return "N/A";
      return new Date(d).toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const formatCurrency = (v: string) => {
      const n = Number(v || 0);
      return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Credit Note ${creditNoteNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
    .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
    .cn-title { font-size: 28px; font-weight: bold; color: #1e40af; text-align: right; }
    .cn-number { font-size: 16px; color: #666; text-align: right; margin-top: 5px; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .detail-group { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .detail-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-bottom: 4px; }
    .detail-value { font-size: 14px; color: #1e293b; font-weight: 500; }
    .amount-box { background: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px; }
    .amount-label { font-size: 12px; text-transform: uppercase; color: #2563eb; font-weight: 600; }
    .amount-value { font-size: 32px; font-weight: bold; color: #1e40af; margin-top: 5px; }
    .reason-box { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin-bottom: 30px; }
    .reason-title { font-size: 12px; text-transform: uppercase; color: #92400e; font-weight: 600; margin-bottom: 5px; }
    .reason-text { font-size: 14px; color: #78350f; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">Motion Live</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Credit Note</div>
    </div>
    <div>
      <div class="cn-title">CREDIT NOTE</div>
      <div class="cn-number">${creditNoteNumber}</div>
    </div>
  </div>

  <div class="details">
    <div class="detail-group">
      <div class="detail-label">Client Name</div>
      <div class="detail-value">${clientName}</div>
    </div>
    <div class="detail-group">
      <div class="detail-label">Account Number</div>
      <div class="detail-value">${accountNumber}</div>
    </div>
    <div class="detail-group">
      <div class="detail-label">Credit Note Date</div>
      <div class="detail-value">${formatDate(date)}</div>
    </div>
    <div class="detail-group">
      <div class="detail-label">Billing Month Applies To</div>
      <div class="detail-value">${formatDate(billingMonth)}</div>
    </div>
  </div>

  <div class="amount-box">
    <div class="amount-label">Credit Note Amount</div>
    <div class="amount-value">${formatCurrency(amount)}</div>
  </div>

  ${reason ? `
  <div class="reason-box">
    <div class="reason-title">Reason</div>
    <div class="reason-text">${reason}</div>
  </div>
  ` : ""}

  ${reference ? `
  <div class="detail-group" style="margin-bottom: 30px;">
    <div class="detail-label">Reference</div>
    <div class="detail-value">${reference}</div>
  </div>
  ` : ""}

  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" })}</p>
    <p style="margin-top: 5px;">Motion Live - Credit Note ${creditNoteNumber}</p>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Error generating credit note PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
