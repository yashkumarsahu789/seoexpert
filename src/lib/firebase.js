import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyDuxCtAveHMxGcbAOmuc25IgKVT__4deTY',
  authDomain: 'manager-fc26f.firebaseapp.com',
  projectId: 'manager-fc26f',
  storageBucket: 'manager-fc26f.firebasestorage.app',
  messagingSenderId: '534713538513',
  appId: '1:534713538513:web:733bddf9ca23963a5e32f0',
  measurementId: 'G-0HG93MWWTZ',
};

export const firebaseApp = initializeApp(firebaseConfig);

isSupported().then((supported) => {
  if (supported) {
    getAnalytics(firebaseApp);
  }
});

export const API_BASE = import.meta.env.VITE_API_URL || '/api';
