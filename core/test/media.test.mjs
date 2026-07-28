import test from "node:test";
import assert from "node:assert/strict";
import { mapMovie, mapSeries, playOptions } from "../src/media.js";

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
