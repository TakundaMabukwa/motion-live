import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountNumber = String(searchParams.get("accountNumber") || "").trim();

    if (!accountNumber) {
      return NextResponse.json(
        { error: "accountNumber is required" },
        { status: 400 },
      );
    }

    const [jobCardsResponse, clientQuotesResponse] = await Promise.all([
      supabase
        .from("job_cards")
        .select(
          "id, job_number, completion_date, quotation_total_amount, job_status",
        )
        .eq("new_account_number", accountNumber)
        .not("created_by", "is", null),
      supabase
        .from("client_quotes")
        .select("job_status, quotation_total_amount")
        .eq("new_account_number", accountNumber)
        .not("created_by", "is", null),
    ]);

    if (jobCardsResponse.error || clientQuotesResponse.error) {
      return NextResponse.json(
        {
          error:
            jobCardsResponse.error?.message ||
            clientQuotesResponse.error?.message ||
            "Failed to fetch account dashboard summary",
        },
        { status: 500 },
      );
    }

    const jobCards = Array.isArray(jobCardsResponse.data)
      ? jobCardsResponse.data
      : [];
    const clientQuotes = Array.isArray(clientQuotesResponse.data)
      ? clientQuotesResponse.data
      : [];

    const quotationsOpened = clientQuotes.length;
    const approved = clientQuotes.filter(
      (quote) => String(quote.job_status || "").toLowerCase() === "approved",
    ).length;
    const jobsOpen = jobCards.filter(
      (job) => String(job.job_status || "").toLowerCase() !== "completed",
    ).length;

    const totalQuotationAmount = clientQuotes
      .filter((quote) => String(quote.job_status || "").toLowerCase() === "approved")
      .reduce(
        (sum, quote) => sum + (Number.parseFloat(String(quote.quotation_total_amount)) || 0),
        0,
      );

    const recentInvoices = jobCards
      .filter((job) => job.completion_date && job.quotation_total_amount)
      .sort(
        (a, b) =>
          new Date(String(b.completion_date || 0)).getTime() -
          new Date(String(a.completion_date || 0)).getTime(),
      )
      .slice(0, 5)
      .map((job) => ({
        id: job.id,
        jobNumber: job.job_number,
        completionDate: job.completion_date,
        totalAmount: Number.parseFloat(String(job.quotation_total_amount)) || 0,
        status: job.job_status,
      }));

    const totalJobsValue = jobCards
      .filter((job) => job.quotation_total_amount)
      .reduce(
        (sum, job) => sum + (Number.parseFloat(String(job.quotation_total_amount)) || 0),
        0,
      );

    return NextResponse.json({
      quotationsOpened,
      approved,
      jobsOpen,
      totalQuotationAmount,
      recentInvoices,
      totalJobsValue,
      clientQuotesCount: clientQuotes.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
