# BLOCK-06 — HOME EXPERIENCE

> **Trạng thái:** RELEASED `v1.2.0` · **Kết thúc:** 2026-07-29
> **Phụ thuộc:** B2, B3, B5 · **Bắt đầu:** 2026-07-28

## 1. Vision

Trang `/` trở thành media dashboard hữu ích: người dùng thấy ngay một phim có thể xem, nội dung vừa mở, phim đang tải/chờ, gợi ý TMDB theo nhịp ngày/tuần/phổ biến và toàn bộ thư viện sẵn sàng.

## 2. Scope & Non-Goals

**Trong scope:**
- Hero chỉ từ phim có file thật.
- “Xem gần đây” lưu cục bộ trên trình duyệt.
- Tách hoạt động tải khỏi thư viện xem được.
- Feed TMDB Hôm nay/Tuần này/Phổ biến và lọc thể loại.
- Bộ lọc nhóm quốc gia trong Phim lẻ, Phim bộ và Khám phá theo ADR-009.
- Responsive 320/375/414/768px, keyboard/focus, reduced motion.
- Giữ route tree, auth và luồng request hiện có.

**Non-Goals:**
- Không giả playback progress hoặc dùng nhãn “Xem tiếp”.
- Không tích hợp Plex/Jellyfin/Trakt trong B6.
- Không autoplay carousel/video.
- Không thay đổi hành vi B2/B3/B5; ADR-009 chỉ thêm field metadata tương thích ngược.
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
- [x] Tách Home và thư viện phim lẻ theo ADR-008; thêm `/movies` và điều hướng năm mục.
- [x] Chuẩn hóa `countryGroups` và bộ lọc quốc gia theo ADR-009.
- [x] Nối trang chi tiết phim chưa có file vào luồng chọn nguồn tải B5 hiện có.
- [x] Chuẩn hóa tokens, responsive và accessibility.
- [x] Chạy QA và cập nhật handoff.

## 6. QA / Definition of Done

- [x] Core test: today/week/popular/genre map đúng TMDB path và validation.
- [x] Core full test PASS — 20/20.
- [x] Web lint/build PASS — 0 lỗi lint, Next production build thành công.
- [x] Không có hero từ phim chưa có file — selection chỉ từ `availableMovies`.
- [x] Discovery error không làm mất thư viện — browser smoke PASS.
- [x] Responsive không horizontal scroll tại 320/375/414/768px — browser metrics PASS.
- [x] Keyboard focus/tab semantics và reduced motion PASS — ArrowLeft/Right/Home/End + global focus ring.
- [x] Hallmark slop-test 58/58 PASS.
- [x] Production smoke PASS — Core/Web `sha-2b76ec7` healthy; feed hôm nay/tuần trả 20 mục, 19 thể loại và homepage authenticated trả HTTP 200 tại `vietarr.home.arpa`.
- [x] Follow-up production regression PASS — Web `sha-0d88186`; Hero 403px tại viewport desktop 720px; poster hoạt động và khám phá có ảnh thật, đúng khung; mobile 375px không tràn ngang.
- [x] Sonarr diagnostic PASS — API/root folder healthy nhưng thư viện thực tế có 0 series; UI không giả dữ liệu và hướng người dùng sang Khám phá.
- [x] Navigation production smoke PASS — Web `sha-6402324`; `/movies` trả 5 phim/5 poster, điều hướng đủ năm mục, `/series` hiển thị đúng Sonarr 0 bộ và CTA Khám phá.
- [x] Country filter browser regression PASS — lọc thư viện/Khám phá, phim hợp tác đa nhóm, `aria-pressed`, hit target mobile 44px và không tràn ngang tại 375px.
- [x] Country filter production smoke PASS — Core/Web `sha-69aa630`; Phim lẻ `Âu Mỹ 5`, Phim bộ `Trung Quốc 1`, Khám phá `Hàn Quốc 1 · Thái Lan 1 · Âu Mỹ 18`; lọc Hàn Quốc trả đúng `1 / 20` và mobile 375px không tràn ngang.
- [x] Movie detail download regression PASS — phim thiếu file hiện CTA tải, mở nguồn Bitmagnet, gửi release và cập nhật `37% · Đang tải`; phim sẵn sàng chỉ hiện PlayMenu; mobile 375px không tràn ngang và control cao 44px.
- [x] Movie detail production smoke PASS — Web `sha-34b5697`; `movie-6` hiện CTA và mở `ReleasePicker`, `movie-3` không có vùng tải và chỉ hiện PlayMenu/SMB; smoke test không gửi request tải thật.

## 7. Release

`=== BLOCK 06 COMPLETE ===`

- Version: `v1.2.0`
- Approved by Jooh: 2026-07-29
- Evidence: toàn bộ checklist §6 PASS; production smoke và handoff ghi tại §9.

## 8. Technical Debt

- Playback progress thật và đồng bộ đa thiết bị: để block tương lai có player telemetry.

## 9. Handoff & Next Block

- Core có hai endpoint JWT mới tại `/api/v1/home/discover` và `/api/v1/home/genres`; TMDB key không đi qua Web.
- Trang `/` dùng server data B2 cho hero/activity/library và client data B6 cho discovery, nên TMDB lỗi không làm mất thư viện.
- “Xem gần đây” lưu tối đa 12 movie ID trong `vietarr_recent_movies`; không có playback percentage.
- Production hiện chạy Core `sha-69aa630` và Web `sha-34b5697`; bản vá trang chi tiết chỉ recreate Web, không khởi động lại Core hay ứng dụng media nào khác.
- Bản vá follow-up giữ ảnh Khám phá trong containing block và giới hạn Hero theo viewport; kiểm tra desktop/mobile trên production bằng trình duyệt thật PASS.
- ADR-008 tách `/movies` khỏi Home và giữ `/series` trung thực với Sonarr; file TV tải rời cần được import vào Sonarr để xuất hiện.
- ADR-009 thêm bộ lọc quốc gia cục bộ; metadata thiếu mã quốc gia dùng ngôn ngữ gốc làm fallback và không gọi thêm API theo từng poster.
- Trang chi tiết phim thiếu file tái sử dụng `RequestButton` và `ReleasePicker`; không thêm endpoint hoặc cơ chế tải thứ hai.
- QA local và production smoke hoàn tất; Block giữ ACTIVE đến câu `APPROVED BLOCK 06`.
- Jooh gửi đúng câu `APPROVED BLOCK 06` ngày 2026-07-29; toàn bộ DoD PASS và Block 06 được release `v1.2.0`.
- Block tiếp theo: BLOCK-07 — Multi-source Release Search theo ADR-010.
