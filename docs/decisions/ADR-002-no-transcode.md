# ADR-002: Không transcode, phát qua Infuse/SMB
- **Ngày:** 2026-07-02 · **Trạng thái:** Accepted
## Bối cảnh
Web xem phim thường transcode server-side (Plex/Jellyfin) — tốn CPU/GPU, phức tạp, trong khi người dùng mục tiêu đã có Infuse decode mọi codec ngay trên thiết bị.
## Quyết định
MVP không transcode. Nút "Xem" = deep link Infuse/VLC, copy SMB path, hoặc HTTP direct stream (chỉ khi codec trình duyệt chơi được).
## Hệ quả / đánh đổi
Không xem MKV/HEVC trong trình duyệt — chấp nhận, ghi rõ trong docs. Đổi lại chạy tốt trên NUC/NAS yếu, kiến trúc đơn giản hơn hẳn.
