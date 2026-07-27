# ADR-006: Đổi kho media vật lý sang `torrents/` và `library/`
- **Ngày:** 2026-07-28 · **Trạng thái:** Accepted

## Bối cảnh
VietArr hiện gắn NFS share `media` tại `/mnt/media`, nhưng `MEDIA_ROOT` lại là
`/mnt/media/data`. Vì thư viện hoàn chỉnh tiếp tục nằm trong thư mục con `media`,
đường dẫn vật lý trở thành `/volume1/media/data/media/...`, dễ nhầm với nhánh tải
`/volume1/media/data/torrents/...` và làm giao diện File Station khó đọc.

Mục tiêu vận hành đã được Jooh chọn là:

```text
/volume1/media/
├── torrents/
│   ├── movies/
│   └── tv/
└── library/
    ├── movies/
    └── tv/
```

Radarr/Sonarr phải tiếp tục import bằng hardlink. Thử nghiệm production ngày
2026-07-28 xác nhận việc map `torrents` và `library` thành hai Docker volume riêng
gây lỗi `Cross-device link`; vì vậy toàn bộ share vẫn phải được map thành một root
duy nhất trong container.

## Quyết định
- `MEDIA_ROOT` mặc định đổi từ `/mnt/media/data` thành `/mnt/media`.
- Installer tạo `torrents/{movies,tv}` và `library/{movies,tv}` trực tiếp dưới
  `MEDIA_ROOT`.
- Các container tiếp tục dùng một mount duy nhất `${MEDIA_ROOT}:/data` để giữ
  hardlink và atomic import.
- Core dùng `CORE_MEDIA_ROOT=/data` khi đọc/stream file trong container;
  `MEDIA_ROOT` chỉ còn là đường dẫn mount trên host.
- qBittorrent giữ nguyên `/data/torrents/movies` và `/data/torrents/tv`.
- Thư viện Radarr/Sonarr đổi từ `/data/media/{movies,tv}` thành
  `/data/library/{movies,tv}`.
- Trường `path`/`smbPath` của API B2 phản ánh tên mới `library`; hình dạng response,
  endpoint và ý nghĩa nghiệp vụ không đổi.
- Production migration phải dừng các container ghi dữ liệu, đổi tên hai thư mục
  trong cùng NFS share, cập nhật compose/*arr, rồi kiểm tra inode hardlink trước khi
  chạy lại. Không xóa `media-test` trong migration này.

## Lý do & phương án đã loại
- Giữ `/data/media` và cấu trúc hiện tại: loại vì không giải quyết tên lặp
  `media/data/media` mà người dùng yêu cầu làm gọn.
- Map riêng host `torrents` và `library` vào `/data/torrents` và `/data/media`: loại
  vì hardlink production trả `Cross-device link`, dẫn đến sao chép file và tốn gấp
  đôi dung lượng.
- Tạo symlink `media -> library`: loại vì File Station vẫn hiện cả `media` và
  `library`, tiếp tục gây nhầm lẫn và tạo hai tên cho cùng một nội dung.

## Hệ quả / đánh đổi
- Đây là thay đổi có chủ đích đối với path contract đã freeze ở B2/B3; cần Jooh
  duyệt ADR trước khi implementation/migration.
- Installer, verifier, wiring, Core fallback, test fixtures, API docs, architecture
  và release docs phải đổi đồng bộ.
- Các client tự lưu đường dẫn tuyệt đối `/data/media/...` cần chuyển sang
  `/data/library/...`; client chỉ dùng ID/URL của VietArr không bị ảnh hưởng.
- Cấu trúc NAS ngắn hơn một tầng, phân biệt rõ file đang tải và thư viện hoàn chỉnh,
  trong khi hardlink vẫn hoạt động vì các app nhìn thấy một filesystem `/data`.
