import { useEffect } from 'react';

const SMARTSUPP_KEY = import.meta.env.VITE_SMARTSUPP_KEY || '';

export default function SmartsuppChat({ enabled = true }) {
  useEffect(() => {
    if (!enabled || !SMARTSUPP_KEY) return;

    if (window.smartsupp || document.getElementById('smartsupp-chat-script')) return;

    window._smartsupp = window._smartsupp || {};
    window._smartsupp.key = SMARTSUPP_KEY;

    const script = document.createElement('script');
    script.id = 'smartsupp-chat-script';
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = true;
    script.src = 'https://www.smartsuppchat.com/loader.js?';

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }

    return () => {
      if (window.smartsupp && typeof window.smartsupp === 'function') {
        try { window.smartsupp('hide'); } catch {}
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (window.smartsupp && typeof window.smartsupp === 'function') {
      try {
        window.smartsupp(enabled ? 'show' : 'hide');
      } catch {}
    }
  }, [enabled]);

  return null;
}
