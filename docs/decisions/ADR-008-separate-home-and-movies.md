# ADR-008: Tách Trang chủ và Phim lẻ

- **Ngày:** 2026-07-28 · **Trạng thái:** Accepted

## Bối cảnh

Sau khi Home Experience thay grid phim lẻ tại `/`, điều hướng không còn lối vào rõ ràng cho toàn bộ thư viện Radarr. Jooh yêu cầu cấu trúc `Trang chủ | Phim lẻ | Phim bộ | Khám phá | Admin` ngày 2026-07-28.

## Quyết định

- `/` tiếp tục là Home Experience.
- Thêm `/movies` làm trang thư viện phim lẻ đầy đủ từ contract B2 `GET /library/movies`.
- Giữ `/movies/:id` cho chi tiết phim và đổi liên kết quay lại sang `/movies`.
- `/series` tiếp tục chỉ dùng Sonarr làm nguồn chân lý theo ADR-003; khi Sonarr chưa có series, hiển thị nguyên nhân và lối sang Khám phá thay vì tự quét file torrent.
- Không thay đổi API Core hay contract B2/B3/B5.

## Hệ quả / đánh đổi

- Trang chủ và thư viện phim lẻ có vai trò rõ ràng, không phải hy sinh dashboard để lấy lại grid.
- Điều hướng có năm mục; trên màn hình hẹp tiếp tục cuộn ngang bằng cơ chế hiện có.
- File TV tải rời vẫn không xuất hiện cho đến khi được thêm/import vào Sonarr.
