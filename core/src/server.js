import express from "express";
import { createCache } from "./cache.js";
import { loadConfig } from "./config.js";
import { createArrClient, UpstreamError } from "./arr.js";
import { mapMovie, mapSeries, mergeMovieSubtitles, movieDetail, playOptions, streamMovieFile } from "./media.js";

export function createServer(options = {}) {
  const config = options.config || loadConfig();
  const cache = options.cache || createCache(config.cachePath);
  const app = express();
  const arr = createArrClient({ cache, config });

  app.use(express.json());

  app.get("/api/v1/health", async (_req, res, next) => {
    try {
      res.json(await arr.health());
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/library/movies", async (_req, res, next) => {
    try {
      const result = await arr.movies();
      let movies = result.data;
      let warning = result.warning || null;
      try {
        const bazarr = await arr.bazarrMovies();
        movies = mergeMovieSubtitles(movies, bazarr.data);
        warning = warning || bazarr.warning || null;
      } catch (_error) {
        warning = warning || "bazarr down, subtitle status unknown";
      }
      if (result.stale) res.set("X-Vietarr-Cache", "stale");
      res.json(movies.map((movie) => ({ ...mapMovie(movie, config), warning })));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/library/series", async (_req, res, next) => {
    try {
      const result = await arr.series();
      if (result.stale) res.set("X-Vietarr-Cache", "stale");
      res.json(result.data.map((series) => ({ ...mapSeries(series, config), warning: result.warning || null })));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/library/movies/:id", async (req, res, next) => {
    try {
      const result = await arr.movie(req.params.id);
      let movie = result.data;
      let warning = result.warning || null;
      try {
        const bazarr = await arr.bazarrMovies();
        movie = mergeMovieSubtitles([movie], bazarr.data)[0];
        warning = warning || bazarr.warning || null;
      } catch (_error) {
        warning = warning || "bazarr down, subtitle status unknown";
      }
      if (result.stale) res.set("X-Vietarr-Cache", "stale");
      res.json({ ...movieDetail(movie, config), warning });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/play/:mediaId/options", async (req, res, next) => {
    try {
      if (!req.params.mediaId.startsWith("movie-")) {
        return res.status(404).json({ error: { code: "not_found", message: "Media not found" } });
      }
      const result = await arr.movie(req.params.mediaId);
      res.json(playOptions(result.data, config));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/stream/:fileId", async (req, res, next) => {
    try {
      if (!req.params.fileId.startsWith("movie-")) {
        return res.status(404).json({ error: { code: "not_found", message: "File not found" } });
      }
      const result = await arr.movie(req.params.fileId);
      const streamResult = streamMovieFile(result.data, config, req.headers.range);
      res.status(streamResult.status).set(streamResult.headers);
      streamResult.stream.pipe(res);
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    if (error instanceof UpstreamError) {
      return res.status(502).json({ error: { code: "upstream_unavailable", message: error.message, upstream: error.upstream } });
    }
    const status = error.status || 500;
    res.status(status).set(error.headers || {}).json({ error: { code: status === 404 ? "not_found" : "internal_error", message: error.message } });
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const app = createServer({ config, cache: createCache(config.cachePath) });
  app.listen(config.port, () => {
    console.log(`VietArr Core listening on :${config.port}`);
  });
}
