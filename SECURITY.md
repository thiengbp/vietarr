# SECURITY

## Secrets trong dự án
`/opt/vietarr/.env` là nơi DUY NHẤT chứa: API keys *arr, tài khoản qBittorrent, TMDB key, JWT secret của Core và webhook secret. File `chmod 600`, đã gitignore. Không secret nào trong code, compose, log, docs, hay commit.

## Luật xử lý
1. Log/error/report: che secret dạng `abc***xyz`. Installer không in password ra terminal (BR-4, B1).
2. Không truyền password qua tham số dòng lệnh (lộ trong shell history/ps) — dùng file hoặc stdin.
3. Credentials chỉ Core/installer được đọc khi cần; Dashboard không bao giờ nhận secret về client.
4. Các app *arr không expose port ra LAN — chỉ qua Caddy; Dashboard có auth (B3) trước mọi thao tác ghi.
5. Dependency: chạy `npm audit` trước mỗi Release; pin version trong lockfile.

## Gitleaks suppressions
Hai API key trong `docs/blocks/BLOCK-02-dashboard-read.md` là test key, đã được suppress bằng `.gitleaksignore`. Bắt buộc rotate trước khi repo public.

## Báo lỗ hổng
Mở GitHub Security Advisory (khi repo public) hoặc liên hệ trực tiếp Jooh.
