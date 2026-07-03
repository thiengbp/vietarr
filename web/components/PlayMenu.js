"use client";

import { useState } from "react";

export function PlayMenu({ options }) {
  const [copied, setCopied] = useState(false);
  async function copySmb() {
    if (!options?.smbPath) return;
    await navigator.clipboard.writeText(options.smbPath);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a className="rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-[#FFB84D]" href={options.infuseUrl}>
        Xem
      </a>
      <a className="rounded-[10px] border border-subtle bg-raised px-4 py-2 text-sm font-medium text-primary hover:bg-overlay" href={options.vlcUrl}>
        VLC
      </a>
      {options.browserPlayable && options.httpStreamUrl ? (
        <a className="rounded-[10px] border border-subtle bg-raised px-4 py-2 text-sm font-medium text-primary hover:bg-overlay" href={options.httpStreamUrl}>
          Trình duyệt
        </a>
      ) : null}
      <button className="rounded-[10px] border border-subtle bg-raised px-4 py-2 text-sm font-medium text-primary hover:bg-overlay" type="button" onClick={copySmb}>
        {copied ? "Đã copy" : "Copy SMB"}
      </button>
    </div>
  );
}
