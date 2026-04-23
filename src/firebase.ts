import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Explicitly target the AI Studio database ID to prevent (default) fallback
const DB_ID = 'ai-studio-678ce048-1082-4c2c-bedd-a1b77361ee71';
export const db = getFirestore(app, DB_ID);

// Debug: Expose DB ID to window for verification
(window as any).FIREBASE_DB_ID = DB_ID;

export const auth = getAuth(app);
