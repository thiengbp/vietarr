"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiFetch, saveSession } from "@/lib/clientApi";

export default function RegisterPage() {
  const params = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inviteToken = params.get("invite") || "";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await apiFetch("/auth/register", { method: "POST", body: { inviteToken, username, password }, token: "" });
      saveSession(session);
      window.location.href = "/discover";
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form className="w-full max-w-sm rounded-lg border border-subtle bg-raised p-5" onSubmit={submit}>
        <h1 className="text-xl font-semibold text-primary">Tạo tài khoản</h1>
        <div className="mt-5 space-y-3">
          <input className="w-full rounded-md border border-subtle bg-overlay px-3 py-2 text-primary" placeholder="Tên đăng nhập" value={username} onChange={(event) => setUsername(event.target.value)} />
          <input className="w-full rounded-md border border-subtle bg-overlay px-3 py-2 text-primary" placeholder="Mật khẩu" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {!inviteToken ? <p className="mt-3 text-sm text-danger">Thiếu invite token.</p> : null}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <button className="mt-5 w-full rounded-md bg-accent px-4 py-2 font-semibold text-black disabled:opacity-50" disabled={busy || !inviteToken} type="submit">
          {busy ? "Đang tạo" : "Tạo tài khoản"}
        </button>
      </form>
    </main>
  );
}
