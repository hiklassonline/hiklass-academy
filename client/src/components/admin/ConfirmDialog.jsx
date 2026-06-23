import React from 'react';

export default function ConfirmDialog({ open, onClose, onConfirm, title, message }) {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(7,22,47,0.6)', backdropFilter: 'blur(4px)',
      padding: '20px',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', width: '420px', maxWidth: '100%',
        padding: '28px', boxShadow: '0 24px 60px rgba(7,22,47,0.3)',
        animation: 'modalIn 200ms ease',
      }}>
        <h3 style={{ margin: '0 0 8px', color: '#111827', fontWeight: 600, fontSize: '18px' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', color: '#6B7280', fontSize: '15px', lineHeight: '1.5' }}>{message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', border: '1px solid #E5E7EB', borderRadius: '8px',
            background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: '10px 20px', border: 'none', borderRadius: '8px',
            background: '#D30D1A', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
          }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
