# BLOCK-05 — NGUỒN TẢI BITMAGNET
> **Trạng thái:** RELEASED `v1.1.0` · **Kết thúc:** 2026-07-28
> **Phụ thuộc:** B3, B4 · **Bắt đầu:** 2026-07-27

## 1. Vision
Từ tab Khám phá, người dùng chọn một phim TMDB, xem ngay các release Bitmagnet đã index (chất lượng, dung lượng, seed/leech và magnet), rồi chọn đúng release để Radarr gửi sang qBittorrent và tiếp tục theo dõi tiến độ trong VietArr.

## 2. Scope & Non-Goals
**Trong scope:**
- Kết nối Bitmagnet vào Prowlarr bằng Generic Torznab.
- Core tìm release qua Prowlarr và chỉ trả dữ liệu đã làm sạch, không lộ API key.
- Tìm cả phim lẻ/phim bộ từ TMDB; phim bộ được xem và sao chép Magnet từ danh mục TV của Bitmagnet.
- Modal chọn nguồn tải responsive, hỗ trợ bàn phím/focus/ESC.
- Chọn release cụ thể, thêm/monitor phim trong Radarr và push release sang download client.
- Giữ luồng Radarr tự chọn làm phương án dự phòng.

**Non-Goals:**
- Không scrape YTS, BT4G, BTDig hoặc website bên thứ ba.
- Không tự thêm tracker announce vào magnet.
- Không tự động gửi release phim bộ sang Sonarr trong B5; phim bộ chỉ hiển thị nguồn/Magnet.
- Không thay đổi contract B2/B3 đã freeze.
- Không xác minh hay cấp quyền bản quyền nội dung; người dùng chỉ được tải nội dung họ có quyền truy cập.
- Không mở API key Prowlarr/Bitmagnet ra Web.

## 3. Architecture
```
Dashboard → Core GET releases → Prowlarr → Bitmagnet Torznab
Dashboard → Core POST selected release → Radarr release/push → qBittorrent
```

Core dựng magnet sạch từ `infoHash`; URL proxy của Prowlarr chứa API key không đi qua boundary Core/Web. Khi tải, Core tìm lại release theo ID ổn định để không chấp nhận magnet do client tự gửi.

## 4. Interface Contract
Xem `docs/API.md`, mục B5.

## 5. Business Rules
- **BR-1:** Chỉ user đã đăng nhập mới xem/chọn release.
- **BR-2:** Release được sắp theo seeders giảm dần; tối đa 50 kết quả.
- **BR-3:** Release phải có info hash hợp lệ; kết quả không có info hash bị loại.
- **BR-4:** Mọi URL chứa Prowlarr API key phải bị loại trước khi response rời Core.
- **BR-5:** Chọn release vẫn áp dụng rate limit, kiểm tra phim đã có và kiểm tra download client như request thường.

## 6. QA / Definition of Done
- [x] Prowlarr Test Bitmagnet PASS và indexer được đồng bộ sang Radarr/Sonarr.
- [x] Core test: Prowlarr proxy URL chứa API key không xuất hiện trong response release.
- [x] Core test: release ID không hợp lệ/hết hạn bị từ chối.
- [x] Core test: release hợp lệ được push tới Radarr với magnet và TMDB ID đúng.
- [x] Web lint/build PASS.
- [x] Modal dùng được ở 390px và desktop; ESC đóng, focus quay lại nút mở.
- [x] Production smoke: token 5 phút → TMDB Big Buck Bunny → 2 release Bitmagnet đã lọc; magnet hợp lệ, không lộ Prowlarr URL/API key.

## 7. Handoff & Next Block
- Production Prowlarr indexer `Bitmagnet` dùng Torznab endpoint nội bộ của NAS và đã sync sang Radarr/Sonarr.
- Prowlarr API key đã được rotate ngày 2026-07-27 sau khi proxy URL xuất hiện trong log chẩn đoán; Radarr/Sonarr indexer credentials đã cập nhật và Test PASS.
- Sau khi phát hiện credential drift trên production, application credentials Radarr/Sonarr trong Prowlarr đã được cập nhật từ khóa hiện hành rồi full-sync; Prowlarr→Radarr/Sonarr và Radarr/Sonarr→Prowlarr/Bitmagnet đều Test PASS, log 401 hai phút gần nhất bằng 0.
- TMDB search chuẩn hóa tên release có dấu chấm/gạch dưới và gộp cả phim lẻ/phim bộ; phim bộ hiển thị Magnet từ Prowlarr TV nhưng chưa tự động gửi Sonarr trong B5.
- Radarr release rejection được trả về ngay và request thủ công không có queue quá 90 giây chuyển `not_found` thay vì treo `queued`.
- Lỗi gửi release luôn hiển thị ngay dưới header của modal; client dừng chờ sau 45 giây và request `failed`/`not_found` không còn tiêu hao hạn mức ngày.
- Production `sha-7589aea`: query `the.eternal.fragrance` trả đúng series `Thiên Hương` (TMDB 251600), endpoint TV trả 19 release Bitmagnet sạch; bốn request The Odyssey cũ chuyển `not_found`, qBittorrent không có torrent giả.
- Production `sha-31c9a9f`: Core/Web healthy; hạn mức admin `raw=5`, hiệu lực `2/5`; lookup The Odyssey trả 36 nguồn trong 0,9 giây; toàn bộ qBittorrent vẫn có 0 torrent sau lần bấm bị chặn.
- Production qBittorrent đã bật Automatic Torrent Management và category paths: Interstellar tiếp tục tải tại `/data/torrents/movies`, The Eternal Fragrance tại `/data/torrents/tv`; thư mục gốc không còn dữ liệu rời.
- ADR-006 được Jooh duyệt ngày 2026-07-28: media root vật lý đổi sang `/volume1/media/{torrents,library}`, container giữ một mount `/data`, thư viện *arr đổi sang `/data/library/{movies,tv}` để cấu trúc NAS rõ ràng mà vẫn hardlink.
- Webhook callback dùng URL nội bộ `http://core:3000/api/v1/webhook/arr`; không đi vòng qua home-domain DNS/Caddy TLS.
- Block đã giữ trạng thái ACTIVE đến khi production smoke hoàn tất và Jooh gửi đúng câu `APPROVED BLOCK 05`.
- Jooh gửi đúng câu `APPROVED BLOCK 05` ngày 2026-07-28; toàn bộ DoD đã PASS và Block 05 được release `v1.1.0`.
- Block tiếp theo: BLOCK-06 — Home Experience. B2/B3/B5 giữ nguyên; UI trang chủ dùng API B6 mới cho các feed TMDB.

## 8. Release

`=== BLOCK 05 COMPLETE ===`

- Version: `v1.1.0`
- Approved by Jooh: 2026-07-28
- Evidence: toàn bộ checklist §6 PASS; production smoke và handoff ghi tại §7.
