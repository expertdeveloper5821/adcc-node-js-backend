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
      // Firebase Admin SDK can accept file path directly, but we'll load it to verify it exists
      try {
        serviceAccount = require(absolutePath) as admin.ServiceAccount;
      } catch (error) {
        throw new Error(`Failed to load service account from ${absolutePath}. File may not exist or is invalid JSON.`);
      }
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
 * Supports both mobile app (phone OTP) and web app (email/password) authentication
 * @param idToken - Firebase ID token from client (mobile app or web app)
 * @returns User UID and optional phone (for phone auth) or email (for email/password auth)
 */
export const verifyFirebaseToken = async (
  idToken: string
): Promise<{ uid: string; phone?: string; email?: string }> => {
  // Initialize Firebase if not already initialized
  initializeFirebase();

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    return {
      uid: decodedToken.uid,
      phone: decodedToken.phone_number || undefined, // Present for phone authentication
      email: decodedToken.email || undefined, // Present for email/password authentication
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Invalid or expired Firebase token', 401);
  }
};

/**
 * Create a Firebase user with email and password
 * Used for seeding admin users or creating users from backend
 * @param email - User's email address
 * @param password - User's password
 * @param displayName - Optional display name
 * @param emailVerified - Whether email is verified (default: true for seeded admins)
 * @returns Created Firebase user record with UID
 */
export const createFirebaseUser = async (
  email: string,
  password: string,
  displayName?: string,
  emailVerified: boolean = true
): Promise<admin.auth.UserRecord> => {
  // Initialize Firebase if not already initialized
  initializeFirebase();

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified, // Set to true for seeded admin users
      disabled: false,
    });

    return userRecord;
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      throw new Error('User with this email already exists in Firebase');
    }
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak');
    }
    // Network connectivity errors
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      throw new Error(
        'Cannot connect to Firebase servers. Check your internet connection, firewall settings, or proxy configuration.'
      );
    }
    if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
      throw new Error(
        'Cannot resolve Firebase server address. Check your DNS settings and internet connection.'
      );
    }
    throw new Error(`Failed to create Firebase user: ${error.message || error.code || 'Unknown error'}`);
  }
};

/**
 * Get Firebase user by email
 * Used for seed scripts when user might already exist in Firebase
 * @param email - User's email address
 * @returns Firebase user record with UID
 */
export const getFirebaseUserByEmail = async (
  email: string
): Promise<admin.auth.UserRecord> => {
  // Initialize Firebase if not already initialized
  initializeFirebase();

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    return userRecord;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('User with this email not found in Firebase');
    }
    throw new Error(`Failed to get Firebase user: ${error.message}`);
  }
};

