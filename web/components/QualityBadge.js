export function QualityBadge({ quality }) {
  if (!quality) return null;
  const isPremium = /4k|remux|2160/i.test(quality);
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${isPremium ? "border-[#C9A227]/40 bg-[#C9A227]/10 text-[#E5C451]" : "border-subtle bg-overlay text-secondary"}`}>
      {quality}
    </span>
  );
}
