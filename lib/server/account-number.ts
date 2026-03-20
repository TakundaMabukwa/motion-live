function normalizeCostCodeSource(value: unknown) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function buildBasePrefix(companyName: unknown) {
  const normalized = normalizeCostCodeSource(companyName);
  return (normalized || "CLNT").slice(0, 4).padEnd(4, "X");
}

function extractPrefixFromCostCode(costCode: unknown) {
  const raw = String(costCode || "").trim().toUpperCase();
  const [prefix] = raw.split("-");
  return prefix || "";
}

function buildCandidatePrefixes(companyName: unknown) {
  const normalized = normalizeCostCodeSource(companyName) || "CLNT";
  const padded = normalized.padEnd(4, "X");
  const candidates = new Set<string>();

  const pushCandidate = (value: string) => {
    const candidate = value.slice(0, 4).padEnd(4, "X");
    if (/^[A-Z0-9]{4}$/.test(candidate)) {
      candidates.add(candidate);
    }
  };

  pushCandidate(padded);

  for (let start = 0; start <= padded.length - 4; start += 1) {
    pushCandidate(padded.slice(start, start + 4));
  }

  for (let i = 3; i < padded.length; i += 1) {
    pushCandidate(`${padded[0]}${padded[1]}${padded[2]}${padded[i]}`);
  }

  for (let i = 2; i < padded.length; i += 1) {
    for (let j = i + 1; j < padded.length; j += 1) {
      pushCandidate(`${padded[0]}${padded[1]}${padded[i]}${padded[j]}`);
    }
  }

  for (let i = 1; i < padded.length; i += 1) {
    for (let j = i + 1; j < padded.length; j += 1) {
      for (let k = j + 1; k < padded.length; k += 1) {
        pushCandidate(`${padded[0]}${padded[i]}${padded[j]}${padded[k]}`);
      }
    }
  }

  const basePrefix = buildBasePrefix(companyName);
  for (let n = 0; n < 1296; n += 1) {
    const suffix = n.toString(36).toUpperCase().padStart(2, "0");
    pushCandidate(`${basePrefix.slice(0, 2)}${suffix}`);
  }

  return [...candidates];
}

export function buildAccountPreview(companyName: unknown) {
  const normalized = normalizeCostCodeSource(companyName);
  if (!normalized) return "";
  return `${normalized.slice(0, 4).padEnd(4, "X")}-0001`;
}

export async function allocateNewCustomerAccountNumber(
  supabase: any,
  companyName: string,
) {
  const { data, error } = await supabase
    .from("cost_centers")
    .select("cost_code");

  if (error) {
    throw new Error(`Failed to inspect existing cost codes: ${error.message}`);
  }

  const usedPrefixes = new Set(
    (data || [])
      .map((row: Record<string, unknown>) =>
        extractPrefixFromCostCode(row.cost_code),
      )
      .filter(Boolean),
  );

  const candidatePrefix =
    buildCandidatePrefixes(companyName).find((prefix) => !usedPrefixes.has(prefix)) ||
    null;

  if (!candidatePrefix) {
    throw new Error("Unable to allocate a unique account prefix");
  }

  return `${candidatePrefix}-0001`;
}
