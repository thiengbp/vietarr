"use client";

import { useMemo, useState } from "react";
import { CountryFilter, filterByCountry } from "./CountryFilter";
import { PosterCard } from "./PosterCard";

export function CountryLibraryGrid({ items, type }) {
  const [country, setCountry] = useState("all");
  const visibleItems = useMemo(() => filterByCountry(items, country), [country, items]);

  return (
    <>
      <CountryFilter items={items} value={country} onChange={setCountry} />
      <div className="poster-grid">
        {visibleItems.map((item) => (
          <PosterCard
            key={item.id}
            item={item}
            href={type === "movie" ? `/movies/${item.id}` : "/series"}
          />
        ))}
      </div>
    </>
  );
}
