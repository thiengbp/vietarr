"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/clientApi";

export function AdminClient() {
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({ rate_limit_per_day: 5 });
  const [invite, setInvite] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setError("");
    try {
      const [userRows, nextSettings] = await Promise.all([
        apiFetch("/admin/users"),
        apiFetch("/settings")
      ]);
      setUsers(userRows);
      setSettings(nextSettings);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createInvite() {
    setSaving(true);
    setError("");
    try {
      const result = await apiFetch("/auth/invite/create", { method: "POST", body: { role: "member" } });
      setInvite(result.inviteUrl || `${window.location.origin}/register?invite=${encodeURIComponent(result.inviteToken)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await apiFetch("/settings", { method: "PATCH", body: { rate_limit_per_day: Number(settings.rate_limit_per_day) } });
      setSettings(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-6 md:px-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-primary md:text-[1.75rem]">Admin</h1>
        <p className="mt-1 text-sm text-secondary">Quản lý user, invite và giới hạn request.</p>
      </div>
      {error ? <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-subtle bg-raised">
          <div className="border-b border-subtle px-4 py-3">
            <h2 className="font-semibold text-primary">User</h2>
          </div>
          <div className="divide-y divide-subtle">
            {users.map((user) => (
              <div key={user.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-primary">{user.username}</p>
                  <p className="text-xs text-secondary">{user.createdAt}</p>
                </div>
                <span className="rounded-full border border-subtle bg-overlay px-2 py-1 text-xs text-secondary">{user.role}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-subtle bg-raised p-4">
            <h2 className="font-semibold text-primary">Invite</h2>
            <button className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black disabled:opacity-50" disabled={saving} type="button" onClick={createInvite}>
              Tạo invite
            </button>
            {invite ? (
              <input className="mt-3 w-full rounded-md border border-subtle bg-overlay px-3 py-2 text-xs text-primary" readOnly value={invite} onFocus={(event) => event.target.select()} />
            ) : null}
          </section>

          <section className="rounded-lg border border-subtle bg-raised p-4">
            <h2 className="font-semibold text-primary">Giới hạn tải</h2>
            <form className="mt-3 flex gap-2" onSubmit={saveSettings}>
              <input
                className="min-w-0 flex-1 rounded-md border border-subtle bg-overlay px-3 py-2 text-primary"
                min="1"
                max="100"
                type="number"
                value={settings.rate_limit_per_day}
                onChange={(event) => setSettings({ rate_limit_per_day: event.target.value })}
              />
              <button className="rounded-md bg-overlay px-4 py-2 text-sm font-semibold text-primary disabled:opacity-50" disabled={saving} type="submit">
                Lưu
              </button>
            </form>
          </section>
        </aside>
      </div>
    </main>
  );
}
