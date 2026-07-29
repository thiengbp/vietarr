"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/clientApi";

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "Không rõ dung lượng";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toLocaleString("vi-VN", { maximumFractionDigits: index > 2 ? 1 : 0 })} ${units[index]}`;
}

function peerLabel(release) {
  const seeders = release.seeders == null ? "?" : release.seeders.toLocaleString("vi-VN");
  const leechers = release.leechers == null ? "?" : release.leechers.toLocaleString("vi-VN");
  return `${seeders} seed · ${leechers} peer`;
}

function providerStatusLabel(status) {
  if (status === "ok") return "Sẵn sàng";
  if (status === "degraded") return "Chập chờn";
  return "Không khả dụng";
}

function providerStatusTone(status) {
  if (status === "ok") return "border-success/30 text-success";
  if (status === "degraded") return "border-accent/30 text-accent";
  return "border-danger/30 text-danger";
}

export function ReleasePicker({ item, qualityProfileId, onClose, onRequested }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const busyRef = useRef("");
  const [releases, setReleases] = useState([]);
  const [providers, setProviders] = useState([]);
  const [partial, setPartial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const isSeries = item.type === "series";
  busyRef.current = busyId;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setReleases([]);
    setProviders([]);
    setPartial(false);
    apiFetch(`/discover/${encodeURIComponent(item.tmdbId)}/releases?type=${encodeURIComponent(item.type || "movie")}`)
      .then((data) => {
        if (!active) return;
        const results = data.results || [];
        setReleases(results);
        setPartial(Boolean(data.partial));
        setProviders(Array.isArray(data.providers) ? data.providers : [{
          id: "legacy",
          label: data.source || "Nguồn tải",
          status: "ok",
          count: results.length,
          latencyMs: 0
        }]);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [item.tmdbId, item.type]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]), a[href], select:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [onClose]);

  async function copyMagnet(release) {
    setNotice("");
    try {
      await navigator.clipboard.writeText(release.magnetUrl);
      setNotice(`Đã sao chép magnet của ${release.title}`);
    } catch (_copyError) {
      setNotice("Không thể sao chép tự động; hãy mở liên kết Magnet.");
    }
  }

  async function requestRelease(release) {
    setBusyId(release.id);
    setError("");
    try {
      const result = await apiFetch("/request/release", {
        method: "POST",
        body: {
          tmdbId: item.tmdbId,
          type: item.type || "movie",
          qualityProfileId: Number(qualityProfileId),
          releaseId: release.id
        }
      });
      onRequested(item, result);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  async function requestAutomatic() {
    setBusyId("automatic");
    setError("");
    try {
      const result = await apiFetch("/request", {
        method: "POST",
        body: { tmdbId: item.tmdbId, type: item.type || "movie", qualityProfileId: Number(qualityProfileId) }
      });
      onRequested(item, result);
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busyId) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-picker-title"
        aria-describedby="release-picker-description"
        aria-busy={loading || Boolean(busyId)}
        tabIndex={-1}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-subtle bg-raised shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent sm:max-w-4xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-subtle px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="release-picker-title" className="truncate text-lg font-semibold text-primary sm:text-xl">Chọn nguồn tải</h2>
            <p id="release-picker-description" className="mt-1 line-clamp-2 text-sm text-secondary">{item.title} · {item.year || "Không rõ năm"}</p>
          </div>
          <button
            type="button"
            aria-label="Đóng danh sách nguồn tải"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-subtle bg-overlay text-xl text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            disabled={Boolean(busyId)}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="shrink-0 border-b border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger sm:px-6"
          >
            {error}
          </div>
        ) : null}

        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          <p className="mb-3 text-xs text-secondary">Kết quả tổng hợp từ các nguồn đã cấu hình. Chỉ tải nội dung anh có quyền sử dụng.</p>

          {!loading && providers.length ? (
            <div className="mb-4 flex flex-wrap gap-2" aria-label="Trạng thái nguồn tải">
              {providers.map((provider) => (
                <span
                  key={provider.id}
                  title={provider.message || undefined}
                  className={`rounded-full border px-2.5 py-1 text-xs ${providerStatusTone(provider.status)}`}
                >
                  {provider.label}: {providerStatusLabel(provider.status)}{provider.status === "ok" ? ` · ${provider.count || 0}` : ""}
                </span>
              ))}
            </div>
          ) : null}

          {!loading && partial ? (
            <div role="status" className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
              Một số nguồn đang không khả dụng. Danh sách bên dưới là kết quả một phần.
            </div>
          ) : null}

          {loading ? <div className="rounded-xl border border-subtle bg-overlay p-5 text-sm text-secondary">Đang tìm trên các nguồn tải…</div> : null}
          {!loading && !releases.length && !error ? (
            <div className="rounded-xl border border-subtle bg-overlay p-5 text-sm text-secondary">
              {partial ? "Các nguồn còn hoạt động chưa tìm thấy release phù hợp." : "Chưa tìm thấy release phù hợp."}
            </div>
          ) : null}

          <div className="space-y-3">
            {releases.map((release) => (
              <article key={release.id} className="rounded-xl border border-subtle bg-overlay p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-medium leading-6 text-primary">{release.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-secondary">
                      <span className="rounded-full border border-subtle px-2 py-1 text-primary">{release.quality}</span>
                      <span className="rounded-full border border-subtle px-2 py-1">{formatBytes(release.sizeBytes)}</span>
                      <span className={`rounded-full border px-2 py-1 ${release.seeders > 0 ? "border-success/30 text-success" : "border-danger/30 text-danger"}`}>{peerLabel(release)}</span>
                      <span className="rounded-full border border-subtle px-2 py-1">{(release.sources || [release.source]).join(" · ")}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <a
                      href={release.magnetUrl}
                      aria-label={`Mở magnet ${release.title}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-md border border-subtle px-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      Magnet
                    </a>
                    <button
                      type="button"
                      aria-label={`Sao chép magnet ${release.title}`}
                      className="min-h-11 rounded-md border border-subtle px-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      onClick={() => copyMagnet(release)}
                    >
                      Sao chép
                    </button>
                    {!isSeries ? (
                      <button
                        type="button"
                        aria-label={`Tải release ${release.title}`}
                        className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-overlay disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={Boolean(busyId) || release.seeders === 0}
                        onClick={() => requestRelease(release)}
                      >
                        {busyId === release.id ? "Đang gửi…" : release.seeders === 0 ? "Không có seed" : "Tải bản này"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div aria-live="polite" aria-atomic="true" className="mt-3 min-h-5 text-sm text-success">{notice}</div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-subtle px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {isSeries ? (
            <p className="text-xs text-secondary">Phim bộ hiện hỗ trợ mở hoặc sao chép Magnet; tải tự động sẽ được bổ sung sau.</p>
          ) : (
            <>
              <p className="text-xs text-secondary">Không muốn chọn thủ công? Radarr có thể tự ưu tiên theo profile.</p>
              <button
                type="button"
                className="min-h-11 rounded-md border border-subtle bg-overlay px-4 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                disabled={Boolean(busyId)}
                onClick={requestAutomatic}
              >
                {busyId === "automatic" ? "Đang gửi…" : "Để Radarr tự chọn"}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}
