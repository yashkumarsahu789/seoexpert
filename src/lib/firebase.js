import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDuxCtAveHMxGcbAOmuc25IgKVT__4deTY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'manager-fc26f.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'manager-fc26f',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'manager-fc26f.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '534713538513',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:534713538513:web:733bddf9ca23963a5e32f0',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-0HG93MWWTZ',
};

export const firebaseApp = initializeApp(firebaseConfig);

isSupported().then((supported) => {
  if (supported) {
    getAnalytics(firebaseApp);
  }
});

function resolveApiBase() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return '/api';

  const host = window.location.hostname;
  if (host.endsWith('web.app') || host.endsWith('firebaseapp.com')) {
    return '/api';
  }

  return '/api';
}

export const API_BASE = resolveApiBase();

export const FIREBASE_HOSTING_URL =
  import.meta.env.VITE_FIREBASE_HOSTING_URL || 'https://manager-fc26f.web.app';
