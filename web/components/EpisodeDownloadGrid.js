"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/clientApi";

const ACTIVE_STATUSES = new Set(["sending", "queued", "downloading"]);

function episodeCode(episode) {
  return `S${String(episode.seasonNumber).padStart(2, "0")}E${String(episode.episodeNumber).padStart(2, "0")}`;
}

function buttonLabel(state) {
  if (state.status === "sending") return "Đang gửi…";
  if (state.status === "queued") return "Đang tìm nguồn…";
  if (state.status === "downloading") return `${state.progress || 0}% · Đang tải`;
  if (state.status === "available") return "Đã tải";
  if (["failed", "not_found"].includes(state.status)) return "Thử lại";
  return "Tải tập này";
}

function statusLabel(state) {
  if (state.error) return state.error;
  if (state.status === "queued") return "Sonarr đang tìm nguồn phù hợp.";
  if (state.status === "downloading") return `Đã tải ${state.progress || 0}%.`;
  if (state.status === "available") return "Tập đã tải xong.";
  return "";
}

function EpisodeDownloadButton({ episode }) {
  const router = useRouter();
  const [state, setState] = useState({ status: "idle", progress: 0, requestId: null, error: "" });

  useEffect(() => {
    if (!state.requestId || !["queued", "downloading"].includes(state.status)) return undefined;
    let active = true;
    let timer;

    async function poll() {
      try {
        const progress = await apiFetch(`/request/${encodeURIComponent(state.requestId)}/progress`);
        if (!active) return;
        setState((current) => ({ ...current, ...progress, error: progress.error || "" }));
        if (progress.status === "available") {
          router.refresh();
          return;
        }
      } catch (error) {
        if (!active) return;
        setState((current) => ({ ...current, status: "failed", error: error.message }));
        return;
      }
      timer = window.setTimeout(poll, 5000);
    }

    void poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [router, state.requestId, state.status]);

  async function requestEpisode() {
    setState({ status: "sending", progress: 0, requestId: null, error: "" });
    try {
      const result = await apiFetch("/request/episode", {
        method: "POST",
        body: { episodeId: episode.id }
      });
      setState({
        status: result.status || "queued",
        progress: 0,
        requestId: result.requestId,
        error: ""
      });
    } catch (error) {
      setState({ status: "failed", progress: 0, requestId: null, error: error.message });
    }
  }

  const busy = ACTIVE_STATUSES.has(state.status);
  const message = statusLabel(state);
  return (
    <div className="mt-3 border-t border-subtle pt-3">
      <button
        type="button"
        className="min-h-11 w-full rounded-lg border border-accent/50 bg-raised px-3 py-2 text-sm font-semibold text-primary transition hover:border-accent hover:bg-overlay focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-70"
        onClick={requestEpisode}
        disabled={busy || state.status === "available"}
        aria-describedby={`${episode.id}-download-status`}
      >
        {buttonLabel(state)}
      </button>
      <p
        id={`${episode.id}-download-status`}
        className={`mt-2 min-h-5 text-xs leading-5 ${state.error ? "text-danger" : "text-secondary"}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}

export function EpisodeDownloadGrid({ episodes }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {episodes.map((episode) => (
        <article key={episode.id} className="rounded-lg border border-subtle bg-base px-3 py-3">
          <p className="text-xs font-semibold text-secondary">{episodeCode(episode)}</p>
          <p className="mt-1 truncate text-sm">{episode.title}</p>
          <EpisodeDownloadButton episode={episode} />
        </article>
      ))}
    </div>
  );
}
