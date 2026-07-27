# Changelog

Theo [Keep a Changelog](https://keepachangelog.com/vi/) + SemVer. Mỗi block Release = một phiên bản.

## [Unreleased]

### Added
- Add Block 06 Home Experience with a real-library hero, recent viewing history, download activity, discovery feeds, genre filters, and an available-only library surface.
- Add authenticated home discovery APIs for TMDB day/week/popular feeds and movie genres without changing frozen B2/B3/B5 contracts.

### Changed
- Turn the root movie grid into an honest media dashboard while retaining existing routes, Vietnamese terminology, and VietArr's dark amber design system.

## [1.1.0] - 2026-07-28

### Added
- Add Block 05 Bitmagnet release discovery through Prowlarr with credential-safe magnet links, an accessible responsive source picker, and selected-release push through Radarr to qBittorrent.
- Add authenticated `GET /discover/:tmdbId/releases` and `POST /request/release` APIs without changing frozen B2/B3 contracts.

### Changed
- Adopt ADR-006 media layout: `/volume1/media/{torrents,library}` on NAS and `/data/{torrents,library}` in containers, preserving a single mount for hardlinks.

### Fixed
- Separate the host `MEDIA_ROOT` from Core's container path `CORE_MEDIA_ROOT=/data` so HTTP streaming resolves imported files inside the container.
- Enable qBittorrent automatic torrent management and category paths so movie downloads land in `/data/torrents/movies` and series downloads in `/data/torrents/tv`.
- Serve the qBittorrent Web UI on the established `qbit.<domain>` hostname while retaining `qbittorrent.<domain>` as a compatibility alias.
- Keep release-request errors visible below the picker header, stop client requests after 45 seconds, and exclude `failed`/`not_found` attempts from the daily request limit.
- Search both TMDB movies and series, normalize dotted/underscored release-style names, and expose clean Bitmagnet Magnet links for series without presenting an unsupported Sonarr download action.
- Surface Radarr release rejection immediately and expire untracked manual requests after 90 seconds instead of leaving the Dashboard at “Đang tìm nguồn tải…” indefinitely.
- Trigger a real monitored Radarr `MoviesSearch` only when an automatic indexer and enabled download client exist; otherwise return a clear source/client configuration error.
- Report request state from the real Radarr command, queue, and movie file instead of presenting `queued` as fake download progress.
- Stop generating Infuse, VLC, HTTP, and SMB links for movies without a real file; desktop UI no longer opens unsupported mobile player URL schemes.
- Update patched Next.js/PostCSS releases and override Sharp to a non-vulnerable release so the production dependency audit passes.
- Filter Prowlarr results by the movie title/year and never expose Prowlarr proxy download URLs containing its API key.
- Serialize custom webhook headers as key/value entries so current Radarr/Sonarr versions accept VietArr realtime notification registration.
- Register *arr webhooks against the internal Core service URL so containers do not depend on home-domain DNS or Caddy TLS trust.

## [1.0.0] - 2026-07-06
### Added
- BLOCK-04 release packaging hardening: MIT `LICENSE`, `CONTRIBUTING.md`, GitHub issue templates, PR template, and bilingual README with screenshot placeholder.
- Public installer bootstrap `installer/install.sh` with checksum verification before executing `vietarr.sh`.
- GitHub Actions CI for Core/Web install, check/lint/build/test, and high-severity audit policy on pull requests.
- Tag-triggered release workflow that builds installer checksum and GitHub Release artifacts.
- `.gitleaksignore` suppressions for two historical Block 02 test API keys, documented in `SECURITY.md` with mandatory rotate-before-public note.
- Official BLOCK-04 DoD evidence: VM 106 clean install `INSTALL_EXIT=0`, `PASS=12 FAIL=0`, CI pass, gitleaks clean, npm audit high policy clean, checksum verify PASS, and README GitHub render PASS.

### Fixed
- Fetch all required installer payload files in `installer/install.sh` (`verify.sh`, `lib/wiring.mjs`, and templates) so one-liner installs work without a local repo checkout.
- Remove current-feature README/SECURITY claims for Fshare Bridge after ADR-005 removed it from the v1.0 roadmap.

### Notes
- Repo remains private by Jooh decision; no public repository setting was changed for this release.
- Before any future public release, rotate the historical Block 02 test API keys documented in `SECURITY.md`.

## [0.3.0] - 2026-07-04
### Added
- BLOCK-03 auth: JWT login, invite-only registration, bcrypt password hashing, admin invite creation, user list, and configurable `rate_limit_per_day`.
- BLOCK-03 Core write APIs: TMDB discover/search, Radarr request creation with `searchForMovie:false`, duplicate `hasFile=true` protection, request logging, settings, and quality profile lookup.
- BLOCK-03 realtime: Core WebSocket server, Radarr/Sonarr webhook receiver with `X-Vietarr-Webhook-Secret`, queue polling progress events, import/grab broadcasts, and idempotent webhook registration.
- BLOCK-03 Dashboard write UI: login/register, Discover tab, RequestButton with quality selection and inline progress, toast on import, WS reconnect hook, and Admin panel.
- Official BLOCK-03 DoD evidence for T1-T7 on VM 106 snapshot `clean`, Toast within 2s, Lighthouse mobile Discover `100`, and secret leak check PASS.
- Roadmap updated after release: Fshare Bridge removed from the block plan; packaging/release work is now Block 04.

### Fixed
- Preserve Core error codes in JSON responses.
- Keep Block 03 Radarr requests unmonitored and non-searching for DoD-safe request creation.
- Read Web auth token from cookie fallback for middleware/client consistency.

## [0.2.0] - 2026-07-03
### Added
- BLOCK-02 Core read-only API: library movies/series, movie detail, health, play options, and HTTP Range stream endpoint.
- BLOCK-02 Dashboard web: mobile-first poster grid, series grid, movie detail page, PlayMenu, EmptyState, skeleton loading, and cache warning banner.
- SQLite cache fallback for Radarr/Sonarr downtime with `X-Vietarr-Cache: stale`.
- Official BLOCK-02 DoD evidence for iPhone grid `101` movies, Infuse deep link/Core Range stream, Lighthouse mobile `100`, and kill-Radarr stale-cache banner.

## [0.1.0] - 2026-07-03
### Added
- Khung dự án: docs, roadmap, design system, ADR 001–004, đặc tả BLOCK-01.
- BLOCK-01 installer: `installer/vietarr.sh`, Docker Compose/Caddy/Recyclarr templates, zero-touch wiring for qBittorrent/Prowlarr/Radarr/Sonarr/Bazarr/FlareSolverr, and `installer/verify.sh`.
- Official BLOCK-01 DoD evidence for T1-T5 on VM 106 snapshot `clean` with NFS `media-test`.
