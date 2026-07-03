import Link from "next/link";

export function AppHeader({ active = "movies", stale = false }) {
  return (
    <header className="sticky top-0 z-20 border-b border-subtle bg-base/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="text-lg font-semibold tracking-normal text-primary">
          VietArr
        </Link>
        <nav className="flex items-center gap-2 rounded-full border border-subtle bg-raised p-1 text-sm">
          <Link className={`rounded-full px-3 py-1.5 ${active === "movies" ? "bg-overlay text-primary" : "text-secondary"}`} href="/">
            Phim lẻ
          </Link>
          <Link className={`rounded-full px-3 py-1.5 ${active === "series" ? "bg-overlay text-primary" : "text-secondary"}`} href="/series">
            Phim bộ
          </Link>
        </nav>
      </div>
      {stale ? (
        <div className="border-t border-danger/30 bg-danger/10 px-4 py-2 text-center text-sm text-danger">
          Không kết nối được nguồn dữ liệu — đang dùng cache.
        </div>
      ) : null}
    </header>
  );
}
