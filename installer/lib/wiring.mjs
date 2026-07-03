#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const home = process.env.VIETARR_HOME || "/opt/vietarr";
const envPath = join(home, ".env");

function readEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    env[line.slice(0, index)] = line.slice(index + 1);
  }
  return env;
}

function upsertEnv(path, values) {
  const current = existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/) : [];
  const seen = new Set();
  const next = current.map((line) => {
    const index = line.indexOf("=");
    if (index === -1) return line;
    const key = line.slice(0, index);
    if (!(key in values)) return line;
    seen.add(key);
    return `${key}=${values[key]}`;
  });
  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) next.push(`${key}=${value}`);
  }
  writeFileSync(path, next.filter(Boolean).join("\n") + "\n", { mode: 0o600 });
}

function readXmlValue(path, tag) {
  const xml = readFileSync(path, "utf8");
  const match = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
  if (!match) throw new Error(`Missing <${tag}> in ${path}`);
  return match[1];
}

function readBazarrApiKey() {
  const candidates = [
    join(home, "appdata/bazarr/config/config.yaml"),
    join(home, "appdata/bazarr/config/config.yml"),
    join(home, "appdata/bazarr/config/config.ini")
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const yamlMatch = text.match(/(?:^|\n)\s*apikey:\s*["']?([A-Za-z0-9_-]{16,})["']?/);
    if (yamlMatch) return yamlMatch[1];
    const iniMatch = text.match(/(?:^|\n)\s*api_key\s*=\s*([A-Za-z0-9_-]{16,})/);
    if (iniMatch) return iniMatch[1];
  }
  return "";
}

function bazarrConfigPath() {
  return [
    join(home, "appdata/bazarr/config/config.yaml"),
    join(home, "appdata/bazarr/config/config.yml")
  ].find((path) => existsSync(path));
}

function yamlScalar(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return String(value);
}

function setYamlSectionValue(text, section, key, value) {
  const lines = text.split(/\r?\n/);
  let inSection = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.startsWith(" ") && line.endsWith(":")) {
      inSection = line === `${section}:`;
      continue;
    }
    if (!inSection) continue;
    if (line.startsWith(`  ${key}:`)) {
      lines[index] = `  ${key}: ${yamlScalar(value)}`;
      return lines.join("\n");
    }
  }
  throw new Error(`Missing Bazarr config key ${section}.${key}`);
}

function configureBazarrFile(keys) {
  const path = bazarrConfigPath();
  if (!path) throw new Error("Missing Bazarr config.yaml");
  let text = readFileSync(path, "utf8");
  const changes = [
    ["general", "use_radarr", true],
    ["general", "use_sonarr", true],
    ["general", "default_und_audio_lang", "vi"],
    ["general", "default_und_embedded_subtitles_lang", "vi"],
    ["radarr", "ip", "radarr"],
    ["radarr", "port", 7878],
    ["radarr", "base_url", "/"],
    ["radarr", "ssl", false],
    ["radarr", "apikey", keys.RADARR_API_KEY],
    ["sonarr", "ip", "sonarr"],
    ["sonarr", "port", 8989],
    ["sonarr", "base_url", "/"],
    ["sonarr", "ssl", false],
    ["sonarr", "apikey", keys.SONARR_API_KEY]
  ];
  for (const [section, key, value] of changes) {
    text = setYamlSectionValue(text, section, key, value);
  }
  writeFileSync(path, text);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = text;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const summary = typeof body === "string" ? body.slice(0, 240) : JSON.stringify(body).slice(0, 240);
    throw new Error(`${options.method || "GET"} ${url} returned ${response.status}: ${summary}`);
  }
  return body;
}

function apiHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": apiKey
  };
}

async function waitHttp(name, url, timeoutMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // app is still booting
    }
    await sleep(2000);
  }
  throw new Error(`${name} did not become ready within ${timeoutMs / 1000}s`);
}

async function waitForConfig(name, path, timeoutMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (existsSync(path)) return;
    await sleep(2000);
  }
  throw new Error(`${name} did not create ${path} within ${timeoutMs / 1000}s`);
}

function setField(resource, name, value) {
  const field = resource.fields?.find((item) => item.name === name);
  if (field) field.value = value;
}

async function getSchema(baseUrl, apiKey, path, implementation) {
  const schemas = await request(`${baseUrl}${path}/schema`, { headers: apiHeaders(apiKey) });
  const schema = schemas.find((item) => item.implementation === implementation);
  if (!schema) throw new Error(`Missing schema ${implementation} at ${path}/schema`);
  return schema;
}

async function upsertByName(baseUrl, apiKey, path, payload) {
  const current = await request(`${baseUrl}${path}`, { headers: apiHeaders(apiKey) });
  const existing = current.find((item) => item.name === payload.name || item.implementation === payload.implementation);
  if (existing) {
    payload.id = existing.id;
    return request(`${baseUrl}${path}/${existing.id}`, {
      method: "PUT",
      headers: apiHeaders(apiKey),
      body: JSON.stringify(payload)
    });
  }
  return request(`${baseUrl}${path}`, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: JSON.stringify(payload)
  });
}

async function ensureRootFolder(baseUrl, apiKey, path) {
  const current = await request(`${baseUrl}/api/v3/rootfolder`, { headers: apiHeaders(apiKey) });
  if (current.some((item) => item.path === path)) return;
  await request(`${baseUrl}/api/v3/rootfolder`, {
    method: "POST",
    headers: apiHeaders(apiKey),
    body: JSON.stringify({ path })
  });
}

async function ensureQbitDownloadClient({ app, baseUrl, apiKey, category }) {
  const schema = await getSchema(baseUrl, apiKey, "/api/v3/downloadclient", "QBittorrent");
  schema.name = "qBittorrent";
  schema.enable = true;
  schema.protocol = "torrent";
  schema.priority = 1;
  setField(schema, "host", "qbittorrent");
  setField(schema, "port", 8080);
  setField(schema, "useSsl", false);
  setField(schema, "urlBase", "");
  setField(schema, "username", process.env.QBIT_USER);
  setField(schema, "password", process.env.QBIT_PASS);
  setField(schema, "movieCategory", category);
  setField(schema, "tvCategory", category);
  const current = await request(`${baseUrl}/api/v3/downloadclient`, { headers: apiHeaders(apiKey) });
  const existing = current.find((item) => item.name === schema.name || item.implementation === schema.implementation);
  if (existing) {
    schema.id = existing.id;
  } else {
    await request(`${baseUrl}/api/v3/downloadclient/test`, {
      method: "POST",
      headers: apiHeaders(apiKey),
      body: JSON.stringify(schema)
    });
  }
  await upsertByName(baseUrl, apiKey, "/api/v3/downloadclient", schema);
  await ensureRootFolder(baseUrl, apiKey, app === "radarr" ? "/data/media/movies" : "/data/media/tv");
}

async function ensureProwlarrApplication({ prowlarrKey, implementation, name, baseUrl, apiKey }) {
  const prowlarr = "http://prowlarr:9696";
  const schema = await getSchema(prowlarr, prowlarrKey, "/api/v1/applications", implementation);
  schema.name = name;
  schema.enable = true;
  schema.syncLevel = "fullSync";
  setField(schema, "prowlarrUrl", "http://prowlarr:9696");
  setField(schema, "baseUrl", baseUrl);
  setField(schema, "apiKey", apiKey);
  const current = await request(`${prowlarr}/api/v1/applications`, { headers: apiHeaders(prowlarrKey) });
  const existing = current.find((item) => item.name === schema.name || item.implementation === schema.implementation);
  if (existing) {
    schema.id = existing.id;
  } else {
    await request(`${prowlarr}/api/v1/applications/test`, {
      method: "POST",
      headers: apiHeaders(prowlarrKey),
      body: JSON.stringify(schema)
    });
  }
  await upsertByName(prowlarr, prowlarrKey, "/api/v1/applications", schema);
}

async function ensureFlareSolverr(prowlarrKey) {
  const prowlarr = "http://prowlarr:9696";
  const schema = await getSchema(prowlarr, prowlarrKey, "/api/v1/indexerproxy", "FlareSolverr");
  schema.name = "FlareSolverr";
  setField(schema, "host", "http://flaresolverr:8191/");
  setField(schema, "url", "http://flaresolverr:8191/");
  setField(schema, "tags", []);
  await upsertByName(prowlarr, prowlarrKey, "/api/v1/indexerproxy", schema);
}

async function qbitRequest(path, options = {}) {
  const response = await fetch(`http://qbittorrent:8080${path}`, options);
  const text = await response.text();
  if (!response.ok) throw new Error(`qBittorrent ${path} returned ${response.status}: ${text.slice(0, 160)}`);
  return { response, text };
}

async function configureQbit() {
  const candidates = [
    [process.env.QBIT_USER, process.env.QBIT_PASS],
    ["admin", process.env.QBIT_BOOTSTRAP_PASS],
    ["admin", "adminadmin"]
  ].filter(([, password]) => password);

  let login;
  for (const [username, password] of candidates) {
    const form = new URLSearchParams({ username, password });
    login = await fetch("http://qbittorrent:8080/api/v2/auth/login", { method: "POST", body: form });
    const text = await login.text();
    if (login.ok && (login.status === 204 || text === "Ok.")) break;
    login = undefined;
  }
  if (!login) throw new Error("qBittorrent login failed");
  const cookie = login.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("qBittorrent did not return SID cookie");
  const headers = { Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" };
  const prefs = {
    save_path: "/data/torrents",
    web_ui_username: process.env.QBIT_USER,
    web_ui_password: process.env.QBIT_PASS
  };
  await qbitRequest("/api/v2/app/setPreferences", {
    method: "POST",
    headers,
    body: new URLSearchParams({ json: JSON.stringify(prefs) })
  });
  const categories = await qbitRequest("/api/v2/torrents/categories", { headers });
  const existingCategories = categories.text ? JSON.parse(categories.text) : {};
  for (const category of ["movies", "tv"]) {
    if (existingCategories[category]) continue;
    await qbitRequest("/api/v2/torrents/createCategory", {
      method: "POST",
      headers,
      body: new URLSearchParams({ category, savePath: `/data/torrents/${category}` })
    });
  }
}

async function main() {
  if (!existsSync(envPath)) throw new Error(`Missing ${envPath}`);
  const env = readEnv(envPath);
  Object.assign(process.env, env);

  await waitForConfig("Radarr", join(home, "appdata/radarr/config.xml"));
  await waitForConfig("Sonarr", join(home, "appdata/sonarr/config.xml"));
  await waitForConfig("Prowlarr", join(home, "appdata/prowlarr/config.xml"));
  await waitForConfig("Bazarr", join(home, "appdata/bazarr/config/config.yaml"));

  const keys = {
    RADARR_API_KEY: readXmlValue(join(home, "appdata/radarr/config.xml"), "ApiKey"),
    SONARR_API_KEY: readXmlValue(join(home, "appdata/sonarr/config.xml"), "ApiKey"),
    PROWLARR_API_KEY: readXmlValue(join(home, "appdata/prowlarr/config.xml"), "ApiKey"),
    BAZARR_API_KEY: readBazarrApiKey()
  };
  upsertEnv(envPath, keys);
  Object.assign(process.env, keys);

  await waitHttp("Radarr", "http://radarr:7878/ping");
  await waitHttp("Sonarr", "http://sonarr:8989/ping");
  await waitHttp("Prowlarr", "http://prowlarr:9696/ping");
  await waitHttp("qBittorrent", "http://qbittorrent:8080");

  await configureQbit();
  await ensureQbitDownloadClient({ app: "radarr", baseUrl: "http://radarr:7878", apiKey: keys.RADARR_API_KEY, category: "movies" });
  await ensureQbitDownloadClient({ app: "sonarr", baseUrl: "http://sonarr:8989", apiKey: keys.SONARR_API_KEY, category: "tv" });
  await ensureProwlarrApplication({ prowlarrKey: keys.PROWLARR_API_KEY, implementation: "Radarr", name: "Radarr", baseUrl: "http://radarr:7878", apiKey: keys.RADARR_API_KEY });
  await ensureProwlarrApplication({ prowlarrKey: keys.PROWLARR_API_KEY, implementation: "Sonarr", name: "Sonarr", baseUrl: "http://sonarr:8989", apiKey: keys.SONARR_API_KEY });
  await ensureFlareSolverr(keys.PROWLARR_API_KEY);
  configureBazarrFile(keys);

  console.log("WIRING PASS");
}

main().catch((error) => {
  console.error(`WIRING FAIL: ${error.message}`);
  process.exit(1);
});
