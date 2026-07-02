# VIETARR DESIGN SYSTEM v0.1

> Nguồn chân lý duy nhất cho UI Dashboard. Agent không tự chế màu/spacing/size ngoài file này.
> Tinh thần: **web xem phim ban đêm** — nền tối sâu, poster là nhân vật chính, chrome UI lùi lại phía sau.

## 1. Nguyên tắc
1. **Poster-first:** mọi màn hình xoay quanh artwork; UI không bao giờ cạnh tranh màu với poster.
2. **Một hành động chính mỗi ngữ cảnh:** phim chưa có → "Tải về"; phim đã có → "Xem". Nút phụ luôn ghost/outline.
3. **Trạng thái luôn nhìn thấy:** đang tải/đã có/thiếu phụ đề thể hiện bằng badge trên card, không bắt user mở chi tiết.
4. **Tiếng Việt trước:** mọi label theo GLOSSARY.md; số liệu định dạng vi-VN (17:30, 12/07/2026, 1.5 GB).
5. Mobile-first: người dùng request phim từ điện thoại là luồng số 1.

## 2. Design Tokens

### 2.1. Màu (dark theme mặc định — theme duy nhất ở MVP)
| Token | Hex | Dùng cho |
|-------|-----|----------|
| `--bg-base` | `#0B0E14` | nền toàn trang |
| `--bg-raised` | `#131720` | card, header, modal |
| `--bg-overlay` | `#1B2130` | hover card, dropdown |
| `--border-subtle` | `#232B3B` | viền card, divider |
| `--text-primary` | `#E8ECF4` | tiêu đề, nội dung chính |
| `--text-secondary` | `#9AA4B8` | metadata, mô tả |
| `--text-muted` | `#5C6678` | placeholder, disabled |
| `--accent` | `#F5A623` | hành động chính "Tải về", progress *(xem ADR-004)* |
| `--accent-hover` | `#FFB84D` | hover accent |
| `--success` | `#3DDC84` | badge "Đã có", verify pass |
| `--info` | `#4DA3FF` | badge đang tải, link |
| `--danger` | `#FF5C5C` | lỗi tải, cảnh báo |
| `--quality-4k` | `#C9A227` | badge 4K/Remux (vàng đồng) |

Ghi chú: accent **cam hổ phách** thay vì đỏ Netflix — tránh cảm giác clone, hợp tông "ấm" và nổi trên nền xanh đen. Quyết định tại ADR-004.

### 2.2. Typography
- Font: **Inter** (Latin + Vietnamese subset, self-host qua `next/font` — không gọi Google Fonts runtime). Fallback: system-ui.
- Scale (rem): `display 2.25 / h1 1.75 / h2 1.375 / h3 1.125 / body 1 / caption 0.8125` — line-height 1.5 cho body, 1.2 cho heading. Weight: 400 body, 500 label, 600 heading, 700 display.
- Số liệu (dung lượng, tiến độ): `font-variant-numeric: tabular-nums`.

### 2.3. Spacing & radius
- Spacing scale 4px: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`.
- Radius: card & poster `12px`, nút `10px`, badge `999px`, modal `16px`.
- Shadow: dùng tiết chế — chỉ modal và hover card: `0 8px 24px rgba(0,0,0,.45)`.

### 2.4. Poster & layout
- Tỉ lệ poster: **2:3** cố định, `object-fit: cover`, ảnh TMDB `w342` (grid) / `w780` (chi tiết), luôn có skeleton shimmer khi load.
- Grid: mobile 3 cột / tablet 5 / desktop 7, gap 12px. Container max `1440px`.
- Hero trang chi tiết: backdrop TMDB phủ mờ gradient xuống `--bg-base`.

## 3. Component inventory (đặt tên chuẩn, tái dùng)
| Component | Mô tả | Trạng thái |
|-----------|-------|-----------|
| `PosterCard` | poster + tên + năm + `QualityBadge` + `StatusBadge`, hover hiện nút nhanh | P2 |
| `StatusBadge` | Đã có / Đang tải x% / Chờ / Thiếu phụ đề | P2 |
| `QualityBadge` | 1080p / 4K / Remux (màu `--quality-4k`) | P2 |
| `PlayMenu` | nút "Xem" → Infuse / VLC / Copy SMB / (Trình duyệt nếu MP4) | P2 |
| `RequestButton` | "Tải về" + chọn chất lượng, biến thành progress sau khi bấm | P3 |
| `ProgressBar` | tiến độ tải realtime, tabular-nums | P3 |
| `SearchBar` | tìm TMDB, debounce 300ms, kết quả kèm badge "Đã có" | P3 |
| `MediaHero` | backdrop + metadata + hàng nút, trang chi tiết | P2 |
| `Toast` | thông báo (request thành công, lỗi) | P3 |
| `EmptyState` | thư viện trống / không tìm thấy, có minh họa + CTA | P2 |

## 4. Motion
- Chuẩn: `150ms ease-out` (hover), `250ms` (modal/menu). Poster hover: scale `1.03` + shadow.
- Tôn trọng `prefers-reduced-motion`.

## 5. Giọng UI (microcopy)
- Xưng hô trung tính, ngắn: "Tải về", "Xem ngay", "Đã có trong thư viện", "Đang tải 43%", "Chưa có phụ đề Việt".
- Lỗi luôn kèm hành động: "Không kết nối được Radarr — Thử lại".
