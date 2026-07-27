"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/clientApi";

export function RequestButton({ item, state, onRequested, qualityProfiles = null }) {
  const [profiles, setProfiles] = useState(qualityProfiles || []);
  const [profileId, setProfileId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (qualityProfiles) {
      setProfiles(qualityProfiles);
      setProfileId(String(qualityProfiles[0]?.id || ""));
      return undefined;
    }
    let active = true;
    apiFetch(`/quality-profiles?type=${encodeURIComponent(item.type || "movie")}`)
      .then((rows) => {
        if (!active) return;
        setProfiles(rows);
        setProfileId(String(rows[0]?.id || ""));
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [item.type, qualityProfiles]);

  async function requestMedia() {
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch("/request", {
        method: "POST",
        body: { tmdbId: item.tmdbId, type: item.type || "movie", qualityProfileId: Number(profileId) }
      });
      onRequested?.(item, result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const progress = state?.progress ?? 0;
  const queued = state?.status === "queued" || state?.status === "searching";
  const downloading = state?.status === "downloading";
  const available = state?.status === "available";
  const terminalError = state?.status === "not_found" || state?.status === "failed";
  const canRequest = !queued && !downloading && !available;

  return (
    <div className="mt-3 space-y-2">
      {queued ? (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-overlay">
            <div className="h-full w-1/4 animate-pulse bg-info" />
          </div>
          <p className="mt-1 text-xs text-info">Đang tìm nguồn tải...</p>
        </div>
      ) : null}
      {downloading ? (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-overlay">
            <div className="h-full bg-info transition-all" style={{ width: `${Math.max(3, progress)}%` }} />
          </div>
          <p className="mt-1 text-xs text-info">{progress}% · Đang tải</p>
          {state?.eta ? <p className="mt-1 text-xs text-secondary">Còn khoảng {state.eta}</p> : null}
        </div>
      ) : null}
      {available ? <p className="text-xs text-success">Đã tải xong</p> : null}
      {terminalError ? <p className="text-xs text-danger">{state?.error || (state.status === "not_found" ? "Không tìm thấy nguồn phù hợp" : "Tải phim thất bại")}</p> : null}
      {canRequest ? (
        <div className="flex gap-2">
          <select
            className="min-w-0 flex-1 rounded-md border border-subtle bg-overlay px-2 py-2 text-xs text-primary"
            value={profileId}
            onChange={(event) => setProfileId(event.target.value)}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <button
            className="rounded-md bg-accent px-3 py-2 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            disabled={busy || !profileId}
            onClick={requestMedia}
          >
            {busy ? "..." : "Tải"}
          </button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {!terminalError && state?.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </div>
  );
}
