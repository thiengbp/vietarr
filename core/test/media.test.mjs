import test from "node:test";
import assert from "node:assert/strict";
import { mapMovie, mapSeries, playOptions, seriesDetail } from "../src/media.js";

const config = {
  mediaRoot: "/data",
  publicBaseUrl: "https://vietarr.home.arpa",
  smbBaseUrl: "smb://vietarr.home.arpa/media"
};

test("missing movies do not expose fake play or SMB URLs", () => {
  const movie = { id: 2, title: "The Odyssey", path: "/data/library/movies/The Odyssey (2026)", monitored: true };
  assert.equal(mapMovie(movie, config).path, null);
  assert.deepEqual(playOptions(movie, config), {
    infuseUrl: null,
    vlcUrl: null,
    smbPath: null,
    httpStreamUrl: null,
    browserPlayable: false
  });
});

test("available movies expose player URLs from the real movie file", () => {
  const movie = {
    id: 7,
    movieFile: {
      path: "/data/library/movies/Test (2026)/test.mp4",
      mediaInfo: { videoCodec: "h264", audioCodec: "aac" }
    }
  };
  const options = playOptions(movie, config);
  assert.match(options.infuseUrl, /^infuse:\/\//);
  assert.match(options.vlcUrl, /^vlc-x-callback:\/\//);
  assert.equal(options.httpStreamUrl, "https://vietarr.home.arpa/api/v1/stream/movie-7");
  assert.equal(options.browserPlayable, true);
  assert.equal(options.smbPath, "smb://vietarr.home.arpa/media/library/movies/Test%20(2026)/test.mp4");
});

test("library summaries expose country groups without changing source metadata", () => {
  assert.deepEqual(mapMovie({ id: 1, title: "Film", originalLanguage: { name: "English" } }, config).countryGroups, ["western"]);
  assert.deepEqual(mapSeries({ id: 2, title: "Series", originalLanguage: { name: "Chinese" }, seasons: [] }, config).countryGroups, ["china"]);
});

test("series detail exposes real Sonarr episodes and play options only for imported files", () => {
  const series = {
    id: 1,
    title: "The Eternal Fragrance",
    year: 2026,
    seasons: [{ seasonNumber: 1, statistics: { episodeCount: 2, episodeFileCount: 1 } }]
  };
  const episodes = [
    { id: 1, seasonNumber: 1, episodeNumber: 1, title: "Episode 1", hasFile: false },
    {
      id: 2,
      seasonNumber: 1,
      episodeNumber: 2,
      title: "Episode 2",
      hasFile: true,
      episodeFile: {
        path: "/data/library/tv/The Eternal Fragrance/Season 1/S01E02.mp4",
        size: 1234,
        quality: { quality: { name: "WEBDL-1080p" } },
        mediaInfo: { videoCodec: "h264", audioCodec: "aac" }
      }
    }
  ];

  const detail = seriesDetail(series, episodes, config);
  assert.equal(detail.episodeCount, 2);
  assert.equal(detail.availableCount, 1);
  assert.equal(detail.episodes[0].status, "missing");
  assert.equal(detail.episodes[0].playOptions, null);
  assert.equal(detail.episodes[1].status, "available");
  assert.equal(detail.episodes[1].quality, "WEBDL-1080p");
  assert.equal(detail.episodes[1].playOptions.httpStreamUrl, "https://vietarr.home.arpa/api/v1/stream/episode-2");
  assert.equal(detail.episodes[1].playOptions.smbPath, "smb://vietarr.home.arpa/media/library/tv/The%20Eternal%20Fragrance/Season%201/S01E02.mp4");
});
