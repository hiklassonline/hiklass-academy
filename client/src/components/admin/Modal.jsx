import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, wide }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const keyHandler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(7,22,47,0.6)', backdropFilter: 'blur(4px)',
      padding: '20px',
    }}>
      <div ref={ref} style={{
        background: '#fff', borderRadius: '16px',
        width: wide ? '720px' : '520px', maxWidth: '100%',
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 60px rgba(7,22,47,0.3)',
        animation: 'modalIn 200ms ease',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 0', gap: '16px',
        }}>
          <h3 style={{ margin: 0, color: '#1E2F97', fontWeight: 600, fontSize: '18px' }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#6B7280', padding: '4px', borderRadius: '6px',
            display: 'grid', placeItems: 'center',
          }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}
