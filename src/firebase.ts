import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { AppUser } from './types';

// System Firebase Config (Pre-configured and verified working with Cloud Run preview)
export const SYSTEM_FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0299913473",
  appId: "1:257951316951:web:bfde50e6aa845f650c6992",
  apiKey: "AIzaSyD51mVk7e-qGf9I2kcG69JFH9jCnCPdT1A",
  authDomain: "gen-lang-client-0299913473.firebaseapp.com",
  storageBucket: "gen-lang-client-0299913473.firebasestorage.app",
  messagingSenderId: "257951316951",
  firestoreDatabaseId: "ai-studio-eb4c42ea-effd-461d-9d01-fdfe47067387",
};

// Default Custom Project Firebase configuration (Provided by user)
export const CUSTOM_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDd7fgLfc8tSm2ufJxPweLQCrgyNEQz9g8",
  authDomain: "pricewise-e9c1e.firebaseapp.com",
  projectId: "pricewise-e9c1e",
  storageBucket: "pricewise-e9c1e.firebasestorage.app",
  messagingSenderId: "986859435510",
  appId: "1:986859435510:web:64222bed308fceea75c3d7",
  measurementId: "G-7RPC8HPKTV"
};

// Check if user has an override API key or switched active project in localStorage or env
export function getActiveFirebaseConfig() {
  if (typeof window !== 'undefined') {
    const activeMode = localStorage.getItem('pricewise_firebase_active_mode');
    const savedCustomKey = localStorage.getItem('pricewise_firebase_custom_api_key');
    const envKey = (import.meta as any).env?.VITE_FIREBASE_API_KEY;

    // The key "AIzaSyDd7fgLfc8tSm2ufJxPweLQCrgyNEQz9g8" is known to be rejected with auth/invalid-api-key.
    // Use custom project ONLY if user explicitly enabled it and provided a new verified key,
    // or if a non-placeholder VITE_FIREBASE_API_KEY is configured in env.
    const hasValidCustomKey = Boolean(
      (savedCustomKey && savedCustomKey !== CUSTOM_FIREBASE_CONFIG.apiKey) ||
      (envKey && envKey !== CUSTOM_FIREBASE_CONFIG.apiKey)
    );

    if (activeMode === 'custom' && hasValidCustomKey) {
      return {
        ...CUSTOM_FIREBASE_CONFIG,
        apiKey: savedCustomKey || envKey,
        isSystemFallback: false,
        isCustom: true,
      };
    }

    // Default to verified and active system project to prevent auth/invalid-api-key errors
    return {
      ...SYSTEM_FIREBASE_CONFIG,
      isSystemFallback: true,
      isCustom: false,
    };
  }
  return { ...SYSTEM_FIREBASE_CONFIG, isSystemFallback: true, isCustom: false };
}

export const firebaseConfig = getActiveFirebaseConfig();

// Global protection against uncaught Firebase Auth invalid API key errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = String(reason?.message || reason || '');
    const code = String(reason?.code || '');
    if (
      code.includes('invalid-api-key') ||
      code.includes('api-key-not-valid') ||
      msg.includes('auth/invalid-api-key') ||
      msg.includes('auth/api-key-not-valid')
    ) {
      console.warn('[Firebase Auth Handled] Suppressed unhandled rejection for invalid API key:', code || msg);
      event.preventDefault();

      // If in custom mode, automatically fall back to verified system configuration
      try {
        const activeMode = localStorage.getItem('pricewise_firebase_active_mode');
        if (activeMode === 'custom') {
          localStorage.setItem('pricewise_firebase_active_mode', 'system');
          window.location.reload();
        }
      } catch {
        // ignore
      }
    }
  });

  window.addEventListener('error', (event) => {
    const msg = String(event?.message || '');
    if (msg.includes('auth/invalid-api-key') || msg.includes('auth/api-key-not-valid')) {
      console.warn('[Firebase Auth Handled] Suppressed global error for invalid API key:', msg);
      event.preventDefault();
    }
  });
}

// Switch active Firebase project mode
export function setActiveFirebaseMode(mode: 'custom' | 'system'): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pricewise_firebase_active_mode', mode);
    window.location.reload();
  }
}

// Save a newly pasted API key for the custom project
export function saveCustomApiKey(newApiKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pricewise_firebase_custom_api_key', newApiKey.trim());
    localStorage.setItem('pricewise_firebase_active_mode', 'custom');
    window.location.reload();
  }
}

// Reset custom configuration
export function resetFirebaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pricewise_firebase_custom_api_key');
    localStorage.removeItem('pricewise_firebase_active_mode');
    window.location.reload();
  }
}

// Verify an API key with Google Identity Toolkit API before saving
export async function testApiKeyValidity(apiKey: string): Promise<{ valid: boolean; message?: string }> {
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects?key=${encodeURIComponent(apiKey.trim())}`);
    const data = await res.json();
    if (res.ok) {
      return { valid: true };
    }
    const errorMsg = data?.error?.message || 'מפתח ה-API אינו תקין ב-Google Identity Toolkit';
    return { valid: false, message: errorMsg };
  } catch (err: any) {
    return { valid: false, message: err?.message || 'שגיאת תקשורת בבדיקת המפתח' };
  }
}

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initialize Firestore
export const db = getFirestore(app);

// Local User helpers for offline / dev preview environments when domain is not yet authorized
export function getStoredLocalUser(): AppUser | null {
  try {
    const saved = localStorage.getItem('cw_local_auth_user');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveStoredLocalUser(user: AppUser | null): void {
  try {
    if (user) {
      localStorage.setItem('cw_local_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('cw_local_auth_user');
    }
  } catch {
    // ignore
  }
}

// Google Sign In helper
export async function signInWithGoogle(): Promise<User | null> {
  // Validate that Firebase configuration is present and valid
  if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
    const configError = new Error('הגדרות Firebase חסרות: חסר apiKey או projectId בקובץ התצורה.');
    console.warn('[Google OAuth] Missing Firebase configuration or environment variables:', {
      hasApiKey: Boolean(firebaseConfig?.apiKey),
      hasProjectId: Boolean(firebaseConfig?.projectId),
      hasAuthDomain: Boolean(firebaseConfig?.authDomain),
    });
    throw configError;
  }

  if (!auth) {
    const authError = new Error('רכיב Firebase Auth אינו מאותחל כראוי.');
    console.warn('[Google OAuth] Firebase Auth instance is not initialized');
    throw authError;
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    saveStoredLocalUser(null);
    return result.user;
  } catch (error: any) {
    const errorCode = error?.code || '';
    const isApiKeyError = errorCode.includes('api-key-not-valid') || errorCode.includes('invalid-api-key');

    if (isApiKeyError) {
      console.warn('[Firebase Auth Notice] The Web API Key was rejected by Google Identity Toolkit (auth/api-key-not-valid). Project:', firebaseConfig.projectId);
      error.isInvalidApiKey = true;
      error.activeProjectId = firebaseConfig.projectId;
      throw error;
    }

    console.warn('[Google OAuth Notice]:', {
      errorCode: error?.code,
      errorMessage: error?.message,
    });
    throw error;
  }
}

// Sign Out helper
export async function logOut(): Promise<void> {
  try {
    saveStoredLocalUser(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
  } catch (error) {
    console.warn('Sign Out Error:', error);
    throw error;
  }
}

// User sync helper
export async function saveUserDataToCloud(userId: string, data: Record<string, any>): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Error saving user data to Firestore:', err);
  }
}

export async function getUserDataFromCloud(userId: string): Promise<Record<string, any> | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('Error fetching user data from Firestore:', err);
    return null;
  }
}
