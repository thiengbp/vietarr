# ROADMAP — VietArr

Mỗi Block là một milestone khóa chặt. Chỉ MỘT block ACTIVE tại một thời điểm.
Block chỉ được đánh RELEASED khi toàn bộ Definition of Done PASS.

| Block | Tên | Trạng thái | File |
|-------|-----|-----------|------|
| 01 | Installer & Zero-touch Wiring | 🟢 ACTIVE | docs/blocks/BLOCK-01-installer.md |
| 02 | Dashboard Read-only (thư viện + nút Xem) | ⚪ PLANNED | docs/blocks/BLOCK-02-dashboard-read.md |
| 03 | Dashboard Write (tìm TMDB, Tải về, user/auth) | ⚪ PLANNED | docs/blocks/BLOCK-03-dashboard-write.md |
| 04 | Fshare Bridge (tab dán link → Torznab → giả API qBittorrent) | ⚪ PLANNED | docs/blocks/BLOCK-04-fshare-bridge.md |
| 05 | Đóng gói phát hành (docs public, one-liner install, video) | ⚪ PLANNED | docs/blocks/BLOCK-05-release.md |

## Nguyên tắc chuyển block
1. DoD của block hiện tại: 100% PASS, có bằng chứng (log/screenshot) trong mục Release.
2. Mục Handoff & Next Block đã điền.
3. Jooh xác nhận bằng chữ "APPROVED BLOCK XX" trong conversation.
4. Cập nhật bảng trạng thái file này + CHANGELOG.md.

## PoC đã xác nhận trước khi bắt đầu (điều kiện tiên quyết Block 01–02)
- [ ] PoC-1: đọc API key từ config.xml + nối Prowlarr↔Radarr qua API
- [ ] PoC-2: Next.js render poster grid từ Radarr API
- [ ] PoC-3: deep link Infuse mở HTTP stream trên iPhone
