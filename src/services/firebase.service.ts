import admin from 'firebase-admin';
import { AppError } from '@/utils/app-error';
import path from 'path';

// Lazy initialization - only initialize when needed
const initializeFirebase = () => {
  if (!admin.apps.length) {
    let serviceAccount: admin.ServiceAccount;

    // Option 1: Use environment variable (for cloud deployment - Render/Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (error) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
      }
    }
    // Option 2: Use file path (for local development)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const absolutePath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      serviceAccount = require(absolutePath);
    } else {
      throw new Error(
        'Either FIREBASE_SERVICE_ACCOUNT (JSON string) or FIREBASE_SERVICE_ACCOUNT_PATH (file path) must be set'
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin initialized');
  }
};

/**
 * Verify Firebase ID token and extract user info
 * @param idToken - Firebase ID token from mobile app
 * @returns User phone number and UID
 */
export const verifyFirebaseToken = async (
  idToken: string
): Promise<{ phone: string; uid: string }> => {
  // Initialize Firebase if not already initialized
  initializeFirebase();

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    if (!decodedToken.phone_number) {
      throw new AppError('Phone number not found in token', 400);
    }

    return {
      phone: decodedToken.phone_number,
      uid: decodedToken.uid,
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Invalid or expired Firebase token', 401);
  }
};

