import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { 
  ChatMessage, 
  ChatSession,
  AppUser,
  PersonalGeminiConfig, 
  GroceryItem, 
  IProduct, 
  IPrice, 
  Note, 
  Task,
  AppCartItemSummary,
  AppContextData,
  UserProfileContext
} from '../types';
import { sendChatMessage, streamChatMessage } from '../services/aiService';
import { speakText, stopSpeaking, getSpeechRecognition, createSpeechStreamer, SpeechStreamer } from '../utils/speech';
import { VoiceChatModal } from './VoiceChatModal';
import { GeminiConnectModal } from './GeminiConnectModal';
import { ShoppingListImportModal } from './ShoppingListImportModal';
import { 
  extractShoppingItemsFromText, 
  convertExtractedToGroceryItems 
} from '../utils/shoppingListExtractor';
import { 
  detectRecipeFromText, 
  isRecipeAlreadySaved, 
  ExtractedRecipe 
} from '../utils/recipeExtractor';
import { MarkdownContent } from './MarkdownContent';
import { 
  Send, Bot, User as UserIcon, Trash2, Sparkles, Copy, Check, Download, 
  Utensils, Wine, Cake, Settings, X, Mic, MicOff, Volume2, VolumeX, 
  Radio, Key, Cpu, ShieldCheck, ShoppingCart, DollarSign, Heart, 
  ChefHat, Layers, ArrowRight, Tag, HelpCircle, PlusCircle, BookOpen, 
  BookmarkPlus, BookmarkCheck, Plus, History, MessageSquare, Edit3, 
  Search, PanelRightClose, PanelRight, Square
} from 'lucide-react';

export const WELCOME_MESSAGE_CONTENT = `שלום וברוכים הבאים לשף של PriceWise! 🍳🍷
אני העוזר הקולינרי האישי שלך. אני כבר מכיר את הטעם שלך, רואה מה יש לך בסל, ומחובר למחירי הרשתות. אז מה מתחשק לך לבשל היום?`;

interface ChatStudioProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUser?: AppUser | User | null;
  groceryItems?: GroceryItem[];
  products?: IProduct[];
  prices?: IPrice[];
  notes?: Note[];
  tasks?: Task[];
  budgetLimit?: number | null;
  onAddItemsToCart?: (items: GroceryItem[], replace?: boolean, navigateToComparison?: boolean) => void;
  onNavigateToComparison?: () => void;
  onSaveNote?: (note: Note) => void;
  onNavigateToNotes?: (noteId?: string) => void;
}

export const ChatStudio: React.FC<ChatStudioProps> = ({ 
  initialPrompt, 
  onClearInitialPrompt, 
  showToast,
  currentUser,
  groceryItems = [],
  products = [],
  prices = [],
  notes = [],
  tasks = [],
  budgetLimit = null,
  onAddItemsToCart,
  onNavigateToComparison,
  onSaveNote,
  onNavigateToNotes,
}) => {
  // Modal state for shopping list import into PriceWise
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [itemsToImport, setItemsToImport] = useState<GroceryItem[]>([]);
  const [savedRecipeMsgIds, setSavedRecipeMsgIds] = useState<Set<string>>(new Set());
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  // Application cart and store prices summary
  const cartSummary = useMemo(() => {
    const items = groceryItems || [];
    const count = items.length;
    let total = 0;
    const storeTotals: Record<string, number> = {};

    const itemsList: AppCartItemSummary[] = items.map((item) => {
      const pricesMap = item.prices || {};
      const pricesArr = (Object.values(pricesMap) as number[]).filter((p): p is number => typeof p === 'number');
      const minPrice = pricesArr.length > 0 ? Math.min(...pricesArr) : undefined;
      const bestStore = item.prices ? Object.entries(item.prices).find(([, p]) => p === minPrice)?.[0] : undefined;
      if (minPrice !== undefined) {
        total += minPrice * item.quantity;
      }
      Object.entries(pricesMap).forEach(([store, p]) => {
        if (typeof p === 'number') {
          storeTotals[store] = (storeTotals[store] || 0) + p * item.quantity;
        }
      });
      return {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit || 'יח\'',
        cheapestPrice: minPrice,
        cheapestStore: bestStore,
        allPrices: item.prices,
      };
    });

    let bestStoreForCart: string | undefined = undefined;
    let lowestTotal: number | undefined = undefined;
    Object.entries(storeTotals).forEach(([store, t]) => {
      if (lowestTotal === undefined || t < lowestTotal) {
        lowestTotal = t;
        bestStoreForCart = store;
      }
    });

    return {
      count,
      total,
      bestStoreForCart,
      itemsList,
    };
  }, [groceryItems]);

  // Multiple Chat Sessions State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const savedSessions = localStorage.getItem('cw_chat_sessions');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
    // Migration from legacy cw_chat_history if present
    const legacyHistory = localStorage.getItem('cw_chat_history');
    let initialMsgs: ChatMessage[] = [
      {
        id: 'msg-welcome',
        role: 'model',
        content: WELCOME_MESSAGE_CONTENT,
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    if (legacyHistory) {
      try {
        const parsed = JSON.parse(legacyHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          initialMsgs = parsed.map((m) =>
            m.id === 'msg-welcome' || m.content.includes('שלום וברוכים הבאים')
              ? { ...m, content: WELCOME_MESSAGE_CONTENT }
              : m
          );
        }
      } catch {}
    }

    const defaultSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'שיחה חדשה עם השף',
      messages: initialMsgs,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category: 'general',
    };
    return [defaultSession];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedActiveId = localStorage.getItem('cw_active_session_id');
    return savedActiveId || '';
  });

  // Ensure activeSessionId points to a valid session
  useEffect(() => {
    if (sessions.length > 0 && (!activeSessionId || !sessions.some((s) => s.id === activeSessionId))) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // UI state for Multiple Sessions Drawer / Sidebar
  const [isSessionsSidebarOpen, setIsSessionsSidebarOpen] = useState(false);
  const [sessionSearchQuery, setSessionSearchQuery] = useState('');
  const [sessionCategoryFilter, setSessionCategoryFilter] = useState<'all' | 'general' | 'smart_fridge' | 'recipe'>('all');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const deletedSessionIdsRef = useRef<Set<string>>(new Set());

  // Save sessions to localStorage & sync with backend SQLite
  useEffect(() => {
    localStorage.setItem('cw_chat_sessions', JSON.stringify(sessions));
    // Background sync to SQLite so backend has chat records
    if (sessions.length > 0) {
      sessions.forEach((s) => {
        // Skip sessions that were deleted
        if (deletedSessionIdsRef.current.has(s.id)) return;
        fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: s }),
        }).catch((err) => {
          console.debug('[ChatStudio] Sync to SQLite notice:', err);
        });
      });
    }
  }, [sessions]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('cw_active_session_id', activeSessionId);
    }
  }, [activeSessionId]);

  // Resolved active session
  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) || sessions[0] || {
      id: 'session-fallback',
      title: 'שיחה חדשה עם השף',
      messages: [
        {
          id: 'msg-welcome',
          role: 'model',
          content: WELCOME_MESSAGE_CONTENT,
          timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category: 'general',
    };
  }, [sessions, activeSessionId]);

  const messages = activeSession.messages;

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState(false);

  // Personal Gemini Configuration State
  const [geminiConfig, setGeminiConfig] = useState<PersonalGeminiConfig>(() => {
    const saved = localStorage.getItem('cw_personal_gemini_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      apiKey: '',
      isEnabled: false,
      selectedModel: 'gemini-3.7-flash',
      temperature: 0.7,
      dietaryPreference: 'ללא הגבלה',
      kosherPreference: 'לא מוגדר',
      culinaryStyle: 'ים-תיכוני ישראלי מודרני',
      personalNotes: '',
    };
  });

  // Speech & Voice States
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [autoReadAloud, setAutoReadAloud] = useState<boolean>(() => {
    return localStorage.getItem('cw_auto_read_aloud') === 'true';
  });
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const dictationRecognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    localStorage.setItem('cw_personal_gemini_config', JSON.stringify(geminiConfig));
  }, [geminiConfig]);

  useEffect(() => {
    localStorage.setItem('cw_auto_read_aloud', String(autoReadAloud));
  }, [autoReadAloud]);

  // Create a brand new isolated chat session
  const handleCreateNewSession = (
    category: 'general' | 'smart_fridge' | 'recipe' | 'budget' = 'general',
    customTitle?: string
  ) => {
    stopSpeaking();
    setSpeakingMsgId(null);
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: customTitle || (category === 'smart_fridge' ? '❄️ מקרר חכם' : 'שיחה חדשה עם השף'),
      messages: [
        {
          id: 'msg-welcome',
          role: 'model',
          content: WELCOME_MESSAGE_CONTENT,
          timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    if (window.innerWidth < 1024) {
      setIsSessionsSidebarOpen(false);
    }
    showToast?.('נפתחה שיחה חדשה!', 'info');
    return newId;
  };

  const handleSwitchSession = (sessionId: string) => {
    stopSpeaking();
    setSpeakingMsgId(null);
    setActiveSessionId(sessionId);
    if (window.innerWidth < 1024) {
      setIsSessionsSidebarOpen(false);
    }
  };

  const handleDeleteSession = async (sessionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 1. Validate that chatId is valid and not undefined, null, or empty string
    if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '' || sessionId === 'undefined' || sessionId === 'null') {
      console.error('[ChatStudio Delete] Invalid or undefined chatId received:', sessionId);
      showToast?.('שגיאה: מזהה השיחה אינו תקין או חסר', 'error');
      return;
    }

    const targetChatId = sessionId.trim();
    stopSpeaking();
    setSpeakingMsgId(null);

    // Track as deleted so background sync will never re-post it
    deletedSessionIdsRef.current.add(targetChatId);

    try {
      console.log(`[ChatStudio Delete] Sending DELETE request for chatId "${targetChatId}" to /api/chats/${encodeURIComponent(targetChatId)}...`);
      
      // 2. Call Node.js backend DELETE endpoint with exact chatId
      const response = await fetch(`/api/chats/${encodeURIComponent(targetChatId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        const errorMsg = data.error || `HTTP ${response.status}: שגיאה במחיקת השיחה בשרת`;
        throw new Error(errorMsg);
      }

      console.log(`[ChatStudio Delete] Successfully deleted chat "${targetChatId}" from backend SQLite:`, data);

      // 3. Immediately update local State with filter so it disappears from UI without page reload
      setSessions((prevSessions) => {
        const remaining = prevSessions.filter((s) => s.id !== targetChatId);

        // If no sessions remain, generate a clean default session
        if (remaining.length === 0) {
          const freshId = `session-${Date.now()}`;
          const freshSession: ChatSession = {
            id: freshId,
            title: 'שיחה חדשה עם השף',
            messages: [
              {
                id: 'msg-welcome',
                role: 'model',
                content: WELCOME_MESSAGE_CONTENT,
                timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
              },
            ],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            category: 'general',
          };
          setActiveSessionId(freshId);
          try {
            localStorage.setItem('cw_chat_sessions', JSON.stringify([freshSession]));
            localStorage.setItem('cw_active_session_id', freshId);
          } catch (storageErr) {
            console.warn('[ChatStudio Delete] LocalStorage update notice:', storageErr);
          }
          return [freshSession];
        }

        // If active session was deleted, switch to the first remaining session
        if (activeSessionId === targetChatId) {
          const nextActiveId = remaining[0].id;
          setActiveSessionId(nextActiveId);
          try {
            localStorage.setItem('cw_active_session_id', nextActiveId);
          } catch {}
        }

        try {
          localStorage.setItem('cw_chat_sessions', JSON.stringify(remaining));
        } catch (storageErr) {
          console.warn('[ChatStudio Delete] LocalStorage update notice:', storageErr);
        }
        return remaining;
      });

      showToast?.('השיחה נמחקה בהצלחה!', 'info');
    } catch (err: any) {
      // Print full error to console for easy debugging
      console.error(`[ChatStudio Delete Error] Failed to delete session "${targetChatId}":`, err);
      // Display toast notification to user
      showToast?.(`שגיאה במחיקת השיחה: ${err?.message || 'אנא נסה שוב'}`, 'error');
    }
  };

  const handleStartRenameSession = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRenameSession = (sessionId: string) => {
    if (!editingSessionId) return;
    const trimmed = editingTitle.trim();
    if (trimmed) {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: trimmed } : s))
      );
    }
    setEditingSessionId(null);
  };

  const handleClearCurrentSession = () => {
    stopSpeaking();
    setSpeakingMsgId(null);
    const resetMsg: ChatMessage[] = [
      {
        id: 'msg-welcome',
        role: 'model',
        content: WELCOME_MESSAGE_CONTENT,
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: resetMsg, updatedAt: Date.now() }
          : s
      )
    );
    showToast?.('הודעות השיחה אופסו בהצלחה', 'info');
  };

  const handleClearAllSessions = async () => {
    stopSpeaking();
    setSpeakingMsgId(null);

    try {
      console.log('[ChatStudio ClearAll] Sending DELETE request to /api/chats...');
      const response = await fetch('/api/chats', { method: 'DELETE' });
      const resData = await response.json().catch(() => ({}));
      if (!response.ok || resData.success === false) {
        throw new Error(resData.error || 'שגיאה במחיקת כל השיחות בשרת');
      }
      console.log('[ChatStudio ClearAll] Successfully cleared all chats from SQLite:', resData);

      const freshId = `session-${Date.now()}`;
      const freshSession: ChatSession = {
        id: freshId,
        title: 'שיחה חדשה עם השף',
        messages: [
          {
            id: 'msg-welcome',
            role: 'model',
            content: WELCOME_MESSAGE_CONTENT,
            timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        category: 'general',
      };
      setSessions([freshSession]);
      setActiveSessionId(freshId);
      localStorage.removeItem('cw_chat_history');
      localStorage.setItem('cw_chat_sessions', JSON.stringify([freshSession]));
      localStorage.setItem('cw_active_session_id', freshId);
      showToast?.('כל השיחות נוקו ונפתחה שיחה חדשה', 'info');
    } catch (err: any) {
      console.error('[ChatStudio ClearAll Error]:', err);
      showToast?.(`שגיאה באיפוס השיחות: ${err?.message || 'אנא נסה שוב'}`, 'error');
    }
  };

  const filteredSessions = useMemo(() => {
    let list = sessions;
    if (sessionCategoryFilter !== 'all') {
      list = list.filter((s) => (s.category || 'general') === sessionCategoryFilter);
    }
    if (!sessionSearchQuery.trim()) return list;
    const q = sessionSearchQuery.toLowerCase();
    return list.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      s.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [sessions, sessionSearchQuery, sessionCategoryFilter]);

  const formatSessionDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `היום, ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffHours < 48 && date.getDate() === now.getDate() - 1) {
      return 'אתמול';
    }
    return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  };

  useEffect(() => {
    if (initialPrompt) {
      if (onClearInitialPrompt) onClearInitialPrompt();

      // Check if prompt is from smart fridge or cooking flow
      const isFridgeContext = 
        initialPrompt.includes('מקרר') || 
        initialPrompt.includes('מצרכים') || 
        initialPrompt.includes('סל הקניות') ||
        initialPrompt.includes('מנה מהמקרר') ||
        initialPrompt.length > 50;

      const currentHasUserMessages = (activeSession?.messages || []).some((m) => m.role === 'user');

      let targetId = activeSessionId;

      if (currentHasUserMessages || isFridgeContext) {
        // Create an isolated session so smart fridge context doesn't mix with other topics!
        const fridgeTitle = isFridgeContext ? '❄️ מקרר חכם: הכנת מנה' : 'שיחה חדשה';
        const newSessionId = `session-${Date.now()}`;
        const newSession: ChatSession = {
          id: newSessionId,
          title: fridgeTitle,
          messages: [
            {
              id: 'msg-welcome',
              role: 'model',
              content: WELCOME_MESSAGE_CONTENT,
              timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          category: isFridgeContext ? 'smart_fridge' : 'general',
        };

        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSessionId);
        targetId = newSessionId;
      }

      handleSend(initialPrompt, targetId);
    }
  }, [initialPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Unified User Profile Context
  const userProfile: UserProfileContext = useMemo(() => ({
    name: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'שף',
    email: currentUser?.email || undefined,
    isLoggedIn: !!currentUser,
    dietary: geminiConfig.dietaryPreference,
    kosher: geminiConfig.kosherPreference,
    culinaryStyle: geminiConfig.culinaryStyle,
    notes: geminiConfig.personalNotes,
  }), [currentUser, geminiConfig]);

  // Unified Application Context
  const appContext: AppContextData = useMemo(() => ({
    cartItems: cartSummary.itemsList,
    cartTotal: cartSummary.total,
    bestStoreForCart: cartSummary.bestStoreForCart,
    budgetLimit: budgetLimit ?? null,
    groceryItemsCount: cartSummary.count,
    notes: (notes || []).slice(0, 5).map((n) => ({ title: n.title, content: n.content })),
    tasks: (tasks || []).slice(0, 5).map((t) => ({ title: t.title, status: t.status, priority: t.priority })),
    totalProductsInDb: products?.length || 12000,
  }), [cartSummary, budgetLimit, notes, tasks, products]);

  const handleSend = async (overrideText?: string, specificSessionId?: string) => {
    const rawText = overrideText || inputMessage;
    if (!rawText.trim() || isLoading) return;

    const userText = rawText.trim();
    if (!overrideText) {
      setInputMessage('');
    }
    if (isDictating && dictationRecognitionRef.current) {
      try {
        dictationRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsDictating(false);
    }

    const targetSessionId = specificSessionId || activeSessionId;
    const targetSession = sessions.find((s) => s.id === targetSessionId) || activeSession;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    };

    const modelMsgId = `model-${Date.now() + 1}`;
    const initialModelMsg: ChatMessage = {
      id: modelMsgId,
      role: 'model',
      content: '',
      timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== targetSessionId) return s;
        const isDefaultTitle = s.title === 'שיחה חדשה עם השף' || s.title === 'שיחה חדשה';
        const newTitle = isDefaultTitle
          ? (userText.length > 28 ? userText.slice(0, 28) + '...' : userText)
          : s.title;
        return {
          ...s,
          title: newTitle,
          updatedAt: Date.now(),
          messages: [...s.messages, userMsg, initialModelMsg],
        };
      })
    );
    setIsLoading(true);

    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    activeAbortControllerRef.current = abortController;

    let chatSpeechStreamer: SpeechStreamer | null = null;
    if (autoReadAloud) {
      setSpeakingMsgId(modelMsgId);
      chatSpeechStreamer = createSpeechStreamer({
        onStart: () => setSpeakingMsgId(modelMsgId),
        onEnd: () => setSpeakingMsgId(null),
        onError: () => setSpeakingMsgId(null),
      });
    }

    try {
      const history = (targetSession.messages || [])
        .filter((m) => m.id !== 'msg-welcome' && m.content)
        .map((m) => ({ role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model', content: m.content }));

      await streamChatMessage(
        {
          message: userText,
          history,
          userApiKey: (geminiConfig.isEnabled && geminiConfig.apiKey) ? geminiConfig.apiKey : undefined,
          model: geminiConfig.selectedModel,
          temperature: geminiConfig.temperature,
          userProfile,
          personalProfile: {
            dietary: geminiConfig.dietaryPreference,
            kosher: geminiConfig.kosherPreference,
            culinaryStyle: geminiConfig.culinaryStyle,
            notes: geminiConfig.personalNotes,
          },
          appContext,
        },
        (deltaChunk, accumulated) => {
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== targetSessionId) return s;
              return {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === modelMsgId ? { ...m, content: accumulated, isStreaming: true } : m
                ),
              };
            })
          );
          if (chatSpeechStreamer) {
            chatSpeechStreamer.feedChunk(deltaChunk);
          }
        },
        (finalText) => {
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== targetSessionId) return s;
              return {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) =>
                  m.id === modelMsgId ? { ...m, content: finalText, isStreaming: false } : m
                ),
              };
            })
          );
          if (chatSpeechStreamer) {
            chatSpeechStreamer.finish();
          }
        },
        (err) => {
          console.error('[ChatStudio stream error callback]', err);
          const errorMsg = err.message || 'מצטער, חלה שגיאה בחיבור לשרת. אנא נסה שוב.';
          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== targetSessionId) return s;
              return {
                ...s,
                updatedAt: Date.now(),
                messages: s.messages.map((m) =>
                  m.id === modelMsgId
                    ? {
                        ...m,
                        content: `⚠️ ${errorMsg}`,
                        isStreaming: false,
                      }
                    : m
                ),
              };
            })
          );
          if (chatSpeechStreamer) {
            chatSpeechStreamer.cancel();
          }
          setSpeakingMsgId(null);
          setIsLoading(false);
        },
        abortController.signal
      );
    } catch (err: any) {
      console.error('[ChatStudio send message catch]', err);
      const errorMsg = err?.message || 'מצטער, חלה שגיאה בחיבור לשרת. אנא נסה שוב.';
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== targetSessionId) return s;
          return {
            ...s,
            updatedAt: Date.now(),
            messages: s.messages.map((m) =>
              m.id === modelMsgId
                ? {
                    ...m,
                    content: `⚠️ ${errorMsg}`,
                    isStreaming: false,
                  }
                : m
            ),
          };
        })
      );
      if (chatSpeechStreamer) {
        chatSpeechStreamer.cancel();
      }
      setSpeakingMsgId(null);
    } finally {
      setIsLoading(false);
      activeAbortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (activeAbortControllerRef.current) {
      activeAbortControllerRef.current.abort();
      activeAbortControllerRef.current = null;
    }
    setIsLoading(false);
    setSpeakingMsgId(null);
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        messages: s.messages.map((m) =>
          m.isStreaming
            ? {
                ...m,
                isStreaming: false,
                content: m.content || '⚠️ יצירת התשובה הופסקה על פי בקשתך.',
              }
            : m
        ),
      }))
    );
  };

  const toggleDictation = () => {
    if (isDictating) {
      if (dictationRecognitionRef.current) {
        try {
          dictationRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsDictating(false);
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) {
      alert('זיהוי דיבור קולי אינו נתמך בדפדפן זה. מומלץ להשתמש ב-Chrome או Edge.');
      return;
    }

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'he-IL';

    recognition.onstart = () => {
      setIsDictating(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) {
        setInputMessage((prev) => (prev ? `${prev} ${finalTranscript}` : finalTranscript));
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Dictation error:', event.error);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    dictationRecognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsDictating(false);
    }
  };

  const handleToggleSpeakMessage = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      stopSpeaking();
      setSpeakingMsgId(null);
    } else {
      stopSpeaking();
      setSpeakingMsgId(msgId);
      speakText(
        text,
        () => setSpeakingMsgId(msgId),
        () => setSpeakingMsgId(null),
        () => setSpeakingMsgId(null)
      );
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    stopSpeaking();
    setSpeakingMsgId(null);
    const resetMsg: ChatMessage[] = [
      {
        id: 'msg-welcome',
        role: 'model',
        content: WELCOME_MESSAGE_CONTENT,
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: resetMsg, updatedAt: Date.now() }
          : s
      )
    );
    localStorage.removeItem('cw_chat_history');
    showToast?.('היסטוריית ההודעות בשיחה נוקתה', 'info');
  };

  const handleExportHistory = () => {
    const userLabel = currentUser?.displayName || 'אורח';
    const text = messages
      .map((m) => `[${m.timestamp}] ${m.role === 'user' ? userLabel : 'השף של PriceWise'}:\n${m.content}\n`)
      .join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${activeSession.title.replace(/[\s/\\?%*:|"<>]/g, '_')}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handlers for integrating shopping list directly from chat to PriceWise comparison
  const handleOpenImportModal = (text: string) => {
    const extracted = extractShoppingItemsFromText(text);
    if (extracted.length === 0) {
      showToast?.('לא זוהתה רשימת מצרכים ברורה בהודעה זו. נסה לבקש מהשף רשימת קניות עם כמויות.', 'info');
      return;
    }
    const groceryList = convertExtractedToGroceryItems(extracted);
    setItemsToImport(groceryList);
    setIsImportModalOpen(true);
  };

  const handleDirectImportToComparison = (text: string, navigate: boolean = true) => {
    const extracted = extractShoppingItemsFromText(text);
    if (extracted.length === 0) {
      showToast?.('לא זוהתה רשימת מצרכים ברורה בהודעה זו', 'info');
      return;
    }
    const groceryList = convertExtractedToGroceryItems(extracted);
    if (onAddItemsToCart) {
      onAddItemsToCart(groceryList, false, navigate);
    }
  };

  const handleConfirmImport = (
    items: GroceryItem[],
    replaceCart: boolean,
    navigateToPricewise: boolean
  ) => {
    if (onAddItemsToCart) {
      onAddItemsToCart(items, replaceCart, navigateToPricewise);
    }
  };

  // Handler for saving a chef recipe directly into the recipes list (NotesStudio)
  const handleSaveRecipeToNotes = (
    msg: ChatMessage,
    recipe: ExtractedRecipe,
    navigateToNotes: boolean = false
  ) => {
    const newNote: Note = {
      id: `recipe-${Date.now()}`,
      title: recipe.title,
      content: recipe.formattedContent,
      tags: recipe.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: true,
    };

    if (onSaveNote) {
      onSaveNote(newNote);
    }

    setSavedRecipeMsgIds((prev) => new Set(prev).add(msg.id));

    if (showToast) {
      showToast(`המתכון "${recipe.title}" הועבר בהצלחה לרשימת המתכונים!`, 'success');
    }

    if (navigateToNotes && onNavigateToNotes) {
      onNavigateToNotes(newNote.id);
    }
  };

  const quickPromptChips = [
    {
      id: 'cart-recipes',
      label: '🍲 מה לבשל מהסל שלי?',
      prompt: cartSummary.count > 0
        ? `מה אפשר לבשל עם המצרכים שיש לי בסל הקניות באפליקציה (${cartSummary.count} מוצרים)? הצע לי 2-3 רעיונות קלים ומדויקים.`
        : `מה אפשר לבשל עם מה שיש לי במקרר ובבית? שאל אותי 1-2 שאלות מנחות ונרכיב יחד מתכון מעולה.`,
    },
    {
      id: 'build-menu',
      label: '📋 בנה לי תפריט',
      prompt: 'בנה לי תפריט ארוחה שלמה המתאים בדיוק לפרופיל שלי, כולל מנה עיקרית, תוספת והמלצה קולינרית.',
    },
    {
      id: 'price-comparison',
      label: '💰 השוואת מחירים למתכון',
      prompt: 'אני רוצה להשוות מחירים למצרכים של מתכון שף בין רשתות השיווק. רשום לי רשימת מצרכים ברורה להשוואה.',
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto p-2 sm:p-4">
      {/* Clean Minimalist Top Bar with New Chat & Sessions Toggle */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border border-amber-500/20 rounded-2xl shadow-xl backdrop-blur-xl mb-3 text-slate-100">
        {/* Right: Clean Title, Active Session Badge, Connection Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
            <ChefHat className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-black tracking-tight text-white shrink-0">השף של PriceWise</span>
            <span 
              className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0"
              title="סטטוס חיבור: פעיל ומחובר"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>מחובר</span>
            </span>

            {/* Current Active Session Pill & Quick Delete */}
            <div className="hidden md:flex items-center gap-1 bg-slate-950/60 border border-slate-800 hover:border-amber-500/30 rounded-lg p-0.5 transition-colors">
              <button
                type="button"
                onClick={() => setIsSessionsSidebarOpen(!isSessionsSidebarOpen)}
                className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-800/80 rounded-md text-xs text-amber-200/90 cursor-pointer transition-all max-w-[180px] truncate"
                title="לחץ לצפייה והחלפת שיחות"
              >
                <span>{activeSession.category === 'smart_fridge' ? '❄️' : activeSession.category === 'recipe' ? '🍲' : '💬'}</span>
                <span className="truncate font-medium">{activeSession.title}</span>
              </button>
              <button
                type="button"
                id="btn-delete-active-session"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (activeSession && activeSession.id) {
                    handleDeleteSession(activeSession.id, e);
                  } else {
                    console.error('[ChatStudio UI] Delete active clicked without valid id:', activeSession);
                    showToast?.('שגיאה: מזהה שיחה לא תקין', 'error');
                  }
                }}
                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                title="מחק שיחה זו לצמיתות"
                aria-label={`מחק שיחה ${activeSession.title}`}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Left: Prominent "שיחה חדשה" (New Chat) button + History + Voice + Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Prominent New Chat Button (כפתור שיחה חדשה בולט) */}
          <button
            type="button"
            id="btn-chat-new-session"
            onClick={() => handleCreateNewSession('general')}
            title="פתח שיחה חדשה ונקייה (State נפרד לחלוטין)"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>שיחה חדשה</span>
          </button>

          {/* Sessions List / History Sidebar Toggle */}
          <button
            type="button"
            id="btn-chat-toggle-sessions"
            onClick={() => setIsSessionsSidebarOpen(!isSessionsSidebarOpen)}
            title="היסטוריית שיחות קודמות"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isSessionsSidebarOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-inner'
                : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 hover:border-amber-500/40 text-slate-200 hover:text-amber-300'
            }`}
          >
            <History className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">שיחות</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 border border-slate-700 font-mono">
              {sessions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            title="שיחה קולית רציפה עם השף"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Radio className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden lg:inline">שיחה קולית</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsDrawerOpen(true)}
            title="הגדרות צ'אט וכלים"
            className="p-2 text-slate-300 hover:text-amber-300 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 rounded-xl transition-all cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sessions Sidebar / Drawer & Main Chat Body */}
      <div className="flex-1 flex gap-3 min-h-0 relative mb-3 overflow-hidden">
        {/* Sessions Sidebar: Desktop panel or Mobile sliding overlay */}
        {isSessionsSidebarOpen && (
          <>
            {/* Mobile backdrop overlay */}
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsSessionsSidebarOpen(false)}
            />

            {/* Sidebar Container */}
            <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] lg:static lg:z-auto lg:w-72 sm:lg:w-80 shrink-0 bg-slate-900/95 lg:bg-slate-900/80 border-l lg:border border-slate-800/90 rounded-none lg:rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl flex flex-col h-full text-slate-100">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">היסטוריית שיחות</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                    {sessions.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSessionsSidebarOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="סגור תפריט שיחות"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Action: New Chat button inside sidebar */}
              <button
                type="button"
                onClick={() => handleCreateNewSession('general')}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
                <span>פתיחת שיחה חדשה</span>
              </button>

              {/* Search Bar */}
              <div className="mt-2.5 relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={sessionSearchQuery}
                  onChange={(e) => setSessionSearchQuery(e.target.value)}
                  placeholder="חפש שיחה או תוכן..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pr-8 pl-7 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                {sessionSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSessionSearchQuery('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 mt-2.5 pb-1 overflow-x-auto scrollbar-none text-[11px]">
                {[
                  { key: 'all', label: 'הכל' },
                  { key: 'smart_fridge', label: '❄️ מקרר' },
                  { key: 'recipe', label: '🍲 מתכונים' },
                  { key: 'general', label: '💬 כללי' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSessionCategoryFilter(tab.key as any)}
                    className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      sessionCategoryFilter === tab.key
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Sessions List */}
              <div className="flex-1 overflow-y-auto space-y-1.5 my-2.5 pr-0.5 scrollbar-thin">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    לא נמצאו שיחות תואמות
                  </div>
                ) : (
                  filteredSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const isEditing = editingSessionId === session.id;
                    const categoryEmoji =
                      session.category === 'smart_fridge' ? '❄️' : session.category === 'recipe' ? '🍲' : '💬';

                    return (
                      <div
                        key={session.id}
                        onClick={() => !isEditing && handleSwitchSession(session.id)}
                        className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-sm text-amber-100'
                            : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        {isEditing ? (
                          <div
                            className="flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRenameSession(session.id);
                                if (e.key === 'Escape') setEditingSessionId(null);
                              }}
                              autoFocus
                              className="flex-1 bg-slate-950 border border-amber-500/60 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRenameSession(session.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded"
                              title="שמור שם"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSessionId(null)}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                              title="בטל"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="text-xs shrink-0">{categoryEmoji}</span>
                                <span className="text-xs font-bold truncate">
                                  {session.title}
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => handleStartRenameSession(session, e)}
                                  className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 rounded transition-colors"
                                  title="שנה שם שיחה"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  id={`btn-delete-session-${session.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (session && session.id) {
                                      handleDeleteSession(session.id, e);
                                    } else {
                                      console.error('[ChatStudio UI] Delete clicked without valid session.id:', session);
                                      showToast?.('שגיאה: מזהה שיחה לא תקין', 'error');
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded transition-colors cursor-pointer relative z-10"
                                  title="מחק שיחה לצמיתות"
                                  aria-label={`מחק שיחה ${session.title}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-500">
                              <span>{formatSessionDate(session.updatedAt)}</span>
                              <span className="px-1.5 py-0.2 bg-slate-900 rounded border border-slate-800 text-slate-400">
                                {session.messages.length} הודעות
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer: Clear All Sessions */}
              {sessions.length > 1 && (
                <div className="pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleClearAllSessions}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/30 text-rose-300 rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3 text-rose-400" />
                    <span>איפוס ומחיקת כל השיחות</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Main Chat Column */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Main Chat Stream Container */}
          <div className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-xl overflow-y-auto flex flex-col space-y-6 mb-2.5 text-slate-100">
            {messages.map((msg) => {
              const isModelResponse = msg.role === 'model' && msg.id !== 'msg-welcome' && !msg.isStreaming;
              const detectedRecipe = isModelResponse ? detectRecipeFromText(msg.content) : null;
              const detectedItems = isModelResponse ? extractShoppingItemsFromText(msg.content) : [];
              const isRecipeSaved = detectedRecipe 
                ? (savedRecipeMsgIds.has(msg.id) || isRecipeAlreadySaved(detectedRecipe.title, notes))
                : false;
              const isUser = msg.role === 'user';
              const userDisplayName = currentUser?.displayName || 'אורח';

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3.5 sm:gap-4 py-1.5 transition-colors ${
                    isUser ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  {/* Small Avatar: User on right (in RTL), AI on left (in RTL) */}
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs mt-0.5 overflow-hidden ${
                      isUser
                        ? 'bg-slate-800 text-slate-200 border border-slate-700/80 shadow-sm'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    }`}
                    title={isUser ? userDisplayName : 'השף של PriceWise'}
                  >
                    {isUser ? (
                      currentUser?.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* Message Body */}
                  <div className="flex-1 min-w-0 max-w-3xl">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-slate-300">
                        {isUser ? userDisplayName : 'השף של PriceWise'}
                      </span>
                      <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                    </div>

                {/* Clean text on background without heavy borders or box shadows */}
                <div className="text-[15px] sm:text-base leading-relaxed text-slate-100 font-normal">
                  {msg.isStreaming && !msg.content ? (
                    /* Immediate Typing Dots */
                    <div className="flex items-center gap-1.5 py-2.5 px-0.5 text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce" />
                    </div>
                  ) : (
                    <>
                      <MarkdownContent content={msg.content} isUser={isUser} />
                      {msg.isStreaming && (
                        <span className="inline-block w-1.5 h-4 bg-amber-400 ml-1 animate-pulse align-middle" />
                      )}
                    </>
                  )}
                </div>

                {/* Recipe Card (Clean & Muted) */}
                {!msg.isStreaming && detectedRecipe && (
                  <div className="mt-3 p-3 bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
                        <ChefHat className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-emerald-300">
                            השף מציע לשמור מתכון:
                          </span>
                          <span className="text-[11px] text-slate-300 font-medium truncate max-w-[220px]">
                            {detectedRecipe.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {isRecipeSaved ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>נשמר במתכונים</span>
                          </span>
                          {onNavigateToNotes && (
                            <button
                              type="button"
                              onClick={() => {
                                const existing = notes.find((n) => n.title.includes(detectedRecipe.title) || detectedRecipe.title.includes(n.title));
                                onNavigateToNotes(existing?.id);
                              }}
                              className="text-xs text-amber-300 hover:text-amber-200 underline cursor-pointer"
                            >
                              פתח מתכון ↗
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSaveRecipeToNotes(msg, detectedRecipe, false)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <BookmarkCheck className="h-3.5 w-3.5" />
                          <span>שמור במתכונים</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Shopping List Card (Clean & Muted) */}
                {!msg.isStreaming && detectedItems.length >= 2 && !detectedRecipe && (
                  <div className="mt-3 p-3 bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-amber-200">
                          זוהתה רשימת מצרכים ({detectedItems.length} פריטים)
                        </span>
                        <p className="text-[11px] text-slate-400 truncate max-w-md">
                          {detectedItems.slice(0, 3).map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(' • ')}
                          {detectedItems.length > 3 ? ` ועוד ${detectedItems.length - 3}...` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenImportModal(msg.content)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        סקור פריטים
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDirectImportToComparison(msg.content, true)}
                        className="px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        <span>שלב בהשוואה</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Minimalist Muted Icons Row (ChatGPT / Gemini style) */}
                {(!msg.isStreaming || msg.content) && (
                  <div className="flex items-center gap-1 mt-2.5 text-slate-400">
                    {/* Copy */}
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
                      title={copiedId === msg.id ? 'הועתק!' : 'העתק תוכן'}
                      aria-label="העתק"
                    >
                      {copiedId === msg.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {/* Read Aloud (TTS) */}
                    {msg.role === 'model' && msg.content && (
                      <button
                        type="button"
                        onClick={() => handleToggleSpeakMessage(msg.id, msg.content)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          speakingMsgId === msg.id
                            ? 'text-amber-400 bg-amber-500/15 animate-pulse'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`}
                        title={speakingMsgId === msg.id ? 'עצור הקראה' : 'הקרא בקול'}
                        aria-label="הקרא בקול"
                      >
                        {speakingMsgId === msg.id ? (
                          <VolumeX className="h-3.5 w-3.5" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}

                    {/* Add to comparison */}
                    <button
                      type="button"
                      onClick={() => handleOpenImportModal(msg.content)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-amber-300 hover:bg-slate-800/60 transition-colors cursor-pointer"
                      title="שלב מצרכים בהשוואת מחירים (PriceWise)"
                      aria-label="שלב בהשוואת מחירים"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                    </button>

                    {/* Save recipe */}
                    {detectedRecipe && (
                      <button
                        type="button"
                        onClick={() => handleSaveRecipeToNotes(msg, detectedRecipe, false)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          isRecipeSaved
                            ? 'text-emerald-400'
                            : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
                        }`}
                        title={isRecipeSaved ? 'המתכון שמור ברשימת המתכונים' : 'שמור מתכון בספר המתכונים'}
                        aria-label="שמור מתכון"
                      >
                        {isRecipeSaved ? (
                          <BookmarkCheck className="h-3.5 w-3.5" />
                        ) : (
                          <BookOpen className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && !messages.some((m) => m.isStreaming) && (
          <div className="flex items-start gap-3.5 sm:gap-4 py-1.5 flex-row-reverse">
            <div className="h-7 w-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1.5 py-2.5 px-0.5 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3 Quick Action Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-1 scrollbar-none">
        {quickPromptChips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => handleSend(chip.prompt)}
            disabled={isLoading}
            className="bg-slate-900/80 border border-slate-700/80 hover:border-amber-500/50 hover:bg-amber-500/10 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all shadow-md shrink-0 cursor-pointer disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Form Bar with Speech Recognition Microphone */}
      <div className="bg-slate-900/85 border border-amber-500/30 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          {/* Microphone Dictation Button */}
          <button
            type="button"
            onClick={toggleDictation}
            title={isDictating ? 'עצור הקלטת דיבור' : 'הקלט הודעה במיקרופון'}
            className={`p-2.5 rounded-xl border transition-all shrink-0 ${
              isDictating
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-500/30'
                : 'bg-slate-950/80 border-slate-800 text-amber-400 hover:text-amber-300 hover:border-amber-500/40'
            }`}
          >
            {isDictating ? <MicOff className="h-4 w-4 animate-bounce" /> : <Mic className="h-4 w-4" />}
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isDictating
                ? 'מקשיב לדיבורך בעברית...'
                : 'הקלד מצרך, בקש מתכון, או לחץ על המיקרופון...'
            }
            className={`flex-1 bg-slate-950/80 border rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
              isDictating ? 'border-rose-500/80 animate-pulse' : 'border-slate-800 focus:border-amber-500/60'
            }`}
          />

          {isLoading ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              title="עצור יצירת מענה"
              className="bg-rose-500/20 border border-rose-500/50 hover:bg-rose-500/30 text-rose-300 font-medium px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 text-xs sm:text-sm cursor-pointer shadow-lg shadow-rose-500/10"
            >
              <Square className="h-4 w-4 fill-rose-400" />
              <span>עצור</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 shrink-0 text-xs sm:text-sm cursor-pointer"
            >
              <span>שלח</span>
              <Send className="h-4 w-4 rotate-180" />
            </button>
          )}
        </form>
      </div>
        </div>
      </div>

      {/* Voice Chat Modal (Hands-Free Voice Mode) */}
      <VoiceChatModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        personaName="השף של PriceWise"
        geminiConfig={geminiConfig}
        userProfile={userProfile}
        appContext={appContext}
        historyMessages={messages
          .filter((m) => m.id !== 'msg-welcome')
          .map((m) => ({ role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model', content: m.content }))}
        onNewMessagePair={(userText, aiText) => {
          const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: userText,
            timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          };
          const modelMsg: ChatMessage = {
            id: `model-${Date.now() + 1}`,
            role: 'model',
            content: aiText,
            timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
          };
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? {
                    ...s,
                    updatedAt: Date.now(),
                    messages: [...s.messages, userMsg, modelMsg],
                  }
                : s
            )
          );
        }}
      />

      {/* Personal Gemini Connect & Settings Modal */}
      <GeminiConnectModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        config={geminiConfig}
        currentUser={currentUser}
        onSaveConfig={(newConfig) => {
          setGeminiConfig(newConfig);
        }}
        showToast={showToast}
      />

      {/* Direct Shopping List Import to PriceWise Comparison Modal */}
      <ShoppingListImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        initialItems={itemsToImport}
        onConfirmImport={handleConfirmImport}
        showToast={showToast}
      />

      {/* Chat Settings & Tools Drawer / Modal */}
      {isSettingsDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-slate-100 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">הגדרות צ'אט וכלים</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsDrawerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Profile & Google Connection Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-amber-500/40" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-white">
                      {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'משתמש אורח'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {currentUser ? 'מחובר עם חשבון Google' : 'העדפות תזונה וכשרות מקומיות'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsDrawerOpen(false);
                    setIsGeminiModalOpen(true);
                  }}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/60 bg-amber-500/10 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  ערוך פרופיל
                </button>
              </div>
            </div>

            {/* Actions List */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsDrawerOpen(false);
                  setItemsToImport([]);
                  setIsImportModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-2.5 bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 hover:text-amber-300 transition-all text-right cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-amber-400" />
                  <span>ייבוא מצרכים ישירות להשוואת מחירים</span>
                </div>
                <span className="text-slate-500">←</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextVal = !autoReadAloud;
                  setAutoReadAloud(nextVal);
                  if (!nextVal) stopSpeaking();
                }}
                className="w-full flex items-center justify-between p-2.5 bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 transition-all text-right cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {autoReadAloud ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
                  <span>הקראה קולית אוטומטית של תשובות</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  autoReadAloud ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {autoReadAloud ? 'פעיל' : 'כבוי'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSettingsDrawerOpen(false);
                  handleExportHistory();
                }}
                className="w-full flex items-center justify-between p-2.5 bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 hover:text-white transition-all text-right cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-amber-400" />
                  <span>ייצוא היסטוריית שיחה</span>
                </div>
                <span className="text-slate-500">הורד</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSettingsDrawerOpen(false);
                  if (activeSession && activeSession.id) {
                    handleDeleteSession(activeSession.id);
                  }
                }}
                className="w-full flex items-center justify-between p-2.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-200 transition-all text-right cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-rose-400" />
                  <span>מחיקת השיחה הנוכחית לצמיתות</span>
                </div>
                <span className="text-rose-400/80">מחק</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
