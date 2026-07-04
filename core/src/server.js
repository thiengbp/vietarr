import http from "node:http";
import express from "express";
import { createCache } from "./cache.js";
import { loadConfig } from "./config.js";
import { createArrClient, UpstreamError } from "./arr.js";
import { mapMovie, mapSeries, mergeMovieSubtitles, movieDetail, playOptions, streamMovieFile } from "./media.js";
import { createAuthService } from "./auth.mjs";
import { createAppDb } from "./db.mjs";
import { createDiscoverService } from "./discover.mjs";
import { createRequestService } from "./requests.mjs";
import { createWebhookService, registerArrWebhooks } from "./webhook.mjs";
import { attachWebSocketServer, createRealtimeHub } from "./ws.js";

export function createServer(options = {}) {
  const config = options.config || loadConfig();
  const cache = options.cache || createCache(config.cachePath);
  const db = options.db || createAppDb(config.dbPath);
  const hub = options.hub || createRealtimeHub();
  const app = express();
  const arr = createArrClient({ cache, config });
  const auth = options.auth || createAuthService({ db, jwtSecret: config.jwtSecret, publicBaseUrl: config.publicBaseUrl });
  const discover = options.discover || createDiscoverService({ config });
  const requests = options.requests || createRequestService({ db, config, discover });
  const webhook = options.webhook || createWebhookService({
    hub,
    webhookSecret: config.webhookSecret,
    radarr: config.radarr,
    sonarr: config.sonarr
  });

  app.locals.config = config;
  app.locals.db = db;
  app.locals.hub = hub;

  app.use(express.json());

  function requireAuth(req, _res, next) {
    try {
      const header = req.get("authorization") || "";
      const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
      if (!token) {
        const error = new Error("Authentication required");
        error.status = 401;
        throw error;
      }
      const payload = auth.verifyToken(token);
      const user = db.getUserById(Number(payload.sub));
      if (!user) {
        const error = new Error("User not found");
        error.status = 401;
        throw error;
      }
      req.user = auth.sanitizeUser(user);
      next();
    } catch (error) {
      error.status = error.status || 401;
      next(error);
    }
  }

  function requireAdmin(req, _res, next) {
    if (req.user?.role !== "admin") {
      const error = new Error("Admin role required");
      error.status = 403;
      return next(error);
    }
    return next();
  }

  app.post("/api/v1/auth/login", async (req, res, next) => {
    try {
      res.json(await auth.login(req.body || {}));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/auth/register", async (req, res, next) => {
    try {
      res.json(await auth.registerWithInvite(req.body || {}));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/auth/invite/create", requireAuth, requireAdmin, async (req, res, next) => {
    try {
      res.json(await auth.createInvite({ createdByUserId: req.user.id, role: req.body?.role || "member" }));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/admin/users", requireAuth, requireAdmin, (_req, res) => {
    res.json(db.listUsers());
  });

  app.get("/api/v1/settings", requireAuth, (_req, res) => {
    res.json({ rate_limit_per_day: Number(db.getSetting("rate_limit_per_day") || 5) });
  });

  app.patch("/api/v1/settings", requireAuth, requireAdmin, (req, res, next) => {
    const nextLimit = Number(req.body?.rate_limit_per_day);
    if (!Number.isInteger(nextLimit) || nextLimit < 1 || nextLimit > 100) {
      const error = new Error("rate_limit_per_day must be an integer from 1 to 100");
      error.status = 400;
      return next(error);
    }
    db.setSetting("rate_limit_per_day", nextLimit);
    return res.json({ rate_limit_per_day: nextLimit });
  });

  app.get("/api/v1/discover/trending", requireAuth, async (req, res, next) => {
    try {
      res.json(await discover.trending({ page: Number(req.query.page || 1) }));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/discover/search", requireAuth, async (req, res, next) => {
    try {
      res.json(await discover.search({ q: req.query.q || "", page: Number(req.query.page || 1) }));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/quality-profiles", requireAuth, async (req, res, next) => {
    try {
      res.json(await requests.listQualityProfiles(req.query.type || "movie"));
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/v1/request", requireAuth, async (req, res, next) => {
    try {
      res.status(202).json(await requests.createRequest({ user: req.user, ...req.body }));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/request/:id/progress", requireAuth, (req, res, next) => {
    try {
      res.json(requests.progress(req.params.id));
    } catch (error) {
      next(error);
    }
  });

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

  app.post("/api/v1/webhook/arr", (req, res, next) => {
    Promise.resolve(webhook.handleArrWebhook(req, res)).catch(next);
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
  const hub = createRealtimeHub();
  const app = createServer({ config, cache: createCache(config.cachePath), hub });
  const server = http.createServer(app);
  attachWebSocketServer(server, { hub });
  server.listen(config.port, () => {
    console.log(`VietArr Core listening on :${config.port}`);
    registerArrWebhooks({ config, webhookUrl: config.webhookUrl, webhookSecret: config.webhookSecret })
      .then((results) => {
        console.log(`Webhook registration: ${JSON.stringify(results)}`);
      })
      .catch((error) => {
        console.warn(`Webhook registration failed: ${error.message}`);
      });
  });
}
