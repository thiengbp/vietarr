import Link from "next/link";

const links = [
  { id: "home", label: "Trang chủ", href: "/" },
  { id: "movies", label: "Phim lẻ", href: "/movies" },
  { id: "series", label: "Phim bộ", href: "/series" },
  { id: "discover", label: "Khám phá", href: "/discover" },
  { id: "admin", label: "Admin", href: "/admin" }
];

export function AppHeader({ active = "home", stale = false, immersive = false }) {
  return (
    <header className={`app-header ${immersive ? "app-header--immersive" : ""}`}>
      <div className="app-header__shell">
        <Link href="/" className="app-wordmark">
          VietArr
        </Link>
        <nav className="app-nav" aria-label="Điều hướng chính">
          {links.map((link) => (
            <Link className="app-nav__link" data-active={active === link.id ? "true" : "false"} href={link.href} key={link.id}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      {stale ? (
        <div className="app-header__warning">
          Không kết nối được nguồn dữ liệu — đang dùng cache.
        </div>
      ) : null}
    </header>
  );
}
