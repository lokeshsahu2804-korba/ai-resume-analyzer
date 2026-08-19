// Public configuration — no secrets here
const isLocalhost = Boolean(
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname === '')
);

export const API_BASE_URL = isLocalhost
  ? 'http://localhost:5001/api'
  : 'https://ai-resume-analyzer-rn7x.onrender.com/api';

if (typeof window !== 'undefined') {
  window.API_BASE_URL = API_BASE_URL;
}
