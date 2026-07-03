# BLOCK-02 — DASHBOARD READ-ONLY
> **Trạng thái:** IN PROGRESS · **Phụ thuộc:** B1 (.env contract) + PoC Infuse deep link PASS

## 1. Vision
Mở `vietarr.home.arpa` trên điện thoại/máy tính → thấy toàn bộ thư viện dạng poster grid như web xem phim; bấm một phim → trang chi tiết đẹp → bấm "Xem" mở thẳng Infuse (hoặc VLC / copy SMB).

## 2. Scope & Non-Goals
**Scope:** Core read-only API (API.md mục B2) · web Next.js: trang thư viện (phim lẻ/phim bộ), trang chi tiết, PlayMenu, EmptyState, skeleton · HTTP stream proxy có Range · trạng thái phụ đề từ Bazarr · responsive mobile-first theo Design_System.
**Non-Goals:** KHÔNG tìm kiếm TMDB, KHÔNG nút Tải về, KHÔNG auth/user, KHÔNG realtime progress, KHÔNG Fshare — tất cả thuộc B3/B4.

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
- Chưa chạy DoD khi chưa có duyệt của Jooh.

## 8. Technical Debt
| Nợ | Mức độ | Evidence | Trả ở |
|----|--------|----------|-------|
| `npm audit` trong `web/` còn 2 moderate vulnerabilities: `next` affected via bundled `postcss <8.5.10` (`GHSA-qx2v-qp2m-jg93`, XSS via unescaped `</style>` in CSS stringify output). Không có high/critical. `npm audit fix --force` đề xuất downgrade/major path không phù hợp để làm trong B2. | Moderate | `npm audit --json`: `moderate=2`, `high=0`, `critical=0`, direct `next`, transitive `postcss`. | Block 05 checklist release public: audit sạch mức high bắt buộc; xem lại moderate khi Next/PostCSS có bản vá an toàn. |

## 9. Handoff
- Core `/stream/:fileId` trả `Accept-Ranges: bytes`; khi có Range header trả `206 Partial Content` + `Content-Range`. Content-Type detect theo extension (`.mkv` → `video/x-matroska`, `.mp4` → `video/mp4`).
- Core library endpoints luôn thử upstream trước; nếu Radarr/Sonarr lỗi và đã có SQLite cache, trả cache với header `X-Vietarr-Cache: stale`. Web dùng header này để hiện banner cảnh báo thay vì trắng trang.
- **Next: BLOCK-03.**
