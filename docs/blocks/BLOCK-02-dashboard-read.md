# BLOCK-02 — DASHBOARD READ-ONLY
> **Trạng thái:** IN PROGRESS · **Phụ thuộc:** B1 (.env contract) + PoC Infuse deep link PASS

## 1. Vision
Mở `vietarr.home.arpa` trên điện thoại/máy tính → thấy toàn bộ thư viện dạng poster grid như web xem phim; bấm một phim → trang chi tiết đẹp → bấm "Xem" mở thẳng Infuse (hoặc VLC / copy SMB).

## 2. Scope & Non-Goals
**Scope:** Core read-only API (API.md mục B2) · web Next.js: trang thư viện (phim lẻ/phim bộ), trang chi tiết, PlayMenu, EmptyState, skeleton · HTTP stream proxy có Range · trạng thái phụ đề từ Bazarr · responsive mobile-first theo Design_System.
**Non-Goals:** KHÔNG tìm kiếm TMDB, KHÔNG nút Tải về, KHÔNG auth/user, KHÔNG realtime progress, KHÔNG Fshare — tất cả thuộc B3/B4.

## 3. Architecture
`core/` Express + better-sqlite3 (cache 60s kết quả *arr) · `web/` Next.js App Router, fetch từ Core, không gọi thẳng *arr. Interface Contract: API.md mục B2 (freeze khi Release).

## 4. Business Rules
BR-1: Radarr/Sonarr down → Dashboard vẫn render từ cache + banner cảnh báo, không trắng trang. BR-2: httpStreamUrl chỉ trả về khi container là MP4/H.264+AAC. BR-3: Không lộ API key *arr xuống client — mọi request qua Core.

## 5. Implementation
- [ ] 1. API contract detail: bổ sung schema B2 vào `docs/API.md`, giữ `/opt/vietarr/.env` là nguồn config duy nhất từ B1.
- [x] 2. Core scaffold: Node 22 + Express + better-sqlite3, đọc `.env`, cache SQLite 60s, health endpoint.
- [x] 3. Core library API: Radarr movies, Sonarr series, detail movie, Bazarr subtitle status, lỗi upstream dùng cache + warning.
- [x] 4. Core play/stream API: Infuse/VLC/SMB options, HTTP Range proxy, chỉ bật `httpStreamUrl` cho MP4/H.264+AAC.
- [x] 5. Web scaffold: Next.js 15 App Router + Tailwind, theme theo Design System, fetch chỉ qua Core.
- [ ] 6. Web views: poster grid phim lẻ/phim bộ, detail page, PlayMenu, EmptyState, skeleton, mobile-first responsive.
- [ ] 7. Smoke checks trước DoD: type/build/lint cơ bản và API smoke local nếu có mock hoặc env thật.

## 6. QA
**DoD khung:** grid ≥100 phim mượt trên iPhone · deep link Infuse mở phát được file thật · Lighthouse mobile ≥85 · kill Radarr → BR-1 đúng.

## 7. Release
- Chưa chạy DoD khi chưa có duyệt của Jooh.

## 8–9. Technical Debt / Handoff
(điền khi làm) · **Next: BLOCK-03.**
