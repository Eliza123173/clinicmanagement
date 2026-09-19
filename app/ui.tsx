"use client";
import React from "react";

export function Av({ x, size = "" }: { x: string; size?: string }) {
  return <i className={`av ${size}`}>{x}</i>;
}

export function St({ x }: { x: string }) {
  const map: Record<string, string> = { confirmed: "st-confirmed", completed: "st-completed", pending: "st-pending", cancelled: "st-cancelled" };
  return <span className={`st ${map[x.toLowerCase()] ?? "st-pending"}`}>{x}</span>;
}

export function Loading() {
  return <div className="loading"><div className="spinner" />Loading...</div>;
}

export function Pagination({ total, page, setPage, perPage = 5 }: { total: number; page: number; setPage: (n: number) => void; perPage?: number }) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      {Array.from({ length: pages }, (_, i) => (
        <button key={i} className={`page-btn ${page === i ? "page-btn-active" : ""}`} onClick={() => setPage(i)}>{i + 1}</button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
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
