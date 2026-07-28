import { AppHeader } from "@/components/AppHeader";
import { CountryLibraryGrid } from "@/components/CountryLibraryGrid";
import { EmptyState } from "@/components/EmptyState";
import { getMovies } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const { data: movies, stale } = await getMovies();
  const availableCount = movies.filter((movie) => movie.status === "available").length;

  return (
    <>
      <AppHeader active="movies" stale={stale} />
      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-primary md:text-[1.75rem]">Phim lẻ</h1>
          <p className="mt-1 text-sm text-secondary">
            {movies.length.toLocaleString("vi-VN")} phim · {availableCount.toLocaleString("vi-VN")} sẵn sàng để xem
          </p>
        </div>
        {movies.length ? (
          <CountryLibraryGrid items={movies} type="movie" />
        ) : (
          <EmptyState
            title="Chưa có phim lẻ"
            detail="Radarr chưa trả về phim nào trong thư viện."
            actionHref="/discover"
            actionLabel="Khám phá phim"
          />
        )}
      </main>
    </>
  );
}
