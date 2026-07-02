# BLOCK-XX — <TÊN BLOCK>

> **Trạng thái:** PLANNED | IN PROGRESS | QA | RELEASED
> **Phụ thuộc:** BLOCK-YY (contract nào)
> **Bắt đầu / Kết thúc:** yyyy-mm-dd / yyyy-mm-dd

## 1. Vision (đích đến)
Một đoạn: block này xong thì người dùng/hệ thống làm được gì mà trước đó không làm được.

## 2. Scope & Non-Goals
**Trong scope:** gạch đầu dòng cụ thể.
**Non-Goals (cấm làm ở block này):** gạch đầu dòng — agent đọc kỹ mục này.

## 3. Architecture
Sơ đồ/mô tả thành phần, luồng dữ liệu, file/module chính sẽ tạo.

### Interface Contract (đóng băng khi Release)
Endpoint / schema / CLI flags mà block khác sẽ gọi. Ghi rõ input/output.

## 4. Business Rules
Các luật nghiệp vụ dạng đánh số BR-1, BR-2... (điều kiện, giới hạn, hành vi khi lỗi).

## 5. Implementation
Checklist việc, chia theo ngày/nhóm. Agent tick trực tiếp vào đây.
- [ ] ...

## 6. QA
### Definition of Done (pass hết mới được Release)
- [ ] Tiêu chí đo được 1 (kèm lệnh verify)
- [ ] ...
### Test cases
Bảng: mã | kịch bản | bước | kết quả mong đợi | trạng thái.

## 7. Release
Phiên bản semver, nội dung CHANGELOG, lệnh build/tag, ai duyệt.

## 8. Technical Debt
Nợ phát sinh trong block: mô tả | mức độ | dự kiến trả ở block nào.

## 9. Handoff & Next Block
- Block sau cần biết: key files, quyết định, gotcha, credentials ở đâu.
- Block tiếp theo: BLOCK-XX+1 — <tên>.
