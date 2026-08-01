import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeLibraryModel } from "../lib/homeLibrary.js";

const movieReady = { id: "movie-1", title: "Movie Ready", status: "available", backdropUrl: "/movie-bg.jpg" };
const movieWaiting = { id: "movie-2", title: "Movie Waiting", status: "missing" };
const seriesReady = { id: "series-1", title: "Series Ready", status: "available", quality: "3/33 tập" };
const seriesWaiting = { id: "series-2", title: "Series Waiting", status: "missing" };

test("separates playable movies and series with type-safe destinations", () => {
  const model = buildHomeLibraryModel({
    movies: [movieReady, movieWaiting],
    series: [seriesReady, seriesWaiting]
  });

  assert.deepEqual(model.availableMovies, [movieReady]);
  assert.deepEqual(model.activityMovies, [movieWaiting]);
  assert.deepEqual(model.availableSeries, [seriesReady]);
  assert.deepEqual(model.movieCards, [{ item: movieReady, href: "/movies/movie-1" }]);
  assert.deepEqual(model.seriesCards, [{ item: seriesReady, href: "/series/series-1" }]);
  assert.equal(model.heroMovie, movieReady);
  assert.equal(model.empty, false);
  assert.deepEqual(model.sections.map(({ id, title, href, count }) => ({ id, title, href, count })), [
    { id: "movie-library-title", title: "Phim lẻ của anh", href: "/movies", count: 1 },
    { id: "series-library-title", title: "Phim bộ của anh", href: "/series", count: 1 }
  ]);
});

test("keeps movie and series empty states independent", () => {
  const onlySeries = buildHomeLibraryModel({ movies: [], series: [seriesReady] });
  assert.deepEqual(onlySeries.movieCards, []);
  assert.equal(onlySeries.seriesCards.length, 1);
  assert.equal(onlySeries.empty, false);

  const nothingPlayable = buildHomeLibraryModel({ movies: [movieWaiting], series: [seriesWaiting] });
  assert.equal(nothingPlayable.movieCards.length, 0);
  assert.equal(nothingPlayable.seriesCards.length, 0);
  assert.equal(nothingPlayable.empty, true);
});

test("propagates stale state from either source without promoting series to hero", () => {
  const model = buildHomeLibraryModel({
    movies: [movieReady],
    series: [seriesReady],
    movieStale: false,
    seriesStale: true
  });

  assert.equal(model.stale, true);
  assert.equal(model.heroMovie, movieReady);
  assert.deepEqual(model.activityMovies, []);
});
