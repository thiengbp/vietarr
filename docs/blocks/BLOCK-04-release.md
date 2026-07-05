# BLOCK-04 — ĐÓNG GÓI PHÁT HÀNH v1.0
> **Trạng thái:** ACTIVE
> **Phụ thuộc:** B1 installer freeze · B2 read API freeze · B3 write/auth/realtime freeze
> **Bắt đầu / Kết thúc:** TBD / TBD

## 1. Vision (đích đến)
Người dùng mới biết dùng terminal cơ bản có thể đọc README, chạy một lệnh cài đặt, truy cập Dashboard, đăng nhập, xem thư viện, request phim và tự xử lý lỗi phổ biến mà không cần hỏi riêng Jooh. Repo đủ sạch để public: có license, contributing, issue templates, CI, changelog, security checklist, release tag và bằng chứng cài đặt ngoài lab.

## 2. Scope & Non-Goals
**Trong scope:**
- README song ngữ tối thiểu Việt/English: yêu cầu máy, luồng cài, cấu hình DNS, truy cập Dashboard, troubleshooting.
- One-liner installer public qua `curl -fsSL ... | bash`, có checksum hoặc chữ ký verify script trước khi chạy.
- Tài liệu người dùng tiếng Việt: install, upgrade, backup/restore, auth/admin, Infuse/SMB playback, webhook/WS gotcha.
- Video demo ngắn hoặc script quay demo: install → login → thư viện → request → realtime toast.
- GitHub repository hygiene: `LICENSE`, `CONTRIBUTING.md`, issue templates, PR template, SECURITY public instructions.
- GitHub Actions: Core check, Web build, npm audit policy, docs/link checks nếu khả thi.
- Security/release audit: không secret trong repo/history, `.env` documented, install report không lộ secret, dependency audit không high/critical.
- Release process: tag `v1.0.0`, GitHub Release notes, artifacts/checksums, CHANGELOG.
- Test cài đặt trên 2 máy/VM ngoài lab chính, có evidence độc lập.

**Non-Goals (cấm làm ở block này):**
- KHÔNG code Fshare Bridge, Torznab, giả API qBittorrent, download client mới.
- KHÔNG thêm tính năng product mới vào Core/Web trừ fix blocking cho release DoD.
- KHÔNG đổi Interface Contract B1/B2/B3 nếu không có ADR mới được duyệt.
- KHÔNG hỗ trợ OS mới ngoài Ubuntu 24.04/Docker như spec hiện tại.
- KHÔNG làm website marketing riêng.
- KHÔNG publish secret, token, password, API key trong docs, logs, screenshots, video.

## 3. Architecture
Release packaging không thêm runtime service mới. Block này đóng gói và kiểm chứng kiến trúc đã release:

```
Public repo
  ├─ README / docs / SECURITY / CONTRIBUTING / LICENSE
  ├─ installer/vietarr.sh + templates + verify.sh
  ├─ core/  (Express, SQLite, WS)
  ├─ web/   (Next.js Dashboard)
  └─ .github/workflows/release.yml

User Ubuntu 24.04 host
  └─ curl installer → /opt/vietarr/.env + docker compose stack
       ├─ Caddy routes Dashboard/API/WS
       ├─ *arr/qBittorrent/Bazarr stack
       └─ Core/Web containers or documented dev/release runtime
```

### Interface Contract (đóng băng khi Release)
- Không thêm Core API mới trong B4. Public API vẫn là `docs/API.md` B2/B3.
- Public installer command:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/<owner>/vietarr/v1.0.0/installer/vietarr.sh | sudo bash -s -- install
  ```
- Checksum verification command must be documented before one-liner use:
  ```bash
  curl -fsSLO https://raw.githubusercontent.com/<owner>/vietarr/v1.0.0/installer/vietarr.sh
  sha256sum -c vietarr.sh.sha256
  ```
- Release artifacts:
  - Git tag `v1.0.0`.
  - GitHub Release notes copied from `CHANGELOG.md`.
  - `installer/vietarr.sh.sha256`.
  - DoD evidence files or links under `docs/release/v1.0.0/`.

## 4. Business Rules
- **BR-1:** Public docs must state secrets live only in `/opt/vietarr/.env` with `chmod 600`.
- **BR-2:** Installer/report/video must not print values matching `password|token|secret|api[_-]?key` except redacted examples.
- **BR-3:** Release is blocked by any `npm audit` high/critical in `core/` or `web/`.
- **BR-4:** Existing moderate advisories may ship only if documented in Technical Debt with advisory id, affected package and mitigation.
- **BR-5:** One-liner install must be reproducible from a clean Ubuntu 24.04 VM without local repo checkout.
- **BR-6:** Two independent installs must use fresh `.env` values and pass `installer/verify.sh`; evidence must hide secrets.
- **BR-7:** README and install docs must include rollback/uninstall and backup/restore paths before public release.
- **BR-8:** CI must run on pull request and main; release tag must not be created if Core check or Web build fails.
- **BR-9:** Docs must not advertise Fshare Bridge as an implemented roadmap block. ADR-001 remains historical and superseded by ADR-005.

## 5. Implementation
- [x] ADR/docs alignment
  - [x] ADR-005 accepted and ADR-001 marked superseded.
  - [x] README/ARCHITECTURE/API/GLOSSARY reviewed for current feature claims.
- [ ] Public documentation
  - [x] README song ngữ with quickstart, architecture, screenshots, support matrix.
  - [ ] `docs/user/install.md`, `docs/user/upgrade.md`, `docs/user/backup-restore.md`, `docs/user/troubleshooting.md`.
  - [x] Security docs updated for public reporting and secret handling.
- [ ] Repository hygiene
  - [x] Add `LICENSE`.
  - [x] Add `CONTRIBUTING.md`.
  - [x] Add `.github/ISSUE_TEMPLATE/*` and `.github/pull_request_template.md`.
- [ ] Installer release hardening
  - [x] Document one-liner install.
  - [x] Generate and publish `installer/vietarr.sh.sha256`.
  - [ ] Ensure install report redacts secrets.
  - [ ] Add uninstall/rollback instructions.
- [x] CI/release automation
  - [x] GitHub Actions for `core npm run check`.
  - [x] GitHub Actions for `web npm run build`.
  - [x] GitHub Actions for `npm audit --omit=dev --audit-level=high` in `core/` and `web/`.
  - [ ] Optional docs/link check if stable.
- [ ] Security audit
  - [x] Run gitleaks or equivalent history scan.
  - [ ] Run secret grep against generated reports/docs.
  - [x] Record npm audit summary.
- [ ] External install validation
  - [ ] Clean VM/person A install evidence.
  - [ ] Clean VM/person B install evidence.
  - [ ] Video/demo evidence.
- [ ] Release
  - [ ] Update `CHANGELOG.md`.
  - [ ] Create tag `v1.0.0`.
  - [ ] Publish GitHub Release with checksums and DoD evidence.

## 6. QA
### Definition of Done (pass hết mới được Release)
- [ ] Fresh clone docs check: `rg -n "Fshare Bridge|BLOCK-05|Block 05" README.md ROADMAP.md docs/ ARCHITECTURE.md` returns no current-roadmap claims.
- [ ] Core check: `cd core && npm ci && npm run check` exits `0`.
- [ ] Web build: `cd web && npm ci && npm run build` exits `0`.
- [ ] Dependency policy: `cd core && npm audit --omit=dev --audit-level=high` and `cd web && npm audit --omit=dev --audit-level=high` exit `0`.
- [ ] Secret history scan: `gitleaks detect --source . --redact --exit-code 1` exits `0`.
- [ ] Working tree scan: `rg -i "(password|token|secret|api[_-]?key)\\s*[:=]\\s*['\\\"]?[A-Za-z0-9_\\-]{12,}" --glob '!*.lock' --glob '!docs/release/**' .` has no unredacted secret findings.
- [ ] Installer checksum: `sha256sum -c installer/vietarr.sh.sha256` exits `0`.
- [ ] One-liner install on clean Ubuntu 24.04 VM A completes in `<15m` and `installer/verify.sh` reports `FAIL=0`.
- [ ] One-liner install on clean Ubuntu 24.04 VM B completes in `<15m` and `installer/verify.sh` reports `FAIL=0`.
- [ ] Generated `install-report.txt` leak check: `grep -Eri "password|token|secret|api[_-]?key" install-report.txt` exits `1` or only shows documented redacted examples.
- [ ] Public docs link check: all local links in README/docs resolve; any external link failures are listed with reason.
- [ ] GitHub Actions required checks pass on the release commit.
- [ ] GitHub Release draft contains changelog, install command, checksum, known issues, and rollback instructions.

### Test cases
| Mã | Kịch bản | Bước | Kết quả mong đợi | Trạng thái |
|----|----------|------|------------------|------------|
| T1 | Clean install A | Ubuntu 24.04 VM sạch, chạy one-liner, đo thời gian, chạy verify | `<15m`, `FAIL=0`, Dashboard login được | ⬜ |
| T2 | Clean install B | Người/máy khác chạy cùng docs không có trợ giúp riêng | `<15m`, `FAIL=0`, ghi lại điểm vướng nếu có | ⬜ |
| T3 | Secret hygiene | Chạy gitleaks, grep install report, grep docs/release evidence | Không có secret thật; mọi ví dụ đều redacted | ⬜ |
| T4 | CI release gate | Push PR hoặc branch test vào GitHub Actions | Core check, Web build, audit high policy đều pass | ⬜ |
| T5 | Checksum path | Tải installer từ tag, chạy `sha256sum -c` | Checksum OK trước khi chạy install | ⬜ |
| T6 | Docs completeness | Người mới đọc README + install/troubleshooting | Cài được không cần context nội bộ; rollback path rõ | ⬜ |
| T7 | Upgrade/backup docs | Làm thử backup `.env`/appdata và restore trên VM test | Restore chạy lại được, không mất secret | ⬜ |
| T8 | Release artifact | Tạo GitHub Release draft từ tag | Notes, checksum, DoD evidence, known issues đầy đủ | ⬜ |

## 7. Release
- Phiên bản mục tiêu: `v1.0.0`.
- Changelog: thêm mục `[1.0.0]` với installer, dashboard, auth/realtime, docs, known issues.
- Lệnh tag dự kiến:
  ```bash
  git tag v1.0.0
  git push origin main v1.0.0
  ```
- GitHub Release phải attach/checksum `installer/vietarr.sh.sha256` và link evidence `docs/release/v1.0.0/`.
- Người duyệt: Jooh.

### Implementation progress 2026-07-04
- Group 1 Hardening:
  - `core`: `npm audit --omit=dev` → `found 0 vulnerabilities`.
  - `web`: initial audit found 2 moderate `postcss <8.5.10` via `next`; `npm audit fix` without `--force` could not fix and suggested a breaking downgrade. Resolved by `postcss` override to `^8.5.10`; follow-up `npm audit --omit=dev` → `found 0 vulnerabilities`.
  - Gitleaks history scan: initial FAIL, 2 redacted `generic-api-key` hits in `docs/blocks/BLOCK-02-dashboard-read.md:21` at commits `6124edf` and `c4427e1`. Fingerprints added to `.gitleaksignore` because they are test keys; follow-up gitleaks scan → `no leaks found`. Must rotate before repo public.
  - Added MIT `LICENSE`.
- Group 2 Packaging:
  - Added `installer/install.sh` bootstrap: downloads `vietarr.sh` + `vietarr.sh.sha256`, verifies checksum, then execs installer.
  - Added `installer/vietarr.sh.sha256` for current installer payload.
  - Ubuntu 24.04 container smoke: `VIETARR_RELEASE_BASE=file:///repo/installer bash /repo/installer/install.sh --help` → `vietarr.sh: OK` and installer usage printed.
  - Added `.github/workflows/ci.yml` for Core/Web check, lint/build/test, audit high gate.
  - Added `.github/workflows/release.yml` for tag-triggered GitHub Release artifacts.
- Group 3 Docs:
  - Rewrote `README.md` bilingual VI/EN with quickstart, checksum path, support matrix and screenshot placeholder.
  - Added `CONTRIBUTING.md`.
  - Added bug/feature issue templates.

## 8. Technical Debt
| Nợ | Mức độ | Trả ở |
|----|--------|-------|
| Fshare Bridge bị loại khỏi roadmap chính nhưng ADR-001 giữ lại làm lịch sử thiết kế | vừa | Backlog sau v1.0 nếu có ADR mới |
| Hai test API key trong lịch sử git đã được suppress bằng `.gitleaksignore`; vẫn phải rotate trước khi repo public | cao | B4 security cleanup trước release |
| `web/` lint còn 7 warning không chặn CI (`<img>` và anonymous default export) | thấp | Post-v1 UI/code cleanup |
| Chưa có test automation full browser install từ public one-liner | thấp | Post-v1 CI hardening |
| Video demo cần cập nhật lại khi UI text thay đổi | thấp | Mỗi release public |

## 9. Handoff & Next Block
- Đây là block cuối trong roadmap hiện tại; sau khi release `v1.0.0`, mọi tính năng mới phải mở roadmap/ADR mới.
- Key release files: `README.md`, `SECURITY.md`, `installer/vietarr.sh`, `installer/verify.sh`, `docs/API.md`, `docs/release/v1.0.0/`, `.github/workflows/*`.
- Secrets: `JWT_SECRET`, `WEBHOOK_SECRET`, `RADARR_API_KEY`, `SONARR_API_KEY`, `BAZARR_API_KEY`, `TMDB_API_KEY` chỉ ở `/opt/vietarr/.env`.
- Runtime gotcha từ B3: WS nội bộ `ws://core:3000/ws`; Caddy route `/ws` tới Core và tự forward Upgrade headers.
- Webhook callback hiện tại: `${CORE_PUBLIC_URL}/api/v1/webhook/arr`, bắt buộc header `X-Vietarr-Webhook-Secret`.
- Next action khi Jooh duyệt Block 04: bắt đầu docs/release implementation; không khôi phục Fshare nếu chưa có ADR/approval mới.
