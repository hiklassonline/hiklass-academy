export const JITSI_DOMAIN = '8x8.vc';
export const JITSI_APP_ID = 'vpaas-magic-cookie-125dff6842e445fbbed3d0cd292cc185';

export function jitsiRoomName(roomName) {
  return `${JITSI_APP_ID}/${roomName}`;
}

let scriptPromise = null;

export function loadJitsiScript() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://${JITSI_DOMAIN}/${JITSI_APP_ID}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load the video call service. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}
