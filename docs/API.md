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
POST `/auth/login` · GET `/discover/trending` · GET `/discover/search?q=` · POST `/request` {tmdbId, type, quality} · GET `/request/:id/progress` · POST `/webhook/arr` (Radarr/Sonarr gọi vào) · WS `/ws?token=`.

### B3 auth/admin
| Method | Path | Auth | Body | Trả về |
|--------|------|------|------|--------|
| POST | `/auth/login` | none | `{username,password}` | `{token,user:{id,username,role}}` |
| POST | `/auth/register` | none | `{inviteToken,username,password}` | `{token,user}` |
| POST | `/auth/invite/create` | admin | `{role?}` | `{inviteToken,inviteUrl,expiresAt}` |
| GET | `/admin/users` | admin | none | `[{id,username,role,createdAt}]` |
| GET | `/settings` | JWT | none | `{rate_limit_per_day}` |
| PATCH | `/settings` | admin | `{rate_limit_per_day}` | `{rate_limit_per_day}` |

JWT gửi qua `Authorization: Bearer <token>`. Member chỉ được xem settings; admin tạo invite, xem user list và sửa settings.

### B3 discover/request
| Method | Path | Auth | Trả về |
|--------|------|------|--------|
| GET | `/discover/trending?page=` | JWT | `{results:[DiscoverItem], page, totalPages}` |
| GET | `/discover/search?q=&page=` | JWT | `{results:[DiscoverItem], page, totalPages}` |
| GET | `/quality-profiles?type=movie|series` | JWT | `[{id,name}]` |
| POST | `/request` | JWT | `{requestId,status,mediaId}` |
| GET | `/request/:id/progress` | JWT | `{status,progress,eta}` |

`DiscoverItem = {tmdbId,type,title,year,overview,posterUrl,backdropUrl,status}`. `POST /request` nhận `{tmdbId,type:'movie'|'series',qualityProfileId}`. Trùng media đã có trả `409`; vượt rate limit trả `429`.

### B3 realtime WS
Client kết nối `ws://core:3000/ws?token=<JWT>` hoặc qua Caddy `wss://vietarr.home.arpa/ws?token=<JWT>`.

Server events:
```json
{
  "type": "grab",
  "mediaId": "movie-101",
  "requestId": "req_01H...",
  "source": "radarr",
  "data": {
    "title": "Tên phim",
    "status": "downloading",
    "progress": 0
  },
  "ts": "2026-07-04T02:00:00.000Z"
}
```

```json
{
  "type": "progress",
  "mediaId": "movie-101",
  "requestId": "req_01H...",
  "source": "radarr",
  "data": {
    "status": "downloading",
    "progress": 43,
    "eta": "00:12:30",
    "downloadClient": "qBittorrent"
  },
  "ts": "2026-07-04T02:00:05.000Z"
}
```

```json
{
  "type": "import",
  "mediaId": "movie-101",
  "requestId": "req_01H...",
  "source": "radarr",
  "data": {
    "status": "available",
    "progress": 100,
    "path": "/data/media/movies/Ten Phim (2026)/movie.mkv"
  },
  "ts": "2026-07-04T02:20:00.000Z"
}
```

Realtime rules:
- `grab` và `import` đến từ Radarr/Sonarr webhook `POST /webhook/arr` (`OnGrab`, `OnImport`, `OnDownload`).
- `progress` không phải Radarr/Sonarr push. Khi Core thấy active grab/download, Core tự polling Radarr/Sonarr `/api/v3/queue` mỗi 5s, tính `progress` theo queue item, rồi broadcast WS cho client đang mở.
- Khi queue item biến mất mà chưa có `OnImport`, Core broadcast `progress` cuối cùng với `status="unknown"` và dừng polling item đó sau 5 phút idle.
- `progress` là số nguyên `0..100`. Client không tự suy diễn % từ UI nếu server đã gửi field này.
- WS client phải auto reconnect; reconnect xong client gọi lại REST read API để rehydrate state, vì Core không replay event history trong B3.

## B4 — packaging/release
Block 04 không thêm Core API mới. Mọi API public hiện tại vẫn là B2/B3 contract.

## Quy ước lỗi
JSON `{error: {code, message}}`; 400 input, 401/403 auth, 404, 502 khi app *arr downstream lỗi (kèm `upstream`).
