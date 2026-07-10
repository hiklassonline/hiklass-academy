import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Phone, PhoneCall, Search, Send, Video } from 'lucide-react';
import { getStoredAdminToken } from '../../services/authService';
import { adminApi, adminUploadVoiceNote } from '../../services/adminContentApi';
import EmojiPickerButton from '../../components/EmojiPickerButton';
import VoiceRecorderButton from '../../components/VoiceRecorderButton';
import VideoCallModal from '../../components/VideoCallModal';
import getAssetUrl from '../../utils/getAssetUrl';
import './AdminMessagesPanel.css';

const POLL_MS = 4000;

function formatTime(iso) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function AdminMessagesPanel({ studentAccounts = [] }) {
  const token = getStoredAdminToken();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [thread, setThread] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
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

  async function loadConversations() {
    try {
      const data = await adminApi(token, 'GET', '/api/admin/messages/conversations');
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingList(false);
    }
  }

  async function loadThread(studentId, showSpinner) {
    if (showSpinner) setLoadingThread(true);
    try {
      const data = await adminApi(token, 'GET', `/api/admin/messages/${studentId}`);
      setThread(data.messages || []);
      setConversations((current) => current.map((conv) => (conv.studentId === studentId ? { ...conv, unreadCount: 0 } : conv)));
    } catch (err) {
      setError(err.message);
    } finally {
      if (showSpinner) setLoadingThread(false);
    }
  }

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, POLL_MS);
    function onFocus() {
      if (document.visibilityState === 'visible') loadConversations();
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
    if (!selectedId) return undefined;
    loadThread(selectedId, true);
    const interval = setInterval(() => loadThread(selectedId, false), POLL_MS);
    function onFocus() {
      if (document.visibilityState === 'visible') loadThread(selectedId, false);
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [selectedId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [thread]);

  async function submit(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || !selectedId) return;
    setSending(true);
    setError('');
    try {
      const data = await adminApi(token, 'POST', `/api/admin/messages/${selectedId}`, { body });
      setThread((current) => [...current, data.message]);
      setDraft('');
      await loadConversations();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function startCall(callType) {
    if (!selectedId || sending) return;
    setSending(true);
    setError('');
    try {
      const data = await adminApi(token, 'POST', `/api/admin/messages/${selectedId}`, { type: 'call', callType });
      setThread((current) => [...current, data.message]);
      await loadConversations();
      setActiveCall({ roomName: data.message.roomName, callType });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function sendVoiceNote(blob) {
    if (!selectedId || sending) return;
    setSending(true);
    setError('');
    try {
      const data = await adminUploadVoiceNote(token, `/api/admin/messages/${selectedId}/voice`, blob);
      setThread((current) => [...current, data.message]);
      await loadConversations();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // Merge every registered student account with their conversation (if any), so
  // admin can start a brand-new conversation with a student who hasn't messaged in yet,
  // not just reply to students who already reached out.
  const directory = useMemo(() => {
    const conversationsByStudent = new Map(conversations.map((conv) => [conv.studentId, conv]));
    const entries = studentAccounts.map((account) => {
      const conv = conversationsByStudent.get(account.id);
      return conv
        ? { ...conv, hasConversation: true }
        : {
            studentId: account.id,
            studentName: account.name,
            studentEmail: account.email,
            lastMessage: '',
            lastMessageSender: '',
            lastMessageAt: account.createdAt,
            unreadCount: 0,
            hasConversation: false,
          };
    });
    return entries.sort((a, b) => {
      if (a.hasConversation !== b.hasConversation) return a.hasConversation ? -1 : 1;
      if (a.hasConversation) return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      return a.studentName.localeCompare(b.studentName);
    });
  }, [studentAccounts, conversations]);

  const filteredDirectory = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return directory;
    return directory.filter((entry) =>
      entry.studentName.toLowerCase().includes(search) || entry.studentEmail.toLowerCase().includes(search));
  }, [directory, query]);

  const selectedEntry = directory.find((entry) => entry.studentId === selectedId);

  return (
    <section className="adminContentCard adminMessagesCard">
      <h2><MessageSquare size={18} /> Student Messages</h2>
      <p className="adminContentHint">Direct messages between students and HIKLASS Academy staff. Select any registered student to start or continue a conversation.</p>

      {error ? <div className="adminContentStatus error">{error}</div> : null}

      <div className="adminMessagesLayout">
        <div className="adminMessagesConversations">
          <div className="adminMessagesSearch">
            <Search size={14} />
            <input
              placeholder="Search students..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {loadingList ? <p className="adminContentEmpty">Loading...</p> : null}
          {!loadingList && !filteredDirectory.length ? <p className="adminContentEmpty">No students found.</p> : null}
          {filteredDirectory.map((entry) => (
            <button
              key={entry.studentId}
              type="button"
              className={entry.studentId === selectedId ? 'adminMessagesConvo active' : 'adminMessagesConvo'}
              onClick={() => setSelectedId(entry.studentId)}
            >
              <span className="adminMessagesConvoName">{entry.studentName}</span>
              <span className="adminMessagesConvoPreview">
                {entry.hasConversation
                  ? `${entry.lastMessageSender === 'admin' ? 'You: ' : ''}${entry.lastMessage}`
                  : 'No messages yet — start the conversation'}
              </span>
              {entry.unreadCount > 0 ? <em className="adminMessagesConvoBadge">{entry.unreadCount}</em> : null}
            </button>
          ))}
        </div>

        <div className="adminMessagesThread">
          {!selectedId ? (
            <p className="adminContentEmpty" style={{ margin: 'auto' }}>Select a student to view or start a conversation.</p>
          ) : (
            <>
              <div className="adminMessagesThreadHead">
                <div>
                  <strong>{selectedEntry?.studentName}</strong>
                  <small>{selectedEntry?.studentEmail}</small>
                </div>
                <div className="adminMessagesCallButtons">
                  <button type="button" onClick={() => startCall('audio')} disabled={sending} aria-label="Start audio call">
                    <Phone size={16} /> Audio Call
                  </button>
                  <button type="button" onClick={() => startCall('video')} disabled={sending} aria-label="Start video call">
                    <Video size={16} /> Video Call
                  </button>
                </div>
              </div>
              <div className="adminMessagesThreadList" ref={listRef}>
                {loadingThread ? <p className="adminContentEmpty">Loading...</p> : null}
                {!loadingThread && !thread.length ? <p className="adminContentEmpty">No messages yet. Say hello below.</p> : null}
                {!loadingThread && thread.map((item) => (
                  <div key={item.id} className={item.sender === 'admin' ? 'adminMessageRow mine' : 'adminMessageRow'}>
                    {item.type === 'call' ? (
                      <div className="adminMessageBubble callBubble">
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
                      <div className="adminMessageBubble">
                        <audio controls src={getAssetUrl(item.audioUrl)} />
                        <time>{formatTime(item.createdAt)}</time>
                      </div>
                    ) : (
                      <div className="adminMessageBubble">
                        <p>{item.body}</p>
                        <time>{formatTime(item.createdAt)}</time>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <form className="adminMessagesComposer" onSubmit={submit}>
                <EmojiPickerButton onSelect={insertEmoji} />
                <VoiceRecorderButton onRecorded={sendVoiceNote} disabled={sending} />
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type a reply..."
                  maxLength={2000}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !draft.trim()} aria-label="Send reply">
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {activeCall ? (
        <VideoCallModal
          roomName={activeCall.roomName}
          callType={activeCall.callType}
          displayName="HIKLASS Academy"
          onClose={() => setActiveCall(null)}
        />
      ) : null}
    </section>
  );
}
