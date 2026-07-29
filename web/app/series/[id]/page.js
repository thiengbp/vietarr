import Link from "next/link";
import { EpisodeDownloadGrid } from "@/components/EpisodeDownloadGrid";
import { PlayMenu } from "@/components/PlayMenu";
import { QualityBadge } from "@/components/QualityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { getSeriesDetail } from "@/lib/api";

export const dynamic = "force-dynamic";

function formatBytes(value) {
  if (!value) return "—";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value / 1024 / 1024 / 1024) + " GB";
}

function episodeCode(episode) {
  return `S${String(episode.seasonNumber).padStart(2, "0")}E${String(episode.episodeNumber).padStart(2, "0")}`;
}

export default async function SeriesDetailPage({ params }) {
  const { id } = await params;
  const { data: series } = await getSeriesDetail(id);
  const availableEpisodes = series.episodes.filter((episode) => episode.status === "available");
  const missingEpisodes = series.episodes.filter((episode) => episode.status !== "available");

  return (
    <main className="min-h-screen bg-base text-primary">
      <section className="relative overflow-hidden border-b border-subtle">
        {series.backdropUrl ? (
          <img src={series.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-base/35 via-base/85 to-base" />
        <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-10 pt-6 md:flex-row md:px-6 md:pb-12 md:pt-10">
          <div className="w-36 shrink-0 md:w-52">
            <div className="aspect-[2/3] overflow-hidden rounded-xl border border-subtle bg-raised shadow-poster">
              {series.posterUrl ? <img src={series.posterUrl} alt="" className="h-full w-full object-cover" /> : null}
            </div>
          </div>
          <div className="flex max-w-3xl flex-1 flex-col justify-end py-2">
            <Link href="/series" className="mb-5 w-fit text-sm text-secondary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              ← Phim bộ
            </Link>
            <div className="mb-3 flex flex-wrap gap-2">
              <StatusBadge status={series.status} />
              <QualityBadge quality={series.quality} />
            </div>
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">{series.title}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-secondary">
              <span>{series.year || "—"}</span>
              {series.network ? <span>{series.network}</span> : null}
              {series.runtimeMinutes ? <span>{series.runtimeMinutes} phút/tập</span> : null}
              <span>{series.availableCount}/{series.episodeCount} tập có file</span>
              <span>{formatBytes(series.sizeBytes)}</span>
            </div>
            {series.overview ? <p className="mt-5 max-w-2xl text-base leading-7 text-secondary">{series.overview}</p> : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 md:py-10">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold">Các tập đã tải</h2>
          <p className="mt-1 text-sm text-secondary">
            {availableEpisodes.length ? `${availableEpisodes.length} tập sẵn sàng mở từ NAS.` : "Chưa có tập nào được Sonarr import vào thư viện."}
          </p>
        </div>

        {availableEpisodes.length ? (
          <div className="grid gap-3">
            {availableEpisodes.map((episode) => (
              <article key={episode.id} className="flex flex-col gap-4 rounded-xl border border-subtle bg-raised p-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-subtle bg-overlay px-2 py-1 text-xs font-semibold text-secondary">{episodeCode(episode)}</span>
                    <QualityBadge quality={episode.quality} />
                  </div>
                  <h3 className="mt-2 font-semibold">{episode.title}</h3>
                  <p className="mt-1 text-sm text-secondary">{formatBytes(episode.sizeBytes)}{episode.airDate ? ` · ${episode.airDate}` : ""}</p>
                </div>
                <div className="shrink-0 md:max-w-[30rem]">
                  <PlayMenu options={episode.playOptions} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-subtle bg-raised px-4 py-5 text-sm text-secondary">Sonarr chưa trả về file tập nào có thể mở.</div>
        )}

        {missingEpisodes.length ? (
          <details className="mt-6 rounded-xl border border-subtle bg-raised p-4">
            <summary className="cursor-pointer font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
              {missingEpisodes.length} tập chưa tải
            </summary>
            <EpisodeDownloadGrid episodes={missingEpisodes} />
          </details>
        ) : null}
      </section>
    </main>
  );
}
