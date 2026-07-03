import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_HOME = "/opt/vietarr";

export function readDotEnv(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function loadConfig() {
  const home = process.env.VIETARR_HOME || DEFAULT_HOME;
  const envPath = process.env.VIETARR_ENV || join(home, ".env");
  const fileEnv = readDotEnv(envPath);
  const env = { ...fileEnv, ...process.env };
  const mediaRoot = env.MEDIA_ROOT || "/mnt/media/data";
  return {
    port: Number(env.PORT || env.CORE_PORT || 3000),
    home,
    envPath,
    cachePath: env.CORE_CACHE_PATH || join(home, "core-cache.sqlite"),
    mediaRoot,
    publicBaseUrl: env.CORE_PUBLIC_URL || "http://localhost:3000",
    smbBaseUrl: env.SMB_BASE_URL || "smb://vietarr.home.arpa/media",
    radarr: {
      baseUrl: env.RADARR_URL || "http://127.0.0.1:7878",
      apiKey: env.RADARR_API_KEY || ""
    },
    sonarr: {
      baseUrl: env.SONARR_URL || "http://127.0.0.1:8989",
      apiKey: env.SONARR_API_KEY || ""
    },
    bazarr: {
      baseUrl: env.BAZARR_URL || "http://127.0.0.1:6767",
      apiKey: env.BAZARR_API_KEY || ""
    },
    qbit: {
      baseUrl: env.QBIT_URL || "http://127.0.0.1:8080"
    }
  };
}
