# ADR-010: Tổng hợp nguồn tải qua provider có kiểm soát

- **Ngày:** 2026-07-29 · **Trạng thái:** Accepted

## Bối cảnh

VietArr hiện tìm release qua Core → Prowlarr → Bitmagnet. Người dùng muốn kết quả có thể bao gồm BT4G và BTDig thay vì chỉ thấy nguồn đã cấu hình trong Prowlarr.

Hai website này không phải tracker BitTorrent. Chúng là công cụ tìm kiếm metadata/magnet, tương tự phần tìm kiếm DHT mà Bitmagnet đã cung cấp. Tại thời điểm ra quyết định, kiểm tra ngoài production từng cho thấy:

- Kho definition chính thức của Prowlarr và Jackett không có adapter BT4G/BTDig.
- BT4G trả Cloudflare challenge cho request tìm kiếm tự động.
- BTDig có lúc trả trang Google reCAPTCHA cho request tìm kiếm tự động.
- Prowlarr hỗ trợ custom Cardigann definition, Generic Torznab và proxy FlareSolverr theo từng indexer; đây là extension point được duy trì chính thức.

## Quyết định

- Core là nơi duy nhất tổng hợp release; Web không scrape hay gọi trực tiếp website nguồn.
- Chuẩn hóa nguồn qua giao diện `ReleaseProvider`. `ProwlarrProvider` tiếp tục là provider bắt buộc và có thể gom Bitmagnet, custom Cardigann hoặc Torznab đã được quản trị viên cấu hình.
- Chỉ bật một nguồn website khi có API/Torznab/Cardigann machine-readable ổn định và vượt capability check từ chính môi trường production mà không cần người thao tác.
- Có thể dùng FlareSolverr cho Cloudflare challenge thông thường. Không tự động giải, thuê dịch vụ giải hoặc tìm cách vượt CAPTCHA/reCAPTCHA.
- BT4G chỉ được bật sau PoC custom Cardigann + FlareSolverr đạt yêu cầu. BTDig giữ trạng thái `unavailable` đến khi custom Cardigann ổn định và không còn bắt CAPTCHA đối với luồng production.
- Kết quả từ nhiều provider được chuẩn hóa, khử trùng lặp theo info hash và gộp nhãn nguồn. Lỗi/timeout một provider trả kết quả một phần từ provider còn khỏe thay vì làm hỏng toàn bộ tìm kiếm.
- Giữ tương thích ngược contract B5; các trường trạng thái provider và danh sách nguồn là phần mở rộng additive.

## Lý do & phương án đã loại

- **Scrape trực tiếp trong Web/Core:** loại vì giao diện HTML và anti-bot thay đổi không báo trước, dễ lộ cookie/proxy, khó kiểm thử và vi phạm ranh giới Web → Core.
- **Tự vượt CAPTCHA bằng browser automation hoặc solver:** loại vì không bền vững, tạo rủi ro vận hành/pháp lý và biến một người dùng gia đình thành dịch vụ né kiểm soát truy cập.
- **Chạy thêm một DHT crawler:** loại vì Bitmagnet đã đảm nhiệm vai trò này; thêm crawler trùng chức năng nhưng tăng tài nguyên và độ phức tạp.
- **Hứa luôn có đủ BT4G/BTDig:** loại vì khả dụng của website ngoài quyền kiểm soát VietArr. UI phải nói đúng `ok`, `degraded` hoặc `unavailable`.

## Hệ quả / đánh đổi

- VietArr có kiến trúc mở rộng được cho nhiều nguồn nhưng vẫn giữ API key, cookie và proxy ở phía server.
- Kết quả tìm kiếm có thể là kết quả một phần; UI phải hiển thị trạng thái nguồn thay vì giả rằng không có torrent.
- BT4G/BTDig không được bật chỉ vì có ADR này. Mỗi nguồn cần PoC và fixture test riêng trước khi production enable.
- Block 07 triển khai quyết định; Block 06 và contract đã release trước đó không bị thay đổi hành vi.

## Kết quả capability gate ngày 2026-07-29

- BT4G: direct request và FlareSolverr đều thất bại ở TLS/challenge; tiếp tục `unavailable`, không cài definition và không bypass.
- BTDig: từ đúng VM production trả HTTP 200, có magnet và không có CAPTCHA. Managed Cardigann definition đã PASS Prowlarr test, được enable và trả info hash/magnet end-to-end qua Core.
- BTDig không công bố số seed/leech trực tiếp. Definition phải dùng numeric sentinel để tương thích Cardigann, nhưng Core chuyển sentinel này thành `null` để Web không trình bày như số đo thật.

## Tài liệu tham chiếu

- Prowlarr: custom YML/Cardigann, Generic Torznab và per-indexer proxy — <https://github.com/Prowlarr/Prowlarr>
- Servarr Prowlarr Quick Start — <https://wiki.servarr.com/en/prowlarr/quick-start-guide>
- Jackett tracker requirements: ưu tiên API, hạn chế scrape và multi-page parsing — <https://github.com/Jackett/Jackett/wiki/How-to-request-a-new-tracker>
- FlareSolverr — <https://github.com/FlareSolverr/FlareSolverr>
- Bitmagnet — <https://github.com/bitmagnet-io/bitmagnet>
