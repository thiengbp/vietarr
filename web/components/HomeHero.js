import Image from "next/image";
import Link from "next/link";

export function HomeHero({ movie }) {
  if (!movie) return null;
  const artwork = movie.backdropUrl || movie.posterUrl;
  const subtitle = movie.hasVietnameseSubtitle ? "Có phụ đề Việt" : "Phụ đề đang cập nhật";

  return (
    <section className="home-hero" aria-labelledby="home-featured-title">
      {artwork ? (
        <Image
          className="home-hero__image"
          src={artwork}
          alt=""
          fill
          priority
          sizes="100vw"
        />
      ) : null}
      <div className="home-hero__scrim" aria-hidden="true" />
      <div className="home-hero__content">
        <p className="home-hero__signal"><span aria-hidden="true" /> Sẵn sàng để xem</p>
        <h1 id="home-featured-title">{movie.title}</h1>
        <div className="home-hero__meta" aria-label="Thông tin phim">
          <span>{movie.year || "Chưa rõ năm"}</span>
          {movie.quality ? <span>{movie.quality}</span> : null}
          <span>{subtitle}</span>
        </div>
        <div className="home-hero__actions">
          <Link className="home-button home-button--primary" href={`/movies/${movie.id}`}>
            Xem ngay
          </Link>
        </div>
      </div>
    </section>
  );
}
