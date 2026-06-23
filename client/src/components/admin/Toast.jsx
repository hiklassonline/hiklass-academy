import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const colors = {
  success: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: '#059669' },
  error: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', icon: '#DC2626' },
  info: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', icon: '#2563EB' },
};

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  const style = colors[type] || colors.info;
  const Icon = icons[type] || icons.info;

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 1200,
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 18px', borderRadius: '12px',
      background: style.bg, border: `1px solid ${style.border}`,
      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
      animation: 'toastIn 300ms ease',
      maxWidth: '420px',
    }}>
      <Icon size={20} color={style.icon} style={{ flexShrink: 0 }} />
      <span style={{ color: style.text, fontSize: '14px', fontWeight: 500, lineHeight: '1.4' }}>{message}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: style.text, padding: '2px', flexShrink: 0, opacity: 0.6,
      }}>
        <X size={16} />
      </button>
    </div>
  );
}
