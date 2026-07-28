"use client";

const COUNTRY_OPTIONS = [
  { id: "vietnam", label: "Việt Nam" },
  { id: "china", label: "Trung Quốc" },
  { id: "korea", label: "Hàn Quốc" },
  { id: "japan", label: "Nhật Bản" },
  { id: "thailand", label: "Thái Lan" },
  { id: "western", label: "Âu Mỹ" },
  { id: "other", label: "Khác" }
];

export function filterByCountry(items, value) {
  if (value === "all") return items;
  return items.filter((item) => (item.countryGroups || ["other"]).includes(value));
}

export function CountryFilter({ items, value, onChange }) {
  const options = COUNTRY_OPTIONS
    .map((option) => ({
      ...option,
      count: items.filter((item) => (item.countryGroups || ["other"]).includes(option.id)).length
    }))
    .filter((option) => option.count > 0);

  if (!items.length || !options.length) return null;

  return (
    <div className="country-filter">
      <p className="country-filter__label">Quốc gia</p>
      <div className="genre-chips" aria-label="Lọc theo quốc gia">
        <button
          aria-pressed={value === "all"}
          className="genre-chip"
          data-active={value === "all" ? "true" : "false"}
          onClick={() => onChange("all")}
          type="button"
        >
          Tất cả <span>{items.length}</span>
        </button>
        {options.map((option) => (
          <button
            aria-pressed={value === option.id}
            className="genre-chip"
            data-active={value === option.id ? "true" : "false"}
            key={option.id}
            onClick={() => onChange(option.id)}
            type="button"
          >
            {option.label} <span>{option.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
