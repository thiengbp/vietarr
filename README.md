# VietArr

**Media server tự động cho người Việt.** Cài một lệnh — có ngay hệ thống tải phim tự động
(torrent + Fshare), phụ đề Việt, và Dashboard duyệt phim kiểu Netflix, phát qua Infuse/SMB.

> Trạng thái: đang phát triển — xem [ROADMAP.md](ROADMAP.md)

## Vì sao có VietArr?
- Các repo *arr-stack hiện có chỉ dựng container, người dùng vẫn phải tự nối API key, root folder, download client bằng tay.
- Chưa hệ thống nào tích hợp **Fshare** — nguồn phim lớn nhất Việt Nam.
- Overseerr/Jellyseerr bắt buộc có Plex/Jellyfin; người dùng Infuse + SMB không có Dashboard nào.

## Thành phần
| Thư mục | Vai trò |
|---|---|
| `installer/` | CLI cài đặt + zero-touch wiring |
| `core/` | Vietarr Core: auth, Fshare Bridge, Torznab, stream proxy |
| `web/` | Dashboard Next.js |
| `docs/` | Toàn bộ tài liệu (blocks, ADR, API, design system) |

## Tài liệu bắt đầu
1. [ARCHITECTURE.md](ARCHITECTURE.md) — sơ đồ tổng
2. [ROADMAP.md](ROADMAP.md) — lộ trình block
3. [docs/blocks/](docs/blocks/) — chi tiết từng block
4. [CLAUDE.md](CLAUDE.md) — luật cho AI agent
