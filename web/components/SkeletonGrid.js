export function SkeletonGrid() {
  return (
    <div className="poster-grid">
      {Array.from({ length: 21 }).map((_, index) => (
        <div key={index}>
          <div className="skeleton aspect-[2/3] rounded-xl" />
          <div className="skeleton mt-2 h-4 w-4/5 rounded" />
          <div className="skeleton mt-1 h-3 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
}
