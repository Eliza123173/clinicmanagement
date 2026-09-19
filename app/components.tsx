"use client";
import { useState } from "react";

export function Av({ x, size = "" }: { x: string; size?: string }) {
  return <i className={`av ${size}`}>{x}</i>;
}

export function St({ x }: { x: string }) {
  const cls: Record<string, string> = {
    confirmed: "st-confirmed", completed: "st-completed",
    pending: "st-pending", cancelled: "st-cancelled",
  };
  return <span className={`st ${cls[x.toLowerCase()] ?? "st-pending"}`}>{x}</span>;
}

export function Pagination({ total, page, setPage }: { total: number; page: number; setPage: (n: number) => void }) {
  const pages = Math.ceil(total / 5);
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      {Array.from({ length: pages }, (_, i) => (
        <button key={i} className={`page-btn ${page === i ? "page-btn-active" : ""}`} onClick={() => setPage(i)}>
          {i + 1}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ border: 0, background: "none", fontSize: 20, color: "#8190a5", cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PasswordInput({ placeholder, value, onChange }: { placeholder?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-field">
      <input type={show ? "text" : "password"} placeholder={placeholder ?? "••••••••"} value={value} onChange={onChange} />
      <button type="button" className="password-toggle" onClick={() => setShow(s => !s)}>{show ? "🙈" : "👁"}</button>
    </div>
  );
}

export function useLocalList<T extends { id: string }>(initial: T[]) {
  const [list, setList] = useState<T[]>(initial);
  const add = (item: T) => setList(p => [...p, item]);
  const update = (id: string, patch: Partial<T>) => setList(p => p.map(x => x.id === id ? { ...x, ...patch } : x));
  const remove = (id: string) => setList(p => p.filter(x => x.id !== id));
  return { list, add, update, remove };
}
