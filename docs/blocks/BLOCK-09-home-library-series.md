# BLOCK-09 — HOME LIBRARY MOVIES AND SERIES

> **Trạng thái:** ACTIVE

## Scope

- Tách “Phim lẻ của anh” và “Phim bộ của anh” trên trang chủ.
- Radarr và Sonarr được tải song song; chỉ nội dung `available` xuất hiện.
- Không thay đổi hero, activity rail, Core API hoặc download flow.

## Definition of Done

- [ ] Pure model tests PASS.
- [ ] Web lint/build PASS.
- [ ] Movie và series section ẩn độc lập khi trống.
- [ ] Header stale nếu Radarr hoặc Sonarr stale.
- [ ] Production hiển thị đúng movie và series card/link.
- [ ] Smoke không tạo download request.

## Evidence

- Chờ CI và production smoke.
