"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReleasePicker } from "@/components/ReleasePicker";
import { RequestButton } from "@/components/RequestButton";
import { Toast } from "@/components/Toast";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiFetch } from "@/lib/clientApi";

const TERMINAL_STATUSES = new Set(["available", "failed", "not_found"]);

export function MovieDownloadAction({ movie }) {
  const router = useRouter();
  const item = useMemo(() => ({
    tmdbId: movie.tmdbId,
    type: "movie",
    title: movie.title,
    year: movie.year
  }), [movie.tmdbId, movie.title, movie.year]);
  const [state, setState] = useState({ status: movie.status, progress: 0 });
  const [picker, setPicker] = useState(null);
  const [toast, setToast] = useState("");

  const closePicker = useCallback(() => setPicker(null), []);
  const chooseSource = useCallback((selectedItem, qualityProfileId) => {
    setPicker({ item: selectedItem, qualityProfileId });
  }, []);

  useWebSocket({
    onEvent: (event) => {
      if (!event.mediaId || ![movie.id, state.mediaId].includes(event.mediaId)) return;
      if (!["grab", "progress", "import"].includes(event.type)) return;
      const status = event.data?.status || (event.type === "import" ? "available" : "downloading");
      setState((current) => ({
        ...current,
        status,
        progress: event.data?.progress ?? current.progress ?? 0,
        error: event.data?.error || ""
      }));
      if (status === "available") {
        setToast(`${movie.title} đã tải xong`);
        router.refresh();
      }
    }
  });

  useEffect(() => {
    if (!state.requestId || TERMINAL_STATUSES.has(state.status)) return undefined;
    let active = true;
    let timer;

    async function pollProgress() {
      try {
        const progress = await apiFetch(`/request/${encodeURIComponent(state.requestId)}/progress`);
        if (!active) return;
        setState((current) => ({ ...current, ...progress, error: progress.error || "" }));
        if (progress.status === "available") {
          setToast(`${movie.title} đã tải xong`);
          router.refresh();
          return;
        }
      } catch (error) {
        if (!active) return;
        setState((current) => ({ ...current, error: error.message }));
      }
      timer = window.setTimeout(pollProgress, 5000);
    }

    void pollProgress();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [movie.title, router, state.requestId, state.status]);

  function onRequested(_item, result) {
    setState({
      status: result.status,
      progress: 0,
      requestId: result.requestId,
      mediaId: result.mediaId,
      error: ""
    });
    setToast("Đã gửi phim sang Radarr");
  }

  if (!movie.tmdbId) {
    return (
      <div className="rounded-xl border border-subtle bg-raised/95 px-4 py-3 text-sm text-secondary">
        Phim chưa có mã TMDB nên chưa thể tìm nguồn tải tự động.
      </div>
    );
  }

  return (
    <>
      <section className="max-w-xl rounded-xl border border-accent/30 bg-raised/95 p-4 shadow-poster" aria-labelledby="movie-download-title">
        <h2 id="movie-download-title" className="text-base font-semibold text-primary">Tải phim này</h2>
        <p className="mt-1 text-sm leading-6 text-secondary">Chọn chất lượng, sau đó chọn nguồn torrent phù hợp. Tiến độ tải sẽ cập nhật ngay tại đây.</p>
        <RequestButton item={item} state={state} onChooseSource={chooseSource} buttonLabel="Tải về" />
      </section>
      {picker ? (
        <ReleasePicker
          item={picker.item}
          qualityProfileId={picker.qualityProfileId}
          onClose={closePicker}
          onRequested={onRequested}
        />
      ) : null}
      <Toast message={toast} onClose={() => setToast("")} />
    </>
  );
}
