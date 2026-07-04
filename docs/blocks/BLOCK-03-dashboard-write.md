# BLOCK-03 — DASHBOARD WRITE + AUTH
> **Trạng thái:** IN PROGRESS
> **Phụ thuộc:** B2 (API B2 freeze) · **Bắt đầu:** 2026-07-03

## 1. Vision (đích đến)
Từ điện thoại: tìm phim bất kỳ (TMDB tiếng Việt) → bấm "Tải về" chọn chất lượng → theo dõi % realtime trên card → phim về xong có toast notification ngay lập tức. Nhiều user, admin invite-only, rate limit configurable.

## 2. Scope & Non-Goals
**Trong scope:**
- Auth JWT (login/logout/refresh token, lưu SQLite).
- User model: admin tạo invite link → user đăng ký qua link (invite-only, không đăng ký tự do).
- Phân quyền: admin (full) / member (request + xem).
- Rate limit request: mặc định 5/ngày/user, admin set được qua UI Settings.
- Tab Khám phá: TMDB trending + search (tiếng Việt, dùng `language=vi`).
- Nút "Tải về": chọn chất lượng → POST sang Radarr/Sonarr → UI chuyển sang trạng thái "Đang tải".
- **WebSocket realtime** (không polling): Core giữ WS connection, nhận webhook từ Radarr/Sonarr (`OnGrab`, `OnImport`, `OnDownload`) → broadcast tới Dashboard client đang mở → card cập nhật % và badge ngay lập tức.
- Toast notification khi import xong.
- Webhook endpoint tự đăng ký vào Radarr/Sonarr khi Core khởi động (idempotent).

**Non-Goals (CẤM làm ở block này):**
- KHÔNG Fshare (Block 04).
- KHÔNG email/OAuth/SSO.
- KHÔNG duyệt-request nhiều cấp (admin approve từng request — backlog).
- KHÔNG push notification mobile/PWA (backlog).
- KHÔNG xóa phim từ Dashboard (admin-only, backlog).
- KHÔNG thay đổi Interface Contract B2 đã freeze.

## 3. Architecture

```
Dashboard (Next.js)          Core (Express)              *arr
     │                           │
     │── WS connect ────────────►│ ws://core:3000/ws
     │                           │◄── POST /webhook/arr ── Radarr/Sonarr
     │                           │    (OnGrab, OnImport)
     │◄── broadcast {type,       │
     │     movieId, progress} ───│
     │                           │
     │── POST /request ─────────►│── POST /api/v3/movie ──► Radarr
     │                           │── POST /api/v3/series ──► Sonarr
     │◄── {requestId, status} ───│
```

**Modules mới trong `core/`:**
- `auth.mjs` — JWT sign/verify, invite token (one-time, TTL 24h), bcrypt password.
- `users.mjs` — SQLite schema: users, invites, request_log.
- `requests.mjs` — POST request → *arr, ghi request_log, rate limit check.
- `webhook.mjs` — nhận POST từ *arr, parse event, broadcast qua WS.
- `ws.mjs` — WebSocket server (ws library), giữ map clientId→socket.
- `settings.mjs` — đọc/ghi settings (rate_limit_per_day) từ SQLite.

**Modules mới trong `web/`:**
- `app/login/` — trang login + trang đăng ký qua invite link.
- `app/discover/` — TMDB trending + search, nút Tải về.
- `app/admin/` — quản lý user, tạo invite link, cài rate limit.
- `hooks/useWebSocket.js` — kết nối WS, nhận event, update React state.
- `components/RequestButton` — "Tải về" + chọn chất lượng → progress inline.
- `components/Toast` — notification import xong.

### Interface Contract (đóng băng khi Release)
Thêm vào `docs/API.md` mục B3 (đã có draft, freeze khi Release):
- `POST /auth/login` `{username, password}` → `{token, user}`
- `POST /auth/invite/create` (admin) → `{inviteUrl, expiresAt}`
- `POST /auth/register` `{inviteToken, username, password}` → `{token, user}`
- `GET /discover/trending?page=` → TMDB trending (cached 1h)
- `GET /discover/search?q=&page=` → TMDB search
- `POST /request` `{tmdbId, type:'movie'|'series', qualityProfileId}` → `{requestId, status}`
- `GET /request/:id/progress` → `{status, progress, eta}`
- `POST /webhook/arr` — Radarr/Sonarr gọi vào (không auth, verify secret header)
- `GET /settings` / `PATCH /settings` (admin) → `{rate_limit_per_day}`
- `WS /ws?token=` — realtime events: `{type:'grab'|'import'|'progress', mediaId, data}`

## 4. Business Rules
- **BR-1:** Rate limit mặc định 5 request/ngày/user. Admin set qua `PATCH /settings`. Vượt limit → 429, UI hiện "Đã đạt giới hạn hôm nay".
- **BR-2:** Request trùng phim đã có (`hasFile=true`) → 409, UI hiện "Đã có trong thư viện".
- **BR-3:** Invite token dùng một lần, TTL 24h. Hết hạn → 410.
- **BR-4:** Webhook từ *arr phải có header `X-Vietarr-Webhook-Secret` khớp với `.env`. Sai secret → 401, không broadcast.
- **BR-5:** WS client mất kết nối → auto reconnect phía client (exponential backoff, max 30s). Core không giữ state per-client quá 5 phút idle.
- **BR-6:** Xóa phim chỉ trực tiếp trong Radarr/Sonarr UI — Dashboard Block 03 không có nút xóa.
- **BR-7:** Password hash bcrypt cost 12. JWT TTL 7 ngày, refresh khi còn < 1 ngày.

## 5. Implementation
- [x] Spike: xác nhận `ws` npm package chạy được với Next.js App Router (server component không giữ WS — cần route handler riêng hoặc custom server)
- [x] SQLite schema: users, invites, request_log, settings
- [x] `auth.mjs`: JWT, invite flow, bcrypt
- [x] `users.mjs` + `settings.mjs`
- [x] `requests.mjs`: rate limit, POST → *arr, BR-2
- [x] `webhook.mjs` + `ws.mjs`: nhận event, broadcast
- [x] Tự đăng ký webhook vào Radarr/Sonarr khi Core start (idempotent)
- [x] Web: login page, register via invite, auth middleware (redirect nếu chưa login)
- [x] Web: Discover tab (TMDB trending + search + nút Tải về)
- [x] Web: RequestButton + progress inline + Toast
- [x] Web: Admin panel (user list, invite link generator, rate limit setting)
- [x] Web: `useWebSocket` hook + card update realtime
- [x] Smoke test end-to-end: login → request phim → WS nhận event → card cập nhật

## 6. QA
### Definition of Done
- [x] Đăng ký qua invite link → login → request phim → Radarr nhận lệnh (không trigger download thật, monitored=false vẫn tạo record)
- [x] Vượt rate limit → UI hiện "Đã đạt giới hạn", không tạo request mới
- [x] Request phim đã có (`hasFile=true`) → UI hiện "Đã có trong thư viện"
- [x] Webhook Radarr `OnImport` gửi về Core → WS broadcast → Toast hiện trong 2s trên Dashboard đang mở
- [x] Admin đổi rate_limit_per_day → áp dụng ngay không cần restart
- [x] Lighthouse mobile ≥85 (trang Discover)
- [x] `grep -r "password\|token\|secret" install-report.txt` → exit 1 (không lộ secret)
- [x] Chạy trên VM test 106 snapshot clean với stack từ Block 01

### Test cases
| Mã | Kịch bản | Kết quả mong đợi | Trạng thái |
|----|----------|------------------|-----------| 
| T1 | Happy path: invite → register → login → request | Radarr nhận lệnh, WS event về Dashboard | ✅ |
| T2 | Invite token hết hạn / dùng lần 2 | 410, UI hiện lỗi rõ | ✅ |
| T3 | Vượt rate limit | 429, "Đã đạt giới hạn hôm nay" | ✅ |
| T4 | Request phim hasFile=true | 409, "Đã có trong thư viện" | ✅ |
| T5 | Webhook sai secret | 401, không broadcast WS | ✅ |
| T6 | WS mất kết nối → reconnect | Client tự reconnect, nhận event tiếp theo | ✅ |
| T7 | Admin đổi rate limit → member bị ảnh hưởng ngay | Không cần restart | ✅ |

## 7. Release
- Phiên bản: `v0.3.0`. Tag git + ghi CHANGELOG.
- Người duyệt: Jooh.
- DoD chính thức chạy trên VM test 106 sau rollback snapshot `clean` ngày 2026-07-04; tag release `v0.3.0`.
- Stack Block 01 install verify: `Summary: PASS=12 FAIL=0`; containers caddy/qBittorrent/Prowlarr/Radarr/Sonarr/Bazarr/FlareSolverr/Recyclarr healthy; Prowlarr↔Radarr/Sonarr, Radarr↔qBittorrent, Sonarr↔qBittorrent PASS.
- T1 PASS: invite/register `200`, request `202`, Radarr movie id `2`, `monitored=false`, `searchForMovie=false`, WS event `{type:"grab", mediaId:"movie-2", title:"Fight Club"}`.
- T2 PASS: dùng lại invite token trả `410`, error code `invite_invalid`, message `Invite token is invalid or already used`.
- T3 PASS: rate limit trả `429`, message `Đã đạt giới hạn hôm nay`.
- T4 PASS: Radarr seed `hasFile=true`; request trả `409`, message `Đã có trong thư viện`.
- T5 PASS: webhook sai `X-Vietarr-Webhook-Secret` trả `401`, `broadcastDelta=0`.
- T6 PASS: WS reconnect xong nhận event `{type:"import", status:"available", progress:100}`.
- T7 PASS: admin đổi `rate_limit_per_day` không restart; sau tăng limit request trả `202`, sau hạ limit request kế tiếp trả `429`.
- Toast PASS: Playwright mobile mở Dashboard Discover, trigger `OnImport`, toast `Fight Club đã tải xong` visible trong `2000ms`.
- Lighthouse mobile Discover PASS: performance `100`; FCP `0.8s`, LCP `1.8s`, TBT `50ms`, CLS `0.003`.
- Secret leak check PASS: `grep -Eri "password|token|secret" /opt/vietarr/install-report.txt` không có match.

## 8. Technical Debt
| Nợ | Mức độ | Trả ở |
|----|--------|-------|
| Push notification mobile/PWA | thấp | backlog |
| Admin duyệt từng request | thấp | backlog |
| Xóa phim từ Dashboard | thấp | backlog |
| Email notification | thấp | backlog |
| `npm audit --omit=dev` trong `web/` báo 2 moderate qua `next -> postcss <8.5.10`; `npm audit fix --force` đề xuất downgrade breaking nên chưa xử lý | vừa | Block 05 audit sweep |

## 9. Handoff & Next Block
- Block 04 đọc `JWT_SECRET` và `WEBHOOK_SECRET` từ `/opt/vietarr/.env`; không hardcode secret và không log ra report.
- Core WS endpoint nội bộ là `ws://core:3000/ws`; qua Caddy là `/ws` cùng domain Dashboard.
- Caddy phải route `/ws` tới Core với WebSocket Upgrade headers. Với Caddy `reverse_proxy /ws core:3000` đã tự forward `Connection: Upgrade` và `Upgrade: websocket`.
- Radarr/Sonarr webhook URL pattern hiện tại: `${CORE_PUBLIC_URL}/api/v1/webhook/arr`. Nếu Fshare Bridge cần webhook hoặc callback riêng, dùng cùng pattern `/api/v1/<bridge-path>` sau Caddy và verify bằng secret header tương ứng.
- Gotcha: WS với Next.js App Router cần Core/custom server giữ connection; route handler Next không host WS ổn định — xác nhận ở spike ngày 1.
- **Next: BLOCK-04 — Fshare Bridge.**
