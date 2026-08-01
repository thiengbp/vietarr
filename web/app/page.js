import { AppHeader } from "@/components/AppHeader";
import { HomeDiscoverShelf } from "@/components/HomeDiscoverShelf";
import { HomeHero } from "@/components/HomeHero";
import { HomeLibrary } from "@/components/HomeLibrary";
import { MediaRail } from "@/components/MediaRail";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { getMovies, getSeries } from "@/lib/api";
import { buildHomeLibraryModel } from "@/lib/homeLibrary";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const [movieResult, seriesResult] = await Promise.all([getMovies(), getSeries()]);
  const model = buildHomeLibraryModel({
    movies: movieResult.data,
    series: seriesResult.data,
    movieStale: movieResult.stale,
    seriesStale: seriesResult.stale
  });

  return (
    <>
      <AppHeader active="home" stale={model.stale} immersive={Boolean(model.heroMovie)} />
      <main className="home-page">
        {model.heroMovie ? (
          <HomeHero movie={model.heroMovie} />
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
          <RecentlyViewed movies={model.availableMovies} />
          <MediaRail
            id="activity-title"
            title="Đang tải và chờ"
            description="Các phim chưa sẵn sàng sẽ ở đây, tách khỏi thư viện xem được."
            items={model.activityMovies}
          />
          <HomeDiscoverShelf />

          <HomeLibrary sections={model.sections} empty={model.empty} />

          <footer className="home-footer">
            <p>VietArr · Thư viện từ Radarr &amp; Sonarr · Khám phá từ TMDB</p>
          </footer>
        </div>
      </main>
    </>
  );
}
