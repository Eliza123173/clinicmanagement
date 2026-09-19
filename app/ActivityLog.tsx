"use client";

import { useEffect, useState } from "react";
import { ActivityLog as Activity, getActivityLogs } from "./supabase";
import { Loading } from "./ui";

export function ActivityLog() {
  const [logs, setLogs] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  useEffect(() => {
    getActivityLogs().then(({ data }) => { setLogs(data ?? []); setLoading(false); });
  }, []);
  const visible = logs.filter(log => (log.actor_name + " " + log.action + " " + log.details + " " + (log.target_name ?? "")).toLowerCase().includes(search.toLowerCase()));
  return <><div style={{ marginBottom: 22 }}><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Activity History</h1><p style={{ color: "#8190a5" }}>Track appointment processing and important system activity.</p></div>
    <div className="filters"><input value={search} placeholder="Search activity..." onChange={event => setSearch(event.target.value)} /></div>
    {loading ? <Loading /> : <div className="tbl-wrap"><table><thead><tr><th>Date & time</th><th>User</th><th>Role</th><th>Action</th><th>Details</th></tr></thead><tbody>{visible.map(log => <tr key={log.id}><td>{new Date(log.created_at).toLocaleString()}</td><td>{log.actor_name}</td><td>{log.actor_role}</td><td><b>{log.action}</b></td><td>{log.details}{log.target_name ? " — " + log.target_name : ""}</td></tr>)}{visible.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: 24, color: "#8190a5" }}>No activity recorded yet.</td></tr>}</tbody></table></div>}
  </>;
}
