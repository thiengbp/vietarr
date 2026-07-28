const COUNTRY_CODE_GROUPS = new Map([
  ["VN", "vietnam"],
  ["CN", "china"],
  ["HK", "china"],
  ["TW", "china"],
  ["KR", "korea"],
  ["JP", "japan"],
  ["TH", "thailand"],
  ["US", "western"],
  ["GB", "western"],
  ["CA", "western"],
  ["AU", "western"],
  ["NZ", "western"],
  ["IE", "western"]
]);

const LANGUAGE_GROUPS = new Map([
  ["vi", "vietnam"],
  ["vietnamese", "vietnam"],
  ["zh", "china"],
  ["chinese", "china"],
  ["mandarin", "china"],
  ["cantonese", "china"],
  ["ko", "korea"],
  ["korean", "korea"],
  ["ja", "japan"],
  ["japanese", "japan"],
  ["th", "thailand"],
  ["thai", "thailand"],
  ["en", "western"],
  ["english", "western"],
  ["fr", "western"],
  ["french", "western"],
  ["de", "western"],
  ["german", "western"],
  ["es", "western"],
  ["spanish", "western"],
  ["it", "western"],
  ["italian", "western"],
  ["pt", "western"],
  ["portuguese", "western"]
]);

function languageValue(originalLanguage) {
  if (typeof originalLanguage === "string") return originalLanguage;
  return originalLanguage?.name || originalLanguage?.code || "";
}

export function classifyCountryGroups({ originCountries = [], originalLanguage } = {}) {
  const codes = Array.isArray(originCountries) ? originCountries : [originCountries];
  const groups = codes
    .map((code) => COUNTRY_CODE_GROUPS.get(String(code || "").trim().toUpperCase()))
    .filter(Boolean);
  if (groups.length) return [...new Set(groups)];

  const language = languageValue(originalLanguage).trim().toLowerCase();
  return [LANGUAGE_GROUPS.get(language) || "other"];
}
