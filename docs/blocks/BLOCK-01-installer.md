# BLOCK-01 — INSTALLER & ZERO-TOUCH WIRING

> **Trạng thái:** READY FOR REVIEW (DoD PASS, chờ Jooh duyệt tag)
> **Phụ thuộc:** không (block nền móng)
> **Bắt đầu / Kết thúc:** 2026-07-02 / dự kiến +2 tuần

## 1. Vision (đích đến)
Trên một máy Ubuntu 24.04 sạch có Docker, người dùng chạy **một lệnh** `vietarr install`, trả lời tối đa 5 câu hỏi, và 15 phút sau có stack qBittorrent/Prowlarr/Radarr/Sonarr/Bazarr/Recyclarr/FlareSolverr/Caddy **đã tự nối với nhau hoàn chỉnh** — không phải mở UI của bất kỳ app *arr nào, không copy API key thủ công. Kết thúc bằng báo cáo verify tự động (hardlink test, container health, kết nối app-to-app).

## 2. Scope & Non-Goals
**Trong scope:**
- CLI wizard (bash hoặc Node single-file): hỏi đường dẫn media, TZ, domain nội bộ, TMDB key (lưu cho block sau), tài khoản qBittorrent mong muốn.
- Sinh `.env` + `docker-compose.yml` từ `installer/templates/`, ghi ra `/opt/vietarr/` trên máy đích.
- Zero-touch wiring qua API (chi tiết mục 3).
- Verify tự động + báo cáo PASS/FAIL từng mục.
- Idempotent: chạy lại không phá cấu hình sẵn có.

**Non-Goals (CẤM làm ở block này):**
- KHÔNG code Dashboard, KHÔNG code Fshare Bridge, KHÔNG Torznab.
- KHÔNG hỗ trợ hệ điều hành ngoài Ubuntu/Debian (Synology, macOS để sau).
- KHÔNG cấu hình VPN/Gluetun.
- KHÔNG tự tạo VM/mount NFS — installer giả định `/mnt/media` (hoặc đường dẫn user chỉ định) đã tồn tại và ghi được; chỉ KIỂM TRA và báo lỗi rõ ràng nếu chưa.
- KHÔNG thêm indexer torrent cụ thể hộ người dùng (vùng xám pháp lý — user tự thêm trong Prowlarr).

## 3. Architecture
```
installer/
├── vietarr.sh            # entry: wizard + orchestrate
├── lib/wiring.mjs        # gọi API các app (Node, không dependency ngoài)
├── templates/
│   ├── docker-compose.yml.tpl
│   ├── Caddyfile.tpl
│   └── recyclarr.yml.tpl
└── verify.sh             # hardlink test, health, connectivity
```
Luồng: wizard → render template → `docker compose up -d` → chờ healthy → **đọc API key từ `<appdata>/<app>/config.xml`** (sinh ra sau lần chạy đầu, không cần mở UI) → wiring → recyclarr sync → verify → in báo cáo + lưu `install-report.txt`.

Wiring qua API:
- Prowlarr `POST /api/v1/applications` (nối Radarr, Sonarr) + `POST /api/v1/indexerProxies` (FlareSolverr).
- Radarr/Sonarr `POST /api/v3/downloadclient` (qBittorrent, category movies/tv), `POST /api/v3/rootfolder` (`/data/media/movies`, `/data/media/tv`).
- qBittorrent: đổi password mặc định qua WebUI API, tạo category, set save path `/data/torrents`, tắt torrent nếu port chưa forward? (không — giữ mặc định, ghi note).
- Bazarr: ghi cấu hình kết nối Radarr/Sonarr + language profile Vietnamese-first (qua config file hoặc API tùy khả thi — spike ngày 1).

### Interface Contract (đóng băng khi Release)
1. **CLI:** `vietarr install [--media-path <path>] [--non-interactive --config <file>]`; exit code 0 = verify pass toàn bộ, 2 = cài xong nhưng có mục verify fail, 1 = lỗi cài.
2. **File sinh ra tại vị trí cố định:** `/opt/vietarr/.env`, `/opt/vietarr/docker-compose.yml`, `/opt/vietarr/install-report.txt`, appdata tại `/opt/vietarr/appdata/<app>/`.
3. **`/opt/vietarr/.env` chứa (block sau đọc từ đây):** `RADARR_API_KEY`, `SONARR_API_KEY`, `PROWLARR_API_KEY`, `BAZARR_API_KEY`, `QBIT_USER`, `QBIT_PASS`, `TMDB_API_KEY`, `MEDIA_ROOT`, `DOMAIN_SUFFIX`.

## 4. Business Rules
- **BR-1:** Installer không bao giờ ghi đè `.env` đã tồn tại; chạy lại ở chế độ *repair* (chỉ wiring + verify).
- **BR-2:** Nếu đường dẫn media không ghi được bởi UID 1000 → dừng ngay với hướng dẫn sửa NFS/permission, không cài tiếp.
- **BR-3:** Mọi container phải healthy trong 180s, quá hạn → rollback (`compose down`) và in log container lỗi.
- **BR-4:** Password qBittorrent: nếu user không nhập, sinh ngẫu nhiên 20 ký tự, ghi vào `.env`, KHÔNG in ra terminal.
- **BR-5:** Hardlink verify fail → exit code 2 + cảnh báo đỏ "Radarr sẽ copy nhân đôi dung lượng", không silent pass.

## 5. Implementation
- [x] Spike D1: xác nhận đọc được API key từ config.xml cả 4 app; xác nhận Bazarr cấu hình được qua file/API
- [x] Wizard + validate input (đường dẫn, quyền ghi UID 1000)
- [x] Template compose/Caddyfile/recyclarr + render `.env`
- [x] `lib/wiring.mjs`: hàm chờ healthy, đọc config.xml, 6 lệnh wiring
- [x] `verify.sh`: hardlink inode test, health, app-to-app connectivity (Prowlarr test app, Radarr test download client)
- [x] Chế độ repair (BR-1) + rollback (BR-3)
- [x] Chạy end-to-end trên VM test sạch (snapshot Proxmox để lặp lại)

## 6. QA
### Definition of Done
- [x] VM Ubuntu 24.04 sạch (snapshot) → 1 lệnh → exit code 0, không mở UI *arr lần nào trong toàn bộ quá trình
- [x] `install-report.txt` có: hardlink PASS (2 inode giống nhau), 8/8 container healthy, Prowlarr↔Radarr/Sonarr test OK, Radarr/Sonarr↔qBittorrent test OK
- [x] Chạy lệnh lần 2 → chế độ repair, không mất cấu hình (BR-1)
- [x] Rút quyền ghi thư mục media → installer dừng đúng theo BR-2 với thông báo dễ hiểu
- [x] `grep -r "password\|apikey" install-report.txt` không lộ secret nào

### Test cases
| Mã | Kịch bản | Kết quả mong đợi | Trạng thái |
|----|----------|------------------|-----------|
| T1 | Cài sạch happy path | exit 0, report toàn PASS | ✅ PASS |
| T2 | Media path không ghi được | dừng, hướng dẫn NFS, exit 1 | ✅ PASS |
| T3 | Chạy lần 2 | repair mode, giữ nguyên .env | ✅ PASS |
| T4 | 1 container không healthy | rollback + in log, exit 1 | ✅ PASS |
| T5 | NFS không hỗ trợ hardlink | exit 2 + cảnh báo copy | ✅ PASS |

## 7. Release
- Phiên bản: `v0.1.0`. Tag git + ghi CHANGELOG mục Added.
- Bằng chứng DoD đính kèm vào PR/commit release (output terminal, install-report.txt mẫu).
- Người duyệt: Jooh.

### Release Evidence (2026-07-03)
- Source commit tested: `a45d628` (`fix: require media write access for uid 1000`). Code pushed to `main`. Tag `v0.1.0` chưa tạo, chờ Jooh duyệt.
- Test bed: Proxmox VM `106` (`vietarr-block01-test`), Ubuntu 24.04, Docker `29.1.3`, Compose `2.40.3`, snapshot `clean` recreated with source `a45d628`.
- Media share: NFS `10.10.10.10:/volume1/media-test` mounted at `/mnt/media`; T1/T3 used `/mnt/media/data`.
- Evidence files saved locally: `/private/tmp/vietarr-dod/T1` ... `/private/tmp/vietarr-dod/T5`.
- T1 PASS: clean install from snapshot `clean`, command `sudo ./installer/vietarr.sh install --non-interactive --media-path /mnt/media/data`; `install-report.txt` summary `PASS=12 FAIL=0`, exit `0`, hardlink inode `366`, 8/8 containers healthy, Prowlarr↔Radarr/Sonarr OK, Radarr/Sonarr↔qBittorrent OK.
- Secret check PASS: `grep -Ei 'password|apikey|api_key' install-report.txt` returned exit `1` (no matches).
- T2 PASS: media path `/tmp/vietarr-no-write` root-owned `0700`; installer stopped before compose with `ERROR: UID 1000 cannot write to /tmp/vietarr-no-write. Fix NFS/permission before install.`, exit `1`.
- T3 PASS: second run printed `Repair mode: existing /opt/vietarr/.env found; keeping it unchanged.`, exit `0`; `.env` SHA before/after both `01889070bfc843fbe08e7f88e7072a68d9b21e1d6cd6f4424852b2b5c912ae3c`.
- T4 PASS: VM source template mutated only for test so Caddy healthcheck returns `exit 1`; installer printed `Container readiness failed; rolling back.`, exit `1`; `docker ps --filter name=vietarr` empty after rollback.
- T5 PASS: `/tmp/vietarr-hardlink-bad/torrents` mounted as tmpfs while `media` stayed on root fs; verify printed `FAIL hardlink - Radarr sẽ copy nhân đôi dung lượng`, summary `PASS=11 FAIL=1`, exit `2`.

## 8. Technical Debt
| Nợ | Mức độ | Trả ở |
|----|--------|-------|
| Installer ghi vào `/opt/vietarr`, nên trên Ubuntu sạch cần chạy bằng `sudo` hoặc qua one-liner có quyền root. | Low | Block 05 docs public |
| qBittorrent port/VPN chưa cấu hình theo Non-Goal Block 01; installer giữ mặc định và không thêm indexer cụ thể. | Medium | Block sau khi có ADR VPN/indexer |

## 9. Handoff & Next Block
- Block 2 đọc toàn bộ API key + đường dẫn từ `/opt/vietarr/.env` (contract mục 3) — không tự dò lại.
- API keys được đọc từ config sinh bởi app: Radarr/Sonarr/Prowlarr dùng `config.xml`, Bazarr dùng `config/config.yaml`; Block 2 không cần mở UI *arr.
- Bazarr wiring hiện ghi `config/config.yaml` rồi restart `vietarr-bazarr`; cần đợi restart trước khi verify.
- Gotcha cho Block 2: `/opt/vietarr/.env` có thể đã có `BAZARR_API_KEY` đúng trước khi Bazarr nhận config Radarr/Sonarr sau restart. Nếu Bazarr restart fail hoặc chậm ngay sau install, health/API check Bazarr có thể lỗi tạm thời dù key trong `.env` hợp lệ; Block 2 nên retry/poll Bazarr readiness thay vì coi đó là config-key failure.
- Recyclarr sync chạy sau wiring và phải pass; log có bảng sync cho `vietarr-radarr` và `vietarr-sonarr`.
- Installer validate media path bằng quyền UID 1000; nếu chạy bằng root/sudo nhưng UID 1000 không ghi được, installer vẫn dừng theo BR-2.
- Verify hardlink kiểm tra giữa `$MEDIA_ROOT/torrents` và `$MEDIA_ROOT/media`; NAS/NFS phải cho hardlink trong cùng export.
- **Next: BLOCK-02 — Dashboard (read-only library).**
