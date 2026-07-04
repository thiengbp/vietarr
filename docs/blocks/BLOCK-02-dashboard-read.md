# BLOCK-02 — DASHBOARD READ-ONLY
> **Trạng thái:** RELEASED · **Phụ thuộc:** B1 (.env contract) + PoC Infuse deep link PASS

## 1. Vision
Mở `vietarr.home.arpa` trên điện thoại/máy tính → thấy toàn bộ thư viện dạng poster grid như web xem phim; bấm một phim → trang chi tiết đẹp → bấm "Xem" mở thẳng Infuse (hoặc VLC / copy SMB).

## 2. Scope & Non-Goals
**Scope:** Core read-only API (API.md mục B2) · web Next.js: trang thư viện (phim lẻ/phim bộ), trang chi tiết, PlayMenu, EmptyState, skeleton · HTTP stream proxy có Range · trạng thái phụ đề từ Bazarr · responsive mobile-first theo Design_System.
**Non-Goals:** KHÔNG tìm kiếm TMDB, KHÔNG nút Tải về, KHÔNG auth/user, KHÔNG realtime progress, KHÔNG Fshare — write/auth thuộc B3, Fshare nằm ngoài roadmap hiện tại.

## 3. Architecture
`core/` Express + better-sqlite3 (SQLite cache fallback cho kết quả *arr) · `web/` Next.js App Router, fetch từ Core, không gọi thẳng *arr. Interface Contract: API.md mục B2 (freeze khi Release).

## 4. Business Rules
BR-1: Radarr/Sonarr down → Dashboard vẫn render từ cache + banner cảnh báo, không trắng trang. BR-2: httpStreamUrl chỉ trả về khi container là MP4/H.264+AAC. BR-3: Không lộ API key *arr xuống client — mọi request qua Core.

## 5. Implementation
- [x] 1. API contract detail: bổ sung schema B2 vào `docs/API.md`, giữ `/opt/vietarr/.env` là nguồn config duy nhất từ B1.
- [x] 2. Core scaffold: Node 22 + Express + better-sqlite3, đọc `.env`, SQLite cache fallback, health endpoint.
- [x] 3. Core library API: Radarr movies, Sonarr series, detail movie, Bazarr subtitle status, lỗi upstream dùng cache + warning.
- [x] 4. Core play/stream API: Infuse/VLC/SMB options, HTTP Range proxy, chỉ bật `httpStreamUrl` cho MP4/H.264+AAC.
- [x] 5. Web scaffold: Next.js 15 App Router + Tailwind, theme theo Design System, fetch chỉ qua Core.
- [x] 6. Web views: poster grid phim lẻ/phim bộ, detail page, PlayMenu, EmptyState, skeleton, mobile-first responsive.
- [x] 7. Smoke checks trước DoD: type/build/lint cơ bản và API smoke local nếu có mock hoặc env thật.

## 6. QA
**DoD khung:** grid ≥100 phim mượt trên iPhone · deep link Infuse mở phát được file thật · Lighthouse mobile ≥85 · kill Radarr → BR-1 đúng.

## 7. Release
- Phiên bản: `v0.2.0`.
- Người duyệt: Jooh.

### DoD Official 2026-07-03 — PASS
- Source commit tested: `a98646f` (`fix: avoid caching core read responses`) plus temporary deployment on production host `10.10.10.50`.
- Deployment under test:
  - `vietarr-core-dod` and `vietarr-web-dod` run as temporary containers on Docker network `media`.
  - Caddy route `http://vietarr.home.arpa` proxies `/api/v1/*` to `vietarr-core-dod:3000` and all other paths to `vietarr-web-dod:3000`.
  - Evidence artifacts saved locally under `/private/tmp/vietarr-block02-dod/`.
- Precondition verified:
  - `vietarr.home.arpa` resolves to `10.10.10.50`.
  - Radarr movie count via Core: `101`.
  - Real imported file: `movie-101` / `A Gift From Heaven`, `status=available`, `quality=WEBDL-1080p`, path `/data/media/movies/A Gift From Heaven (2026)/Bau.Vat.Troi.Cho.2025.1080p.WEB-DL.AAC.2.0.H.264-HBO.mkv`, size `5474484168`.
- (1) Grid `>=100` phim mượt trên iPhone: **PASS**.
  - Playwright iPhone 13 check at `http://vietarr.home.arpa`: `cards=101`, `loadMs=1875`, `smooth=true`.
  - Screenshot: `/private/tmp/vietarr-block02-dod/iphone-grid.png`.
- (2) Deep link Infuse mở Core stream file thật có Range: **PASS**.
  - Play options for `movie-101`: `infuse://x-callback-url/play?url=http%3A%2F%2Fvietarr.home.arpa%2Fapi%2Fv1%2Fstream%2Fmovie-101`.
  - `open <infuseUrl>` returned `OPEN_EXIT=0`; macOS process list showed `Infuse`.
  - Core stream through Caddy with `Range: bytes=0-1023` returned:
    - `HTTP/1.1 206 Partial Content`
    - `Accept-Ranges: bytes`
    - `Content-Range: bytes 0-1023/5474484168`
    - `Content-Length: 1024`
    - `Content-Type: video/x-matroska`
- (3) Lighthouse mobile `>=85`: **PASS**.
  - Lighthouse mobile performance score: `100`.
  - Metrics: FCP `0.1 s`, LCP `1.3 s`, TBT `10 ms`, CLS `0`, Speed Index `0.7 s`.
  - Report: `/private/tmp/vietarr-block02-dod/lighthouse-mobile.json`.
- (4) Kill Radarr -> banner hiện, không trắng trang: **PASS**.
  - Test sequence: `docker stop radarr`, request `http://vietarr.home.arpa/api/v1/library/movies`, Playwright iPhone reload, then `docker start radarr`.
  - Core response while Radarr down: `HTTP/1.1 200 OK`, `X-Vietarr-Cache: stale`, `Content-Length: 51714`.
  - Playwright iPhone check while Radarr down: `cards=101`, `banner=true`, `blank=false`.
  - Screenshot: `/private/tmp/vietarr-block02-dod/iphone-stale-cache.png`.
  - Radarr restarted and returned `RADARR_STATUS=healthy`.
- Decision: DoD passed. Jooh approved release; tag `v0.2.0` created.

### DoD Attempt 2026-07-03 — FAIL/BLOCKED
- Test request: run official Block 02 DoD at `vietarr.home.arpa` with real library and real Infuse/Core stream.
- Environment discovery:
  - `curl -I -L http://vietarr.home.arpa --max-time 5` from the DoD machine failed DNS resolution: `Could not resolve host: vietarr.home.arpa`.
  - Production media host `jooh@10.10.10.50` has running stack containers: `caddy`, `radarr`, `sonarr`, `bazarr`, `prowlarr`, `qbittorrent`.
  - VM test 106 (`jooh@10.10.10.51`) has Block 01 stack but Radarr movie count is `0`.
  - Production Radarr API returned movie count `1`; sample movie `Citizen Vigilante` has `hasFile=false` and `movieFile.path=null`.
  - Production Sonarr API returned series count `1`.
  - Production filesystem video count under `/mnt/media`, `/data`, `/media` is `1`; only sample found: `/mnt/media/data/media/movies/Bau.Vat.Troi.Cho.2025/Bau.Vat.Troi.Cho.2025.1080p.WEB-DL.AAC.2.0.H.264-HBO.mkv`.
- DoD result:
  - (1) Grid `>=100` phim trên iPhone: **FAIL/BLOCKED** — Radarr has `1` movie, VM test has `0`; no source library with `>=100` movies exists.
  - (2) Infuse deep link opens Core stream with Range and real file: **BLOCKED** — no Radarr movie currently points to the real MKV file, so `/stream/:fileId` cannot be exercised honestly against a real Radarr media id.
  - (3) Lighthouse mobile `>=85`: **BLOCKED** — `vietarr.home.arpa` does not resolve from the DoD machine and the app was not deployed to the domain.
  - (4) Kill Radarr shows cache banner, no blank page: **BLOCKED** — official domain deployment and seeded Core cache require a library source first.
- Decision: DoD not passed; no tag created; do not advance to Block 03. Need Jooh to provide/approve one of:
  1. Radarr library with `>=100` movies and at least one movie file indexed.
  2. A synthetic DoD fixture/mocked Radarr API explicitly approved for UI/Lighthouse, while deep-link stream uses the one real MKV.
  3. Permission to import/index existing media into Radarr before rerunning official DoD.

## 8. Technical Debt
| Nợ | Mức độ | Evidence | Trả ở |
|----|--------|----------|-------|
| `npm audit` trong `web/` còn 2 moderate vulnerabilities: `next` affected via bundled `postcss <8.5.10` (`GHSA-qx2v-qp2m-jg93`, XSS via unescaped `</style>` in CSS stringify output). Không có high/critical. `npm audit fix --force` đề xuất downgrade/major path không phù hợp để làm trong B2. | Moderate | `npm audit --json`: `moderate=2`, `high=0`, `critical=0`, direct `next`, transitive `postcss`. | Block 04 checklist release public: audit sạch mức high bắt buộc; xem lại moderate khi Next/PostCSS có bản vá an toàn. |

## 9. Handoff
- Core `/stream/:fileId` trả `Accept-Ranges: bytes`; khi có Range header trả `206 Partial Content` + `Content-Range`. Content-Type detect theo extension (`.mkv` → `video/x-matroska`, `.mp4` → `video/mp4`).
- Core library endpoints luôn thử upstream trước; nếu Radarr/Sonarr lỗi và đã có SQLite cache, trả cache với header `X-Vietarr-Cache: stale`. Web dùng header này để hiện banner cảnh báo thay vì trắng trang.
- **Next: BLOCK-03.**
