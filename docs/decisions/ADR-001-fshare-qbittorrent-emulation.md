# ADR-001: Tích hợp Fshare bằng giả lập API qBittorrent + Torznab
- **Ngày:** 2026-07-02 · **Trạng thái:** Accepted
## Bối cảnh
Radarr/Sonarr chỉ hỗ trợ download client có sẵn (qBittorrent, SAB...) và indexer chuẩn Torznab/Newznab. Fshare không thuộc nhóm nào.
## Quyết định
Vietarr Core expose (1) endpoint Torznab để Prowlarr tìm trên Fshare, (2) API giả lập qBittorrent WebUI để Radarr/Sonarr "gửi tải" — Core tải trực tiếp từ Fshare vào /data/torrents rồi báo progress theo format qBittorrent.
## Lý do & phương án đã loại
- Viết plugin/fork Radarr: bảo trì nặng theo upstream — loại.
- Chỉ làm tab dán link thủ công: không tận dụng được automation của *arr. Fshare hiện nằm ngoài roadmap block chính.
- Mô hình giả lập đã được chứng minh production bởi RDT-Client/Decypharr với Real-Debrid.
## Hệ quả / đánh đổi
Phải bám sát API qBittorrent (ổn định nhiều năm); phụ thuộc API Fshare không chính thức → cần lớp retry/adapter riêng (tái dùng Fshare NAS Bot).
