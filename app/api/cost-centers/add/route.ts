import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      customers_grouped_id,
      company,
      legal_name,
      contact_name,
      contact_email,
      contact_phone,
      vat_number,
      registration_number,
      physical_address_1,
      physical_address_2,
      physical_address_3,
      physical_area,
      physical_province,
      physical_code,
      postal_address_1,
      postal_address_2,
      postal_address_3,
    } = body;

    if (!customers_grouped_id) {
      return NextResponse.json({ error: "customers_grouped_id is required" }, { status: 400 });
    }

    if (!company && !legal_name) {
      return NextResponse.json({ error: "company or legal_name is required" }, { status: 400 });
    }

    // Fetch the customers_grouped record to get existing account numbers and generate next code
    const { data: grouped, error: groupedError } = await supabase
      .from("customers_grouped")
      .select("id, all_new_account_numbers, company_group")
      .eq("id", customers_grouped_id)
      .single();

    if (groupedError || !grouped) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Generate next cost code
    const allAccountNumbers = String(grouped.all_new_account_numbers || "")
      .split(",")
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean);

    const prefix = grouped.company_group
      ? grouped.company_group.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4).padEnd(4, "X")
      : "COST";

    const existingNumbers = allAccountNumbers
      .filter((code) => code.startsWith(`${prefix}-`))
      .map((code) => {
        const num = parseInt(code.split("-")[1], 10);
        return isNaN(num) ? 0 : num;
      });

    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNum = maxNum + 1;
    const newCostCode = `${prefix}-${String(nextNum).padStart(4, "0")}`;

    // Insert the new cost center
    const { data: newCostCenter, error: insertError } = await supabase
      .from("cost_centers")
      .insert({
        cost_code: newCostCode,
        company: company || "",
        legal_name: legal_name || "",
        contact_name: contact_name || "",
        email: contact_email || "",
        vat_number: vat_number || null,
        registration_number: registration_number || null,
        physical_address_1: physical_address_1 || null,
        physical_address_2: physical_address_2 || null,
        physical_address_3: physical_address_3 || null,
        physical_area: physical_area || null,
        physical_code: physical_code || null,
        postal_address_1: postal_address_1 || null,
        postal_address_2: postal_address_2 || null,
        postal_address_3: postal_address_3 || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting cost center:", insertError);
      return NextResponse.json({ error: "Failed to create cost center" }, { status: 500 });
    }

    // Append the new cost code to customers_grouped.all_new_account_numbers
    const updatedAccountNumbers = [...allAccountNumbers, newCostCode].join(",");

    const { error: updateError } = await supabase
      .from("customers_grouped")
      .update({ all_new_account_numbers: updatedAccountNumbers })
      .eq("id", customers_grouped_id);

    if (updateError) {
      console.error("Error updating customers_grouped:", updateError);
      // Rollback: delete the cost center if we can't update the grouped record
      await supabase.from("cost_centers").delete().eq("id", newCostCenter.id);
      return NextResponse.json({ error: "Failed to update client account numbers" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      costCenter: newCostCenter,
      newCostCode,
    });

  } catch (error) {
    console.error("Error in cost-centers/add POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
