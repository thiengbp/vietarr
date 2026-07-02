# CLAUDE.md — LUẬT LÀM VIỆC CHO AI AGENT (BẮT BUỘC ĐỌC MỖI SESSION)

## Dự án
VietArr — media server tự động cho người Việt. Installer zero-touch cho stack *arr,
Dashboard kiểu web xem phim (đọc API Radarr/Sonarr), Fshare Bridge, phát qua Infuse/SMB.
Đọc `ARCHITECTURE.md` để nắm sơ đồ tổng. Đọc `ROADMAP.md` để biết đang ở Block nào.

## LUẬT PHASE-GATE (QUAN TRỌNG NHẤT)
1. Chỉ được code trong phạm vi Block đang ACTIVE (xem ROADMAP.md).
2. Đọc kỹ `docs/blocks/BLOCK-XX-*.md` của block hiện tại, đặc biệt mục **Scope & Non-Goals**.
   Thứ nằm trong Non-Goals thì TUYỆT ĐỐI không làm, kể cả khi "tiện tay".
3. Interface Contract của block đã Release là BẤT BIẾN. Muốn đổi → viết ADR mới,
   chờ người dùng (Jooh) duyệt, KHÔNG tự sửa.
4. Hoàn thành block: chạy toàn bộ Definition of Done trong mục QA, in kết quả từng mục,
   in `=== BLOCK XX COMPLETE ===` rồi DỪNG. Không tự ý sang block kế tiếp.
5. Trước khi dừng: cập nhật mục **Handoff & Next Block** của block file,
   cập nhật CHANGELOG.md và ARCHITECTURE.md nếu có thay đổi.

## Quy ước kỹ thuật
- Core: Node.js 22, Express, better-sqlite3. Web: Next.js 15 + Tailwind. Không thêm framework khi chưa có ADR.
- Ngôn ngữ UI: tiếng Việt, thuật ngữ theo `docs/GLOSSARY.md`. Code/comment: tiếng Anh.
- Secrets: chỉ nằm trong `.env` (gitignored). Thấy secret trong code/log → dừng, báo ngay. Đọc SECURITY.md.
- Mọi API của Core phải khớp `docs/API.md` (contract-first). Sửa API.md trước, code sau.
- Commit message: conventional commits (`feat:`, `fix:`, `docs:`...), tiếng Anh.
- Test chạy bằng `npm test` trong từng package. Không merge khi test đỏ.

## Môi trường thật (không được phá)
- VM media-server: jooh@10.10.10.50 (Ubuntu 24.04, Docker). Stack *arr production đang chạy ở /opt/docker.
- KHÔNG deploy thử lên VM này khi chưa được yêu cầu. Dev/test bằng compose local.
- NAS 10.10.10.10, Proxmox 10.10.10.3: chỉ đọc, không ghi, trừ khi được yêu cầu rõ.
