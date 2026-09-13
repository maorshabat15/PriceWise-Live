import React, { useState, useEffect, useRef } from 'react';
import { 
  Accessibility, 
  X, 
  RotateCcw, 
  Type, 
  Eye, 
  Sparkles, 
  Minus, 
  Plus, 
  MousePointer, 
  Check, 
  HelpCircle, 
  Keyboard, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface AccessibilitySettings {
  fontSize: number; // 100, 110, 120, 130, 140
  contrast: 'default' | 'high' | 'high-yellow' | 'monochrome' | 'invert';
  underlineLinks: boolean;
  stopAnimations: boolean;
  readableFont: boolean;
  bigCursor: boolean;
  highlightFocus: boolean;
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontSize: 100,
  contrast: 'default',
  underlineLinks: false,
  stopAnimations: false,
  readableFont: false,
  bigCursor: false,
  highlightFocus: false,
};

const STORAGE_KEY = 'pricewise_a11y_settings';

export function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load a11y settings', e);
    }
    return DEFAULT_SETTINGS;
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Check if any setting is active (different from default)
  const isCustomized = 
    settings.fontSize !== DEFAULT_SETTINGS.fontSize ||
    settings.contrast !== DEFAULT_SETTINGS.contrast ||
    settings.underlineLinks !== DEFAULT_SETTINGS.underlineLinks ||
    settings.stopAnimations !== DEFAULT_SETTINGS.stopAnimations ||
    settings.readableFont !== DEFAULT_SETTINGS.readableFont ||
    settings.bigCursor !== DEFAULT_SETTINGS.bigCursor ||
    settings.highlightFocus !== DEFAULT_SETTINGS.highlightFocus;

  // Apply settings to document root
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save a11y settings', e);
    }

    const root = document.documentElement;

    // 1. Font Size
    if (settings.fontSize === 100) {
      root.style.fontSize = '';
    } else {
      root.style.fontSize = `${settings.fontSize}%`;
    }

    // 2. Contrast
    root.classList.remove(
      'a11y-high-contrast', 
      'a11y-high-yellow', 
      'a11y-monochrome', 
      'a11y-invert'
    );
    if (settings.contrast === 'high') {
      root.classList.add('a11y-high-contrast');
    } else if (settings.contrast === 'high-yellow') {
      root.classList.add('a11y-high-yellow');
    } else if (settings.contrast === 'monochrome') {
      root.classList.add('a11y-monochrome');
    } else if (settings.contrast === 'invert') {
      root.classList.add('a11y-invert');
    }

    // 3. Underline links
    if (settings.underlineLinks) {
      root.classList.add('a11y-underline-links');
    } else {
      root.classList.remove('a11y-underline-links');
    }

    // 4. Stop animations
    if (settings.stopAnimations) {
      root.classList.add('a11y-stop-animations');
    } else {
      root.classList.remove('a11y-stop-animations');
    }

    // 5. Readable font
    if (settings.readableFont) {
      root.classList.add('a11y-readable-font');
    } else {
      root.classList.remove('a11y-readable-font');
    }

    // 6. Big Cursor
    if (settings.bigCursor) {
      root.classList.add('a11y-big-cursor');
    } else {
      root.classList.remove('a11y-big-cursor');
    }

    // 7. Highlight Focus
    if (settings.highlightFocus) {
      root.classList.add('a11y-highlight-focus');
    } else {
      root.classList.remove('a11y-highlight-focus');
    }
  }, [settings]);

  // Keyboard navigation & Shortcuts (Escape to close, Alt+A to toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }

      // Alt + A to toggle
      if (e.altKey && (e.key === 'a' || e.key === 'A' || e.key === 'ש')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const updateFontSize = (delta: number) => {
    setSettings(prev => {
      const next = Math.min(140, Math.max(90, prev.fontSize + delta));
      return { ...prev, fontSize: next };
    });
  };

  return (
    <>
      {/* Discreet Floating Trigger Button (Bottom Left) */}
      <div className="fixed bottom-5 left-5 z-40">
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-label="פתח תפריט נגישות (קיצור מקלדת Alt + A)"
          title="תפריט נגישות (Alt + A)"
          className={`group relative flex items-center justify-center w-11 h-11 rounded-full border shadow-lg backdrop-blur-md transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
            isOpen || isCustomized
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-amber-500/30 scale-105'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border-slate-700/80 hover:border-amber-400/80 shadow-black/40'
          }`}
        >
          <Accessibility className="w-5 h-5 transition-transform group-hover:scale-110" />

          {/* Active indicator dot if accessibility is active */}
          {isCustomized && !isOpen && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-950 rounded-full animate-pulse" />
          )}

          {/* Hover tooltip for desktop */}
          <span className="sr-only">תפריט נגישות</span>
          <div className="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover:block whitespace-nowrap bg-slate-950 text-slate-200 border border-slate-800 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-xl z-50">
            תפריט נגישות <span className="text-amber-400 font-mono text-[10px]">(Alt+A)</span>
          </div>
        </button>
      </div>

      {/* Floating Accessible Menu Drawer / Modal */}
      {isOpen && (
        <div
          ref={menuRef}
          role="dialog"
          aria-modal="true"
          aria-label="תפריט הגדרות נגישות"
          className="fixed bottom-18 sm:bottom-20 left-4 sm:left-5 z-50 w-[340px] sm:w-[370px] max-w-[calc(100vw-2rem)] max-h-[82vh] flex flex-col rounded-3xl bg-slate-900/95 border border-slate-700/90 shadow-2xl backdrop-blur-xl text-slate-100 overflow-hidden animate-fadeIn"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Accessibility className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <span>תפריט נגישות</span>
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-full">
                    WCAG AA
                  </span>
                </h2>
                <p className="text-[10px] text-slate-400">ת\"י 5568 | התאמה אישית של האתר</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isCustomized && (
                <button
                  type="button"
                  onClick={handleReset}
                  aria-label="איפוס הגדרות נגישות לברירת המחדל"
                  title="אפס הגדרות נגישות"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">איפוס</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="סגור תפריט נגישות"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            
            {/* 1. Font Size Scaling */}
            <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <Type className="w-4 h-4 text-amber-400" />
                  <span>גודל טקסט</span>
                </div>
                <span className="text-[11px] font-mono text-amber-400 font-bold bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                  {settings.fontSize}%
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateFontSize(-10)}
                  disabled={settings.fontSize <= 90}
                  aria-label="הקטן טקסט ב-10%"
                  className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-white font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                  <span>הקטן</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, fontSize: 100 }))}
                  aria-label="אפס גודל טקסט לברירת מחדל"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    settings.fontSize === 100
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  100%
                </button>

                <button
                  type="button"
                  onClick={() => updateFontSize(10)}
                  disabled={settings.fontSize >= 140}
                  aria-label="הגדל טקסט ב-10%"
                  className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-white font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-400" />
                  <span>הגדל</span>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[100, 110, 120, 130].map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, fontSize: size }))}
                    className={`py-1 text-[11px] rounded-lg border font-bold transition-colors cursor-pointer ${
                      settings.fontSize === size
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
                    }`}
                  >
                    {size}%
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Contrast & Display Mode */}
            <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>מצב ניגודיות וצבע</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {[
                  { id: 'default', label: 'רגיל (ברירת מחדל)', desc: 'עיצוב מקורי' },
                  { id: 'high', label: 'ניגודיות גבוהה', desc: 'הדגשת גבולות וצבעים' },
                  { id: 'high-yellow', label: 'ניגודיות צהוב-שחור', desc: 'רקע שחור והדגשה צהובה' },
                  { id: 'monochrome', label: 'גווני אפור', desc: 'ללא צבעים' },
                  { id: 'invert', label: 'היפוך צבעים', desc: 'היפוך גוונים מלא' },
                ].map(mode => {
                  const isActive = settings.contrast === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, contrast: mode.id as any }))}
                      className={`p-2 rounded-xl text-right border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm'
                          : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                      } ${mode.id === 'invert' ? 'col-span-2' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px]">{mode.label}</span>
                        {isActive && <Check className="w-3 h-3 text-amber-400" />}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Toggles: Underline, Motion, Font, Cursor, Focus */}
            <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-xs pb-1 border-b border-slate-800/60">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>התאמות נוספות</span>
              </div>

              {/* Underline Links */}
              <label className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-900/60 transition-colors cursor-pointer">
                <div>
                  <div className="font-bold text-[11px] text-white">הדגשת קישורים וכפתורים</div>
                  <div className="text-[10px] text-slate-400">הוספת קו תחתי ברור לכל קישור באתר</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.underlineLinks}
                  onChange={(e) => setSettings(prev => ({ ...prev, underlineLinks: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                />
              </label>

              {/* Stop Animations */}
              <label className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-900/60 transition-colors cursor-pointer">
                <div>
                  <div className="font-bold text-[11px] text-white">עצירת אנימציות ותנועה</div>
                  <div className="text-[10px] text-slate-400">הפחתת הבהובים ותנועות מסיחות דעת</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.stopAnimations}
                  onChange={(e) => setSettings(prev => ({ ...prev, stopAnimations: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                />
              </label>

              {/* Readable Font */}
              <label className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-900/60 transition-colors cursor-pointer">
                <div>
                  <div className="font-bold text-[11px] text-white">גופן קריא וברור</div>
                  <div className="text-[10px] text-slate-400">שימוש בפונט מערכת נקי עם ריווח מוגבר</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.readableFont}
                  onChange={(e) => setSettings(prev => ({ ...prev, readableFont: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                />
              </label>

              {/* Big Cursor */}
              <label className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-900/60 transition-colors cursor-pointer">
                <div>
                  <div className="font-bold text-[11px] text-white">סמן עכבר מוגדל</div>
                  <div className="text-[10px] text-slate-400">הגדלת הסמן לאיתור קל על המסך</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.bigCursor}
                  onChange={(e) => setSettings(prev => ({ ...prev, bigCursor: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                />
              </label>

              {/* Highlight Focus */}
              <label className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-slate-900/60 transition-colors cursor-pointer">
                <div>
                  <div className="font-bold text-[11px] text-white">הדגשת פוקוס מוגברת</div>
                  <div className="text-[10px] text-slate-400">מסגרת צהובה בולטת בעת ניווט במקלדת</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.highlightFocus}
                  onChange={(e) => setSettings(prev => ({ ...prev, highlightFocus: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                />
              </label>
            </div>

            {/* 4. Accessibility Statement & Keyboard Shortcuts (Collapsible) */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
              <button
                type="button"
                onClick={() => setShowStatement(prev => !prev)}
                className="w-full px-3 py-2.5 flex items-center justify-between text-slate-300 hover:text-white transition-colors text-[11px] font-bold"
              >
                <span className="flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-amber-400" />
                  <span>ניווט מקלדת והצהרת נגישות</span>
                </span>
                {showStatement ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showStatement && (
                <div className="p-3 pt-1 border-t border-slate-800 text-[11px] text-slate-400 space-y-2 leading-relaxed">
                  <div>
                    <span className="font-bold text-slate-200 block mb-1">מקשי קיצור לניווט:</span>
                    <ul className="space-y-1 list-disc list-inside text-[10px]">
                      <li><kbd className="px-1 py-0.2 bg-slate-800 rounded border border-slate-700 text-amber-300">Tab</kbd> מעבר קדימה בין אלמנטים וכפתורים</li>
                      <li><kbd className="px-1 py-0.2 bg-slate-800 rounded border border-slate-700 text-amber-300">Shift + Tab</kbd> מעבר אחורה</li>
                      <li><kbd className="px-1 py-0.2 bg-slate-800 rounded border border-slate-700 text-amber-300">Enter / Space</kbd> הפעלה ובחירה</li>
                      <li><kbd className="px-1 py-0.2 bg-slate-800 rounded border border-slate-700 text-amber-300">Escape</kbd> סגירת חלונות ותפריטים</li>
                      <li><kbd className="px-1 py-0.2 bg-slate-800 rounded border border-slate-700 text-amber-300">Alt + A</kbd> פתיחה/סגירה של תפריט נגישות זה</li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-slate-800/60 text-[10px]">
                    <span className="font-bold text-slate-200 block mb-0.5">עמידה בתקן:</span>
                    אתר PriceWise נבנה בהתאם להנחיות הנגישות בתקן הישראלי ת\"י 5568 ומסמך WCAG 2.1 של ארגון W3C ברמת AA.
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span>ההגדרות נשמרות בדפדפן זה</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-colors cursor-pointer"
            >
              סיום
            </button>
          </div>
        </div>
      )}
    </>
  );
}
