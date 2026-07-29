# BLOCK-08 — EPISODE DOWNLOADS

> **Trạng thái:** ACTIVE
> **Phụ thuộc:** B3, B6, B7 · **Bắt đầu:** 2026-07-29

## 1. Vision

Người dùng có thể yêu cầu tải đúng một tập còn thiếu ngay trong trang chi tiết phim bộ, theo dõi trạng thái thật từ Sonarr và biết rõ khi không có nguồn phù hợp.

## 2. Scope & Non-Goals

**Trong scope:**

- Nút `Tải tập này` cho từng episode `missing` trong trang chi tiết series.
- Core xác minh episode tồn tại, chưa có file và Sonarr đã có indexer/download client hoạt động.
- Gửi Sonarr command `EpisodeSearch` với đúng một `episodeId`; Sonarr tự áp quality profile hiện có.
- Ghi request idempotent, theo dõi `queued | downloading | available | not_found | failed` qua endpoint progress hiện có.
- Hiển thị trạng thái độc lập trên từng tập, focus ring, `aria-live` và hit target tối thiểu 44px.
- Tự refresh trang khi tập đã import xong.

**Non-goals:**

- Không gửi magnet tùy ý trực tiếp vào qBittorrent.
- Không chọn release thủ công trong phiên bản đầu; Sonarr tự quyết định theo profile.
- Không có nút tải hàng loạt toàn bộ 30 tập trong Block 08.
- Không cam kết Sonarr chỉ grab file đơn; nếu release tốt nhất là season/multi-episode pack, Sonarr có thể tải pack.
- Không giả tiến độ khi Sonarr không có queue/command tương ứng.

## 3. Architecture

```text
EpisodeDownloadButton
    ↓ POST /api/v1/request/episode (JWT)
Core request service
    ├── validate episode + idempotency + daily limit
    ├── validate Sonarr indexer/download client
    ├── monitor episode
    └── Sonarr EpisodeSearch { episodeIds: [id] }
          ↓
GET /request/:id/progress
    ├── episode hasFile → available
    ├── Sonarr queue → downloading + progress
    ├── command active → queued
    └── completed/no grab → not_found
```

Contract: `docs/API.md`, mục B8. Contract được đóng băng khi Block 08 chuyển ACTIVE.

## 4. Business Rules

- **BR-1:** Chỉ episode chưa có file mới nhận request; tập đã có trả `409 already_available`.
- **BR-2:** Request đang hoạt động cho cùng episode/user được trả lại thay vì tạo command trùng.
- **BR-3:** Request episode dùng chung daily limit với request phim; `failed/not_found` không tiêu hao quota.
- **BR-4:** Web không nhận Sonarr API key và không gửi magnet/download URL.
- **BR-5:** `not_found` khác `failed`: không có release phù hợp không được trình bày như lỗi hệ thống.
- **BR-6:** UI không ghi “đang tải” cho đến khi Sonarr queue thật xuất hiện.

## 5. Implementation

- [x] Release Block 07 `v1.3.0` và mở Block 08.
- [x] Xác minh Sonarr production có `EpisodeSearchCommand.EpisodeIds`.
- [x] Đóng băng API B8.
- [x] Migrate request log cho `media_type=episode` + `episode_id`.
- [x] Thêm Core episode request/progress và unit test.
- [x] Thêm EpisodeDownloadButton và trạng thái accessible.
- [ ] Chạy QA, production smoke và cập nhật handoff.

## 6. QA / Definition of Done

- [x] Episode đã có file trả `409`, không tạo command.
- [x] Episode thiếu gửi đúng `EpisodeSearch { episodeIds:[id] }`.
- [x] Hai lần bấm khi request còn active không tạo command trùng.
- [x] Queue thật trả progress; import xong trả `available`; command hoàn tất không grab trả `not_found`.
- [x] Sonarr thiếu indexer/download client trả lỗi cấu hình cụ thể.
- [x] Core test, Web lint/build PASS.
- [ ] Desktop/mobile không tràn ngang; nút ≥44px; trạng thái được screen reader thông báo.
- [ ] Production smoke không gửi request tải thật nếu chưa chọn một episode thử nghiệm cụ thể.

## 7. Release

- Dự kiến: `v1.4.0` sau khi Jooh gửi `APPROVED BLOCK 08` và toàn bộ DoD PASS.

## 8. Technical Debt

- Manual release picker cho episode và bulk missing search để block sau; cần contract/ranking riêng vì release có thể là single, multi-episode hoặc season pack.

## 9. Handoff & Next Block

- Production hiện có The Eternal Fragrance: 33 episode, file thật chỉ E31–E33; E01–E30 là tập thử nghiệm phù hợp cho UI nhưng production smoke không tự bấm tải.
- Sonarr production binary và source upstream đều xác nhận command `EpisodeSearch` nhận `EpisodeIds`.
