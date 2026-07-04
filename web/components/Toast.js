"use client";

export function Toast({ message, tone = "success", onClose }) {
  if (!message) return null;
  const toneClass = tone === "danger" ? "border-danger/40 bg-danger/15 text-danger" : "border-success/40 bg-success/15 text-success";
  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 rounded-lg border px-4 py-3 text-sm shadow-poster md:left-auto md:w-96 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        <button className="text-primary" type="button" onClick={onClose} aria-label="Đóng">
          ×
        </button>
      </div>
    </div>
  );
}
