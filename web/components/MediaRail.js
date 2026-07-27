import Link from "next/link";
import { PosterCard } from "./PosterCard";

export function MediaRail({ id, title, description, items, actionHref, actionLabel = "Xem tất cả", showStatus = true }) {
  if (!items?.length) return null;

  return (
    <section className="home-section" aria-labelledby={id}>
      <header className="home-section__head">
        <div>
          <h2 id={id}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actionHref ? <Link className="home-section__link" href={actionHref}>{actionLabel} <span aria-hidden="true">→</span></Link> : null}
      </header>
      <div className="media-rail">
        {items.slice(0, 12).map((item) => (
          <div className="media-rail__item" key={item.id}>
            <PosterCard item={item} href={`/movies/${item.id}`} showStatus={showStatus} />
          </div>
        ))}
      </div>
    </section>
  );
}
