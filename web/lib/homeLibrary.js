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
  const sections = [
    {
      id: "movie-library-title",
      title: "Phim lẻ của anh",
      description: `${movieCards.length.toLocaleString("vi-VN")} phim sẵn sàng để xem.`,
      href: "/movies",
      linkLabel: "Xem tất cả phim lẻ",
      count: movieCards.length,
      cards: movieCards
    },
    {
      id: "series-library-title",
      title: "Phim bộ của anh",
      description: `${seriesCards.length.toLocaleString("vi-VN")} bộ sẵn sàng để xem.`,
      href: "/series",
      linkLabel: "Xem tất cả phim bộ",
      count: seriesCards.length,
      cards: seriesCards
    }
  ];

  return {
    availableMovies,
    activityMovies,
    availableSeries,
    heroMovie,
    movieCards,
    seriesCards,
    sections,
    stale: Boolean(movieStale || seriesStale),
    empty: movieCards.length === 0 && seriesCards.length === 0
  };
}
