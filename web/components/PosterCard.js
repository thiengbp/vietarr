import Image from "next/image";
import Link from "next/link";
import { QualityBadge } from "./QualityBadge";
import { StatusBadge } from "./StatusBadge";

export function PosterCard({ item, href, showStatus = true }) {
  return (
    <Link href={href} className="poster-card">
      <div className="poster-card__media">
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt=""
            className="poster-card__image"
            fill
            sizes="(min-width: 75rem) 14vw, (min-width: 48rem) 20vw, 33vw"
          />
        ) : (
          <div className="poster-card__fallback">
            {item.title}
          </div>
        )}
        <div className="poster-card__badges">
          {showStatus ? <StatusBadge status={item.status} /> : null}
          <QualityBadge quality={item.quality} />
        </div>
      </div>
      <div className="poster-card__meta">
        <h3>{item.title}</h3>
        <p>{item.year || "—"}</p>
      </div>
    </Link>
  );
}
