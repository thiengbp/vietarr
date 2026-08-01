export function buildHomeLibraryModel({
  movies = [],
  series = [],
  movieStale = false,
  seriesStale = false
}) {
  const availableMovies = movies.filter((item) => item.status === "available");
  const activityMovies = movies.filter((item) => item.status !== "available");
  const availableSeries = series.filter((item) => item.status === "available");
  const heroMovie = availableMovies.find((item) => item.backdropUrl) || availableMovies[0] || null;
  const movieCards = availableMovies.map((item) => ({ item, href: `/movies/${item.id}` }));
  const seriesCards = availableSeries.map((item) => ({ item, href: `/series/${item.id}` }));

  return {
    availableMovies,
    activityMovies,
    availableSeries,
    heroMovie,
    movieCards,
    seriesCards,
    stale: Boolean(movieStale || seriesStale),
    empty: movieCards.length === 0 && seriesCards.length === 0
  };
}
