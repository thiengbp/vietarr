import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { HomeDiscoverShelf } from "@/components/HomeDiscoverShelf";
import { HomeHero } from "@/components/HomeHero";
import { MediaRail } from "@/components/MediaRail";
import { PosterCard } from "@/components/PosterCard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { getMovies } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const { data: movies, stale } = await getMovies();
  const availableMovies = movies.filter((movie) => movie.status === "available");
  const activityMovies = movies.filter((movie) => movie.status !== "available");
  const heroMovie = availableMovies.find((movie) => movie.backdropUrl) || availableMovies[0] || null;

  return (
    <>
      <AppHeader active="home" stale={stale} immersive={Boolean(heroMovie)} />
      <main className="home-page">
        {heroMovie ? (
          <HomeHero movie={heroMovie} />
        ) : (
          <section className="home-empty-hero">
            <div>
              <h1>Thư viện đang chờ phim đầu tiên</h1>
              <p>Khám phá một phim anh có quyền truy cập, rồi gửi sang hàng tải.</p>
              <a className="home-button home-button--primary" href="/discover">Khám phá phim</a>
            </div>
          </section>
        )}

        <div className="home-shell">
          <RecentlyViewed movies={availableMovies} />
          <MediaRail
            id="activity-title"
            title="Đang tải và chờ"
            description="Các phim chưa sẵn sàng sẽ ở đây, tách khỏi thư viện xem được."
            items={activityMovies}
          />
          <HomeDiscoverShelf />

          <section className="home-section home-library" aria-labelledby="library-title">
            <header className="home-section__head">
              <div>
                <h2 id="library-title">Thư viện của anh</h2>
                <p>{availableMovies.length.toLocaleString("vi-VN")} phim sẵn sàng để xem.</p>
              </div>
            </header>
            {availableMovies.length ? (
              <div className="poster-grid">
                {availableMovies.map((movie) => (
                  <PosterCard key={movie.id} item={movie} href={`/movies/${movie.id}`} showStatus={false} />
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có phim sẵn sàng" detail="Phim đang tải hoặc chưa có file được hiển thị ở vùng hoạt động phía trên." />
            )}
          </section>

          <footer className="home-footer">
            <p>VietArr · Thư viện từ Radarr · Khám phá từ TMDB</p>
          </footer>
        </div>
      </main>
    </>
  );
}
