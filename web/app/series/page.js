import { AppHeader } from "@/components/AppHeader";
import { CountryLibraryGrid } from "@/components/CountryLibraryGrid";
import { EmptyState } from "@/components/EmptyState";
import { getSeries } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SeriesPage() {
  const { data: series, stale } = await getSeries();
  return (
    <>
      <AppHeader active="series" stale={stale} />
      <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-6">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-primary md:text-[1.75rem]">Phim bộ</h1>
          <p className="mt-1 text-sm text-secondary">{series.length.toLocaleString("vi-VN")} bộ</p>
        </div>
        {series.length ? (
          <CountryLibraryGrid items={series} type="series" />
        ) : (
          <EmptyState
            title="Chưa có phim bộ"
            detail="Sonarr chưa có bộ nào trong thư viện. File tải rời cần được thêm hoặc import vào Sonarr trước khi VietArr hiển thị."
            actionHref="/discover"
            actionLabel="Tìm phim bộ"
          />
        )}
      </main>
    </>
  );
}
