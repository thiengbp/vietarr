import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { PosterCard } from "@/components/PosterCard";

function LibrarySection({ section }) {
  if (!section.cards.length) return null;

  return (
    <section className="home-section home-library" aria-labelledby={section.id}>
      <header className="home-section__head">
        <div>
          <h2 id={section.id}>{section.title}</h2>
          <p>{section.description}</p>
        </div>
        <Link href={section.href} aria-label={section.linkLabel} className="home-section__link">
          Xem tất cả <span aria-hidden="true">→</span>
        </Link>
      </header>
      <div className="poster-grid">
        {section.cards.map(({ item, href }) => (
          <PosterCard key={item.id} item={item} href={href} showStatus={false} />
        ))}
      </div>
    </section>
  );
}

export function HomeLibrary({ sections, empty }) {
  if (empty) {
    return (
      <section className="home-section home-library" aria-labelledby="library-title">
        <h2 id="library-title" className="sr-only">Thư viện của anh</h2>
        <EmptyState
          title="Chưa có nội dung sẵn sàng"
          detail="Phim lẻ và phim bộ sẽ xuất hiện tại đây sau khi có file để xem."
        />
      </section>
    );
  }

  return sections.map((section) => <LibrarySection key={section.id} section={section} />);
}
