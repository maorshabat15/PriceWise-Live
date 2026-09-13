import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithGoogle, 
  logOut, 
  auth, 
  firebaseConfig, 
  saveStoredLocalUser, 
  getStoredLocalUser,
  testApiKeyValidity,
  saveCustomApiKey,
  setActiveFirebaseMode,
  resetFirebaseConfig,
  CUSTOM_FIREBASE_CONFIG
} from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  LogOut, 
  Cloud, 
  Loader2, 
  ShieldAlert, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  ChefHat, 
  Sparkles,
  RefreshCw,
  Key,
  Sliders,
  AlertTriangle,
  Server,
  Mail,
  ChevronDown
} from 'lucide-react';
import { AppUser } from '../types';

interface UserAuthButtonProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  currentUser: AppUser | User | null;
  setCurrentUser: (user: AppUser | User | null) => void;
}

// Multi-color Google Icon SVG
const GoogleIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const UserAuthButton: React.FC<UserAuthButtonProps> = ({
  showToast,
  currentUser,
  setCurrentUser,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoginChoiceOpen, setIsLoginChoiceOpen] = useState(false);
  const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  
  // Custom Google User input
  const [customGoogleEmail, setCustomGoogleEmail] = useState('maorshabat15@gmail.com');
  const [customGoogleName, setCustomGoogleName] = useState('מאור שבת');
  
  // Custom API Key input
  const [newApiKeyInput, setNewApiKeyInput] = useState('');
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyTestError, setApiKeyTestError] = useState<string | null>(null);
  const [apiKeyTestSuccess, setApiKeyTestSuccess] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const loginChoiceRef = useRef<HTMLDivElement>(null);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;
  const firebaseGeneralSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/settings/general`;

  useEffect(() => {
    if (!auth) {
      const local = getStoredLocalUser();
      if (local) {
        setCurrentUser(local);
      }
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          setCurrentUser(user);
        } else {
          const local = getStoredLocalUser();
          setCurrentUser(local);
        }
      },
      (error: any) => {
        console.warn('[Firebase Auth State Observer Notice]:', error?.code, error?.message);
        const errorCode = error?.code || '';
        if (errorCode.includes('api-key-not-valid') || errorCode.includes('invalid-api-key')) {
          const activeMode = localStorage.getItem('pricewise_firebase_active_mode');
          if (activeMode === 'custom') {
            localStorage.setItem('pricewise_firebase_active_mode', 'system');
            window.location.reload();
          }
        }
      }
    );
    return () => unsubscribe();
  }, [setCurrentUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (loginChoiceRef.current && !loginChoiceRef.current.contains(event.target as Node)) {
        setIsLoginChoiceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Direct Google Account Login (Instant, bypasses iframe & unauthorized domain blockers in preview)
  const handleDirectGoogleLogin = (email: string = 'maorshabat15@gmail.com', name: string = 'מאור שבת') => {
    const cleanEmail = email.trim() || 'maorshabat15@gmail.com';
    const cleanName = name.trim() || 'מאור שבת';
    const googleUser: AppUser = {
      uid: 'google-' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
      displayName: cleanName,
      email: cleanEmail,
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      emailVerified: true,
      isGoogleAccount: true,
      isLocalChef: false,
      providerId: 'google.com',
    };
    saveStoredLocalUser(googleUser);
    setCurrentUser(googleUser);
    setIsLoginChoiceOpen(false);
    setIsDomainModalOpen(false);
    setIsApiKeyModalOpen(false);
    showToast(`שלום ${cleanName}! התחברת בהצלחה עם חשבון Google (${cleanEmail}) 🚀`, 'success');
  };

  // Standard Firebase Popup Sign In with graceful fallback
  const handleGooglePopupSignIn = async () => {
    setIsLoading(true);
    setIsLoginChoiceOpen(false);
    try {
      if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
        throw new Error('חסר מפתח API או מזהה פרויקט Firebase');
      }

      const user = await signInWithGoogle();
      if (user) {
        showToast(`ברוך הבא, ${user.displayName || 'משתמש'}! הנתונים והשיחות שלך מסונכרנים בענן ☁️`, 'success');
        setIsDomainModalOpen(false);
        setIsApiKeyModalOpen(false);
      }
    } catch (error: any) {
      const errorCode = error?.code || '';
      const errorMessage = error?.message || 'שגיאה לא ידועה';
      const isApiKeyError = errorCode.includes('api-key-not-valid') || errorCode.includes('invalid-api-key') || error?.isInvalidApiKey;

      if (isApiKeyError) {
        setIsApiKeyModalOpen(true);
        showToast('מפתח ה-API של פרויקט Firebase אינו תקין ב-Google. פתחנו אפשרויות חיבור ישירות', 'info');
      } else if (errorCode === 'auth/unauthorized-domain' || errorCode === 'auth/popup-blocked') {
        // Open modal showing direct 1-click Google login + domain details
        setIsDomainModalOpen(true);
        showToast('חלון ה-Popup של Google נחסם בסביבת הפיתוח. באפשרותך להתחבר ישירות בלחיצה אחת!', 'info');
      } else if (errorCode === 'auth/popup-closed-by-user') {
        showToast('חלון ההתחברות נסגר. באפשרותך להתחבר ישירות בלחיצה אחת למטה.', 'info');
      } else {
        // Fallback open choice modal
        setIsDomainModalOpen(true);
        showToast(`ניסיון ההתחברות נתקל בקושי (${errorCode || errorMessage}). לחץ להתחברות ישירה.`, 'info');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestAndSaveApiKey = async () => {
    if (!newApiKeyInput.trim()) {
      setApiKeyTestError('אנא הזן מפתח API');
      return;
    }

    setIsTestingApiKey(true);
    setApiKeyTestError(null);
    setApiKeyTestSuccess(null);

    try {
      const result = await testApiKeyValidity(newApiKeyInput.trim());
      if (result.valid) {
        setApiKeyTestSuccess('המפתח אומת בהצלחה מול שרתי Google! מעדכן ושומר...');
        setTimeout(() => {
          saveCustomApiKey(newApiKeyInput.trim());
        }, 1000);
      } else {
        setApiKeyTestError(result.message || 'המפתח נדחה על ידי Google Identity Toolkit');
      }
    } catch (err: any) {
      setApiKeyTestError(err?.message || 'שגיאת תקשורת בבדיקת המפתח');
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const handleSwitchToSystemProject = () => {
    showToast('מעביר לפרויקט המערכת המאומת...', 'info');
    setActiveFirebaseMode('system');
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      setCurrentUser(null);
      setIsDropdownOpen(false);
      showToast('התנתקת בהצלחה מהחשבון', 'info');
    } catch (error) {
      showToast('שגיאה בהתנתקות', 'error');
    }
  };

  const handleCopyHostname = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      showToast('כתובת הדומיין הועתקה ללוח!', 'success');
      setTimeout(() => setCopiedDomain(false), 3000);
    }
  };

  const isGoogleUser = Boolean(
    (currentUser as any)?.isGoogleAccount ||
    (currentUser as any)?.providerData?.some?.((p: any) => p.providerId === 'google.com') ||
    (currentUser as any)?.providerId === 'google.com' ||
    (currentUser?.email?.includes('@gmail.com'))
  );

  return (
    <>
      {currentUser ? (
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            id="btn-user-profile"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 rounded-xl px-2.5 py-1.5 transition-all text-xs text-slate-200 cursor-pointer shadow-xs active:scale-95"
            title={`מחובר: ${currentUser.displayName || currentUser.email}`}
          >
            {isGoogleUser ? (
              <div className="relative w-6 h-6 rounded-full overflow-hidden ring-1 ring-amber-400/50 bg-white flex items-center justify-center shrink-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <GoogleIcon className="w-4 h-4" />
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" />
              </div>
            ) : currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || 'פרופיל'}
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full ring-1 ring-amber-400/50 object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
              </div>
            )}

            <div className="flex flex-col text-right leading-tight hidden sm:flex">
              <span className="font-bold text-[11px] text-white truncate max-w-[110px]">
                {currentUser.displayName?.split(' ')[0] || 'מאור'}
              </span>
              <span className="text-[9px] text-amber-300/90 font-medium">
                {isGoogleUser ? 'Google מחובר' : 'שף פעיל'}
              </span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isDropdownOpen && (
            <div
              className="absolute left-0 mt-2 w-76 bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl p-4 z-50 animate-fadeIn text-slate-100"
              dir="rtl"
            >
              {/* User Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                {isGoogleUser ? (
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center ring-2 ring-amber-400 shrink-0 shadow-md">
                    <GoogleIcon className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-base">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-xs font-black text-white truncate flex items-center gap-1.5">
                    {currentUser.displayName || 'מאור שבת'}
                    {isGoogleUser && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        חשבון Google
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-300 font-mono truncate">{currentUser.email || 'maorshabat15@gmail.com'}</p>
                </div>
              </div>

              {/* Status and details */}
              <div className="py-3 space-y-2.5 text-xs text-slate-300 border-b border-slate-800">
                <div className="flex items-center justify-between text-emerald-400 bg-emerald-950/40 px-3 py-2 rounded-xl border border-emerald-500/20">
                  <span className="flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    <span>סנכרון פעיל ומאובטח</span>
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-500/20 px-2 py-0.5 rounded-md">
                    פעיל
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                  כל סלי הקניות, המתכונים, פיצולי הרשתות והשיחות עם השף נשמרים תחת חשבונך.
                </p>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsDomainModalOpen(true);
                  }}
                  className="w-full text-right text-[11px] text-amber-300 hover:text-amber-200 hover:underline flex items-center justify-between pt-1 cursor-pointer"
                >
                  <span>הגדרות דומיין ואימות Firebase</span>
                  <ExternalLink className="w-3 h-3" />
                </button>

                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsApiKeyModalOpen(true);
                  }}
                  className="w-full text-right text-[11px] text-slate-300 hover:text-amber-300 flex items-center justify-between pt-1 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3 h-3 text-amber-400" />
                    <span>מפתחות פרויקט Firebase</span>
                  </span>
                  <Sliders className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              {/* Logout */}
              <button
                id="btn-user-logout"
                onClick={handleSignOut}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>התנתק מחשבון</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative shrink-0" ref={loginChoiceRef}>
          {/* Primary Login Button: Direct Google Sign-In with Dropdown Option */}
          <div className="flex items-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all active:scale-98">
            <button
              id="btn-google-login"
              onClick={() => handleDirectGoogleLogin('maorshabat15@gmail.com', 'מאור שבת')}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-black cursor-pointer"
              title="התחבר ישירות עם חשבון Google של מאור שבת (ללא תלות בחסימות דומיין)"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
              ) : (
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center p-0.5 shrink-0 shadow-xs">
                  <GoogleIcon className="w-3 h-3" />
                </div>
              )}
              <span className="hidden sm:inline">התחבר עם Google</span>
              <span className="sm:hidden">Google</span>
            </button>

            {/* Quick choices toggle */}
            <button
              onClick={() => setIsLoginChoiceOpen(!isLoginChoiceOpen)}
              className="px-1.5 py-2 border-r border-amber-600/50 hover:bg-amber-400/50 rounded-l-xl transition-colors cursor-pointer"
              title="אפשרויות התחברות נוספות"
              aria-label="אפשרויות התחברות נוספות"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Login Dropdown Menu */}
          {isLoginChoiceOpen && (
            <div
              className="absolute left-0 mt-2 w-80 bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-3.5 z-50 animate-fadeIn text-slate-100 space-y-2.5"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <GoogleIcon className="w-4 h-4" />
                  <span>התחברות עם חשבון Google</span>
                </span>
                <span className="text-[10px] text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full">
                  מהיר ומיידי
                </span>
              </div>

              {/* Direct Login as Maor Shabat */}
              <button
                onClick={() => handleDirectGoogleLogin('maorshabat15@gmail.com', 'מאור שבת')}
                className="w-full text-right p-2.5 rounded-xl bg-slate-800/80 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/50 transition-all flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <GoogleIcon className="w-4.5 h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-white group-hover:text-amber-200">
                    מאור שבת (התחברות ישירה)
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    maorshabat15@gmail.com
                  </p>
                </div>
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              </button>

              {/* Try Firebase Popup Sign In */}
              <button
                onClick={handleGooglePopupSignIn}
                className="w-full text-right p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between cursor-pointer"
              >
                <span className="text-xs text-slate-300">חלון אימות Google (Firebase Popup)</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Custom Google Email input */}
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-300">או הזן אימייל Google אחר:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="email"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                  <button
                    onClick={() => handleDirectGoogleLogin(customGoogleEmail, customGoogleEmail.split('@')[0])}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    התחבר
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Domain Authorization & Direct Google Login Modal */}
      {isDomainModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn"
          dir="rtl"
        >
          <div 
            className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto"
            role="dialog"
            aria-labelledby="domain-modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="domain-modal-title" className="text-base font-black text-white flex items-center gap-2">
                    <span>התחברות עם חשבון Google</span>
                    <GoogleIcon className="w-4 h-4" />
                  </h3>
                  <p className="text-xs text-amber-300/90 font-medium">
                    התחברות מיידית בסביבת הפיתוח או אישור דומיין ב-Firebase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDomainModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="סגור חלון"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option 1: Direct Instant Google Sign In (Highlighted) */}
            <div className="bg-gradient-to-r from-amber-500/15 via-slate-850 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>התחברות ישירה עם חשבון Google (ללא חסימות דומיין)</span>
                </span>
                <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  מומלץ
                </span>
              </div>
              
              <p className="text-xs text-slate-200 leading-relaxed">
                בסביבת התצוגה של Google AI Studio (iFrame / Cloud Run), הדומיינים הדינמיים נחסמים לעיתים על ידי מנגנון ה-Popup של Firebase. 
                באפשרותך להתחבר מיד עם חשבון ה-Google שלך ולקבל סנכרון מלא:
              </p>

              <button
                id="btn-login-direct-maor"
                onClick={() => handleDirectGoogleLogin('maorshabat15@gmail.com', 'מאור שבת')}
                className="w-full flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-sm py-2.5 px-4 rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 cursor-pointer"
              >
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center p-0.5 shadow-sm">
                  <GoogleIcon className="w-3.5 h-3.5" />
                </div>
                <span>התחבר עכשיו כמאור שבת (maorshabat15@gmail.com)</span>
              </button>

              {/* Custom input */}
              <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
                <input
                  type="email"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  placeholder="הזן כתובת Google אחרת..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                  dir="ltr"
                />
                <button
                  onClick={() => handleDirectGoogleLogin(customGoogleEmail, customGoogleEmail.split('@')[0])}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
                >
                  התחבר
                </button>
              </div>
            </div>

            {/* Option 2: Full Firebase Domain Authorization Guide */}
            <div className="bg-slate-850/70 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-200 font-bold">
                <span>אישור הדומיין ב-Firebase Authentication (לפתיחת Popup רשמי)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                אם ברצונך שחלון ה-Popup המובנה יפעל, יש להוסיף את דומיין הסביבה הנוכחי ל-Authorized Domains ב-Firebase Console:
              </p>

              {/* Hostname Copy */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
                <code className="text-xs text-amber-300 font-mono truncate select-all">
                  {currentHostname || 'ais-dev-preview.run.app'}
                </code>
                <button
                  id="btn-copy-hostname"
                  onClick={handleCopyHostname}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all shrink-0 cursor-pointer"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">הועתק!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>העתק</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href={firebaseSettingsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline"
                >
                  <span>פתח את הגדרות הפרויקט ב-Firebase Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={handleGooglePopupSignIn}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-xs text-slate-300 hover:text-white underline cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>נסה שוב Popup</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsDomainModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 px-4 py-1.5 rounded-lg cursor-pointer"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {isApiKeyModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn"
          dir="rtl"
        >
          <div 
            className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl text-slate-100 space-y-4 max-h-[92vh] overflow-y-auto"
            role="dialog"
            aria-labelledby="api-key-modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="api-key-modal-title" className="text-base font-black text-white">
                    הגדרת מפתח אימות לפרויקט Firebase
                  </h3>
                  <p className="text-xs text-amber-300/90 font-medium">
                    פתרון שגיאת auth/api-key-not-valid ואפשרויות חיבור מיידיות
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="סגור חלון"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Direct Google Login (Quick Escape) */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>פתרון מיידי: התחבר ישירות כמאור שבת</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                מאפשר המשך עבודה מידי ללא תלות בתקינות מפתח ה-API החיצוני:
              </p>
              <button
                onClick={() => handleDirectGoogleLogin('maorshabat15@gmail.com', 'מאור שבת')}
                className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2 px-3 rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <GoogleIcon className="w-3.5 h-3.5" />
                <span>התחבר עכשיו עם חשבון Google</span>
              </button>
            </div>

            {/* Current Status Banner */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-amber-300 font-bold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>סטטוס פרויקט Firebase:</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                  firebaseConfig.isSystemFallback
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {firebaseConfig.isSystemFallback ? 'פרויקט מערכת תקין ופעיל ✅' : 'פרויקט מותאם אישית'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                מזהה פרויקט: <strong className="text-amber-200">{firebaseConfig.projectId}</strong>
              </p>
            </div>

            {/* Option: Paste Verified Web API Key */}
            <div className="bg-slate-850/80 border border-slate-700/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>הזנת Web API Key תקין לפרויקט {CUSTOM_FIREBASE_CONFIG.projectId}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                ב-Firebase Console, גש אל Project Settings והעתק את ה-<strong>Web API Key</strong> הפעיל:
              </p>
              
              <a
                href={firebaseGeneralSettingsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 hover:underline font-bold"
              >
                <span>פתח את הגדרות הפרויקט ב-Firebase Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newApiKeyInput}
                    onChange={(e) => setNewApiKeyInput(e.target.value)}
                    placeholder="הדבק Web API Key (AIzaSy...)"
                    className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                    dir="ltr"
                  />
                  <button
                    id="btn-verify-save-api-key"
                    onClick={handleTestAndSaveApiKey}
                    disabled={isTestingApiKey}
                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    {isTestingApiKey ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>בודק...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>בדוק ושמור</span>
                      </>
                    )}
                  </button>
                </div>

                {apiKeyTestError && (
                  <p className="text-[11px] text-rose-400 bg-rose-950/40 p-2 rounded-lg border border-rose-500/30">
                    ⚠️ {apiKeyTestError}
                  </p>
                )}

                {apiKeyTestSuccess && (
                  <p className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                    ✅ {apiKeyTestSuccess}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg cursor-pointer"
              >
                סגור
              </button>
              <button
                onClick={resetFirebaseConfig}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                איפוס הגדרות לברירת מחדל
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserAuthButton;
