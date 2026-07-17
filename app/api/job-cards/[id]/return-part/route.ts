import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const normalizeToken = (v: unknown) => String(v || "").trim().toLowerCase();

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const jobId = resolvedParams.id;
    const body = await request.json();
    const { part, target_bucket, owner } = body;

    if (!jobId || !part || !target_bucket) {
      return NextResponse.json({ error: "jobId, part, and target_bucket are required" }, { status: 400 });
    }

    const serialNumber = String(part?.serial_number || "").trim();
    const categoryCode = String(part?.code || part?.category_code || "").trim();
    const description = String(part?.description || "").trim();
    const supplier = String(part?.supplier || "N/A").trim();

    if (!serialNumber) {
      return NextResponse.json({ error: "Part must have a serial number to return" }, { status: 400 });
    }

    const bucket = normalizeToken(target_bucket);

    // ── Soltrack: insert into inventory_items ──
    if (bucket === "soltrack") {
      const { error } = await supabase.from("inventory_items").insert({
        category_code: categoryCode || "UNKNOWN",
        serial_number: serialNumber,
        status: "IN STOCK",
        company: supplier || "N/A",
        notes: `Returned from job — ${description}`,
        date_adjusted: new Date().toISOString().slice(0, 10),
      });
      if (error) {
        console.error("[return-part] Soltrack insert error:", error);
        return NextResponse.json({ error: `Failed to return to Soltrack stock: ${error.message}` }, { status: 500 });
      }
    }

    // ── Client: insert into client_inventory_items ──
    else if (bucket === "client") {
      const clientCode = String(owner?.client_code || "").trim();
      const costCode = String(owner?.cost_code || "").trim();
      if (!clientCode || !costCode) {
        return NextResponse.json({ error: "Client return requires client_code and cost_code" }, { status: 400 });
      }
      const { error } = await supabase.from("client_inventory_items").insert({
        client_code: clientCode,
        cost_code: costCode,
        category_code: categoryCode || "UNKNOWN",
        serial_number: serialNumber,
        status: "IN STOCK",
        notes: `Returned from job — ${description}`,
        date_adjusted: new Date().toISOString().slice(0, 10),
      });
      if (error) {
        console.error("[return-part] Client insert error:", error);
        return NextResponse.json({ error: `Failed to return to Client stock: ${error.message}` }, { status: 500 });
      }
    }

    // ── Technician: merge into tech_stock.assigned_parts ──
    else if (bucket === "technician") {
      const techEmail = String(owner?.technician_email || "").trim().toLowerCase();
      if (!techEmail) {
        return NextResponse.json({ error: "Technician return requires technician_email" }, { status: 400 });
      }

      const { data: stockRows, error: fetchError } = await supabase
        .from("tech_stock")
        .select("id, assigned_parts")
        .ilike("technician_email", techEmail)
        .order("id", { ascending: true });

      if (fetchError) {
        console.error("[return-part] Tech stock fetch error:", fetchError);
        return NextResponse.json({ error: `Failed to fetch technician stock: ${fetchError.message}` }, { status: 500 });
      }

      const rows = Array.isArray(stockRows) ? stockRows : [];
      const existingParts = rows.flatMap((row: any) => {
        const ap = row.assigned_parts;
        if (Array.isArray(ap)) return ap;
        if (typeof ap === "string") { try { return JSON.parse(ap); } catch { return []; } }
        return [];
      });

      const newPart = {
        stock_id: part?.stock_id || "",
        serial_number: serialNumber,
        code: categoryCode,
        description: description,
        supplier: supplier,
        quantity: part?.quantity || 1,
        source: "returned_from_job",
        returned_at: new Date().toISOString(),
      };

      const normalizedSerial = normalizeToken(serialNumber);
      const normalizedStockId = normalizeToken(part?.stock_id);
      const alreadyExists = existingParts.some((p: any) => {
        const ps = normalizeToken(p?.serial_number);
        const psid = normalizeToken(p?.stock_id);
        if (normalizedSerial && ps && normalizedSerial === ps) return true;
        if (normalizedStockId && psid && normalizedStockId === psid) return true;
        return false;
      });

      const mergedParts = alreadyExists ? existingParts : [...existingParts, newPart];
      const primaryRow = rows[0] ?? null;

      if (!primaryRow) {
        const { error: insertError } = await supabase.from("tech_stock").insert({
          technician_email: techEmail,
          assigned_parts: mergedParts,
        });
        if (insertError) {
          console.error("[return-part] Tech stock insert error:", insertError);
          return NextResponse.json({ error: `Failed to create technician stock: ${insertError.message}` }, { status: 500 });
        }
      } else {
        const { error: updateError } = await supabase
          .from("tech_stock")
          .update({ assigned_parts: mergedParts })
          .eq("id", primaryRow.id);
        if (updateError) {
          console.error("[return-part] Tech stock update error:", updateError);
          return NextResponse.json({ error: `Failed to update technician stock: ${updateError.message}` }, { status: 500 });
        }
      }
    } else {
      return NextResponse.json({ error: `Unknown bucket: ${target_bucket}. Use "soltrack", "client", or "technician".` }, { status: 400 });
    }

    // ── Remove the part from job_cards.parts_required ──
    const { data: jobCard } = await supabase
      .from("job_cards")
      .select("parts_required")
      .eq("id", jobId)
      .single();

    const currentParts = Array.isArray(jobCard?.parts_required) ? jobCard.parts_required : [];
    const filteredParts = currentParts.filter((p: any) => {
      const pSerial = normalizeToken(p?.serial_number);
      const pStockId = normalizeToken(p?.stock_id);
      if (normalizedSerial && pSerial && normalizedSerial === pSerial) return false;
      if (normalizedStockId && pStockId && normalizedStockId === pStockId) return false;
      return true;
    });

    if (filteredParts.length < currentParts.length) {
      await supabase
        .from("job_cards")
        .update({
          parts_required: filteredParts,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", jobId);
    }

    return NextResponse.json({
      success: true,
      message: `Part returned to ${bucket} stock successfully`,
      removed_from_parts_required: currentParts.length - filteredParts.length,
    });
  } catch (error) {
    console.error("[return-part] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
