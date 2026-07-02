# BLOCK-03 — DASHBOARD WRITE + AUTH
> **Trạng thái:** PLANNED · **Phụ thuộc:** B2 (API B2 freeze)

## 1. Vision
Từ điện thoại: tìm phim bất kỳ (TMDB tiếng Việt) → bấm "Tải về" chọn chất lượng → theo dõi % realtime trên card → phim về xong có thông báo, phụ đề Việt đã gắn. Nhiều user, phân quyền admin/member.

## 2. Scope & Non-Goals
**Scope:** auth JWT + user SQLite · tab Khám phá (trending/search TMDB) · POST request sang Radarr/Sonarr · progress qua queue API (polling 3s, cân nhắc SSE) · webhook import-xong từ *arr → toast/notification · rate limit request theo user.
**Non-Goals:** KHÔNG Fshare (B4) · KHÔNG email/OAuth · KHÔNG duyệt-request nhiều cấp (backlog).

## 3. Architecture / Contract
API.md mục B3. Webhook endpoint đăng ký tự động vào Radarr/Sonarr khi Core khởi động (idempotent).

## 4. Business Rules (khung)
BR-1: member mặc định giới hạn 5 request/ngày (config được). BR-2: request trùng phim đã có → báo "Đã có", không tạo lệnh mới. BR-3: xóa phim chỉ admin.

## 5–9.
Điền khi IN PROGRESS. **DoD khung:** request từ iPhone → phim tự về + phụ đề + notify, không đụng UI *arr. **Next: BLOCK-04.**
