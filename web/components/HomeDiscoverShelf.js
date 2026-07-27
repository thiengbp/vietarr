"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/clientApi";

const feeds = [
  { id: "today", label: "Hôm nay" },
  { id: "week", label: "Tuần này" },
  { id: "popular", label: "Phổ biến" }
];

function DiscoverCard({ item }) {
  return (
    <article className="discover-card">
      <Link className="discover-card__link" href={`/discover?q=${encodeURIComponent(item.title)}`}>
        <span className="discover-card__media">
          {item.posterUrl ? (
            <Image src={item.posterUrl} alt="" fill sizes="(min-width: 60rem) 16vw, (min-width: 40rem) 25vw, 50vw" />
          ) : (
            <span className="discover-card__fallback">{item.title}</span>
          )}
        </span>
        <span className="discover-card__title">{item.title}</span>
        <span className="discover-card__year">{item.year || "—"}</span>
      </Link>
    </article>
  );
}

export function HomeDiscoverShelf() {
  const [activeFeed, setActiveFeed] = useState("today");
  const [activeGenre, setActiveGenre] = useState(null);
  const [genres, setGenres] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const tabRefs = useRef([]);

  const load = useCallback(async ({ feed = "today", genreId = null } = {}) => {
    setLoading(true);
    setError("");
    try {
      const query = feed === "genre" ? `?feed=genre&genreId=${encodeURIComponent(genreId)}` : `?feed=${feed}`;
      const data = await apiFetch(`/home/discover${query}`);
      setItems((data.results || []).slice(0, 12));
    } catch (loadError) {
      setError(`${loadError.message}. Chọn “Thử lại” để tải lại gợi ý.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ feed: "today" });
    apiFetch("/home/genres")
      .then((data) => setGenres((data.results || []).slice(0, 12)))
      .catch(() => setGenres([]));
  }, [load]);

  function chooseFeed(feed) {
    setActiveFeed(feed);
    setActiveGenre(null);
    void load({ feed });
  }

  function chooseGenre(genre) {
    setActiveFeed("popular");
    setActiveGenre(genre);
    void load({ feed: "genre", genreId: genre.id });
  }

  function moveTab(event, index) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowLeft") next = (index - 1 + feeds.length) % feeds.length;
    if (event.key === "ArrowRight") next = (index + 1) % feeds.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = feeds.length - 1;
    tabRefs.current[next]?.focus({ preventScroll: true });
    chooseFeed(feeds[next].id);
  }

  return (
    <section className="home-section home-discover" aria-labelledby="discover-home-title">
      <header className="home-section__head home-discover__head">
        <div>
          <h2 id="discover-home-title">Khám phá hôm nay</h2>
          <p>{activeGenre ? `Phim ${activeGenre.name.toLocaleLowerCase("vi-VN")} đang được quan tâm.` : "Gợi ý mới từ TMDB, tách khỏi thư viện của anh."}</p>
        </div>
        <Link className="home-section__link" href="/discover">Tìm phim <span aria-hidden="true">→</span></Link>
      </header>

      <div className="home-discover__controls">
        <div className="home-tabs" role="tablist" aria-label="Nhịp khám phá">
          {feeds.map((feed, index) => (
            <button
              className="home-tab"
              data-active={activeFeed === feed.id ? "true" : "false"}
              key={feed.id}
              onClick={() => chooseFeed(feed.id)}
              onKeyDown={(event) => moveTab(event, index)}
              ref={(node) => { tabRefs.current[index] = node; }}
              role="tab"
              aria-controls="home-discover-panel"
              aria-selected={activeFeed === feed.id}
              tabIndex={activeFeed === feed.id ? 0 : -1}
              type="button"
            >
              {feed.label}
            </button>
          ))}
        </div>
        {genres.length ? (
          <div className="genre-chips" aria-label="Lọc theo thể loại">
            {genres.map((genre) => (
              <button
                className="genre-chip"
                data-active={activeGenre?.id === genre.id ? "true" : "false"}
                key={genre.id}
                onClick={() => chooseGenre(genre)}
                type="button"
              >
                {genre.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div id="home-discover-panel" role="tabpanel" aria-busy={loading} aria-live="polite">
        {error ? (
          <div className="home-discover__error" role="alert">
            <p>{error}</p>
            <button className="home-button home-button--secondary" onClick={() => load(activeGenre ? { feed: "genre", genreId: activeGenre.id } : { feed: activeFeed })} type="button">
              Thử lại
            </button>
          </div>
        ) : null}
        {loading && !items.length ? (
          <div className="discover-grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => <div className="discover-skeleton skeleton" key={index} />)}
          </div>
        ) : null}
        {!error && items.length ? (
          <div className="discover-grid" data-loading={loading ? "true" : "false"}>
            {items.map((item) => <DiscoverCard item={item} key={item.tmdbId} />)}
          </div>
        ) : null}
      </div>
    </section>
  );
}
