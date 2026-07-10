import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { jitsiRoomName, loadJitsiScript } from '../utils/jitsiConfig';
import './VideoCallModal.css';

export default function VideoCallModal({ roomName, callType, displayName, onClose }) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        apiRef.current = new window.JitsiMeetExternalAPI('8x8.vc', {
          roomName: jitsiRoomName(roomName),
          parentNode: containerRef.current,
          userInfo: displayName ? { displayName } : undefined,
          configOverwrite: callType === 'audio' ? { startAudioOnly: true, startWithVideoMuted: true } : {},
        });
        apiRef.current.addListener('videoConferenceLeft', onClose);
        apiRef.current.addListener('readyToClose', onClose);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, callType]);

  return (
    <div className="videoCallOverlay">
      <div className="videoCallPanel">
        <button type="button" className="videoCallClose" onClick={onClose} aria-label="Close call">
          <X size={20} />
        </button>
        {loading ? <p className="videoCallStatus">Connecting to call...</p> : null}
        {error ? <p className="videoCallStatus error">{error}</p> : null}
        <div className="videoCallContainer" ref={containerRef} />
      </div>
    </div>
  );
}
