import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import type { Analytics } from 'firebase/analytics';
import { FIREBASE_CONFIG } from '@/constants';
import { logger } from './logger';

type FirebaseInstance = {
  app: ReturnType<typeof initializeApp>;
  auth: ReturnType<typeof getAuth>;
  db: ReturnType<typeof getFirestore>;
  analytics: Analytics | null;
};

let initPromise: Promise<FirebaseInstance | null> | null = null;

async function initFirebase(): Promise<FirebaseInstance | null> {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let analytics: Analytics | null = null;
    if (FIREBASE_CONFIG.measurementId) {
      try {
        const supported = await isSupported();
        if (supported) {
          analytics = getAnalytics(app);
          logger.info('Firebase Analytics initialized');
        } else {
          logger.warn('Firebase Analytics not supported in this environment');
        }
      } catch (analyticsErr) {
        logger.warn('Firebase Analytics failed to initialize', { error: String(analyticsErr) });
      }
    } else {
      logger.warn('Firebase Analytics: VITE_FIREBASE_MEASUREMENT_ID is not set');
    }

    return { app, auth, db, analytics };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (errorMsg.includes('FIREBASE_CONFIG') || errorMsg.includes('apiKey')) {
      logger.error(
        'Firebase configuration missing. Check constants/index.ts and .env file'
      );
    } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
      logger.warn(
        'Network error loading Firebase modules. Check your internet connection.'
      );
    } else {
      logger.error('Firebase initialization error', err);
    }

    return null;
  }
}

export function getFirebase(): Promise<FirebaseInstance | null> {
  if (!initPromise) {
    initPromise = initFirebase();
  }
  return initPromise;
}
