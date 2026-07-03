import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/EmptyState";
import { PosterCard } from "@/components/PosterCard";
import { getMovies } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function MoviesPage() {
  const { data: movies, stale } = await getMovies();
  return (
    <>
      <AppHeader active="movies" stale={stale} />
      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-primary md:text-[1.75rem]">Phim lẻ</h1>
            <p className="mt-1 text-sm text-secondary">{movies.length.toLocaleString("vi-VN")} phim</p>
          </div>
        </div>
        {movies.length ? (
          <div className="poster-grid">
            {movies.map((movie) => (
              <PosterCard key={movie.id} item={movie} href={`/movies/${movie.id}`} />
            ))}
          </div>
        ) : (
          <EmptyState title="Chưa có phim lẻ" detail="Radarr chưa trả về phim nào trong thư viện." />
        )}
      </main>
    </>
  );
}
