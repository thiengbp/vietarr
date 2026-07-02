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

## B3 — write + auth (draft, freeze khi B3 Release)
POST `/auth/login` · GET `/discover/trending` · GET `/discover/search?q=` · POST `/request` {tmdbId, type, quality} · GET `/request/:id/progress` · POST `/webhook/arr` (Radarr/Sonarr gọi vào).

## B4 — Fshare Bridge (draft)
GET `/torznab/api?t=search&q=` (Prowlarr gọi) · Giả lập qBittorrent WebUI API: `/fakeqb/api/v2/auth/login`, `/fakeqb/api/v2/torrents/add|info|delete` (Radarr/Sonarr gọi như download client thật).

## Quy ước lỗi
JSON `{error: {code, message}}`; 400 input, 401/403 auth, 404, 502 khi app *arr downstream lỗi (kèm `upstream`).
