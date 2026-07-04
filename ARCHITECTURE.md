# ARCHITECTURE (bản sống — cập nhật mỗi khi Release block)

> Chi tiết đầy đủ từng thành phần: xem docs/blocks/. File này là bức tranh tổng.

## Thành phần
- **installer/** — CLI cài đặt + zero-touch wiring (B1). Sinh `/opt/vietarr/.env`, `/opt/vietarr/docker-compose.yml`, appdata local và `install-report.txt`; chi tiết: BLOCK-01 §3.
- **core/** — Vietarr Core: Node.js/Express/SQLite. Auth, request, HTTP stream proxy, websocket realtime, webhook từ *arr. (B2, B3)
- **web/** — Dashboard Next.js 15: thư viện, khám phá TMDB, request, play menu. (B2, B3)
- **installer/templates/** — template docker-compose, Caddyfile, recyclarr (installer render ra /opt/vietarr trên máy đích).

## Luồng dữ liệu chính
1. **Thư viện:** Dashboard → Core → Radarr/Sonarr API (poster, metadata, trạng thái file). Không quét file trực tiếp.
2. **Request phim:** Dashboard → Core → Radarr `POST /api/v3/movie` → Prowlarr tìm torrent → qBittorrent tải vào `/data/torrents/<cat>` → Radarr import (hardlink) → Bazarr gắn phụ đề Việt → webhook về Core → Dashboard cập nhật.
3. **Phát:** Infuse/app SMB đọc thẳng từ NAS. Dashboard chỉ đưa deep link / SMB path / HTTP stream (Core proxy, Range requests, không transcode).

## Nguyên tắc bất biến
- Chuẩn thư mục TRaSH: một root `/data`, hardlink giữa `torrents/` và `media/`.
- Các app *arr không publish port ra ngoài — chỉ Caddy + Core là mặt tiền.
- Config app trên SSD local, media trên NFS. SQLite không bao giờ nằm trên NFS.
- Không transcode. Không phụ thuộc Plex/Jellyfin.
- Installer kiểm tra media root bằng UID 1000 trước khi cài; nếu NFS/permission không cho UID 1000 ghi hoặc không hỗ trợ hardlink giữa `torrents/` và `media/`, install phải dừng/fail rõ theo BLOCK-01.

## Sơ đồ
(giữ bản mới nhất tại đây — nguồn: vietarr-architecture.md khởi thủy, cập nhật khi Release)
