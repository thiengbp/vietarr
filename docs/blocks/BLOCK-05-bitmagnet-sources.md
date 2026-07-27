# BLOCK-05 — NGUỒN TẢI BITMAGNET
> **Trạng thái:** ACTIVE
> **Phụ thuộc:** B3, B4 · **Bắt đầu:** 2026-07-27

## 1. Vision
Từ tab Khám phá, người dùng chọn một phim TMDB, xem ngay các release Bitmagnet đã index (chất lượng, dung lượng, seed/leech và magnet), rồi chọn đúng release để Radarr gửi sang qBittorrent và tiếp tục theo dõi tiến độ trong VietArr.

## 2. Scope & Non-Goals
**Trong scope:**
- Kết nối Bitmagnet vào Prowlarr bằng Generic Torznab.
- Core tìm release qua Prowlarr và chỉ trả dữ liệu đã làm sạch, không lộ API key.
- Modal chọn nguồn tải responsive, hỗ trợ bàn phím/focus/ESC.
- Chọn release cụ thể, thêm/monitor phim trong Radarr và push release sang download client.
- Giữ luồng Radarr tự chọn làm phương án dự phòng.

**Non-Goals:**
- Không scrape YTS, BT4G, BTDig hoặc website bên thứ ba.
- Không tự thêm tracker announce vào magnet.
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
- [ ] Production smoke: đăng nhập → mở nguồn của nội dung hợp pháp → thấy kết quả Bitmagnet.

## 7. Handoff & Next Block
- Production Prowlarr indexer `Bitmagnet` dùng Torznab endpoint nội bộ của NAS và đã sync sang Radarr/Sonarr.
- Prowlarr API key đã được rotate ngày 2026-07-27 sau khi proxy URL xuất hiện trong log chẩn đoán; Radarr/Sonarr indexer credentials đã cập nhật và Test PASS.
- Block giữ trạng thái ACTIVE đến khi production smoke hoàn tất và Jooh gửi đúng câu `APPROVED BLOCK 05`.
