"use client";

import { useEffect, useState } from "react";
import { ActivityLog as ActivityLogType, getActivityLogs } from "./supabase";
import { Loading } from "./ui";

export function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getActivityLogs().then(({ data }) => { setLogs(data ?? []); setLoading(false); });
  }, []);

  const visible = logs.filter(log =>
    (log.actor_name + " " + log.actor_role + " " + log.action + " " + log.details + " " + (log.target_name ?? ""))
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Activity History</h1>
        <p style={{ color: "#8190a5" }}>Track appointment processing and important system activity.</p>
      </div>
      <div className="filters">
        <input value={search} placeholder="Search activity..." onChange={e => setSearch(e.target.value)} />
      </div>
      {loading ? <Loading /> : (
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Date & Time</th><th>User</th><th>Role</th><th>Action</th><th>Details</th><th>Target</th></tr>
            </thead>
            <tbody>
              {visible.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: "nowrap", color: "#8190a5", fontSize: 12 }}>{new Date(log.created_at).toLocaleString()}</td>
                  <td><b>{log.actor_name}</b></td>
                  <td>{log.actor_role}</td>
                  <td><b>{log.action}</b></td>
                  <td style={{ color: "#5a6a80" }}>{log.details}</td>
                  <td>{log.target_name || "—"}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#8190a5" }}>No activity recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
