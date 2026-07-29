# BLOCK-07 — MULTI-SOURCE RELEASE SEARCH

> **Trạng thái:** ACTIVE
> **Phụ thuộc:** B5, B6 · **Bắt đầu:** 2026-07-29

## 1. Vision

Một lần tìm nguồn trong VietArr có thể tổng hợp các provider được phê duyệt, gộp torrent trùng nhau và cho người dùng biết rõ nguồn nào đang hoạt động, chậm hoặc không khả dụng.

## 2. Scope & Non-Goals

**Trong scope:**

- Tách `ProwlarrProvider` khỏi orchestration hiện tại bằng interface `ReleaseProvider`.
- Tìm provider song song với timeout/failure isolation; Prowlarr vẫn là provider bắt buộc.
- Chuẩn hóa release, khử trùng lặp theo info hash và gộp `sources`.
- Mở rộng additive response B5 bằng `partial`, `providers` và `ReleaseOption.sources`.
- Hiển thị trạng thái nguồn/kết quả một phần trong bộ chọn release.
- Hỗ trợ cài custom Prowlarr definition vào thư mục `Definitions/Custom` bằng installer có tính lặp lại.
- Thực hiện capability-gated PoC cho BT4G bằng custom Cardigann + FlareSolverr; giữ `unavailable` khi production không vượt qua TLS/challenge.
- Bật BTDig qua managed Cardigann chỉ sau capability check production không cần CAPTCHA và kiểm tra magnet end-to-end.
- Logging có cấu trúc, health và fixture test cho từng provider/definition.

**Non-Goals:**

- Không giải hoặc vượt CAPTCHA/reCAPTCHA.
- Không browser automation để scrape trang kết quả.
- Không đưa API key, cookie, proxy URL hoặc FlareSolverr endpoint xuống Web.
- Không hứa website bên thứ ba luôn khả dụng.
- Không triển khai thêm DHT crawler; Bitmagnet tiếp tục là DHT indexer chính.
- Không đổi luồng gửi release đã xác minh tới Radarr/qBittorrent của B5.

## 3. Architecture

```text
ReleasePicker
    ↓ JWT
Core release orchestration
    ├── ProwlarrProvider (bắt buộc)
    │     ├── Bitmagnet Torznab
    │     └── custom Cardigann/Torznab đã capability-check
    └── future stable API providers
          ↓ normalize → dedupe by infoHash → rank → provider status
```

Mỗi provider có timeout riêng và không được làm vượt tổng request budget. Provider lỗi trả trạng thái `degraded|unavailable`; Core vẫn trả kết quả từ provider còn khỏe với `partial=true`.

### Interface Contract

Xem `docs/API.md`, mục B7. Contract được đóng băng khi Block 07 chuyển ACTIVE; mọi thay đổi breaking tiếp theo cần ADR mới.

## 4. Business Rules

- **BR-1:** Web chỉ gọi Core; mọi credential và anti-bot proxy ở phía server.
- **BR-2:** Torrent cùng info hash chỉ xuất hiện một lần; `sources` là hợp của các nguồn báo về torrent đó.
- **BR-3:** Dữ liệu hợp nhất dùng metadata đầy đủ nhất và số seed/leech lớn nhất đã biết; thứ tự cuối cùng xác định được và test được.
- **BR-4:** Provider không trả trong timeout không chặn kết quả provider khác.
- **BR-5:** Nguồn chỉ được chuyển sang `enabled` sau capability check production không cần thao tác người dùng/CAPTCHA.
- **BR-6:** Release vẫn được Core tìm lại và xác minh khi người dùng bấm tải; client không được gửi magnet tùy ý.
- **BR-7:** Không có torrent và không truy cập được nguồn là hai trạng thái UX khác nhau.

## 5. Implementation

- [x] Đóng Block 06 đúng phase gate và chuyển Block 07 sang ACTIVE.
- [x] Đóng băng contract B7 trước khi sửa code.
- [x] Tạo `ReleaseProvider` + chuyển logic Prowlarr hiện tại sang `ProwlarrProvider`.
- [x] Thêm orchestration song song, timeout, trạng thái provider và kết quả một phần.
- [x] Thêm normalize/dedupe/ranking theo info hash.
- [x] Mở rộng ReleasePicker bằng trạng thái nguồn và cảnh báo partial.
- [x] Thêm installer path idempotent cho custom Prowlarr definitions.
- [x] Chạy BT4G capability check trực tiếp và qua FlareSolverr; giữ nguồn `unavailable` vì production lỗi TLS/challenge.
- [x] Thêm managed BTDig Cardigann definition, capability-check và enable trên Prowlarr production.
- [x] Chạy QA, security review và cập nhật handoff.

## 6. QA / Definition of Done

- [x] Unit test: hai provider trả cùng info hash chỉ còn một release và có đủ `sources`.
- [x] Unit test: provider timeout/error vẫn trả kết quả provider khỏe với `partial=true`.
- [x] Unit test: kết quả/ranking có tính xác định; dữ liệu thiếu field không làm lỗi response.
- [x] Contract test: client B5 cũ vẫn đọc được `source` và `results`.
- [x] Security test: response/log không lộ Prowlarr key, cookie, proxy URL hoặc FlareSolverr endpoint.
- [x] Installer test: custom definition được cài/cập nhật idempotent và không ghi đè file do người dùng quản lý.
- [x] BT4G production capability check không PASS; nguồn không được cài/bật và không có hành vi bypass challenge/CAPTCHA.
- [x] BTDig adapter production trả kết quả, info hash và magnet không cần CAPTCHA; Core không trình bày sentinel của Cardigann như số seed/peer đo thật.
- [x] Core test, Web lint/build và browser smoke desktop/mobile PASS.
- [x] Không gửi request tải thật trong smoke test nếu chưa có thao tác phê duyệt riêng.

## 7. Release

- Dự kiến: `v1.3.0` sau khi Jooh gửi `APPROVED BLOCK 07` và toàn bộ DoD PASS.
- Production Core/Web đang chạy image `sha-16d1bde`; Prowlarr đã enable indexer `BTDig` từ managed definition. Block vẫn ACTIVE cho đến approval phrase chính xác.

## 8. Technical Debt

- Provider API riêng ngoài Prowlarr chỉ được thêm khi có nhu cầu và contract ổn định; Block 07 ưu tiên extension point chính thức của Prowlarr.
- Theo dõi độ bền custom definitions khi website đổi markup là chi phí vận hành thường xuyên.

## 9. Handoff & Next Block

- BT4G/BTDig là search index, không phải tracker; tracker nằm trong magnet/torrent mà chúng trả về.
- Bitmagnet đã là DHT crawler/search engine nội bộ và không cần thay thế để có kiến trúc multi-source.
- DNS production xác nhận `vietarr.home.arpa → 10.10.10.51`; VM `10.10.10.50` là media stack cũ, không phải dashboard VietArr production.
- BT4G production check: direct TLS thất bại; FlareSolverr trả `ERR_SSL_PROTOCOL_ERROR`, không có response để parse. Nguồn không được cài/bật.
- BTDig production check: HTTP 200, 20 magnet markers, không có CAPTCHA marker. Prowlarr test PASS; truy vấn “The Eternal Fragrance” trả 10 kết quả có info hash.
- Core production smoke cho TMDB TV `251600`: provider `Prowlarr` `ok`, `partial=false`, 28 release sau chuẩn hóa, 9 release mang nguồn `BTDig` và có magnet hợp lệ.
- Local browser smoke PASS với response B7 giả lập: trạng thái `ok/unavailable`, cảnh báo partial và nguồn gộp hiển thị đúng; viewport 375×812 không tràn ngang, nút cao 44px, ESC đóng modal và trả focus về nút mở.
