const API_BASE = process.env.CORE_API_URL || "http://localhost:3000/api/v1";

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`, { next: { revalidate: 30 } });
  const cacheState = res.headers.get("x-vietarr-cache");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message || `Core API error ${res.status}`;
    throw new Error(message);
  }
  return { data: await res.json(), stale: cacheState === "stale" };
}

export async function getMovies() {
  return getJson("/library/movies");
}

export async function getSeries() {
  return getJson("/library/series");
}

export async function getMovie(id) {
  return getJson(`/library/movies/${encodeURIComponent(id)}`);
}

export async function getPlayOptions(id) {
  return getJson(`/play/${encodeURIComponent(id)}/options`);
}
