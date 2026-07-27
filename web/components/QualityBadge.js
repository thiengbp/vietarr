export function QualityBadge({ quality }) {
  if (!quality) return null;
  const isPremium = /4k|remux|2160/i.test(quality);
  return (
    <span className="quality-badge" data-premium={isPremium ? "true" : "false"}>
      {quality}
    </span>
  );
}
