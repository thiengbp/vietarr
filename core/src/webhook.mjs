const WEBHOOK_NAME_PREFIX = "VietArr";
const WEBHOOK_SECRET_HEADER = "X-Vietarr-Webhook-Secret";
const DEFAULT_QUEUE_POLL_MS = 5_000;
const DEFAULT_QUEUE_IDLE_STOP_MS = 5 * 60_000;

function normalizeEventType(value = "") {
  return String(value).replace(/^On/i, "").toLowerCase();
}

function sourceFromBody(body) {
  const source = String(body.source || body.instanceName || body.application || "").toLowerCase();
  if (source.includes("sonarr") || body.series) return "sonarr";
  return "radarr";
}

function mediaFromBody(body, source) {
  if (source === "sonarr") {
    const id = body.series?.id || body.seriesId || body.episode?.seriesId || body.series?.tvdbId || "unknown";
    return { mediaId: `series-${id}`, title: body.series?.title || body.episode?.title || "Unknown series" };
  }
  const id = body.movie?.id || body.movieId || body.movie?.tmdbId || "unknown";
  return { mediaId: `movie-${id}`, title: body.movie?.title || body.release?.title || "Unknown movie" };
}

function importPathFromBody(body, source) {
  if (source === "sonarr") return body.episodeFile?.path || body.episodeFiles?.[0]?.path || body.path || "";
  return body.movieFile?.path || body.path || "";
}

function progressFromQueueItem(item) {
  if (typeof item.progress === "number") return Math.max(0, Math.min(100, Math.round(item.progress)));
  const size = Number(item.size || 0);
  const sizeLeft = Number(item.sizeleft ?? item.sizeLeft ?? 0);
  if (size <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((size - sizeLeft) / size) * 100)));
}

function mediaFromQueueItem(item, source) {
  if (source === "sonarr") {
    const id = item.series?.id || item.seriesId || item.episode?.seriesId || "unknown";
    return { mediaId: `series-${id}`, title: item.series?.title || item.title || "Unknown series" };
  }
  const id = item.movie?.id || item.movieId || item.movie?.tmdbId || "unknown";
  return { mediaId: `movie-${id}`, title: item.movie?.title || item.title || "Unknown movie" };
}

async function arrJson({ baseUrl, apiKey, path, method = "GET", body, fetchImpl = fetch }) {
  const res = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${res.statusText}`);
  if (res.status === 204) return null;
  return res.json();
}

export function createWebhookService({
  hub,
  webhookSecret,
  radarr,
  sonarr,
  queuePollMs = DEFAULT_QUEUE_POLL_MS,
  queueIdleStopMs = DEFAULT_QUEUE_IDLE_STOP_MS,
  getQueue
}) {
  if (!hub) throw new Error("hub is required");
  const pollers = new Map();

  async function defaultGetQueue(source) {
    const target = source === "sonarr" ? sonarr : radarr;
    if (!target?.baseUrl || !target?.apiKey) return [];
    const data = await arrJson({ ...target, path: "/api/v3/queue" });
    return Array.isArray(data?.records) ? data.records : Array.isArray(data) ? data : [];
  }

  function stopQueuePolling(source) {
    const poller = pollers.get(source);
    if (!poller) return;
    clearInterval(poller.interval);
    pollers.delete(source);
  }

  function startQueuePolling(source) {
    if (pollers.has(source)) return;
    const state = { lastActiveAt: Date.now() };
    async function tick() {
      try {
        const records = await (getQueue || defaultGetQueue)(source);
        if (records.length > 0) state.lastActiveAt = Date.now();
        for (const item of records) {
          const media = mediaFromQueueItem(item, source);
          hub.broadcast({
            type: "progress",
            mediaId: media.mediaId,
            requestId: item.requestId || null,
            source,
            data: {
              title: media.title,
              status: item.status || item.trackedDownloadStatus || "downloading",
              progress: progressFromQueueItem(item),
              eta: item.estimatedCompletionTime || item.eta || null,
              downloadClient: item.downloadClient || null
            }
          });
        }
        if (Date.now() - state.lastActiveAt > queueIdleStopMs) stopQueuePolling(source);
      } catch (error) {
        hub.broadcast({
          type: "progress",
          mediaId: `${source}-unknown`,
          requestId: null,
          source,
          data: { status: "unknown", progress: 0, error: error.message }
        });
      }
    }
    state.interval = setInterval(tick, queuePollMs);
    state.interval.unref?.();
    pollers.set(source, state);
    void tick();
  }

  function verifySecret(req) {
    if (!webhookSecret) return { ok: false, status: 500, code: "webhook_secret_missing" };
    const actual = req.get?.(WEBHOOK_SECRET_HEADER) || req.headers?.[WEBHOOK_SECRET_HEADER.toLowerCase()];
    return actual === webhookSecret ? { ok: true } : { ok: false, status: 401, code: "invalid_webhook_secret" };
  }

  async function handleArrWebhook(req, res) {
    const secret = verifySecret(req);
    if (!secret.ok) return res.status(secret.status).json({ error: { code: secret.code, message: "Webhook secret verification failed" } });

    const body = req.body || {};
    const source = sourceFromBody(body);
    const eventType = normalizeEventType(body.eventType || body.event || body.EventType);
    const media = mediaFromBody(body, source);

    if (eventType === "grab") {
      hub.broadcast({
        type: "grab",
        mediaId: media.mediaId,
        requestId: body.requestId || null,
        source,
        data: { title: media.title, status: "downloading", progress: 0 }
      });
      startQueuePolling(source);
      return res.json({ ok: true, event: "grab" });
    }

    if (eventType === "import" || eventType === "download") {
      hub.broadcast({
        type: "import",
        mediaId: media.mediaId,
        requestId: body.requestId || null,
        source,
        data: { title: media.title, status: "available", progress: 100, path: importPathFromBody(body, source) }
      });
      return res.json({ ok: true, event: "import" });
    }

    return res.json({ ok: true, ignored: true, event: eventType || "unknown" });
  }

  return { handleArrWebhook, startQueuePolling, stopQueuePolling };
}

function fieldValue(fields, name) {
  return fields?.find((field) => field.name === name)?.value;
}

function withField(fields, name, value) {
  if (!fields.some((field) => field.name === name)) return [...fields, { name, value }];
  return fields.map((field) => (field.name === name ? { ...field, value } : field));
}

function buildWebhookPayload({ schema, source, webhookUrl, webhookSecret }) {
  let fields = Array.isArray(schema.fields) ? schema.fields : [];
  fields = withField(fields, "url", webhookUrl);
  fields = withField(fields, "method", 1);
  fields = withField(fields, "headers", `${WEBHOOK_SECRET_HEADER}: ${webhookSecret}`);

  return {
    ...schema,
    id: 0,
    name: `${WEBHOOK_NAME_PREFIX} ${source} Webhook`,
    enable: true,
    onGrab: true,
    onDownload: true,
    onUpgrade: true,
    onRename: false,
    supportsOnGrab: schema.supportsOnGrab ?? true,
    supportsOnDownload: schema.supportsOnDownload ?? true,
    supportsOnUpgrade: schema.supportsOnUpgrade ?? true,
    fields
  };
}

export async function ensureArrWebhook({ source, arr, webhookUrl, webhookSecret, fetchImpl = fetch }) {
  if (!arr?.baseUrl || !arr?.apiKey || !webhookUrl || !webhookSecret) {
    return { source, skipped: true, reason: "missing_config" };
  }
  const existing = await arrJson({ ...arr, path: "/api/v3/notification", fetchImpl });
  const found = existing.find((item) => {
    const url = fieldValue(item.fields, "url");
    return item.name === `${WEBHOOK_NAME_PREFIX} ${source} Webhook` || url === webhookUrl;
  });
  if (found) return { source, created: false, id: found.id };

  const schemas = await arrJson({ ...arr, path: "/api/v3/notification/schema", fetchImpl });
  const schema = schemas.find((item) => item.implementation === "Webhook" || item.configContract === "WebhookSettings");
  if (!schema) throw new Error(`${source} webhook schema not found`);
  const payload = buildWebhookPayload({ schema, source, webhookUrl, webhookSecret });
  const created = await arrJson({ ...arr, path: "/api/v3/notification", method: "POST", body: payload, fetchImpl });
  return { source, created: true, id: created.id };
}

export async function registerArrWebhooks({ config, webhookUrl, webhookSecret, fetchImpl = fetch }) {
  const url = webhookUrl || `${config.publicBaseUrl.replace(/\/$/, "")}/api/v1/webhook/arr`;
  const secret = webhookSecret || config.webhookSecret;
  const results = [];
  results.push(await ensureArrWebhook({ source: "Radarr", arr: config.radarr, webhookUrl: url, webhookSecret: secret, fetchImpl }));
  results.push(await ensureArrWebhook({ source: "Sonarr", arr: config.sonarr, webhookUrl: url, webhookSecret: secret, fetchImpl }));
  return results;
}
