import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TechStockRow = {
  id: number;
  technician_email: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  email: string | null;
  role: string | null;
  tech_admin?: boolean | null;
};

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

    const [
      { data: stockRows, error: stockError },
      { data: userRows, error: userError },
    ] = await Promise.all([
      supabase
        .from("tech_stock")
        .select("id, technician_email, created_at")
        .not("technician_email", "is", null),
      supabase.from("users").select("id, email, role, tech_admin"),
    ]);

    if (stockError) {
      return NextResponse.json({ error: stockError.message }, { status: 500 });
    }

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    const technicianMap = new Map<
      string,
      {
        id: string | number;
        technician_email: string | null;
        created_at: string | null;
      }
    >();

    (userRows as UserRow[] | null)?.forEach((row) => {
      const email = (row.email || "").trim().toLowerCase();
      const role = (row.role || "").trim().toLowerCase();
      const isTechnician =
        role === "technician" || role === "tech" || Boolean(row.tech_admin);
      if (!email || !isTechnician) return;

      technicianMap.set(email, {
        id: row.id,
        technician_email: email,
        created_at: null,
      });
    });

    (stockRows as TechStockRow[] | null)?.forEach((row) => {
      const email = (row.technician_email || "").trim().toLowerCase();
      if (!email) return;

      const existing = technicianMap.get(email);
      if (!existing) {
        technicianMap.set(email, {
          id: row.id,
          technician_email: email,
          created_at: row.created_at || null,
        });
        return;
      }

      technicianMap.set(email, {
        ...existing,
        created_at: row.created_at || existing.created_at,
      });
    });

    const technicians = Array.from(technicianMap.values()).sort((a, b) =>
      (a.technician_email || "").localeCompare(b.technician_email || ""),
    );

    return NextResponse.json({ technicians });
  } catch (error) {
    console.error("Error in tech stock technicians GET:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
