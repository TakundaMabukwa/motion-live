const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    process.env[key] = value;
  }
}

loadEnvFile(path.resolve(process.cwd(), ".env.local"));

const workbookPath = path.resolve(process.cwd(), process.argv[2] || "Book1.xlsx");
const dryRun = !process.argv.includes("--write");
const minScoreArg = process.argv.find((arg) => arg.startsWith("--min-score="));
const minScore = minScoreArg ? Number(minScoreArg.split("=")[1]) : null;
const aliasConfigPath = path.resolve(
  process.cwd(),
  "scripts",
  "cost-center-name-aliases.json",
);

if (!fs.existsSync(workbookPath)) {
  console.error(`Workbook not found: ${workbookPath}`);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function loadAliasConfig() {
  if (!fs.existsSync(aliasConfigPath)) {
    return { phraseAliases: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(aliasConfigPath, "utf8"));
    return {
      phraseAliases: Array.isArray(parsed?.phraseAliases)
        ? parsed.phraseAliases
        : [],
    };
  } catch (error) {
    console.warn(`Failed to parse alias config at ${aliasConfigPath}: ${error.message}`);
    return { phraseAliases: [] };
  }
}

const aliasConfig = loadAliasConfig();
const PHRASE_ALIASES = aliasConfig.phraseAliases;

function applyAliases(value) {
  let output = String(value || "");
  for (const [fromValue, toValue] of PHRASE_ALIASES) {
    const pattern = new RegExp(
      fromValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "g",
    );
    output = output.replace(pattern, toValue);
  }
  return output;
}

function normalize(value) {
  return applyAliases(String(value || ""))
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/\(PTY\)\s*LTD/g, " PTY LTD ")
    .replace(/\bCC\b/g, " CC ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripNoise(value) {
  return normalize(value)
    .replace(/\bACC CLOSED\b/g, " ")
    .replace(/\bCANCELLED\b/g, " ")
    .replace(/\bHANDED OVER\b/g, " ")
    .replace(/\bW OFF\b/g, " ")
    .replace(/\bWOFF\b/g, " ")
    .replace(/\bPRIVATE\b/g, " ")
    .replace(/\bSOLE PROP\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value) {
  return new Set(
    stripNoise(value)
      .split(" ")
      .map((part) => part.trim())
      .filter((part) => part && part.length > 1),
  );
}

function jaccardScore(left, right) {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (!leftTokens.size || !rightTokens.size) return 0;

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union ? intersection / union : 0;
}

function buildVariants(value) {
  const variants = new Set();
  const raw = String(value || "").trim();
  if (!raw) return [];

  variants.add(normalize(raw));
  variants.add(stripNoise(raw));

  const normalized = normalize(raw);
  variants.add(normalized.replace(/\bPTY LTD\b/g, " ").replace(/\s+/g, " ").trim());
  variants.add(normalized.replace(/\bLIMITED\b/g, " ").replace(/\s+/g, " ").trim());

  return Array.from(variants).filter(Boolean);
}

function scoreMatch(costCenterCompany, excelRow) {
  const leftVariants = buildVariants(costCenterCompany);
  const rightVariants = [
    ...buildVariants(excelRow.company),
    ...buildVariants(excelRow.legal_name),
  ];

  let bestScore = 0;
  let source = "none";

  for (const left of leftVariants) {
    for (const right of rightVariants) {
      if (!left || !right) continue;
      if (left === right) {
        return { score: 1, source: "exact" };
      }
      if (left && right && (left.includes(right) || right.includes(left))) {
        bestScore = Math.max(bestScore, 0.96);
        source = "contains";
      }

      const score = jaccardScore(left, right);
      if (score > bestScore) {
        bestScore = score;
        source = "token_overlap";
      }
    }
  }

  return { score: bestScore, source };
}

function mapRow(row) {
  return {
    source_entity_id: row["ENTITYID"] ? String(row["ENTITYID"]).trim() : null,
    legal_name: row["LEGAL NAME"] ? String(row["LEGAL NAME"]).trim() : null,
    contact_name: row["CONTACT"] ? String(row["CONTACT"]).trim() : null,
    company: row["COMPANY"] ? String(row["COMPANY"]).trim() : null,
    vat_number: row["VAT NUMBER"] ? String(row["VAT NUMBER"]).trim() : null,
    email: row["EMAIL"] ? String(row["EMAIL"]).trim() : null,
    registration_number: row["REGISTRATION NUMBER"]
      ? String(row["REGISTRATION NUMBER"]).trim()
      : null,
    physical_address_1: row["PHYSICAL ADDRESS 1"]
      ? String(row["PHYSICAL ADDRESS 1"]).trim()
      : null,
    physical_address_2: row["PHYSICAL ADDRESS 2"]
      ? String(row["PHYSICAL ADDRESS 2"]).trim()
      : null,
    physical_address_3: row["PHYSICAL ADDRESS 3"]
      ? String(row["PHYSICAL ADDRESS 3"]).trim()
      : null,
    physical_area: row["PHYSICAL AREA"] ? String(row["PHYSICAL AREA"]).trim() : null,
    physical_code: row["PHYSICAL CODE"] ? String(row["PHYSICAL CODE"]).trim() : null,
    postal_address_1: row["POSTAL ADDRESS 1"]
      ? String(row["POSTAL ADDRESS 1"]).trim()
      : null,
    postal_address_2: row["POSTAL ADDRESS 2"]
      ? String(row["POSTAL ADDRESS 2"]).trim()
      : null,
    postal_address_3: row["POSTAL ADDRESS 3"]
      ? String(row["POSTAL ADDRESS 3"]).trim()
      : null,
  };
}

async function loadCostCenters() {
  const { data, error } = await supabase
    .from("cost_centers")
    .select("id, company, cost_code")
    .order("cost_code", { ascending: true });

  if (error) throw error;
  return data || [];
}

function loadWorkbookRows() {
  const workbook = XLSX.readFile(workbookPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, {
    range: 4,
    defval: "",
    raw: false,
  });
}

async function main() {
  const costCenters = await loadCostCenters();
  const workbookRows = loadWorkbookRows().map(mapRow);

  const matches = [];
  const unmatched = [];

  for (const costCenter of costCenters) {
    const candidates = workbookRows
      .map((row) => {
        const match = scoreMatch(costCenter.company, row);
        return { row, ...match };
      })
      .sort((a, b) => b.score - a.score);

    const best = candidates[0];
    const second = candidates[1];
    const margin = best && second ? best.score - second.score : best?.score || 0;

    const accepted =
      best &&
      (minScore !== null
        ? best.score >= minScore
        : (best.score >= 1) ||
          (best.score >= 0.96 && margin >= 0.02) ||
          (best.score >= 0.88 && margin >= 0.08));

    if (!accepted) {
      unmatched.push({
        company: costCenter.company,
        cost_code: costCenter.cost_code,
        best_score: best?.score || 0,
        best_company: best?.row?.company || null,
      });
      continue;
    }

    matches.push({
      costCenter,
      row: best.row,
      score: best.score,
      source: best.source,
    });
  }

  console.log(
    JSON.stringify(
      {
        workbook: workbookPath,
        dryRun,
        minScore,
        costCenters: costCenters.length,
        matched: matches.length,
        unmatched: unmatched.length,
        sampleMatches: matches.slice(0, 10).map((item) => ({
          cost_code: item.costCenter.cost_code,
          cost_center_company: item.costCenter.company,
          excel_company: item.row.company,
          excel_legal_name: item.row.legal_name,
          score: item.score,
          source: item.source,
        })),
        sampleUnmatched: unmatched.slice(0, 10),
      },
      null,
      2,
    ),
  );

  if (dryRun) {
    console.log("Dry run only. Re-run with --write to update cost_centers.");
    return;
  }

  for (const match of matches) {
    const payload = {
      source_entity_id: match.row.source_entity_id,
      legal_name: match.row.legal_name,
      contact_name: match.row.contact_name,
      vat_number: match.row.vat_number,
      email: match.row.email,
      registration_number: match.row.registration_number,
      physical_address_1: match.row.physical_address_1,
      physical_address_2: match.row.physical_address_2,
      physical_address_3: match.row.physical_address_3,
      physical_area: match.row.physical_area,
      physical_code: match.row.physical_code,
      postal_address_1: match.row.postal_address_1,
      postal_address_2: match.row.postal_address_2,
      postal_address_3: match.row.postal_address_3,
      client_info_matched_at: new Date().toISOString(),
      client_info_match_score: Number(match.score.toFixed(4)),
      client_info_match_source: match.source,
    };

    const { error } = await supabase
      .from("cost_centers")
      .update(payload)
      .eq("id", match.costCenter.id);

    if (error) {
      throw new Error(
        `Failed updating ${match.costCenter.cost_code} (${match.costCenter.company}): ${error.message}`,
      );
    }
  }

  console.log(`Updated ${matches.length} cost center rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
