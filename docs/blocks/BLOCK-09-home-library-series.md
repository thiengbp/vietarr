# BLOCK-09 — HOME LIBRARY MOVIES AND SERIES

> **Trạng thái:** ACTIVE

## Scope

- Tách “Phim lẻ của anh” và “Phim bộ của anh” trên trang chủ.
- Radarr và Sonarr được tải song song; chỉ nội dung `available` xuất hiện.
- Không thay đổi hero, activity rail, Core API hoặc download flow.

## Definition of Done

- [x] Pure model tests PASS.
- [x] Web lint/build PASS.
- [x] Movie và series section ẩn độc lập khi trống.
- [x] Header stale nếu Radarr hoặc Sonarr stale.
- [x] Production hiển thị đúng movie và series card/link.
- [x] Smoke không tạo download request.

## Evidence

- Implementation/image SHA: `ede29f7` (`ghcr.io/thiengbp/vietarr-web:sha-ede29f7`).
- Local: `pnpm test` — 3/3 tests PASS, ESLint 0 errors (7 pre-existing warnings).
- Local: `pnpm build` — Next.js production build PASS.
- GitHub Actions:
  - CI run `30690515700` — success.
  - Container Images run `30690515692` — success.
- Production container `vietarr-web` — healthy on `sha-ede29f7`.
- Core remained on `sha-2e784a8`; Sonarr, Radarr và qBittorrent kept their existing multi-day uptime.
- Rendered DOM contains exactly two home-library sections:
  - `movie-library-title`: 4 movie posters, links under `/movies/...`.
  - `series-library-title`: 1 series poster, `The Eternal Fragrance`, link `/series/series-1`.
- Raw Next.js response repeats visible strings in the RSC payload; rendered DOM confirms each library section exists once.
- Production smoke used GET/read-only inspection only; no download request or POST was sent.

Block stays `ACTIVE` until the user sends exact approval `APPROVED BLOCK 09`.
