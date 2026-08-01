# Block 09 — Home Library: Movies and Series

**Status:** APPROVED DESIGN  
**Date:** 2026-08-01  
**Depends on:** Block 07–08, ADR-003

## Goal

Trang chủ hiển thị rõ cả phim lẻ đã có file từ Radarr và phim bộ đã có ít nhất một tập từ Sonarr. Hai loại nội dung nằm ở hai hàng riêng để người dùng không nhầm series với movie hoặc với từng episode.

## Chosen approach

Trong vùng thư viện cuối trang chủ, thay hàng chung hiện tại bằng hai section độc lập:

1. **Phim lẻ của anh** — các movie có `status=available` từ `GET /library/movies`.
2. **Phim bộ của anh** — các series có `status=available` từ `GET /library/series`.

Không dùng tab và không trộn hai loại card trong cùng một grid. Mỗi series chỉ có một poster đại diện; không đưa từng episode lên trang chủ.

## Data flow

- Server Component trang chủ gọi `getMovies()` và `getSeries()` song song bằng `Promise.all`.
- Movie tiếp tục được chia thành `availableMovies` và `activityMovies`; hero, xem gần đây và “Đang tải và chờ” không đổi trong Block 09.
- Series chỉ tham gia vùng thư viện khi Core trả `status=available`. Quy tắc hiện tại của Core đã xác định trạng thái này khi tổng `availableCount > 0` trên các season.
- Trạng thái stale của header là `movieStale || seriesStale`, để không che giấu lỗi của một trong hai nguồn.
- Không thêm API và không thay đổi contract Core.

## UI behavior

Mỗi section có:

- Tiêu đề, số lượng nội dung sẵn sàng và liên kết **Xem tất cả**.
- Movie card dùng `PosterCard` với `href=/movies/:id`.
- Series card dùng `PosterCard` với `href=/series/:id`; badge chất lượng giữ dạng `x/y tập` do Core cung cấp.
- Grid và kích thước poster dùng đúng token/layout hiện có, không tạo kiểu card mới.

Quy tắc empty state:

- Chỉ movie trống: ẩn section movie, vẫn hiện series.
- Chỉ series trống: ẩn section series, vẫn hiện movie.
- Cả hai trống: hiện một empty state chung “Chưa có nội dung sẵn sàng”.

Footer đổi thành: `VietArr · Thư viện từ Radarr & Sonarr · Khám phá từ TMDB`.

## Error handling

- Giữ cơ chế cache/stale hiện tại của từng request.
- Nếu một nguồn trả dữ liệu cache còn nguồn kia bình thường, vẫn render cả hai và bật cảnh báo stale ở header.
- Không biến lỗi Sonarr thành thư viện trống giả nếu `getSeries()` đã có fallback cache theo contract hiện tại.

## Accessibility and responsive behavior

- Heading của hai section có `aria-labelledby` riêng.
- “Xem tất cả” là liên kết có tên rõ loại nội dung.
- Thứ tự DOM: phim lẻ trước, phim bộ sau; giữ cùng thứ tự trên desktop và mobile.
- Không tạo horizontal overflow; breakpoint và poster grid dùng hệ thống hiện có.

## Testing and acceptance criteria

- Web test xác nhận trang chủ gọi đồng thời movie và series sources.
- Chỉ nội dung `available` xuất hiện trong hai section thư viện.
- Series card trỏ đúng `/series/:id`, movie card trỏ đúng `/movies/:id`.
- Không render từng episode trong thư viện trang chủ.
- Mỗi section trống được ẩn độc lập; cả hai trống hiện empty state chung.
- Header stale khi một trong hai nguồn stale.
- Web lint/build/test pass.
- Production smoke xác nhận The Eternal Fragrance xuất hiện một poster trong “Phim bộ của anh”, còn bốn movie hiện tại vẫn ở “Phim lẻ của anh”.

## Non-goals

- Không đổi hero sang series.
- Không đưa series đang thiếu file vào “Đang tải và chờ”.
- Không thêm continue-watching theo episode.
- Không thay đổi trang `/movies`, `/series`, chi tiết hoặc tải episode.
- Không tạo bộ lọc quốc gia mới ở trang chủ.

## Release gate

Block 09 chỉ triển khai sau khi spec này được người dùng xác nhận. Production release cần CI xanh, smoke không tạo download request và ảnh/chức năng hiện tại không bị mất.
