import { io } from 'socket.io-client';
import { authAPI, getToken, SOCKET_URL } from './api';

export function connectSocket(url = SOCKET_URL, options = {}) {
  const socket = io(url, {
    ...options,
    auth: async done => {
      try { await authAPI.me(); done({ token: getToken() }); }
      catch { done({}); }
    },
  });
  socket.on('access_revoked', error => {
    window.dispatchEvent(new CustomEvent('skillbery-access-error', { detail: error.message }));
  });
  let refreshRequired = false;
  socket.on('session_expired', () => { refreshRequired = true; });
  socket.on('disconnect', reason => {
    if (reason === 'io server disconnect' && refreshRequired) {
      refreshRequired = false;
      // The handshake calls /auth/me, which rotates an expired bearer token.
      socket.connect();
    }
  });
  return socket;
}
