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
    const accountsParam = searchParams.get("accounts") || "";
    const months = parseInt(searchParams.get("months") || "1", 10);

    if (!accountsParam) {
      return NextResponse.json({ error: "accounts parameter is required" }, { status: 400 });
    }

    const accountNumbers = accountsParam
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a);

    // Calculate date range
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    // Fetch job_cards for these account numbers
    const { data: jobCards, error } = await supabase
      .from("job_cards")
      .select("id, job_number, job_type, status, quotation_job_type, quotation_products, job_date, completion_date, new_account_number, customer_name, vehicle_registration")
      .in("new_account_number", accountNumbers)
      .gte("job_date", since.toISOString())
      .order("job_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Aggregate products across all job cards
    const productMap = new Map<string, {
      name: string;
      type: string;
      category: string;
      installCount: number;
      deinstallCount: number;
      totalQuantity: number;
      totalCashGross: number;
      totalRentalGross: number;
      totalSubscriptionGross: number;
      totalInstallationGross: number;
      totalDeInstallationGross: number;
      totalCashDiscount: number;
      totalRentalDiscount: number;
      totalSubscriptionDiscount: number;
      totalInstallationDiscount: number;
      totalDeInstallationDiscount: number;
      vehicles: Set<string>;
      jobNumbers: Set<string>;
    }>();

    let totalJobs = 0;
    let installJobs = 0;
    let deinstallJobs = 0;

    for (const card of jobCards || []) {
      totalJobs++;
      if (card.job_type === "install") installJobs++;
      else if (card.job_type === "deinstall") deinstallJobs++;

      const products = Array.isArray(card.quotation_products) ? card.quotation_products : [];

      for (const p of products) {
        if (p.is_labour) continue; // Skip labour charges

        const key = p.name || p.id || "unknown";
        if (!productMap.has(key)) {
          productMap.set(key, {
            name: p.name || "Unknown",
            type: p.type || "",
            category: p.category || "",
            installCount: 0,
            deinstallCount: 0,
            totalQuantity: 0,
            totalCashGross: 0,
            totalRentalGross: 0,
            totalSubscriptionGross: 0,
            totalInstallationGross: 0,
            totalDeInstallationGross: 0,
            totalCashDiscount: 0,
            totalRentalDiscount: 0,
            totalSubscriptionDiscount: 0,
            totalInstallationDiscount: 0,
            totalDeInstallationDiscount: 0,
            vehicles: new Set(),
            jobNumbers: new Set(),
          });
        }

        const entry = productMap.get(key)!;
        const qty = p.quantity || 1;
        entry.totalQuantity += qty;
        entry.totalCashGross += (p.cash_gross || 0) * qty;
        entry.totalRentalGross += (p.rental_gross || 0) * qty;
        entry.totalSubscriptionGross += (p.subscription_gross || 0) * qty;
        entry.totalInstallationGross += (p.installation_gross || 0) * qty;
        entry.totalDeInstallationGross += (p.de_installation_gross || 0) * qty;
        entry.totalCashDiscount += (p.cash_discount || 0) * qty;
        entry.totalRentalDiscount += (p.rental_discount || 0) * qty;
        entry.totalSubscriptionDiscount += (p.subscription_discount || 0) * qty;
        entry.totalInstallationDiscount += (p.installation_discount || 0) * qty;
        entry.totalDeInstallationDiscount += (p.de_installation_discount || 0) * qty;

        if (card.job_type === "install") entry.installCount += qty;
        else if (card.job_type === "deinstall") entry.deinstallCount += qty;

        if (card.vehicle_registration) entry.vehicles.add(card.vehicle_registration);
        if (card.job_number) entry.jobNumbers.add(card.job_number);
      }
    }

    const products = Array.from(productMap.values())
      .map((p) => ({
        ...p,
        vehicles: Array.from(p.vehicles),
        jobNumbers: Array.from(p.jobNumbers),
        vehicleCount: p.vehicles.size,
        jobCount: p.jobNumbers.size,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);

    return NextResponse.json({
      totalJobs,
      installJobs,
      deinstallJobs,
      productCount: products.length,
      products,
      since: since.toISOString(),
      accountNumbers,
    });
  } catch (error) {
    console.error("Job summary error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
