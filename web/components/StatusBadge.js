const labels = {
  available: "Đã có",
  downloading: "Đang tải",
  queued: "Chờ",
  missing: "Chưa có file",
  unknown: "Đang kiểm tra"
};

export function StatusBadge({ status }) {
  const value = status || "unknown";
  return (
    <span className="status-badge" data-status={labels[value] ? value : "unknown"}>
      {labels[value] || labels.unknown}
    </span>
  );
}
