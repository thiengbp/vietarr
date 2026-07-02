# BLOCK-04 — FSHARE BRIDGE
> **Trạng thái:** PLANNED · **Phụ thuộc:** B3 · **ADR nền:** ADR-001

## 1. Vision
Fshare trở thành nguồn tải ngang hàng torrent: Radarr/Sonarr tự thấy kết quả Fshare qua Prowlarr, tự chọn khi tốt hơn, tải bằng tài khoản VIP với tốc độ tối đa, import hardlink như thường. Kèm tab "Fshare" dán link thủ công.

## 2. Scope & Non-Goals
**Scope:** giai đoạn 4a — tab dán link → Core tải (tái dùng logic Fshare NAS Bot: resume, progress, retry) → auto-import Radarr/Sonarr. Giai đoạn 4b — Torznab endpoint + giả lập API qBittorrent (ADR-001), đăng ký vào Prowlarr như indexer + download client.
**Non-Goals:** KHÔNG hỗ trợ host khác (4share, TenLua...) — kiến trúc adapter để mở sau · KHÔNG crack/bypass giới hạn tài khoản free.

## 3–4. Architecture / Business Rules (khung)
Contract: API.md mục B4. BR-1: credentials Fshare chỉ ở .env, không xuống client. BR-2: API Fshare lỗi → đánh dấu indexer tạm down trong Prowlarr, không spam retry. BR-3: file tải về phải qua verify size trước khi báo hoàn tất.

## 5–9.
Điền khi IN PROGRESS. **DoD khung:** thêm phim trong Radarr → thấy release Fshare trong kết quả interactive search → grab → về thư viện có hardlink. **Next: BLOCK-05.**
