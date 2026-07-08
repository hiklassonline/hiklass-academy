import React, { useEffect, useRef, useState } from 'react';
import { LifeBuoy, Send } from 'lucide-react';
import EmojiPickerButton from '../../components/EmojiPickerButton';
import { fetchStudentMessages, sendStudentMessage } from '../../services/studentAuthService';
import './StudentMessages.css';

const POLL_MS = 4000;

function formatTime(iso) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function StudentMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  function insertEmoji(emoji) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      const cursor = start + emoji.length;
      input.setSelectionRange(cursor, cursor);
    });
  }

  async function load(showSpinner) {
    if (showSpinner) setLoading(true);
    try {
      const list = await fetchStudentMessages();
      setMessages(list);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), POLL_MS);
    function onFocus() {
      if (document.visibilityState === 'visible') load(false);
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  async function submit(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const sent = await sendStudentMessage(body);
      setMessages((current) => [...current, sent]);
      setDraft('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="studentMessagesPage">
      <div className="studentPageHeader">
        <h2>Messages</h2>
        <p>Chat directly with HIKLASS Academy staff.</p>
      </div>

      <div className="studentCard studentMessagesCard">
        <div className="studentMessagesList" ref={listRef}>
          {loading ? <p className="studentEmptyState">Loading messages...</p> : null}

          {!loading && !messages.length ? (
            <div className="studentMessagesEmpty">
              <LifeBuoy size={32} />
              <h3>No messages yet</h3>
              <p>Send a message below and HIKLASS Academy staff will reply here.</p>
            </div>
          ) : null}

          {messages.map((item) => (
            <div key={item.id} className={item.sender === 'student' ? 'studentMessageRow mine' : 'studentMessageRow'}>
              <div className="studentMessageBubble">
                <p>{item.body}</p>
                <time>{formatTime(item.createdAt)}</time>
              </div>
            </div>
          ))}
        </div>

        {error ? <div className="studentFormMessage error" style={{ padding: '0 16px' }}>{error}</div> : null}

        <form className="studentMessagesComposer" onSubmit={submit}>
          <EmojiPickerButton onSelect={insertEmoji} />
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a message..."
            maxLength={2000}
            disabled={sending}
          />
          <button type="submit" disabled={sending || !draft.trim()} aria-label="Send message">
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
