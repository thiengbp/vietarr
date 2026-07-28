# ADR-009: Nhóm quốc gia là bộ lọc phụ

- **Ngày:** 2026-07-28 · **Trạng thái:** Accepted

## Bối cảnh

Jooh duyệt đề xuất phân loại theo quốc gia trong Phim lẻ, Phim bộ và Khám phá, nhưng không thêm mục điều hướng hay các hàng Trang chủ. Radarr/Sonarr chủ yếu trả ngôn ngữ gốc; TMDB phim bộ có thể trả thêm `origin_country`.

## Quyết định

- Thêm trường tương thích ngược `countryGroups` vào `MediaSummary` và `DiscoverItem`.
- Các nhóm ổn định: `vietnam`, `china`, `korea`, `japan`, `thailand`, `western`, `other`.
- Ưu tiên mã quốc gia nguồn; khi nguồn không có, suy ra từ ngôn ngữ gốc. Phim hợp tác có thể thuộc nhiều nhóm.
- UI dùng nhãn `Việt Nam`, `Trung Quốc`, `Hàn Quốc`, `Nhật Bản`, `Thái Lan`, `Âu Mỹ`, `Khác`; chỉ hiện chip có kết quả và luôn có `Tất cả`.
- Bộ lọc chạy trên tập kết quả hiện tại, không tạo thêm request hay thay đổi hành vi tải.

## Hệ quả / đánh đổi

- Bộ lọc hoạt động thống nhất giữa thư viện và TMDB mà không lộ API key hay gọi chi tiết cho từng poster.
- Với nguồn chỉ có ngôn ngữ gốc, nhóm là suy luận UX chứ không phải tuyên bố quốc tịch sản xuất tuyệt đối.
- Đây là ngoại lệ additive, tương thích ngược cho contract B2/B3 đã freeze; client cũ bỏ qua trường mới.
