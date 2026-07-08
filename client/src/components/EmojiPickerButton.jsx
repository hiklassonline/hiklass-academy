import React, { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import './EmojiPickerButton.css';

const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🙂', '🙃', '😉',
  '😊', '😇', '🥰', '😍', '😘', '😋', '😛', '🤪', '🤗', '🤔',
  '🤝', '👍', '👎', '👏', '🙌', '🙏', '💪', '✌️', '🤞', '👋',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💯', '✨', '🔥',
  '🎉', '🎊', '🎓', '🏆', '⭐', '📚', '📝', '📌', '📎', '📅',
  '⏰', '✅', '❌', '❓', '❗', '💡', '😢', '😭', '😴', '🙋',
  '😎', '🤓', '😮', '👀', '💻', '📱', '☕', '🎯', '🚀', '👌',
];

export default function EmojiPickerButton({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="emojiPickerWrap" ref={ref}>
      <button
        type="button"
        className="emojiPickerToggle"
        aria-label="Add emoji"
        onClick={() => setOpen((value) => !value)}
      >
        <Smile size={19} />
      </button>
      {open ? (
        <div className="emojiPickerPanel" role="menu">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emojiPickerOption"
              onClick={() => { onSelect(emoji); setOpen(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
