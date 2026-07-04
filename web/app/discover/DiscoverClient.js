"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RequestButton } from "@/components/RequestButton";
import { Toast } from "@/components/Toast";
import { apiFetch } from "@/lib/clientApi";
import { useWebSocket } from "@/hooks/useWebSocket";

function yearLabel(item) {
  return item.year || "—";
}

function itemKey(item) {
  return `${item.type || "movie"}-${item.tmdbId}`;
}

export function DiscoverClient() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [states, setStates] = useState({});
  const [qualityProfiles, setQualityProfiles] = useState([]);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (q = query) => {
    setLoading(true);
    setError("");
    try {
      const path = q.trim() ? `/discover/search?q=${encodeURIComponent(q.trim())}` : "/discover/trending";
      const data = await apiFetch(path);
      setItems(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load("");
  }, [load]);

  useEffect(() => {
    apiFetch("/quality-profiles?type=movie")
      .then(setQualityProfiles)
      .catch((err) => setError(err.message));
  }, []);

  useWebSocket({
    onEvent: (event) => {
      if (!["grab", "progress", "import"].includes(event.type)) return;
      setStates((current) => ({
        ...current,
        [event.mediaId]: {
          status: event.data?.status || (event.type === "import" ? "available" : "downloading"),
          progress: event.data?.progress ?? current[event.mediaId]?.progress ?? 0,
          title: event.data?.title
        }
      }));
      if (event.type === "import") {
        setToast(`${event.data?.title || "Phim"} đã tải xong`);
      }
    }
  });

  const byTitle = useMemo(() => {
    const map = {};
    for (const [mediaId, state] of Object.entries(states)) {
      if (state.title) map[state.title.toLowerCase()] = { mediaId, state };
    }
    return map;
  }, [states]);

  function onRequested(item, result) {
    setStates((current) => ({
      ...current,
      [result.mediaId]: { status: result.status, progress: 0, title: item.title },
      [itemKey(item)]: { status: result.status, progress: 0, mediaId: result.mediaId, title: item.title }
    }));
  }

  function stateFor(item) {
    const local = states[itemKey(item)];
    if (local?.mediaId && states[local.mediaId]) return states[local.mediaId];
    return local || byTitle[item.title.toLowerCase()]?.state || null;
  }

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary md:text-[1.75rem]">Khám phá</h1>
          <p className="mt-1 text-sm text-secondary">TMDB tiếng Việt · {items.length.toLocaleString("vi-VN")} kết quả</p>
        </div>
        <form className="flex gap-2 md:w-[420px]" onSubmit={(event) => { event.preventDefault(); load(query); }}>
          <input className="min-w-0 flex-1 rounded-md border border-subtle bg-raised px-3 py-2 text-primary" placeholder="Tìm phim" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="rounded-md bg-overlay px-4 py-2 text-sm font-semibold text-primary" type="submit">
            Tìm
          </button>
        </form>
      </div>

      {error ? <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div> : null}
      {loading ? <div className="text-sm text-secondary">Đang tải...</div> : null}
      {!loading && !items.length ? <div className="rounded-lg border border-subtle bg-raised p-6 text-sm text-secondary">Không có kết quả.</div> : null}

      <div className="poster-grid">
        {items.map((item) => (
          <article key={itemKey(item)} className="min-w-0">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-subtle bg-raised">
              {item.posterUrl ? <img className="h-full w-full object-cover" src={item.posterUrl} alt="" loading="lazy" /> : <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted">{item.title}</div>}
            </div>
            <div className="mt-2">
              <h3 className="line-clamp-2 min-h-10 text-sm font-medium text-primary">{item.title}</h3>
              <p className="mt-0.5 text-xs text-secondary">{yearLabel(item)}</p>
              <RequestButton item={item} state={stateFor(item)} onRequested={onRequested} qualityProfiles={qualityProfiles} />
            </div>
          </article>
        ))}
      </div>
      <Toast message={toast} onClose={() => setToast("")} />
    </main>
  );
}
