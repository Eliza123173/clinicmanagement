"use client";

import { useEffect, useState } from "react";
import { addMessage, getMessages, Message } from "./supabase";

export function MessageBoard({ email, name, role }: { email: string; name: string; role: "Patient" | "Admin" | "Doctor" }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    const { data, error: requestError } = await getMessages(email, role);
    if (requestError) setError("Message Board needs the messages table. Run supabase/schema.sql once in Supabase.");
    else setMessages(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [email, role]);
  async function send() {
    if (!body.trim()) return;
    setSending(true); setError("");
    const recipientRole = role === "Admin" ? "Patient" : "Admin";
    const { error: requestError } = await addMessage({ sender_email: email, sender_name: name, recipient_role: recipientRole, body: body.trim() });
    setSending(false);
    if (requestError) return setError(requestError.message);
    setBody(""); load();
  }
  return <><div style={{ marginBottom: 22 }}><h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4, color: "#12304A" }}>Message Board</h1><p style={{ color: "#475569" }}>{role === "Admin" ? "Reply to patient and staff questions." : "Send a question or concern to the clinic administrator."}</p></div>
    <div className="panel"><div className="form-group"><label>New message</label><textarea value={body} maxLength={1000} placeholder="Write your message..." onChange={event => setBody(event.target.value)} /></div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: "#475569", fontSize: 12 }}>{body.length}/1000</span><button className="btn btn-primary" disabled={sending || !body.trim()} onClick={send}>{sending ? "Sending..." : "Send message"}</button></div>{error && <p className="error-msg" style={{ marginTop: 14 }}>{error}</p>}</div>
    <div className="panel"><div className="panel-header"><h2>Conversation history</h2></div>{loading ? <p style={{ color: "#475569" }}>Loading messages...</p> : messages.length ? messages.map(message => <div key={message.id} style={{ padding: "14px 0", borderBottom: "1px solid #edf1f5" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><b style={{ color: "#12304A" }}>{message.sender_name}</b><span style={{ color: "#475569", fontSize: 12 }}>{new Date(message.created_at).toLocaleString()}</span></div><p style={{ marginTop: 6, whiteSpace: "pre-wrap", color: "#12304A" }}>{message.body}</p></div>) : <p style={{ color: "#475569" }}>No messages yet.</p>}</div>
  </>;
}
