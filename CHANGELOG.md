# Changelog
Theo [Keep a Changelog](https://keepachangelog.com/vi/) + SemVer. Mỗi block Release = một phiên bản.

## [Unreleased]

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
