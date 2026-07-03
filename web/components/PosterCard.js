import Link from "next/link";
import { QualityBadge } from "./QualityBadge";
import { StatusBadge } from "./StatusBadge";

export function PosterCard({ item, href }) {
  return (
    <Link href={href} className="group block min-w-0">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-subtle bg-raised">
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt=""
            className="h-full w-full object-cover transition duration-150 ease-out group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-overlay px-3 text-center text-xs text-muted">
            {item.title}
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <StatusBadge status={item.status} />
          <QualityBadge quality={item.quality} />
        </div>
      </div>
      <div className="mt-2 min-w-0">
        <h3 className="truncate text-sm font-medium text-primary">{item.title}</h3>
        <p className="mt-0.5 text-xs text-secondary">{item.year || "—"}</p>
      </div>
    </Link>
  );
}
