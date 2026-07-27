# ADR-007: Trang chủ theo mô hình Ecosystem Index

- **Ngày:** 2026-07-28 · **Trạng thái:** Accepted

## Bối cảnh

Route `/` hiện chỉ render một grid phim lẻ. Khi thư viện có ít phim, phần lớn màn hình trống; người dùng không nhìn thấy phim đang tải, nội dung vừa mở hay các gợi ý TMDB. Jooh đã duyệt đề xuất polish trang chủ ngày 2026-07-28.

VietArr phát qua Infuse/VLC/SMB và không nhận playback progress từ player, vì vậy nhãn “Continue Watching” sẽ không trung thực nếu chưa có tích hợp theo dõi phát.

## Quyết định

- Giữ route tree hiện có; `/` trở thành Home Experience nhưng vẫn là điểm vào thư viện phim lẻ.
- Dùng macrostructure **Ecosystem Index**: hero phim sẵn sàng, lịch sử xem gần đây, hoạt động tải, một vùng discovery có tab và thư viện xem được.
- Hero chỉ chọn phim `available` có backdrop/poster thật từ API B2.
- Dùng nhãn “Xem gần đây”, lưu tối đa 12 ID phim trong localStorage khi người dùng mở trang chi tiết. Không hiển thị phần trăm phát.
- Gộp `Hôm nay`, `Tuần này`, `Phổ biến` thành tab trong một shelf. Thể loại là chip lọc cùng shelf, không tạo hàng rỗng.
- Thêm API B6 `/home/discover` và `/home/genres`; TMDB key vẫn chỉ nằm ở Core.
- Phim `downloading`, `queued`, `missing`, `unknown` nằm trong vùng hoạt động, không trộn với thư viện sẵn sàng.
- Giữ palette xanh-đen/cam hổ phách ADR-004, typography và spacing của `docs/Design_System.md`; không thêm motion library.

## Hệ quả / đánh đổi

- Trang chủ hữu ích ngay với dữ liệu thật và không cần Plex/Jellyfin.
- Lịch sử xem gần đây chỉ đồng bộ trên từng trình duyệt. Đồng bộ playback progress thật là non-goal của B6.
- Hai endpoint Core mới cần JWT nhưng không thay đổi contract B2/B3/B5 đã freeze.
- Discovery phụ thuộc TMDB; khi lỗi, thư viện local vẫn render và shelf đưa nút thử lại.
