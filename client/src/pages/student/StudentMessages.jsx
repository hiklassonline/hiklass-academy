import React, { useEffect, useRef, useState } from 'react';
import { LifeBuoy, Phone, PhoneCall, Send, Video } from 'lucide-react';
import EmojiPickerButton from '../../components/EmojiPickerButton';
import VoiceRecorderButton from '../../components/VoiceRecorderButton';
import VideoCallModal from '../../components/VideoCallModal';
import {
  fetchStudentMessages,
  getStoredStudentUser,
  sendStudentMessage,
  sendStudentVoiceNote,
  startStudentCall,
} from '../../services/studentAuthService';
import getAssetUrl from '../../utils/getAssetUrl';
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
  const [activeCall, setActiveCall] = useState(null);
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

  async function handleStartCall(callType) {
    if (sending) return;
    setSending(true);
    try {
      const sent = await startStudentCall(callType);
      setMessages((current) => [...current, sent]);
      setActiveCall({ roomName: sent.roomName, callType });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleVoiceNote(blob) {
    if (sending) return;
    setSending(true);
    try {
      const sent = await sendStudentVoiceNote(blob);
      setMessages((current) => [...current, sent]);
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
        <div className="studentMessagesCallButtons">
          <button type="button" onClick={() => handleStartCall('audio')} disabled={sending}>
            <Phone size={16} /> Audio Call
          </button>
          <button type="button" onClick={() => handleStartCall('video')} disabled={sending}>
            <Video size={16} /> Video Call
          </button>
        </div>

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
              {item.type === 'call' ? (
                <div className="studentMessageBubble callBubble">
                  <div className="callBubbleHead">
                    {item.callType === 'audio' ? <Phone size={16} /> : <Video size={16} />}
                    <span>{item.callType === 'audio' ? 'Audio call' : 'Video call'} started</span>
                  </div>
                  <button
                    type="button"
                    className="callJoinButton"
                    onClick={() => setActiveCall({ roomName: item.roomName, callType: item.callType })}
                  >
                    <PhoneCall size={14} /> Join Call
                  </button>
                  <time>{formatTime(item.createdAt)}</time>
                </div>
              ) : item.type === 'voice' ? (
                <div className="studentMessageBubble">
                  <audio controls src={getAssetUrl(item.audioUrl)} />
                  <time>{formatTime(item.createdAt)}</time>
                </div>
              ) : (
                <div className="studentMessageBubble">
                  <p>{item.body}</p>
                  <time>{formatTime(item.createdAt)}</time>
                </div>
              )}
            </div>
          ))}
        </div>

        {error ? <div className="studentFormMessage error" style={{ padding: '0 16px' }}>{error}</div> : null}

        <form className="studentMessagesComposer" onSubmit={submit}>
          <EmojiPickerButton onSelect={insertEmoji} />
          <VoiceRecorderButton onRecorded={handleVoiceNote} disabled={sending} />
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

      {activeCall ? (
        <VideoCallModal
          roomName={activeCall.roomName}
          callType={activeCall.callType}
          displayName={getStoredStudentUser()?.name}
          onClose={() => setActiveCall(null)}
        />
      ) : null}
    </div>
  );
}
