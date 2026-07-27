# BLOCK-06 — HOME EXPERIENCE

> **Trạng thái:** ACTIVE
> **Phụ thuộc:** B2, B3, B5 · **Bắt đầu:** 2026-07-28

## 1. Vision

Trang `/` trở thành media dashboard hữu ích: người dùng thấy ngay một phim có thể xem, nội dung vừa mở, phim đang tải/chờ, gợi ý TMDB theo nhịp ngày/tuần/phổ biến và toàn bộ thư viện sẵn sàng.

## 2. Scope & Non-Goals

**Trong scope:**
- Hero chỉ từ phim có file thật.
- “Xem gần đây” lưu cục bộ trên trình duyệt.
- Tách hoạt động tải khỏi thư viện xem được.
- Feed TMDB Hôm nay/Tuần này/Phổ biến và lọc thể loại.
- Responsive 320/375/414/768px, keyboard/focus, reduced motion.
- Giữ route tree, auth và luồng request hiện có.

**Non-Goals:**
- Không giả playback progress hoặc dùng nhãn “Xem tiếp”.
- Không tích hợp Plex/Jellyfin/Trakt trong B6.
- Không autoplay carousel/video.
- Không thay đổi B2/B3/B5 contract.
- Không deploy production nếu chưa được yêu cầu rõ.

## 3. Architecture

```text
Home Server Component → B2 /library/movies → hero/activity/library
Home Client Shelf → B6 /home/discover + /home/genres → TMDB
Movie detail → localStorage recent IDs → Home recent rail
```

### Interface Contract

Xem `docs/API.md`, mục B6.

## 4. Business Rules

- **BR-1:** Hero và thư viện xem được chỉ nhận `status=available`.
- **BR-2:** Hoạt động tải nhận `downloading|queued|missing|unknown`, hiển thị đúng trạng thái API.
- **BR-3:** Lịch sử gần đây tối đa 12 phim, khử trùng lặp, mới nhất đứng trước.
- **BR-4:** Discovery lỗi không làm hỏng thư viện; UI có lỗi cụ thể và nút “Thử lại”.
- **BR-5:** Tab/chip dùng được bằng bàn phím, focus ring nhìn thấy, hit target mobile tối thiểu 44px.

## 5. Implementation

- [x] Ghi ADR-007 và API contract B6.
- [x] Thêm Core home feeds/genres và test.
- [x] Xây hero, recent/activity/discovery/library surfaces.
- [x] Chuẩn hóa tokens, responsive và accessibility.
- [x] Chạy QA và cập nhật handoff.

## 6. QA / Definition of Done

- [x] Core test: today/week/popular/genre map đúng TMDB path và validation.
- [x] Core full test PASS — 17/17.
- [x] Web lint/build PASS — 0 lỗi lint, Next production build thành công.
- [x] Không có hero từ phim chưa có file — selection chỉ từ `availableMovies`.
- [x] Discovery error không làm mất thư viện — browser smoke PASS.
- [x] Responsive không horizontal scroll tại 320/375/414/768px — browser metrics PASS.
- [x] Keyboard focus/tab semantics và reduced motion PASS — ArrowLeft/Right/Home/End + global focus ring.
- [x] Hallmark slop-test 58/58 PASS.
- [ ] Production smoke: Core/Web healthy, B6 feeds trả dữ liệu và homepage render đúng tại `vietarr.home.arpa`.

## 7. Release

- Dự kiến: `v1.2.0` sau khi Jooh gửi `APPROVED BLOCK 06`.

## 8. Technical Debt

- Playback progress thật và đồng bộ đa thiết bị: để block tương lai có player telemetry.

## 9. Handoff & Next Block

- Core có hai endpoint JWT mới tại `/api/v1/home/discover` và `/api/v1/home/genres`; TMDB key không đi qua Web.
- Trang `/` dùng server data B2 cho hero/activity/library và client data B6 cho discovery, nên TMDB lỗi không làm mất thư viện.
- “Xem gần đây” lưu tối đa 12 movie ID trong `vietarr_recent_movies`; không có playback percentage.
- QA local hoàn tất; Block giữ ACTIVE đến production smoke và câu `APPROVED BLOCK 06`.
