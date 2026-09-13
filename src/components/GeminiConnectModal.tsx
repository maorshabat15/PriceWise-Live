import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { signInWithGoogle, logOut, firebaseConfig } from '../firebase';
import { PersonalGeminiConfig, AppUser } from '../types';
import { testGeminiConnection } from '../services/aiService';
import { 
  Sparkles, Key, Check, X, ExternalLink, Cpu, Sliders, ShieldCheck, 
  RefreshCw, Zap, Heart, Award, Trash2, AlertCircle, Info, Lock, 
  User as UserIcon, LogOut, ChevronDown, ChevronUp, Loader2,
  Film, Image as ImageIcon, Play, Pause, Eye, EyeOff, RotateCcw
} from 'lucide-react';
import { useBackgroundSettings } from '../services/backgroundSettings';

interface GeminiConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PersonalGeminiConfig;
  onSaveConfig: (config: PersonalGeminiConfig) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUser?: AppUser | User | null;
}

const AVAILABLE_MODELS = [
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    badge: 'הכי מומלץ ⚡',
    desc: 'המודל החדשני והמהיר ביותר של Google לשיחה קולחת ורעיונות מיידיים.',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    id: 'gemini-3.7-pro',
    name: 'Gemini 3.7 Pro',
    badge: 'חשיבה עמוקה 🧠',
    desc: 'למתכונים מורכבים, ניתוח קולינרי מעמיק ותפריטי שף מרובי שלבים.',
    tagColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    badge: 'מהיר וקליל 🚀',
    desc: 'ביצועים מהירים במיוחד לשאלות קצרות וטיפים מהירים.',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'gemini-3.5-pro',
    name: 'Gemini 3.5 Pro',
    badge: 'דיוק וסומלייה 🍷',
    desc: 'מתאים במיוחד לפרופילי יין מורכבים וחישובי כמויות מדויקים.',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
];

export const GeminiConnectModal: React.FC<GeminiConnectModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  showToast,
  currentUser,
}) => {
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [isEnabled, setIsEnabled] = useState(config.isEnabled ?? false);
  const [selectedModel, setSelectedModel] = useState(config.selectedModel || 'gemini-3.7-flash');
  const [temperature, setTemperature] = useState(config.temperature ?? 0.7);
  const [dietaryPreference, setDietaryPreference] = useState(config.dietaryPreference || 'ללא הגבלה');
  const [kosherPreference, setKosherPreference] = useState(config.kosherPreference || 'לא מוגדר');
  const [culinaryStyle, setCulinaryStyle] = useState(config.culinaryStyle || 'ים-תיכוני ישראלי מודרני');
  const [personalNotes, setPersonalNotes] = useState(config.personalNotes || '');

  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [showDevApiKeySection, setShowDevApiKeySection] = useState(Boolean(config.apiKey?.trim()));
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'googleAuth' | 'personalProfile' | 'models' | 'background'>('googleAuth');
  const { 
    settings: bgSettings, 
    currentScene: bgCurrentScene, 
    scenes: bgScenes, 
    updateSettings: updateBgSettings, 
    resetSettings: resetBgSettings 
  } = useBackgroundSettings();

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningInGoogle(true);
    try {
      if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
        const msg = 'חסרים מפתחות תצורה או משתני סביבה של Firebase (apiKey / projectId). בדוק את ההגדרות.';
        console.warn('[Google OAuth in Gemini Modal] Missing Firebase config:', firebaseConfig);
        if (showToast) showToast(msg, 'error');
        alert(msg);
        setIsSigningInGoogle(false);
        return;
      }

      const user = await signInWithGoogle();
      if (user) {
        if (showToast) {
          showToast(`ברוך הבא, ${user.displayName || 'שף'}! התחברת בהצלחה עם Google ☁️`, 'success');
        }
      }
    } catch (error: any) {
      const errorCode = error?.code || '';
      const errorMessage = error?.message || 'שגיאה בהתחברות עם Google';
      console.warn('[Google OAuth in Gemini Modal Notice]:', errorCode || errorMessage);

      if (errorCode.includes('api-key-not-valid') || error?.isInvalidApiKey) {
        if (showToast) showToast('מפתח ה-API של Firebase נדחה על ידי Google (auth/api-key-not-valid). ודא שה-Web API Key תקין בקונסולת Firebase.', 'error');
      } else if (errorCode === 'auth/unauthorized-domain') {
        if (showToast) showToast(`הדומיין (${window.location.hostname}) אינו מאושר ב-Firebase Authentication.`, 'error');
      } else if (errorCode === 'auth/popup-blocked') {
        if (showToast) showToast('חלון ההתחברות נחסם על ידי הדפדפן. אנא אפשר חלונות קופצים ונסה שוב.', 'error');
      } else if (errorCode === 'auth/popup-closed-by-user') {
        if (showToast) showToast('חלון ההתחברות נסגר על ידי המשתמש.', 'info');
      } else if (errorCode === 'auth/network-request-failed') {
        if (showToast) showToast('שגיאת תקשורת עם Google. בדוק את החיבור לרשת ונסה שוב.', 'error');
      } else {
        if (showToast) showToast(`שגיאה בהתחברות עם Google: ${errorMessage}`, 'error');
      }
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await logOut();
      if (showToast) showToast('התנתקת מחשבון Google', 'info');
    } catch (error) {
      if (showToast) showToast('שגיאה בהתנתקות', 'error');
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const res = await testGeminiConnection({
      apiKey: apiKey.trim() || undefined,
      model: selectedModel,
    });

    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      if (showToast) showToast('החיבור ל-Gemini פעיל ותקין!', 'success');
    } else {
      if (showToast) showToast(res.message || 'שגיאה בבדיקת החיבור', 'error');
    }
  };

  const handleSave = () => {
    const updated: PersonalGeminiConfig = {
      apiKey: apiKey.trim(),
      isEnabled: apiKey.trim().length > 0 ? true : isEnabled,
      selectedModel,
      temperature,
      dietaryPreference,
      kosherPreference,
      culinaryStyle,
      personalNotes: personalNotes.trim(),
    };

    onSaveConfig(updated);
    if (showToast) showToast('פרופיל והעדפות השף נשמרו בהצלחה!', 'success');
    onClose();
  };

  const handleClearKey = () => {
    setApiKey('');
    setIsEnabled(false);
    setTestResult(null);
    const updated: PersonalGeminiConfig = {
      ...config,
      apiKey: '',
      isEnabled: false,
    };
    onSaveConfig(updated);
    if (showToast) showToast('המפתח האישי הוסר. המערכת משתמשת בחיבור Google האוטומטי.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn" dir="rtl">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl text-slate-100 space-y-4 max-h-[90vh] flex flex-col relative overflow-hidden">
        
        {/* Decorative Top Accent Glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 relative z-10">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-500 via-emerald-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Sparkles className="h-6 w-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">פרופיל שף אישי והתחברות</h2>
                <span className="text-[10px] font-extrabold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full">
                  ללא צורך במפתח
                </span>
              </div>
              <p className="text-xs text-slate-400">התחברו עם Google לגישה מיידית לשף AI, סנכרון רשימות והתאמה אישית</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 relative z-10 text-xs">
          <button
            onClick={() => setActiveTab('googleAuth')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'googleAuth'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <UserIcon className="h-3.5 w-3.5" />
            <span>התחברות עם Google</span>
          </button>

          <button
            onClick={() => setActiveTab('personalProfile')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'personalProfile'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            <span>העדפות שף וכשרות</span>
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'models'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>אופי השף (AI)</span>
          </button>

          <button
            onClick={() => setActiveTab('background')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'background'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            <span>רקע קולינרי</span>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 relative z-10 text-xs">

          {/* TAB 1: Google Auth & Seamless Setup */}
          {activeTab === 'googleAuth' && (
            <div className="space-y-4 animate-fadeIn">
              {currentUser ? (
                /* Logged in state */
                <div className="bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || 'משתמש'}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-400 shadow-md"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-500 text-slate-950 font-black text-base flex items-center justify-center shadow-md">
                          {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-white">
                            {currentUser.displayName || 'משתמש Google'}
                          </h3>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                            מחובר ומסונכרן ☁️
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{currentUser.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={handleGoogleSignOut}
                      className="px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>התנתק</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800 text-[11px]">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>שף Google Gemini 3.7 פעיל ללא צורך במפתח</span>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>סנכרון ענן מאובטח לרשימות ומתכונים</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Logged out state: Big Google Sign-in Card */
                <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-2">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                    </div>
                    <h3 className="text-base font-black text-white">התחברות בלחיצה אחת עם חשבון Google</h3>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                      אין צורך במפתחות API או בידע טכני! פשוט מתחברים עם חשבון ה-Google שלכם והשף החכם מופעל עבורכם באופן אוטומטי.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningInGoogle}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-black rounded-2xl flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-98 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
                  >
                    {isSigningInGoogle ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                        <span>מתחבר לחשבון Google...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>התחבר עם חשבון Google</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-slate-300">
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <span className="font-bold text-amber-300 block mb-0.5">⚡ מובנה ומוכן</span>
                      <span>Gemini 3.7 פעיל מיד ללא הגדרות מורכבות</span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <span className="font-bold text-emerald-300 block mb-0.5">☁️ גיבוי בענן</span>
                      <span>רשימת קניות, פתקים ומתכונים שמורים</span>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-center">
                      <span className="font-bold text-indigo-300 block mb-0.5">🍳 התאמה אישית</span>
                      <span>השף זוכר כשרות, אלרגיות וסגנון אהוב</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible Advanced Developer Section (Optional override for developers only) */}
              <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setShowDevApiKeySection(!showDevApiKeySection)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-slate-400 hover:text-slate-200 transition-colors text-[11px]"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <Key className="h-3 w-3 text-slate-500" />
                    <span>הגדרות מפתחים מתקדמות (מפתח API אישי אופציונלי)</span>
                  </span>
                  {showDevApiKeySection ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showDevApiKeySection && (
                  <div className="p-4 pt-2 border-t border-slate-800/60 space-y-3">
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      אם אתה מפתח ורוצה להשתמש במפתח פרטי של Google AI Studio במקום במערכת המובנית:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => {
                          setApiKey(e.target.value);
                          setTestResult(null);
                        }}
                        placeholder="AIzaSy... (אופציונלי בלבד)"
                        className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
                      />
                      {apiKey.trim() && (
                        <button
                          type="button"
                          onClick={handleClearKey}
                          className="px-2.5 py-1.5 text-rose-400 border border-rose-500/30 rounded-xl hover:bg-rose-950/40 text-[11px]"
                        >
                          הסר
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs cursor-pointer"
                      >
                        {isTesting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                        <span>בדוק תקינות חיבור</span>
                      </button>

                      {testResult && (
                        <span className={`text-[11px] font-bold ${testResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {testResult.message}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Model Selection & Advanced Settings */}
          {activeTab === 'models' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-2">
                <label className="font-extrabold text-white block text-xs">בחר את מודל ה-Gemini המועדף עליך:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_MODELS.map((m) => {
                    const isSelected = selectedModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-black text-sm text-white block">{m.name}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{m.desc}</span>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border shrink-0 ${m.tagColor}`}>
                            {m.badge}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80">
                          <span className="text-slate-400">Google Gemini API</span>
                          {isSelected && <span className="text-amber-400 font-black flex items-center gap-1">נבחר <Check className="h-3 w-3" /></span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Creativity & Temperature Slider */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-white flex items-center gap-1.5 text-xs">
                    <Sliders className="h-3.5 w-3.5 text-amber-400" />
                    <span>רמת יצירתיות ודיוק (Temperature): {temperature}</span>
                  </label>
                  <span className="text-[11px] text-amber-300 font-bold">
                    {temperature <= 0.3 ? 'מדויק ועובדתי' : temperature <= 0.7 ? 'מאוזן ומומלץ לשף' : 'יצירתי ופורץ דרך 🔥'}
                  </span>
                </div>

                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0.1 (מתכונים שמרניים ומדויקים)</span>
                  <span>0.7 (אידיאלי)</span>
                  <span>1.0 (רעיונות חדשניים ושילובים נועזים)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Personal Culinary Profile & Memory */}
          {activeTab === 'personalProfile' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-slate-300 leading-relaxed">
                <strong className="text-amber-300 font-extrabold block mb-1">✨ זיכרון שף אישי</strong>
                ההעדפות שתגדיר כאן יועברו ל-Gemini באופן אוטומטי בכל שיחה, כך שהשף יתאים את כל המנות, התחליפים והתפריטים בדיוק לאורח החיים שלך.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dietary Preference */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block text-xs">העדפת תזונה</label>
                  <select
                    value={dietaryPreference}
                    onChange={(e) => setDietaryPreference(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ללא הגבלה">ללא הגבלה (הכל הולך)</option>
                    <option value="צמחוני">צמחוני 🥦</option>
                    <option value="טבעוני">טבעוני 🌱</option>
                    <option value="ללא גלוטן (צליאק/רגישות)">ללא גלוטן 🌾</option>
                    <option value="קטוגני / דל פחמימות">קטוגני / דל פחמימות 🥑</option>
                    <option value="ללא לקטוז">ללא לקטוז 🥛</option>
                    <option value="פליאו">פליאו 🥩</option>
                  </select>
                </div>

                {/* Kosher Preference */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300 block text-xs">העדפת כשרות</label>
                  <select
                    value={kosherPreference}
                    onChange={(e) => setKosherPreference(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="לא מוגדר">לא מוגדר / ללא הגבלה</option>
                    <option value="כשר רגיל (הפרדת בשר וחלב)">כשר רגיל ✡️</option>
                    <option value="כשר למהדרין">כשר למהדרין ✨</option>
                    <option value="בד״ץ / גלאט">בד״ץ / גלאט 📜</option>
                  </select>
                </div>
              </div>

              {/* Culinary Style */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block text-xs">סגנון קולינרי מועדף</label>
                <input
                  type="text"
                  value={culinaryStyle}
                  onChange={(e) => setCulinaryStyle(e.target.value)}
                  placeholder="למשל: ים תיכוני מודרני, פטיסרי צרפתי, אסייתי אותנטי, איטלקי קלאסי..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Personal Notes / Allergies / Equipment */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block text-xs">
                  הערות אישיות, אלרגיות או ציוד מטבח מיוחד (טאבון, סו-וויד, מעשנה וכו')
                </label>
                <textarea
                  rows={3}
                  value={personalNotes}
                  onChange={(e) => setPersonalNotes(e.target.value)}
                  placeholder="למשל: אלרגיה לאגוזי מלך, יש לי טאבון ביתי ומעשנת פלטים, אוהב חריף..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Culinary Background Settings */}
          {activeTab === 'background' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Enable / Disable Background Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    {bgSettings.isEnabled ? (
                      <Eye className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    )}
                    <span>הפעלת רקע קולינרי (סרטונים ותמונות)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    מציג סרטוני שף ומנות רקע איכותיות ברקע הממשק
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bgSettings.isEnabled}
                    onChange={(e) => updateBgSettings({ isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {bgSettings.isEnabled && (
                <>
                  {/* Scene Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>בחר סצנה או תמונת אווירה:</span>
                      </label>
                      <span className="text-[10px] text-slate-400">{bgCurrentScene.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {bgScenes.map((scene) => {
                        const isSelected = scene.id === bgCurrentScene.id;
                        return (
                          <button
                            key={scene.id}
                            type="button"
                            onClick={() => updateBgSettings({ sceneId: scene.id })}
                            className={`p-2.5 rounded-2xl text-right border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/10'
                                : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 text-slate-300'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="font-bold text-xs flex items-center gap-1.5 truncate">
                                {scene.type === 'video' ? (
                                  <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                ) : (
                                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                )}
                                <span className="truncate">{scene.name}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                                {scene.description}
                              </p>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Video Play / Pause Controls */}
                  {bgCurrentScene.type === 'video' && (
                    <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">נגן סרטון רקע בלופ</span>
                        <span className="text-[10px] text-slate-400">הפעלה או השהיית הווידאו</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateBgSettings({ isVideoPlaying: !bgSettings.isVideoPlaying })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          bgSettings.isVideoPlaying
                            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {bgSettings.isVideoPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current" />
                            <span>השהה סרטון</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>הפעל סרטון</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Sliders: Opacity & Blur */}
                  <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-bold text-slate-200">
                          שקיפות רקע ({Math.round(bgSettings.opacity * 100)}%)
                        </span>
                        <span className="text-[10px] text-slate-400">עדין ונעים לעין</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.75"
                        step="0.05"
                        value={bgSettings.opacity}
                        onChange={(e) => updateBgSettings({ opacity: parseFloat(e.target.value) })}
                        className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-bold text-slate-200">
                          טשטוש רקע ({bgSettings.blur}px)
                        </span>
                        <span className="text-[10px] text-slate-400">קריאות מקסימלית של טקסטים</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="12"
                        step="1"
                        value={bgSettings.blur}
                        onChange={(e) => updateBgSettings({ blur: parseInt(e.target.value, 10) })}
                        className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Reset background button */}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={resetBgSettings}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>איפוס הגדרות רקע לברירת המחדל</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 relative z-10">
          <div className="text-[11px] text-slate-400">
            {currentUser ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> מחובר לחשבון Google
              </span>
            ) : apiKey.trim() ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> מפתח מפתחים מוגדר
              </span>
            ) : (
              <span>שף Gemini 3.7 פעיל לשימושך</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              סגור
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
            >
              שמור והחל העדפות
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
