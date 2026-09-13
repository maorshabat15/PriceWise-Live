import React, { useState } from 'react';
import { 
  Settings, 
  Film, 
  Image as ImageIcon, 
  Sliders, 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  Sparkles, 
  Accessibility, 
  Check, 
  Eye, 
  EyeOff, 
  User as UserIcon,
  SlidersHorizontal
} from 'lucide-react';
import { useBackgroundSettings, BackgroundScene } from '../services/backgroundSettings';
import { User } from 'firebase/auth';
import { AppUser } from '../types';

interface AppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | User | null;
  onOpenGeminiModal?: () => void;
  initialTab?: 'background' | 'accessibility' | 'chef';
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenGeminiModal,
  initialTab = 'background',
}) => {
  const [activeTab, setActiveTab] = useState<'background' | 'accessibility' | 'chef'>(initialTab);
  const { settings, currentScene, scenes, updateSettings, resetSettings } = useBackgroundSettings();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="הגדרות האפליקציה"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>הגדרות האפליקציה</span>
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  PriceWise
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">התאמת רקע, תצוגה, נגישות והעדפות משתמש</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="סגור חלון הגדרות"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('background')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'background'
                ? 'border-amber-400 text-amber-300 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>רקע קולינרי</span>
          </button>

          <button
            onClick={() => setActiveTab('accessibility')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'accessibility'
                ? 'border-amber-400 text-amber-300 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Accessibility className="w-4 h-4" />
            <span>נגישות ותצוגה</span>
          </button>

          <button
            onClick={() => setActiveTab('chef')}
            className={`flex items-center gap-2 py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'chef'
                ? 'border-amber-400 text-amber-300 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>שף ו-AI</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* TAB 1: CULINARY BACKGROUND SETTINGS */}
          {activeTab === 'background' && (
            <div className="space-y-4">
              {/* Enable / Disable Background Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-bold text-white text-xs flex items-center gap-1.5">
                    {settings.isEnabled ? (
                      <Eye className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    )}
                    <span>הפעלת רקע קולינרי (סרטונים ותמונות)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    מציג רקע וידאו/תמונות אווירה קולינריות מאחורי ממשק האפליקציה
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.isEnabled}
                    onChange={(e) => updateSettings({ isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {settings.isEnabled && (
                <>
                  {/* Scene Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        <span>בחר סצנה או תמונת אווירה:</span>
                      </label>
                      <span className="text-[10px] text-slate-400">סצנה נבחרת: {currentScene.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {scenes.map((scene) => {
                        const isSelected = scene.id === currentScene.id;
                        return (
                          <button
                            key={scene.id}
                            type="button"
                            onClick={() => updateSettings({ sceneId: scene.id })}
                            className={`p-2.5 rounded-2xl text-right border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/10'
                                : 'bg-slate-950/40 hover:bg-slate-800/80 border-slate-800 text-slate-300'
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
                  {currentScene.type === 'video' && (
                    <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">נגן סרטון רקע בלופ</span>
                        <span className="text-[10px] text-slate-400">שליטה בהפעלה או השהיית הווידאו</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateSettings({ isVideoPlaying: !settings.isVideoPlaying })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          settings.isVideoPlaying
                            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                        }`}
                      >
                        {settings.isVideoPlaying ? (
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
                  <div className="space-y-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-bold text-slate-200">
                          שקיפות רקע ({Math.round(settings.opacity * 100)}%)
                        </span>
                        <span className="text-[10px] text-slate-400">עדין ונעים לעין</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.75"
                        step="0.05"
                        value={settings.opacity}
                        onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
                        className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-bold text-slate-200">
                          טשטוש רקע ({settings.blur}px)
                        </span>
                        <span className="text-[10px] text-slate-400">קריאות מקסימלית של טקסטים</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="12"
                        step="1"
                        value={settings.blur}
                        onChange={(e) => updateSettings({ blur: parseInt(e.target.value, 10) })}
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
                  onClick={resetSettings}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>איפוס הגדרות רקע לברירת המחדל</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ACCESSIBILITY SHORTCUTS */}
          {activeTab === 'accessibility' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3">
                <Accessibility className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-amber-300">תפריט נגישות ייעודי זמין תמיד</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    לרשותך כפתור צף דיסקרטי בפינה התחתונה או הקש <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-amber-400 font-mono text-[10px]">Alt + A</kbd> לפתיחה מהירה של אפשרויות נגישות מלאות.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <span className="font-bold text-white block mb-1">התאמות גופן</span>
                  <p className="text-[10px] text-slate-400">שינוי גודל טקסט מ-90% ועד 140% ופונט קריא ברמת WCAG AA.</p>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <span className="font-bold text-white block mb-1">מצבי ניגודיות</span>
                  <p className="text-[10px] text-slate-400">ניגודיות מוגברת, צהוב-שחור, גווני אפור והיפוך צבעים מלא.</p>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <span className="font-bold text-white block mb-1">עצירת תנועה</span>
                  <p className="text-[10px] text-slate-400">הפחתת הבהובים ואנימציות למשתמשים עם רגישות לתנועה.</p>
                </div>
                <div className="p-3 bg-slate-950/50 rounded-2xl border border-slate-800">
                  <span className="font-bold text-white block mb-1">ניווט מקלדת מלא</span>
                  <p className="text-[10px] text-slate-400">תמיכה מלאה ב-Tab, Shift+Tab, Enter ו-Escape עם Focus Rings ברורים.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHEF & AI */}
          {activeTab === 'chef' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs">חשבון שף וסנכרון ענן</span>
                  </div>
                  {currentUser ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      מחובר ל-Google Cloud
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                      אורח מקומי
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  {currentUser 
                    ? `שלום ${currentUser.displayName || currentUser.email}, ההעדפות, המתכונים וסל הקניות שלך מסונכרנים בענן.`
                    : 'התחבר עם Google כדי לסנכרן מתכונים, רשימות קניות והעדפות בין מכשירים.'
                  }
                </p>

                {onOpenGeminiModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenGeminiModal();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>פתח הגדרות שף, כשרות ותזונה מורחבות</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>השינויים מוחלים ונשמרים אוטומטית</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
