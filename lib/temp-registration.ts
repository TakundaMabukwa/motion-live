export function buildTemporaryRegistration(...parts: Array<unknown>) {
  const seed = parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join("|");

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000;
  }

  const numeric = String(hash || 1).padStart(5, "0");
  return `TEMP${numeric}`;
}
