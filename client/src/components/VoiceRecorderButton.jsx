import React, { useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';
import './VoiceRecorderButton.css';

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function VoiceRecorderButton({ onRecorded, disabled }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  async function startRecording() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = window.MediaRecorder?.isTypeSupported?.('audio/webm') ? 'audio/webm' : '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        if (blob.size > 0) onRecorded(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((current) => current + 1), 1000);
    } catch {
      setError('Microphone access denied or unavailable.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  }

  function cancelRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      mediaRecorderRef.current.stop();
    }
    clearInterval(timerRef.current);
    setRecording(false);
    setSeconds(0);
  }

  if (recording) {
    return (
      <div className="voiceRecorderActive">
        <span className="voiceRecorderDot" />
        <span className="voiceRecorderTimer">{formatDuration(seconds)}</span>
        <button type="button" className="voiceRecorderCancel" aria-label="Cancel recording" onClick={cancelRecording}>
          <X size={16} />
        </button>
        <button type="button" className="voiceRecorderStop" aria-label="Stop and send voice note" onClick={stopRecording}>
          <Square size={13} fill="currentColor" />
        </button>
      </div>
    );
  }

  return (
    <span className="voiceRecorderWrap">
      <button
        type="button"
        className="voiceRecorderToggle"
        aria-label="Record voice note"
        onClick={startRecording}
        disabled={disabled}
      >
        <Mic size={19} />
      </button>
      {error ? <span className="voiceRecorderError">{error}</span> : null}
    </span>
  );
}
