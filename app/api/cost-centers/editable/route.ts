import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EDITABLE_FIELDS = [
  "company",
  "legal_name",
  "cost_code",
  "contact_name",
  "email",
  "vat_number",
  "registration_number",
  "physical_address_1",
  "physical_address_2",
  "physical_address_3",
  "physical_area",
  "physical_code",
  "postal_address_1",
  "postal_address_2",
  "postal_address_3",
  "validated",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("cost_centers")
      .select(
        "id, company, legal_name, cost_code, contact_name, email, vat_number, registration_number, physical_address_1, physical_address_2, physical_address_3, physical_area, physical_code, postal_address_1, postal_address_2, postal_address_3, validated, created_at",
      )
      .order("cost_code", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch cost centers" },
        { status: 500 },
      );
    }

    return NextResponse.json({ costCenters: data || [] });
  } catch (error) {
    console.error("Editable cost centers GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const id = String(body?.id || "").trim();

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updatePayload = EDITABLE_FIELDS.reduce<Record<string, unknown>>((acc, field) => {
      if (field in body) {
        const value = body[field];
        acc[field] = field === "validated" ? Boolean(value) : value === "" ? null : value;
      }
      return acc;
    }, {});

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No editable fields were provided" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("cost_centers")
      .update(updatePayload as Partial<Record<EditableField, unknown>>)
      .eq("id", id)
      .select(
        "id, company, legal_name, cost_code, contact_name, email, vat_number, registration_number, physical_address_1, physical_address_2, physical_address_3, physical_area, physical_code, postal_address_1, postal_address_2, postal_address_3, validated, created_at",
      )
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update cost center" },
        { status: 500 },
      );
    }

    return NextResponse.json({ costCenter: data });
  } catch (error) {
    console.error("Editable cost centers PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "rows are required" }, { status: 400 });
    }

    const updates = await Promise.all(
      rows.map(async (row) => {
        const id = String(row?.id || "").trim();
        if (!id) {
          throw new Error("Each row must include an id");
        }

        const updatePayload = EDITABLE_FIELDS.reduce<Record<string, unknown>>((acc, field) => {
          if (field in row) {
            const value = row[field];
            acc[field] = field === "validated" ? Boolean(value) : value === "" ? null : value;
          }
          return acc;
        }, {});

        const { data, error } = await supabase
          .from("cost_centers")
          .update(updatePayload as Partial<Record<EditableField, unknown>>)
          .eq("id", id)
          .select(
            "id, company, legal_name, cost_code, contact_name, email, vat_number, registration_number, physical_address_1, physical_address_2, physical_address_3, physical_area, physical_code, postal_address_1, postal_address_2, postal_address_3, validated, created_at",
          )
          .single();

        if (error) {
          throw new Error(error.message || `Failed to update cost center ${id}`);
        }

        return data;
      }),
    );

    return NextResponse.json({ costCenters: updates });
  } catch (error) {
    console.error("Editable cost centers PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
