"use client";

import { useEffect, useState } from "react";

type ApiOk<T> = { ok: true; data: T };
type ApiErr = { ok: false; error: { message: string; code: number } };
type ApiResp<T> = ApiOk<T> | ApiErr;

function getApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
}

function getToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("fuerza_admin_token") ?? "";
}

function setToken(t: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("fuerza_admin_token", t);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
      ...(getToken() ? { authorization: `Bearer ${getToken()}` } : {})
    }
  });
  const json = (await res.json()) as ApiResp<T>;
  if (!json.ok) throw new Error(json.error.message);
  return json.data;
}

export default function AdminHome() {
  const [email, setEmail] = useState("admin@fuerza.local");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string>("");
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(Boolean(getToken()));
  }, []);

  async function startOtp() {
    setStatus("Requesting code...");
    const res = await fetch(`${getApiBase()}/auth/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "email", target: email })
    });
    const json = (await res.json()) as ApiResp<{ devCode?: string }>;
    if (!json.ok) return setStatus(json.error.message);
    setStatus(json.data.devCode ? `Dev code: ${json.data.devCode}` : "Code sent.");
  }

  async function verifyOtp() {
    setStatus("Verifying...");
    const res = await fetch(`${getApiBase()}/auth/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: "email", target: email, code })
    });
    const json = (await res.json()) as ApiResp<{ token: string }>;
    if (!json.ok) return setStatus(json.error.message);
    setToken(json.data.token);
    location.reload();
  }

  async function loadUsers() {
    setStatus("Loading users...");
    const data = await api<{ users: any[] }>("/admin/users");
    setUsers(data.users);
    setStatus(`Loaded ${data.users.length} users`);
  }

  async function loadJobs() {
    setStatus("Loading jobs...");
    const data = await api<{ jobs: any[] }>("/admin/jobs");
    setJobs(data.jobs);
    setStatus(`Loaded ${data.jobs.length} jobs`);
  }

  async function deactivate(userId: string, isDeactivated: boolean) {
    await api(`/admin/users/${userId}/deactivate`, {
      method: "POST",
      body: JSON.stringify({ isDeactivated })
    });
    await loadUsers();
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Fuerza Admin</h1>
      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Minimal internal dashboard (MVP): users, jobs, deactivate accounts.
      </p>

      {!mounted ? (
        <section
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 16,
            background: "rgba(255,255,255,0.04)"
          }}
        >
          <h2 style={{ marginTop: 0 }}>Loading…</h2>
          <p style={{ opacity: 0.8, marginBottom: 0 }}>
            Initializing admin session.
          </p>
        </section>
      ) : !authed ? (
        <section
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: 16,
            background: "rgba(255,255,255,0.04)"
          }}
        >
          <h2 style={{ marginTop: 0 }}>Admin login (OTP)</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin email"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.25)",
                color: "#e6edf6",
                minWidth: 280
              }}
            />
            <button
              onClick={startOtp}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "#1d4ed8",
                color: "white",
                cursor: "pointer"
              }}
            >
              Send code
            </button>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(0,0,0,0.25)",
                color: "#e6edf6",
                width: 160
              }}
            />
            <button
              onClick={verifyOtp}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "#10b981",
                color: "white",
                cursor: "pointer"
              }}
            >
              Verify & login
            </button>
          </div>
        </section>
      ) : (
        <section
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap"
          }}
        >
          <button
            onClick={loadUsers}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "#e6edf6",
              cursor: "pointer"
            }}
          >
            Load users
          </button>
          <button
            onClick={loadJobs}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "#e6edf6",
              cursor: "pointer"
            }}
          >
            Load jobs
          </button>
          <button
            onClick={() => {
              window.localStorage.removeItem("fuerza_admin_token");
              location.reload();
            }}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "#e6edf6",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </section>
      )}

      {status ? (
        <p style={{ marginTop: 12, opacity: 0.85 }}>
          <b>Status:</b> {status}
        </p>
      ) : null}

      {users.length > 0 ? (
        <section style={{ marginTop: 24 }}>
          <h2>Users</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8 }}>Email</th>
                  <th style={{ padding: 8 }}>Role</th>
                  <th style={{ padding: 8 }}>Deactivated</th>
                  <th style={{ padding: 8 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <td style={{ padding: 8 }}>{u.name}</td>
                    <td style={{ padding: 8 }}>{u.email ?? u.phone ?? "-"}</td>
                    <td style={{ padding: 8 }}>{u.role}</td>
                    <td style={{ padding: 8 }}>{String(u.isDeactivated)}</td>
                    <td style={{ padding: 8 }}>
                      <button
                        onClick={() => deactivate(u.id, !u.isDeactivated)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: u.isDeactivated ? "#10b981" : "#ef4444",
                          color: "white",
                          cursor: "pointer"
                        }}
                      >
                        {u.isDeactivated ? "Reactivate" : "Deactivate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {jobs.length > 0 ? (
        <section style={{ marginTop: 24 }}>
          <h2>Jobs</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={{ padding: 8 }}>Job</th>
                  <th style={{ padding: 8 }}>Trade</th>
                  <th style={{ padding: 8 }}>Status</th>
                  <th style={{ padding: 8 }}>Customer</th>
                  <th style={{ padding: 8 }}>Technician</th>
                  <th style={{ padding: 8 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <td style={{ padding: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                      {j.id}
                    </td>
                    <td style={{ padding: 8 }}>{j.trade}</td>
                    <td style={{ padding: 8 }}>{j.status}</td>
                    <td style={{ padding: 8 }}>{j.customer?.name ?? "-"}</td>
                    <td style={{ padding: 8 }}>{j.technician?.name ?? "-"}</td>
                    <td style={{ padding: 8 }}>{new Date(j.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}


