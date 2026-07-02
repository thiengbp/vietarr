# ADR-003: Thư viện đọc từ API Radarr/Sonarr, không tự quét file
- **Ngày:** 2026-07-02 · **Trạng thái:** Accepted
## Bối cảnh
Dashboard cần danh sách phim + poster + trạng thái. Tự quét thư mục thì phải xây scanner/matcher metadata — bài toán Jellyfin đã tốn nhiều năm.
## Quyết định
Nguồn chân lý thư viện là API Radarr/Sonarr (đã có TMDB metadata, poster, trạng thái file). Core chỉ cache/hợp nhất.
## Hệ quả / đánh đổi
File chép tay ngoài Radarr sẽ không hiện — chấp nhận; hướng dẫn user import qua Radarr. Đổi lại: 0 code scanner, thư viện luôn khớp automation.
