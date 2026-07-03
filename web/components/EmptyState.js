export function EmptyState({ title = "Thư viện trống", detail = "Chưa có nội dung để hiển thị." }) {
  return (
    <div className="mx-auto flex min-h-[320px] max-w-md flex-col items-center justify-center text-center">
      <div className="mb-5 aspect-[2/3] w-28 rounded-xl border border-subtle bg-raised shadow-poster">
        <div className="m-3 h-4 rounded-full bg-overlay" />
        <div className="mx-3 mt-20 h-3 rounded-full bg-overlay" />
        <div className="mx-3 mt-3 h-3 w-2/3 rounded-full bg-overlay" />
      </div>
      <h2 className="text-xl font-semibold text-primary">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-secondary">{detail}</p>
    </div>
  );
}
