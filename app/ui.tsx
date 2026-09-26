"use client";
import React from "react";

export function Av({ x, size = "" }: { x: string; size?: string }) {
  return <i className={`av ${size}`}>{x}</i>;
}

export function St({ x }: { x: string }) {
  const map: Record<string, string> = {
    confirmed: "st-confirmed", completed: "st-completed",
    pending: "st-pending", cancelled: "st-cancelled",
    approved: "st-confirmed", rejected: "st-cancelled",
  };
  return <span className={`st ${map[x.toLowerCase()] ?? "st-pending"}`}>{x}</span>;
}

export function Loading({ text = "Loading..." }: { text?: string }) {
  return <div className="loading"><div className="spinner" />{text}</div>;
}

export function Pagination({ total, page, setPage, perPage = 5 }: { total: number; page: number; setPage: (n: number) => void; perPage?: number }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="page-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>‹</button>
      {Array.from({ length: pages }, (_, i) => (
        <button key={i} className={`page-btn ${page === i ? "page-btn-active" : ""}`} onClick={() => setPage(i)}>{i + 1}</button>
      ))}
      <button className="page-btn" disabled={page === pages - 1} onClick={() => setPage(page + 1)}>›</button>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, size = "" }: {
  title: string; onClose: () => void; children: React.ReactNode;
  footer?: React.ReactNode; size?: string;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${size}`} onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Alert({ type, msg }: { type: "success" | "error"; msg: string }) {
  if (!msg) return null;
  return (
    <div className={`alert alert-${type}`}>{type === "success" ? "✓" : "✕"} {msg}</div>
  );
}

export function EmptyState({ msg }: { msg: string }) {
  return <div className="empty-state"><div className="empty-icon">📭</div><p>{msg}</p></div>;
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      {action && <div>{action}</div>}
    </div>
  );
}
