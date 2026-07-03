import Link from "next/link";
import { PlayMenu } from "@/components/PlayMenu";
import { QualityBadge } from "@/components/QualityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { getMovie, getPlayOptions } from "@/lib/api";

export const dynamic = "force-dynamic";

function formatBytes(value) {
  if (!value) return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1024 / 1024 / 1024) + " GB";
}

export default async function MovieDetailPage({ params }) {
  const { id } = await params;
  const [{ data: movie }, { data: options }] = await Promise.all([getMovie(id), getPlayOptions(id)]);
  const subtitleLabel = movie.subtitleStatus?.vietnamese === "available" ? "Có phụ đề Việt" : movie.subtitleStatus?.vietnamese === "missing" ? "Chưa có phụ đề Việt" : "Phụ đề chưa rõ";

  return (
    <main className="min-h-screen bg-base">
      <section className="relative min-h-[78vh] overflow-hidden">
        {movie.backdropUrl ? (
          <img src={movie.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-base/30 via-base/80 to-base" />
        <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-10 pt-5 md:flex-row md:px-6 md:pt-10">
          <div className="w-36 shrink-0 md:w-56">
            <div className="aspect-[2/3] overflow-hidden rounded-xl border border-subtle bg-raised shadow-poster">
              {movie.posterUrl ? <img src={movie.posterUrl} alt="" className="h-full w-full object-cover" /> : null}
            </div>
          </div>
          <div className="flex max-w-3xl flex-1 flex-col justify-end py-2">
            <Link href="/" className="mb-5 text-sm text-secondary hover:text-primary">
              ← Thư viện
            </Link>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status={movie.status} />
              <QualityBadge quality={movie.quality} />
              <span className="rounded-full border border-subtle bg-raised px-2 py-0.5 text-[0.7rem] font-medium text-secondary">{subtitleLabel}</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight text-primary md:text-5xl">{movie.title}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-secondary">
              <span>{movie.year || "—"}</span>
              <span>{movie.runtimeMinutes ? `${movie.runtimeMinutes} phút` : "—"}</span>
              <span>{formatBytes(movie.sizeBytes)}</span>
            </div>
            {movie.overview ? <p className="mt-5 max-w-2xl text-base leading-7 text-secondary">{movie.overview}</p> : null}
            <div className="mt-6">
              <PlayMenu options={options} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
