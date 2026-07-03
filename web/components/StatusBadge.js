const labels = {
  available: "Đã có",
  downloading: "Đang tải",
  queued: "Chờ",
  missing: "Thiếu",
  unknown: "Không rõ"
};

const styles = {
  available: "border-success/30 bg-success/10 text-success",
  downloading: "border-info/30 bg-info/10 text-info",
  queued: "border-accent/30 bg-accent/10 text-accent",
  missing: "border-subtle bg-overlay text-secondary",
  unknown: "border-subtle bg-overlay text-muted"
};

export function StatusBadge({ status }) {
  const value = status || "unknown";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.7rem] font-medium ${styles[value] || styles.unknown}`}>
      {labels[value] || labels.unknown}
    </span>
  );
}
