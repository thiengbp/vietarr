# ADR-005: Bỏ Fshare Bridge khỏi roadmap block chính
- **Ngày:** 2026-07-04 · **Trạng thái:** Accepted

## Bối cảnh
Roadmap ban đầu có Block 04 Fshare Bridge để biến Fshare thành nguồn tải ngang hàng torrent qua Torznab và giả lập API qBittorrent. Sau khi Block 01-03 đã hoàn thành installer, dashboard read/write, auth và realtime, mục tiêu gần nhất là đóng gói phát hành công khai ổn định. Fshare Bridge phụ thuộc API Fshare không chính thức, tài khoản VIP, logic retry/resume riêng và bề mặt bảo mật mới, làm tăng đáng kể rủi ro trước release public.

## Quyết định
Bỏ Fshare Bridge khỏi roadmap block chính. Block 04 trở thành "Đóng gói phát hành"; Bản public đầu tiên chỉ release các năng lực đã được kiểm chứng trong Block 01-03.

## Lý do & phương án đã loại
- Giữ Fshare Bridge làm Block 04: loại vì scope lớn, rủi ro API không chính thức và chưa cần để chứng minh installer + dashboard.
- Làm Fshare Bridge tối giản dạng tab dán link: loại vì vẫn kéo thêm credentials, queue/progress, import edge cases và documentation bảo mật.
- Đưa Fshare vào backlog/ADR: chọn cách này để không mất tri thức thiết kế ADR-001, nhưng không chặn release public.

## Hệ quả / đánh đổi
- Release public sớm hơn, DoD tập trung vào cài đặt, bảo mật, docs và CI.
- README/ARCHITECTURE/API/ROADMAP không được quảng bá Fshare như tính năng hiện tại.
- ADR-001 được giữ làm lịch sử thiết kế nhưng bị supersede bởi ADR-005 trong roadmap chính.
- Nếu sau release muốn khôi phục Fshare, cần ADR mới hoặc update ADR-005, scope lại như block riêng và chạy phase-gate từ đầu.
