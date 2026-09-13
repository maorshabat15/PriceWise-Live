import React, { useState, useEffect, useRef } from 'react';
import {
  Refrigerator,
  ChefHat,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Users,
  Utensils,
  Clock,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Send,
  Mic,
  MicOff,
  BookmarkPlus,
  HelpCircle,
  MessageSquare,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SmartFridgeDish, SmartFridgeSession, ChatMessage, UserProfileContext } from '../types';
import {
  generateSmartFridgeDishes,
  generateDetailedRecipe,
  sendFridgeCookingMessage,
} from '../services/smartFridgeService';
import { MarkdownContent } from './MarkdownContent';
import { getSpeechRecognition, speakText, stopSpeaking } from '../utils/speech';

interface SmartFridgeViewProps {
  onSendToChat?: (promptText: string) => void;
  searchQuery?: string;
  currentUser?: any;
  showToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  onSaveNote?: (note: any) => void;
  onNavigateToNotes?: (noteId?: string) => void;
}

const COMMON_IN_FRIDGE = [
  'ביצים', 'גבינה צהובה', 'עגבניות', 'בצל', 'שום',
  'חזה עוף', 'פסטה', 'שמנת לבישול', 'פטריות', 'קישואים',
  'תפוחי אדמה', 'אורז', 'שמן זית', 'לימון'
];

const DINER_OPTIONS = [
  { id: '1', label: '1 סועד (רק אני)', icon: '👤' },
  { id: '2', label: '2 סועדים (זוגי)', icon: '👥' },
  { id: '4', label: '4 סועדים', icon: '👨‍👩‍👧' },
  { id: 'משפחה (5+)', label: 'משפחה (5+)', icon: '👨‍👩‍👧‍👦' },
];

const MEAL_STYLE_OPTIONS = [
  { id: 'נשנוש זריז (עד 15 דקות)', label: 'נשנוש זריז (עד 15 דקות)', icon: '⚡' },
  { id: 'ארוחת צהריים משביעה', label: 'ארוחת צהריים משביעה', icon: '🍲' },
  { id: 'ארוחת ערב קלה', label: 'ארוחת ערב קלה', icon: '🥗' },
  { id: 'אירוח מושקע ומפנק', label: 'אירוח מושקע ומפנק', icon: '✨' },
  { id: 'תבשיל חם ומנחם', label: 'תבשיל חם ומנחם', icon: '🥘' },
];

const LOCAL_STORAGE_SESSION_KEY = 'pw_smart_fridge_session';

export const SmartFridgeView: React.FC<SmartFridgeViewProps> = ({
  searchQuery = '',
  currentUser,
  showToast,
  onSaveNote,
  onNavigateToNotes,
}) => {
  // Wizard Step: 1 (Ingredients) | 2 (Meal Details) | 3 (Visual Cards & Selection) | 5 (Dedicated Session)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 5>(1);

  // Step 1: Ingredients State
  const [ingredientsInput, setIngredientsInput] = useState(searchQuery || '');
  const [quickTags, setQuickTags] = useState<string[]>([]);

  // Step 2: Meal Profile State
  const [diners, setDiners] = useState<string>('2');
  const [mealStyle, setMealStyle] = useState<string>('ארוחת ערב קלה');
  const [quantityNotes, setQuantityNotes] = useState<string>('');

  // Step 3 & 4: Visual Dish Cards State
  const [dishOptions, setDishOptions] = useState<SmartFridgeDish[]>([]);
  const [isLoadingDishes, setIsLoadingDishes] = useState<boolean>(false);
  const [selectedDish, setSelectedDish] = useState<SmartFridgeDish | null>(null);

  // Step 5: Dedicated Cooking Session State
  const [cookingSession, setCookingSession] = useState<SmartFridgeSession | null>(null);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Restore existing dedicated session if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
      if (saved) {
        const parsed: SmartFridgeSession = JSON.parse(saved);
        if (parsed && parsed.selectedDish && parsed.chatMessages?.length > 0) {
          setCookingSession(parsed);
          setSelectedDish(parsed.selectedDish);
          setDiners(parsed.diners || '2');
          setMealStyle(parsed.mealStyle || 'ארוחת ערב קלה');
          setQuantityNotes(parsed.notes || '');
          setCurrentStep(5);
        }
      }
    } catch (e) {
      console.warn('Could not restore smart fridge session from localStorage:', e);
    }
  }, []);

  // Scroll to bottom of chat in Step 5
  useEffect(() => {
    if (currentStep === 5) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [cookingSession?.chatMessages, currentStep]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  // Helper to compile final ingredients array
  const getCompiledIngredients = (): string[] => {
    const fromInput = ingredientsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const combined = Array.from(new Set([...quickTags, ...fromInput]));
    return combined.length > 0 ? combined : ['מצרכי בסיס מהמקרר והמזווה'];
  };

  const handleToggleTag = (item: string) => {
    if (quickTags.includes(item)) {
      setQuickTags(quickTags.filter((t) => t !== item));
    } else {
      setQuickTags([...quickTags, item]);
    }
  };

  // Step 1 -> Step 2
  const handleProceedToDetails = () => {
    setCurrentStep(2);
  };

  // Step 2 -> Step 3: Fetch 3 visual dish cards
  const handleGenerateDishes = async () => {
    setIsLoadingDishes(true);
    setCurrentStep(3);

    const ingredients = getCompiledIngredients();
    const userProfile: UserProfileContext = {
      name: currentUser?.displayName || currentUser?.email?.split('@')[0],
      email: currentUser?.email,
    };

    try {
      const dishes = await generateSmartFridgeDishes({
        ingredients,
        diners,
        mealStyle,
        notes: quantityNotes.trim(),
        userProfile,
      });
      setDishOptions(dishes);
    } catch (error) {
      console.error('Error fetching dish cards:', error);
      showToast?.('שגיאה בטעינת הצעות', 'טוען הצעות מותאמות אישית חלופיות...', 'info');
    } finally {
      setIsLoadingDishes(false);
    }
  };

  // Step 4 -> Step 5: Choose dish & initialize dedicated room
  const handleSelectDish = async (dish: SmartFridgeDish) => {
    setSelectedDish(dish);
    setIsLoadingDishes(true);

    const ingredients = getCompiledIngredients();
    const userProfile: UserProfileContext = {
      name: currentUser?.displayName || currentUser?.email?.split('@')[0],
      email: currentUser?.email,
    };

    try {
      const initialRecipe = await generateDetailedRecipe({
        dish,
        ingredients,
        diners,
        mealStyle,
        notes: quantityNotes.trim(),
        userProfile,
      });

      const openingMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'model',
        content: initialRecipe,
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      };

      const newSession: SmartFridgeSession = {
        id: `session-${Date.now()}`,
        createdAt: Date.now(),
        ingredients,
        diners,
        mealStyle,
        notes: quantityNotes.trim(),
        selectedDish: dish,
        chatMessages: [openingMessage],
      };

      setCookingSession(newSession);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(newSession));
      setCurrentStep(5);
      showToast?.('חדר בישול מוכן', `המתכון עבור ${dish.name} נבנה בהצלחה!`, 'success');
    } catch (err) {
      console.error('Failed to create dedicated session:', err);
      showToast?.('שגיאה', 'לא ניתן ליצור חדר בישול. נסה שוב.', 'error');
    } finally {
      setIsLoadingDishes(false);
    }
  };

  // Step 5: Send message inside dedicated room
  const handleSendDedicatedMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || !cookingSession || isSendingMessage) return;

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...cookingSession.chatMessages, userMessage];
    const sessionWithUser = { ...cookingSession, chatMessages: updatedHistory };
    setCookingSession(sessionWithUser);
    setChatInput('');
    setIsSendingMessage(true);

    try {
      const chefReply = await sendFridgeCookingMessage({
        message: text,
        dish: cookingSession.selectedDish,
        ingredients: cookingSession.ingredients,
        diners: cookingSession.diners,
        mealStyle: cookingSession.mealStyle,
        notes: cookingSession.notes,
        history: updatedHistory.map((m) => ({ role: m.role, content: m.content })),
        userProfile: {
          name: currentUser?.displayName || currentUser?.email?.split('@')[0],
        },
      });

      const modelMessage: ChatMessage = {
        id: `msg-model-${Date.now()}`,
        role: 'model',
        content: chefReply,
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      };

      const finalSession = {
        ...sessionWithUser,
        chatMessages: [...updatedHistory, modelMessage],
      };
      setCookingSession(finalSession);
      localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(finalSession));
    } catch (err) {
      console.error('Error in dedicated chef chat:', err);
      showToast?.('שגיאה בתשובת השף', 'אנא נסה לשאול שוב', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Start Voice Recognition in Step 5
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) {
      showToast?.('זיהוי קולי אינו נתמך', 'דפדפן זה אינו תומך בהכתבה קולית ישירה', 'error');
      return;
    }

    recognitionRef.current = recognition;
    recognition.lang = 'he-IL';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setChatInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Recognition start error:', e);
      setIsListening(false);
    }
  };

  // Save recipe to Cookbook Notes
  const handleSaveRecipeToNotes = () => {
    if (!cookingSession) return;
    const dish = cookingSession.selectedDish;
    const initialRecipe = cookingSession.chatMessages[0]?.content || '';

    if (onSaveNote) {
      const noteToSave = {
        id: `note-${Date.now()}`,
        title: `מתכון מהמקרר: ${dish.name}`,
        content: initialRecipe,
        tags: ['המקרר החכם', dish.style, `${cookingSession.diners} סועדים`],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: true,
      };
      onSaveNote(noteToSave);
      showToast?.('נשמר בספר המתכונים!', `המתכון עבור ${dish.name} נשמר בלשונית רשימות ומתכונים.`, 'success');
      onNavigateToNotes?.(noteToSave.id);
    } else {
      navigator.clipboard.writeText(initialRecipe);
      showToast?.('הועתק ללוח!', 'טקסט המתכון הועתק ללוח בהצלחה.', 'success');
    }
  };

  // Reset & start a fresh session
  const handleResetSession = () => {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
    setCookingSession(null);
    setSelectedDish(null);
    setCurrentStep(1);
    showToast?.('ארוחה חדשה', 'מוכן לתכנון המנה הבאה מהמקרר!', 'info');
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6" dir="rtl">
      {/* Header & Step Indicator */}
      <div className="bg-slate-900/95 border border-amber-500/30 p-4 sm:p-5 rounded-3xl shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10 shrink-0">
            <Refrigerator className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white">המקרר החכם</h1>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                תהליך שף מובנה
              </span>
            </div>
            <p className="text-xs text-amber-200/80 mt-0.5">
              5 שלבים פשוטים ממה שיש בבית ועד למנה מושלמת
            </p>
          </div>
        </div>

        {/* Wizard Progress Pill Indicator */}
        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-1.5 bg-slate-950/70 px-3 py-1.5 rounded-2xl border border-slate-800 text-xs">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-xl transition-all ${
            currentStep === 1 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
          }`}>
            <span className="text-[11px]">1. מצרכים</span>
          </div>
          <span className="text-slate-600">←</span>

          <div className={`flex items-center gap-1 px-2 py-1 rounded-xl transition-all ${
            currentStep === 2 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
          }`}>
            <span className="text-[11px]">2. איפיון</span>
          </div>
          <span className="text-slate-600">←</span>

          <div className={`flex items-center gap-1 px-2 py-1 rounded-xl transition-all ${
            currentStep === 3 ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400'
          }`}>
            <span className="text-[11px]">3-4. מנות</span>
          </div>
          <span className="text-slate-600">←</span>

          <div className={`flex items-center gap-1 px-2 py-1 rounded-xl transition-all ${
            currentStep === 5 ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/30' : 'text-slate-400'
          }`}>
            <span className="text-[11px]">5. בישול</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: איסוף מצרכים (Ingredients Collection) */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-slate-100 relative overflow-hidden space-y-6">
          <div className="text-center sm:text-right space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold mb-1">
              <ChefHat className="w-4 h-4 text-amber-400" />
              <span>שלב 1 מתוך 5: איסוף מצרכים</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              מה יש לך במקרר ובמזווה?
            </h2>
            <p className="text-sm text-amber-200/90 font-medium">
              הקלד את המצרכים או לחץ על התגיות הנפוצות. לא זורקים שום דבר!
            </p>
          </div>

          {/* Text Input Area */}
          <div className="space-y-2">
            <label htmlFor="fridge-step1-input" className="block text-xs font-bold text-slate-300">
              הקלד מצרכים, ירקות ושאריות (מופרדים בפסיקים):
            </label>
            <textarea
              id="fridge-step1-input"
              rows={3}
              value={ingredientsInput}
              onChange={(e) => setIngredientsInput(e.target.value)}
              placeholder="למשל: 3 ביצים, עגבניות, חצי חבילת פסטה, בצל, גבינה צהובה, קצת שמנת, שום..."
              className="w-full bg-slate-950/80 border border-slate-700/80 hover:border-amber-500/50 focus:border-amber-400 rounded-2xl p-4 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner leading-relaxed resize-none"
            />
          </div>

          {/* Quick Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>הוספה מהירה בלחיצה (מצרכים נפוצים):</span>
              </span>
              {quickTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuickTags([])}
                  className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
                >
                  נקה בחירה ({quickTags.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {COMMON_IN_FRIDGE.map((item) => {
                const isSelected = quickTags.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleToggleTag(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border border-amber-400 shadow-sm shadow-amber-500/20 scale-105'
                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{item}</span>
                    {isSelected && <span className="text-[10px] font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Session Warning / Resume Banner */}
          {cookingSession && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>יש לך סשן בישול פעיל על המנה: <strong>{cookingSession.selectedDish.name}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="bg-emerald-500 text-slate-950 font-bold px-3 py-1 rounded-xl hover:bg-emerald-400 transition-colors cursor-pointer shrink-0"
              >
                חזור לחדר הבישול ←
              </button>
            </div>
          )}

          {/* Step 1 CTA Button (Renamed as requested) */}
          <div className="pt-2">
            <button
              id="btn-proceed-to-meal-details"
              type="button"
              onClick={handleProceedToDetails}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-base sm:text-lg font-black transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] group"
            >
              <span>המשך לפרטי הארוחה</span>
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3] group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: שאלון איפיון מהיר (Quick Meal Questionnaire) */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-slate-100 space-y-6 animate-fade-in">
          {/* Back button & title */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>חזור לעריכת מצרכים</span>
            </button>

            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              שלב 2 מתוך 5: איפיון הארוחה
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              כמה פרטים קצרים על הארוחה
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              השף ישתמש בפרטים אלו כדי להרכיב מנות מדויקות בגודלן ובסגנונן.
            </p>
          </div>

          {/* Selected Ingredients Summary */}
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>מצרכים שנבחרו:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {getCompiledIngredients().map((ing) => (
                <span
                  key={ing}
                  className="text-xs bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-xl"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Question 1: How many diners? */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>לכמה אנשים מבשלים?</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DINER_OPTIONS.map((opt) => {
                const isSelected = diners === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDiners(opt.id)}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25 scale-[1.02]'
                        : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question 2: Meal Style */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-amber-400" />
              <span>מה סגנון הארוחה?</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MEAL_STYLE_OPTIONS.map((style) => {
                const isSelected = mealStyle === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setMealStyle(style.id)}
                    className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25'
                        : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-lg">{style.icon}</span>
                    <span>{style.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question 3: Optional notes on quantities */}
          <div className="space-y-2">
            <label htmlFor="fridge-step2-notes" className="block text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>האם יש הערות מיוחדות על כמויות המצרכים שהזנת? (אופציונלי):</span>
            </label>
            <input
              id="fridge-step2-notes"
              type="text"
              value={quantityNotes}
              onChange={(e) => setQuantityNotes(e.target.value)}
              placeholder="למשל: נשארו רק 2 ביצים, העגבניות כבר מאוד רכות, יש חצי חבילת פסטה..."
              className="w-full bg-slate-950/80 border border-slate-700/80 hover:border-amber-500/50 focus:border-amber-400 rounded-2xl p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all shadow-inner"
            />
          </div>

          {/* Action button */}
          <div className="pt-2">
            <button
              id="btn-show-what-can-make"
              type="button"
              onClick={handleGenerateDishes}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-base sm:text-lg font-black transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-3 cursor-pointer active:scale-[0.99] group"
            >
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>תראה לי מה אפשר להכין</span>
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3] group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3 & 4: יצירת הצעות חזותיות ובחירת מנה (Visual Dish Cards) */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>חזור לעריכת איפיון</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                עבור <strong>{diners} סועדים</strong> • <strong>{mealStyle}</strong>
              </span>
              <button
                type="button"
                onClick={handleGenerateDishes}
                disabled={isLoadingDishes}
                className="p-1.5 text-amber-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                title="רענן הצעות"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingDishes ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Loading Animation */}
          {isLoadingDishes && (
            <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-3xl p-10 text-center space-y-4 backdrop-blur-xl">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
                <ChefHat className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-xl font-bold text-white">
                השף של המקרר החכם מרכיב 3 הצעות מנצחות...
              </h3>
              <p className="text-xs sm:text-sm text-amber-200/80 max-w-md mx-auto">
                בוחן את המצרכים שהזנת, את מספר הסועדים ואת סגנון הארוחה כדי להציע מתכונים מותאמים ללא בזבוז מזון.
              </p>
            </div>
          )}

          {/* 3 Visual Dish Cards */}
          {!isLoadingDishes && (
            <div className="space-y-4">
              <div className="text-center sm:text-right space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>שלב 3 ו-4: בחר את המנה שמתחשק לך להכין</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  3 אפשרויות שונות מהמקרר שלך
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  לחץ על אחת הכרטיסיות כדי להיכנס לחדר הבישול הייעודי עם המתכון המלא וליווי השף!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {dishOptions.map((dish, index) => {
                  const isSelected = selectedDish?.id === dish.id;
                  return (
                    <div
                      key={dish.id}
                      onClick={() => handleSelectDish(dish)}
                      className={`group relative bg-slate-900/90 border-2 rounded-3xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between gap-5 cursor-pointer shadow-xl hover:-translate-y-1.5 ${
                        isSelected
                          ? 'border-amber-400 bg-slate-900 shadow-amber-500/20 ring-2 ring-amber-400/40'
                          : 'border-slate-800 hover:border-amber-500/60 hover:shadow-amber-500/15'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {dish.style}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{dish.prepTime}</span>
                          </div>
                        </div>

                        {/* Dish Name */}
                        <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-300 transition-colors leading-snug">
                          {dish.name}
                        </h3>

                        {/* Description */}
                        {dish.description && (
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {dish.description}
                          </p>
                        )}
                      </div>

                      {/* Select Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectDish(dish);
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-slate-950 group-hover:bg-amber-500 text-slate-200 group-hover:text-slate-950 border border-slate-800 group-hover:border-amber-400 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <ChefHat className="w-4 h-4" />
                        <span>בחר מנה זו ויאללה נבשל</span>
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: חדר בישול ייעודי (Dedicated Cooking Session) */}
      {/* ========================================================================= */}
      {currentStep === 5 && cookingSession && (
        <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-3xl shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col h-[750px] max-h-[85vh] overflow-hidden animate-fade-in">
          {/* Dedicated Session Header */}
          <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-extrabold uppercase text-amber-400 tracking-wider">
                  חדר בישול ייעודי • המקרר החכם
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {cookingSession.selectedDish.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg text-amber-300 font-semibold">
                  {cookingSession.diners} סועדים
                </span>
                <span>•</span>
                <span>{cookingSession.selectedDish.style}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  {cookingSession.selectedDish.prepTime}
                </span>
              </div>
            </div>

            {/* Session Action Buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={handleSaveRecipeToNotes}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-amber-300 transition-colors cursor-pointer"
                title="שמור מתכון בספר המתכונים והרשימות"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>שמור מתכון</span>
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-colors cursor-pointer"
                title="התחל ארוחה חדשה מהמקרר"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ארוחה חדשה מהמקרר</span>
              </button>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 leading-relaxed">
            {cookingSession.chatMessages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || idx}
                  className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-md ${
                      isUser
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-gradient-to-br from-amber-600 to-amber-800 text-white border border-amber-500/40'
                    }`}
                  >
                    {isUser ? 'אני' : <ChefHat className="w-4 h-4" />}
                  </div>

                  {/* Bubble Content */}
                  <div
                    className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 sm:p-5 shadow-lg space-y-2 ${
                      isUser
                        ? 'bg-amber-500 text-slate-950 font-medium'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-100'
                    }`}
                  >
                    <MarkdownContent content={msg.content} isUser={isUser} />
                    <div className="flex items-center justify-end gap-2 pt-1 text-[10px] opacity-60">
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {isSendingMessage && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-700 text-white flex items-center justify-center shrink-0">
                  <ChefHat className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-amber-300 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span>השף של המקרר החכם מכין תשובה מדויקת למנה שלך...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Chips tailored to current dish */}
          <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">שאלות מומלצות:</span>
            {[
              'במה אפשר להחליף את הבצל?',
              'כמה זמן בדיוק על האש / בתנור?',
              'איך לתבל בלי שיהיה חריף?',
              'איזה תוספת מתאימה ליד?',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendDedicatedMessage(chip)}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-800 transition-colors cursor-pointer text-[11px]"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Footer Form */}
          <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendDedicatedMessage();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={`שאל את השף כל שאלה על הכנת ${cookingSession.selectedDish.name}...`}
                  disabled={isSendingMessage}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-2xl py-3 px-4 pl-12 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />

                {/* Speech Dictation Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                  }`}
                  title={isListening ? 'הקשבה פעילה (לחץ לעצירה)' : 'דבר אל השף במיקרופון'}
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingMessage}
                className="p-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                title="שלח הודעה לשף"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
