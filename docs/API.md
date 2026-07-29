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
  "countryGroups": ["western"],
  "posterUrl": "https://...",
  "backdropUrl": "https://...",
  "quality": "1080p",
  "status": "available",
  "sizeBytes": 1234567890,
  "path": "/data/library/movies/Ten Phim (1999)/movie.mp4",
  "smbPath": "smb://nas/media/library/movies/Ten%20Phim%20(1999)/movie.mp4",
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
- `GET /play/:mediaId/options` chỉ trả URL phát/SMB khi Radarr có `movieFile.path`; phim chưa có file trả các URL bằng `null` để UI không mở deep link không hợp lệ.
- Deep link Infuse/VLC chỉ dùng trên thiết bị di động có cài ứng dụng tương ứng. Desktop dùng HTTP stream (nếu trình duyệt phát được) hoặc copy HTTP/SMB URL.
- Khi Radarr/Sonarr/Bazarr down, Core trả cache nếu có và thêm header `X-Vietarr-Cache: stale`; nếu chưa có cache thì trả `502` theo quy ước lỗi.
- API key *arr không bao giờ xuất hiện trong response. Web chỉ gọi Core.
- Block 2 đọc config từ `/opt/vietarr/.env`: `RADARR_API_KEY`, `SONARR_API_KEY`, `BAZARR_API_KEY`, `CORE_MEDIA_ROOT`, `DOMAIN_SUFFIX`; không tự dò `config.xml`. Installer giữ `MEDIA_ROOT` riêng cho đường dẫn mount trên host.

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

`DiscoverItem = {tmdbId,type,title,year,countryGroups,overview,posterUrl,backdropUrl,status}`. `POST /request` nhận `{tmdbId,type:'movie'|'series',qualityProfileId}`. Trùng media đã có trả `409`; vượt rate limit trả `429`.

`countryGroups` là trường additive theo ADR-009, nhận một hoặc nhiều giá trị `vietnam | china | korea | japan | thailand | western | other`. Nguồn có mã quốc gia được ưu tiên; nếu không có, Core suy ra từ ngôn ngữ gốc.

Giới hạn request trong ngày chỉ tính các yêu cầu còn hiệu lực; request đã kết thúc `failed` hoặc `not_found` không tiêu hao hạn mức vì chưa tạo được tác vụ tải.

`GET /discover/search` tìm cả phim lẻ và phim bộ; chuẩn hóa dấu chấm và dấu gạch dưới trong tên release thành khoảng trắng trước khi gọi TMDB (ví dụ `The.Eternal.Fragrance` → `The Eternal Fragrance`).

Quy ước request tải thật:
- Trước khi nhận request, Core xác nhận Radarr có ít nhất một indexer bật Automatic Search và một download client đang bật; thiếu nguồn/client trả lỗi rõ ràng, không tạo trạng thái “Đang tải” giả.
- Core đặt phim `monitored=true` và phát lệnh `MoviesSearch`. `queued` nghĩa là đang tìm nguồn; chỉ dùng `downloading` khi phim đã xuất hiện trong Radarr queue.
- `GET /request/:id/progress` đối chiếu movie, command và queue thật của Radarr để trả trạng thái/phần trăm; search hoàn tất mà không grab được release trả `not_found`.

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
    "path": "/data/library/movies/Ten Phim (2026)/movie.mkv"
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

## B5 — nguồn tải Bitmagnet
Các endpoint B2/B3 đã freeze không đổi. B5 chỉ bổ sung API chọn release thủ công.

| Method | Path | Auth | Body | Trả về |
|--------|------|------|------|--------|
| GET | `/discover/:tmdbId/releases?type=movie|series` | JWT | none | `{source,results:[ReleaseOption]}` |
| POST | `/request/release` | JWT | `{tmdbId,type:'movie',qualityProfileId,releaseId}` | `{requestId,status,mediaId,releaseTitle}` |

`ReleaseOption`:
```json
{
  "id": "opaque-stable-id",
  "title": "Movie.Title.2026.2160p.WEB-DL",
  "source": "Bitmagnet",
  "quality": "2160p",
  "sizeBytes": 1234567890,
  "seeders": 12,
  "leechers": 3,
  "publishDate": "2026-07-27T10:00:00.000Z",
  "infoHash": "0123456789abcdef...",
  "magnetUrl": "magnet:?xt=urn:btih:..."
}
```

Quy ước B5:
- Core tìm release qua Prowlarr; Web không gọi Prowlarr/Bitmagnet trực tiếp.
- Core không bao giờ trả proxy download URL hoặc API key của Prowlarr. `magnetUrl` được dựng lại từ info hash đã index.
- `POST /request/release` không nhận magnet tùy ý. Core tìm lại release theo `releaseId`, thêm/monitor phim trong Radarr rồi push release đã xác minh cho download client.
- Với `type=series`, endpoint GET dùng metadata phim bộ và danh mục TV của Prowlarr để trả Magnet/Sao chép; B5 chưa gửi release phim bộ sang Sonarr. POST vẫn chỉ nhận `type='movie'`.
- Release hết hạn/không còn trong kết quả trả `409 release_stale`; nguồn chưa cấu hình trả `503 download_source_unavailable`.
- Nếu Radarr trả quyết định từ chối release, Core trả `409 release_rejected` kèm lý do thay vì tạo trạng thái `queued` giả. Request thủ công không xuất hiện trong queue sau 90 giây được kết thúc với `status="not_found"`.
- Bitmagnet chỉ là bộ chỉ mục kỹ thuật; người dùng chịu trách nhiệm chỉ tải nội dung họ có quyền truy cập.

## B6 — Home Experience

Các endpoint B2/B3/B5 đã freeze không đổi. B6 bổ sung feed riêng cho trang chủ; dữ liệu thư viện và trạng thái tải tiếp tục dùng API B2.

| Method | Path | Auth | Trả về |
|--------|------|------|--------|
| GET | `/home/discover?feed=today|week|popular|genre&page=&genreId=` | JWT | `{feed,page,totalPages,results:[DiscoverItem]}` |
| GET | `/home/genres` | JWT | `{results:[{id,name}]}` |

Quy ước B6:
- `feed=today` dùng TMDB trending movie theo ngày; `week` theo tuần; `popular` dùng danh sách phổ biến.
- `feed=genre` bắt buộc `genreId` là số nguyên dương và dùng TMDB discover movie sắp theo độ phổ biến.
- `DiscoverItem` giữ nguyên schema B3; Web không nhận TMDB key.
- Phim lẻ, phim bộ và Khám phá dùng `countryGroups` để lọc cục bộ; bộ lọc không thay đổi feed hay phát sinh request tải.
- Trang chủ chỉ chọn hero từ `MediaSummary.status='available'`; nội dung thiếu file không được trình bày như có thể xem.
- “Xem gần đây” là lịch sử mở trang chi tiết lưu cục bộ trên thiết bị. B6 chưa có playback progress và không dùng nhãn “Xem tiếp”.

## B7 — Multi-source release search (DRAFT; Block 07 chưa ACTIVE)

B7 giữ nguyên endpoint B5 và chỉ mở rộng response theo hướng additive. Phần này chưa có hiệu lực production cho đến khi Block 07 qua phase gate.

`GET /discover/:tmdbId/releases?type=movie|series` dự kiến trả:

```json
{
  "source": "Prowlarr",
  "partial": true,
  "providers": [
    {
      "id": "prowlarr",
      "label": "Prowlarr / Bitmagnet",
      "status": "ok",
      "count": 12,
      "latencyMs": 483
    },
    {
      "id": "bt4g",
      "label": "BT4G",
      "status": "unavailable",
      "count": 0,
      "latencyMs": 12000,
      "message": "Capability check failed"
    }
  ],
  "results": [
    {
      "id": "opaque-stable-id",
      "title": "Movie.Title.2026.2160p.WEB-DL",
      "source": "Bitmagnet",
      "sources": ["Bitmagnet"],
      "quality": "2160p",
      "sizeBytes": 1234567890,
      "seeders": 12,
      "leechers": 3,
      "publishDate": "2026-07-27T10:00:00.000Z",
      "infoHash": "0123456789abcdef...",
      "magnetUrl": "magnet:?xt=urn:btih:..."
    }
  ]
}
```

Quy ước draft B7:

- `source` và `ReleaseOption.source` được giữ lại để client B5 cũ không hỏng; `partial`, `providers` và `sources` là field mới.
- `ProviderStatus.status`: `ok | degraded | unavailable`.
- `partial=true` khi ít nhất một provider được cấu hình không trả kết quả thành công trong request hiện tại.
- Core khử trùng lặp theo info hash chuẩn hóa và gộp nhãn vào `sources`.
- `message` là thông báo an toàn cho người dùng; không chứa URL nội bộ, API key, cookie hoặc chi tiết proxy.
- Nguồn website chỉ được bật sau capability check không cần thao tác người dùng hoặc CAPTCHA; không có hành vi bypass CAPTCHA.

## Quy ước lỗi
JSON `{error: {code, message}}`; 400 input, 401/403 auth, 404, 502 khi app *arr downstream lỗi (kèm `upstream`).
