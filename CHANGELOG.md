# Changelog
Theo [Keep a Changelog](https://keepachangelog.com/vi/) + SemVer. Mỗi block Release = một phiên bản.

## [Unreleased]

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
