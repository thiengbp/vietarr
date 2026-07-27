"use client";

import { useEffect, useState } from "react";

export function PlayMenu({ options }) {
  const [copied, setCopied] = useState(false);
  const [mobileApple, setMobileApple] = useState(false);

  useEffect(() => {
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setMobileApple(isIos);
  }, []);

  async function copySmb() {
    if (!options?.smbPath) return;
    await navigator.clipboard.writeText(options.smbPath);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const available = Boolean(options?.infuseUrl || options?.vlcUrl || options?.smbPath || options?.httpStreamUrl);
  if (!available) {
    return (
      <div className="rounded-lg border border-subtle bg-raised px-4 py-3 text-sm text-secondary">
        Phim chưa có file để phát. Hãy chờ tải xong rồi thử lại.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.browserPlayable && options.httpStreamUrl ? (
        <a className="rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-[#FFB84D]" href={options.httpStreamUrl}>
          Xem trên web
        </a>
      ) : null}
      {mobileApple && options.infuseUrl ? (
        <a className="rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-[#FFB84D]" href={options.infuseUrl}>
          Mở Infuse
        </a>
      ) : null}
      {mobileApple && options.vlcUrl ? (
        <a className="rounded-[10px] border border-subtle bg-raised px-4 py-2 text-sm font-medium text-primary hover:bg-overlay" href={options.vlcUrl}>
          Mở VLC
        </a>
      ) : null}
      {options.smbPath ? (
        <button className="rounded-[10px] border border-subtle bg-raised px-4 py-2 text-sm font-medium text-primary hover:bg-overlay" type="button" onClick={copySmb}>
          {copied ? "Đã copy" : "Copy SMB"}
        </button>
      ) : null}
      {!mobileApple && !options.browserPlayable ? (
        <p className="w-full text-xs text-secondary">Trên Mac, copy đường dẫn SMB rồi mở bằng VLC hoặc Infuse.</p>
      ) : null}
    </div>
  );
}
