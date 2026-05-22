type CompleteTechJobResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

const parseArrayField = (value: unknown): Array<Record<string, unknown>> => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    );
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parseArrayField(parsed) : [];
    } catch {
      return [];
    }
  }
  return [];
};

const getStockIdToken = (item: Record<string, unknown>) =>
  String(item.stock_id ?? item.id ?? "").trim();

const getBootStockPendingTransfer = (equipmentUsed: unknown) =>
  parseArrayField(equipmentUsed)
    .filter((item) => {
      const source = String(item.source || "");
      const rowId = String(item.row_id || "").trim();
      if (source !== "tech_stock.assigned_parts" || !rowId) return false;
      return item.boot_transfer_pending !== false;
    })
    .map((item) => ({
      row_id: String(item.row_id || "").trim(),
      stock_id: getStockIdToken(item) || "",
      code: item.code || "",
      description: item.description || "",
      supplier: item.supplier || "",
      stock_type: item.stock_type || "",
      serial_number: String(item.serial_number || item.serialNumber || "").trim(),
      ip_address: String(item.ip_address || item.ipAddress || "").trim(),
      quantity: 1,
      available_stock:
        parseInt(String(item.available_stock ?? item.quantity ?? "0"), 10) || 0,
      selected_at: item.selected_at || new Date().toISOString(),
      source: "tech_stock.assigned_parts",
    }));

export type CompleteTechJobOptions = {
  completion_notes?: string | null;
  after_photos?: string[];
  before_photos?: string[];
};

export async function completeTechJobCard(
  jobId: string,
  options: CompleteTechJobOptions = {},
): Promise<CompleteTechJobResult> {
  if (!jobId) {
    return { ok: false, error: "Missing job id" };
  }

  let workingJob: Record<string, unknown> = {};
  try {
    const fetchResponse = await fetch(`/api/job-cards/${jobId}`, {
      cache: "no-store",
    });
    if (fetchResponse.ok) {
      workingJob = (await fetchResponse.json()) as Record<string, unknown>;
    }
  } catch {
    // Continue with completion even if refresh fails.
  }

  const bootStockToTransfer = getBootStockPendingTransfer(workingJob.equipment_used);
  if (bootStockToTransfer.length > 0) {
    const transferResponse = await fetch(`/api/job-cards/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        equipment_used: bootStockToTransfer,
        transfer_equipment_from_assigned_parts: true,
      }),
    });

    if (!transferResponse.ok) {
      const errorData = await transferResponse.json().catch(() => ({}));
      return {
        ok: false,
        error: String(
          errorData?.error ||
            errorData?.details ||
            "Failed to transfer boot stock on job completion",
        ),
      };
    }
  }

  const completionPayload: Record<string, unknown> = {
    status: "completed",
    job_status: "completed",
    role: "admin",
    completion_date: new Date().toISOString(),
    end_time: new Date().toISOString(),
  };

  if (options.completion_notes !== undefined) {
    completionPayload.completion_notes = options.completion_notes;
  }

  const isStoredPhotoUrl = (value: string) =>
    /^https?:\/\//i.test(value) || value.startsWith("/");

  if (Array.isArray(options.after_photos) && options.after_photos.length > 0) {
    const storedAfterPhotos = options.after_photos.filter(
      (url) => typeof url === "string" && isStoredPhotoUrl(url),
    );
    if (storedAfterPhotos.length > 0) {
      completionPayload.after_photos = storedAfterPhotos;
    }
  }

  if (Array.isArray(options.before_photos) && options.before_photos.length > 0) {
    const storedBeforePhotos = options.before_photos.filter(
      (url) => typeof url === "string" && isStoredPhotoUrl(url),
    );
    if (storedBeforePhotos.length > 0) {
      completionPayload.before_photos = storedBeforePhotos;
    }
  }

  const completeResponse = await fetch(`/api/job-cards/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(completionPayload),
  });

  if (!completeResponse.ok) {
    const errorData = await completeResponse.json().catch(() => ({}));
    return {
      ok: false,
      error: String(
        errorData?.error ||
          errorData?.details ||
          `Failed to complete job: ${completeResponse.status}`,
      ),
    };
  }

  return { ok: true, data: await completeResponse.json() };
}
