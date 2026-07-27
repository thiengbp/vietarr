"use client";

import { useEffect, useState } from "react";
import { MediaRail } from "./MediaRail";

const STORAGE_KEY = "vietarr_recent_movies";

export function RecentlyViewed({ movies }) {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    try {
      const ids = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      const byId = new Map(movies.map((movie) => [movie.id, movie]));
      setRecent(ids.map((id) => byId.get(id)).filter(Boolean).slice(0, 10));
    } catch (_error) {
      setRecent([]);
    }
  }, [movies]);

  return (
    <MediaRail
      id="recent-title"
      title="Xem gần đây"
      description="Những phim anh vừa mở trên thiết bị này."
      items={recent}
      showStatus={false}
    />
  );
}

export function RecentMovieTracker({ movieId }) {
  useEffect(() => {
    try {
      const current = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      const next = [movieId, ...current.filter((id) => id !== movieId)].slice(0, 12);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_error) {
      // Browsing remains functional when storage is unavailable.
    }
  }, [movieId]);

  return null;
}
