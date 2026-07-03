# VIETARR CORE — API CONTRACT (v0)

> Contract-first: sửa file này TRƯỚC, code theo SAU. Đóng băng theo block Release. Base: `http://core:3000/api/v1`. Auth: Bearer JWT (từ B3); B2 read-only nội bộ chưa auth.

## B2 — read-only (freeze khi B2 Release)
| Method | Path | Trả về |
|--------|------|--------|
| GET | `/library/movies` | [{id, tmdbId, title, year, posterUrl, quality, status, sizeBytes, path, smbPath}] |
| GET | `/library/series` | tương tự + seasons summary |
| GET | `/library/movies/:id` | chi tiết + files + subtitle status (Bazarr) |
| GET | `/play/:mediaId/options` | {infuseUrl, vlcUrl, smbPath, httpStreamUrl?, browserPlayable:boolean} |
| GET | `/stream/:fileId` | HTTP 206 Range stream (không transcode) |
| GET | `/health` | {status, radarr, sonarr, bazarr, qbit: up/down} |

### B2 response schema
`MediaSummary`
```json
{
  "id": "movie-12",
  "source": "radarr",
  "tmdbId": 550,
  "title": "Tên phim",
  "year": 1999,
  "posterUrl": "https://...",
  "backdropUrl": "https://...",
  "quality": "1080p",
  "status": "available",
  "sizeBytes": 1234567890,
  "path": "/data/media/movies/Ten Phim (1999)/movie.mp4",
  "smbPath": "smb://nas/media/media/movies/Ten%20Phim%20(1999)/movie.mp4",
  "hasVietnameseSubtitle": true,
  "warning": null
}
```

`MovieDetail = MediaSummary + { overview, runtimeMinutes, files, subtitleStatus }`.
`SeriesSummary = MediaSummary + { seasons: [{seasonNumber, episodeCount, availableCount}] }`.

`PlayOptions`
```json
{
  "infuseUrl": "infuse://x-callback-url/play?url=...",
  "vlcUrl": "vlc-x-callback://x-callback-url/stream?url=...",
  "smbPath": "smb://nas/media/...",
  "httpStreamUrl": "http://core:3000/api/v1/stream/movie-12",
  "browserPlayable": true
}
```

Quy ước B2:
- `id` là ID nội bộ ổn định dạng `<source>-<arrId>`; Block 2 không tạo media/request mới.
- `status`: `available | missing | queued | downloading | unknown`.
- Khi Radarr/Sonarr/Bazarr down, Core trả cache nếu có và thêm header `X-Vietarr-Cache: stale`; nếu chưa có cache thì trả `502` theo quy ước lỗi.
- API key *arr không bao giờ xuất hiện trong response. Web chỉ gọi Core.
- Block 2 đọc config từ `/opt/vietarr/.env`: `RADARR_API_KEY`, `SONARR_API_KEY`, `BAZARR_API_KEY`, `MEDIA_ROOT`, `DOMAIN_SUFFIX`; không tự dò `config.xml`.

## B3 — write + auth (draft, freeze khi B3 Release)
POST `/auth/login` · GET `/discover/trending` · GET `/discover/search?q=` · POST `/request` {tmdbId, type, quality} · GET `/request/:id/progress` · POST `/webhook/arr` (Radarr/Sonarr gọi vào).

## B4 — Fshare Bridge (draft)
GET `/torznab/api?t=search&q=` (Prowlarr gọi) · Giả lập qBittorrent WebUI API: `/fakeqb/api/v2/auth/login`, `/fakeqb/api/v2/torrents/add|info|delete` (Radarr/Sonarr gọi như download client thật).

## Quy ước lỗi
JSON `{error: {code, message}}`; 400 input, 401/403 auth, 404, 502 khi app *arr downstream lỗi (kèm `upstream`).
