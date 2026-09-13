import { PersonaMode, PersonalGeminiConfig, UserProfileContext, AppContextData } from '../types';

export interface ChatRequestPayload {
  message: string;
  history?: { role: 'user' | 'model'; content: string }[];
  persona?: PersonaMode | string;
  systemInstruction?: string;
  temperature?: number;
  userApiKey?: string;
  model?: string;
  userProfile?: UserProfileContext;
  personalProfile?: {
    dietary?: string;
    kosher?: string;
    culinaryStyle?: string;
    notes?: string;
  };
  appContext?: AppContextData;
  isVoice?: boolean;
}

export async function testGeminiConnection(params: { apiKey?: string; model?: string }): Promise<{ success: boolean; message: string; model?: string; error?: string }> {
  try {
    const response = await fetch('/api/chat/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data.error || 'אימות החיבור נכשל. אנא ודא שהמפתח תקין.',
        error: data.error,
      };
    }

    return {
      success: true,
      message: data.message || 'החיבור ל-Gemini אומת בהצלחה!',
      model: data.model,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'שגיאת רשת בבדיקת חיבור ה-Gemini',
      error: String(err),
    };
  }
}

export const CHAT_STREAM_TIMEOUT_MS = 45000; // 45 seconds timeout for real supermarket MCP and Gemini streaming

/**
 * שליפת מחירי סופרמרקטים בישראל בזמן אמת משרת ה-API של PriceWise
 */
export async function getSupermarketPrices(itemName: string) {
  try {
    const response = await fetch(`https://pricewise-price-server.onrender.com/api/prices?item=${encodeURIComponent(itemName)}`, {
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error("Failed to fetch supermarket prices:", err);
    return { success: false, error: err.message };
  }
}

export async function checkServerGeminiEnv(): Promise<{ hasKey: boolean; defaultModel?: string }> {
  try {
    const res = await fetch('/api/chat/status');
    if (!res.ok) return { hasKey: false };
    const data = await res.json();
    return { hasKey: Boolean(data.hasApiKey), defaultModel: data.defaultModel };
  } catch (err) {
    console.warn('[Gemini ENV Check] Could not verify server status:', err);
    return { hasKey: false };
  }
}

export async function sendChatMessage(payload: ChatRequestPayload): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('TIMEOUT'));
  }, CHAT_STREAM_TIMEOUT_MS);

  try {
    if (!payload.userApiKey) {
      console.log('[Gemini Client Check] Sending chat message via server environment...');
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Request failed' }));
      const msg = errData.error || `Server responded with ${response.status}`;
      console.error('[Gemini API Error]', msg);
      throw new Error(msg);
    }

    const data = await response.json();
    return data.reply;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
    console.error('[Gemini Chat Error]', errorMessage);
    
    if (errorMessage.includes('TIMEOUT') || (err as any)?.name === 'AbortError') {
      throw new Error('פסק זמן בהתחברות לשרת (45 שניות ללא מענה). אנא נסה שוב.');
    }
    throw new Error(errorMessage || 'מצטער, חלה שגיאה בחיבור לשרת. אנא נסה שוב.');
  }
}

export async function streamChatMessage(
  payload: ChatRequestPayload,
  onChunk: (delta: string, accumulated: string) => void,
  onDone: (accumulated: string) => void,
  onError: (err: Error) => void,
  externalSignal?: AbortSignal
): Promise<void> {
  const internalController = new AbortController();
  let hasReceivedFirstChunk = false;
  let isDone = false;

  // Link external abort signal if provided
  if (externalSignal) {
    if (externalSignal.aborted) {
      internalController.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', () => {
        internalController.abort(externalSignal.reason);
      });
    }
  }

  // Pre-flight validation & console logging
  if (!payload.message || !payload.message.trim()) {
    const emptyErr = new Error('הודעת המשתמש ריקה');
    console.error('[streamChatMessage] Error: Empty user message');
    onError(emptyErr);
    return;
  }

  if (payload.userApiKey) {
    console.log('[Gemini ENV Check] User provided personal Gemini API key.');
  } else {
    console.log('[Gemini ENV Check] Using server-side GEMINI_API_KEY environment variable.');
  }

  // 18-second timeout for first token: if no chunk received, abort and display connection error
  const timeoutId = setTimeout(() => {
    if (!hasReceivedFirstChunk && !isDone) {
      console.warn(`[streamChatMessage] Timeout: No response received within ${CHAT_STREAM_TIMEOUT_MS / 1000}s. Aborting request.`);
      internalController.abort(new Error('TIMEOUT_FIRST_TOKEN'));
    }
  }, CHAT_STREAM_TIMEOUT_MS);

  let accumulated = '';

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: internalController.signal,
    });

    if (!response.ok || !response.body) {
      clearTimeout(timeoutId);
      const errData = await response.json().catch(() => ({ error: 'Stream request failed' }));
      const statusMsg = errData.error || `Server responded with ${response.status}`;
      console.error('[streamChatMessage HTTP Error]', response.status, statusMsg);
      throw new Error(statusMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let isStreamTerminated = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') {
          isStreamTerminated = true;
          break;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            console.error('[streamChatMessage] Server returned error chunk:', parsed.error);
            throw new Error(parsed.error);
          } else if (typeof parsed.text === 'string' && parsed.text) {
            if (!hasReceivedFirstChunk) {
              hasReceivedFirstChunk = true;
              clearTimeout(timeoutId);
            }
            accumulated += parsed.text;
            onChunk(parsed.text, accumulated);
          }
        } catch (e: any) {
          if (e.message && !e.message.includes('JSON')) {
            throw e;
          }
        }
      }

      if (isStreamTerminated) break;
    }

    clearTimeout(timeoutId);
    isDone = true;

    if (!accumulated.trim()) {
      throw new Error('לא התקבל תוכן מה-AI. ייתכן שהמודל עמוס כרגע.');
    }

    onDone(accumulated);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorObj = err instanceof Error ? err : new Error(String(err));

    // If aborted intentionally by the user (and not our timeout), exit silently
    if (externalSignal?.aborted && errorObj.name === 'AbortError' && internalController.signal.reason?.message !== 'TIMEOUT_FIRST_TOKEN') {
      console.log('[streamChatMessage] Stream aborted by user.');
      return;
    }

    let userFriendlyMessage = 'מצטער, חלה שגיאה בחיבור לשרת. אנא נסה שוב.';

    const rawMsg = errorObj.message || '';
    const isTimeout = rawMsg.includes('TIMEOUT_FIRST_TOKEN') || (internalController.signal.aborted && internalController.signal.reason?.message === 'TIMEOUT_FIRST_TOKEN');
    const isQuota = rawMsg.includes('429') || rawMsg.includes('quota') || rawMsg.includes('Quota') || rawMsg.includes('RESOURCE_EXHAUSTED') || rawMsg.includes('limit');
    const isMissingKey = rawMsg.includes('מפתח') || rawMsg.includes('API key') || rawMsg.includes('MISSING_API_KEY') || rawMsg.includes('API_KEY');
    const isNetwork = rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('Network') || rawMsg.includes('ECONNREFUSED');

    if (isTimeout) {
      userFriendlyMessage = 'פסק זמן בהתחברות לשרת (45 שניות ללא מענה). המערכת עמוסה כרגע או סורקת קבצי מחירים, אנא נסה לשלוח את ההודעה שוב.';
      console.error('[streamChatMessage Timeout]', userFriendlyMessage);
    } else if (isQuota) {
      userFriendlyMessage = 'חריגה ממכסת הפניות ל-Gemini (Quota Exceeded). אנא המתן כדקה או הזן מפתח Gemini אישי בהגדרות הצ\'אט.';
      console.error('[streamChatMessage Quota]', userFriendlyMessage);
    } else if (isMissingKey) {
      userFriendlyMessage = 'מפתח ה-API של Gemini אינו מוגדר במערכת. אנא הזן מפתח אישי בהגדרות הצ\'אט.';
      console.error('[streamChatMessage Missing Key]', userFriendlyMessage);
    } else if (isNetwork) {
      userFriendlyMessage = 'מצטער, חלה שגיאה בחיבור לשרת. אנא בדוק את החיבור לרשת ונסה שוב.';
      console.error('[streamChatMessage Network]', userFriendlyMessage);
    } else if (rawMsg) {
      userFriendlyMessage = `שגיאה בתקשורת עם ה-AI: ${rawMsg}`;
      console.error('[streamChatMessage General Error]', rawMsg);
    }

    onError(new Error(userFriendlyMessage));
  } finally {
    clearTimeout(timeoutId);
  }
}

function generateSmartFallbackResponse(payload: ChatRequestPayload): string {
  const query = payload.message.toLowerCase();
  const userName = payload.userProfile?.name || 'שף';
  const dietary = payload.userProfile?.dietary || payload.personalProfile?.dietary;
  const kosher = payload.userProfile?.kosher || payload.personalProfile?.kosher;
  const cartItems = payload.appContext?.cartItems || [];
  const cartTotal = payload.appContext?.cartTotal || 0;
  const bestStore = payload.appContext?.bestStoreForCart;
  const budgetLimit = payload.appContext?.budgetLimit;

  // Cart and shopping list specific queries
  if (query.includes('סל') || query.includes('עגלה') || query.includes('מצרכים בסל') || query.includes('רשימת קניות')) {
    if (cartItems.length > 0) {
      const itemsList = cartItems.map((item, idx) => `${idx + 1}. **${item.name}** - ${item.quantity} ${item.unit || 'יח\''} ${item.cheapestPrice ? `(~₪${item.cheapestPrice.toFixed(2)})` : ''}`).join('\n');
      return `שלום ${userName}! 🛒 בדקתי את סל הקניות הנוכחי שלך באפליקציה:

${itemsList}

- **סה"כ פריטים**: ${cartItems.length} מוצרים
- **עלות כוללת מוערכת**: ₪${cartTotal.toFixed(2)}
${bestStore ? `- **הרשת המשתלמת ביותר לסל זה**: 🏆 **${bestStore}**` : ''}
${budgetLimit ? `- **תקציב מוגדר**: ₪${budgetLimit.toFixed(2)} (${cartTotal <= budgetLimit ? `נותרו ₪${(budgetLimit - cartTotal).toFixed(2)}` : `חריגה של ₪${(cartTotal - budgetLimit).toFixed(2)}!`})` : ''}

האם תרצה שאציע מתכון טעים המבוסס על המצרכים הללו, או שנשווה מחירי מוצר ספציפי מול הרשתות?`;
    } else {
      return `שלום ${userName}! 🛒 כרגע סל הקניות שלך באפליקציה ריק.
תוכל להוסיף מוצרים מתוך לשונית **השוואת מחירים (PriceWise)** או לבקש ממני המלצה על מצרכים למתכון מנצח!`;
    }
  }

  // Smart Fridge Interactive Flow
  if (query.includes('מקרר') || query.includes('יש לי במקרר') || query.includes('מה מבשלים') || query.includes('מה יש לך במקרר') || query.includes('שאלות מנחות') || query.includes('אינטראקטיבי')) {
    return `היי ${userName}! איזה כיף, קיבלתי את רשימת המצרכים שלך מהמקרר והמזווה! 🍳🥦

כדי שלא אזרוק לך סתם מתכון גנרי, בוא נדייק את זה ב-2 שאלות קצרות:
1. **סגנון וכיוון**: לאיזה סגנון אתה מכוון היום? (למשל: פסטה מפנקת, מוקפץ זריז, תבשיל חם ומנחם, או סלט עשיר ומשביע?)
2. **זמן ואופי הארוחה**: כמה זמן יש לך להשקיע (15 דקות זריז או בישול בנחת?), והאם זו ארוחה קלה לעצמך או לארוחה משפחתית/אירוח?

תחזיר לי תשובה קצרה ויאללה נבשל מתכון שף מנצח שמנצל בול את מה שיש לך ללא בזבוז מזון!`;
  }

  // Recipe from cart ingredients
  if (query.includes('מה לבשל') || query.includes('מה להכין') || query.includes('מתכון מהסל') || query.includes('מתכון')) {
    const topIngredients = cartItems.length > 0 
      ? cartItems.slice(0, 4).map((i) => i.name).join(', ')
      : 'עשבי תיבול, שמן זית, ירקות טריים ותבלינים מובחרים';

    return `שלום ${userName}! 🍳 הנה מתכון שף מותאם אישית ${cartItems.length > 0 ? `למצרכים שבסל שלך (${topIngredients})` : ''} ${kosher ? `[כשרות: ${kosher}]` : ''} ${dietary ? `[תזונה: ${dietary}]` : ''}:

### מתכון שף: תבשיל קדירה עשיר בניחוח שום ועשבי תיבול

#### מצרכים (4 מנות):
- 500 גרם נתחי עוף או טופו איכותי
- 2 יחידות בצל קצוץ דק
- 3 שיני שום כתושות
- 2 יחידות גזר פרוס לעיגולים
- 1 כוס ציר ירקות או מים רותחים
- 3 כפות שמן זית כתית מעולה
- מלח גס, פלפל שחור גרוס, ענף רוזמרין וטימין

#### אופן ההכנה:
1. **צריבה והזהבה**: מחממים שמן זית בסיר כבד וצורבים את הבצל, השום והירקות במשך כ-5 דקות עד הזהבה יפה.
2. **איטום וקרמליזציה**: מוסיפים את הנתחים והתבלינים וצורבים 3 דקות מכל צד לקבלת עומק טעמים.
3. **בישול עדין**: מוזגים את הציר/נוזלים, מכסים ומנמיכים את הלהבה לבישול רגוע של 35-40 דקות עד ריכוך מושלם.
4. **סיום והגשה**: מעטרים בעשבי תיבול טריים ומגישים חם לצד אורז או לחם מחמצת טרי.

💡 **המלצת שף**: תוכל להעביר את המתכון הזה ישירות לרשימת המתכונים שלך בלחיצה אחת על הכפתור למטה! בתיאבון!`;
  }

  // Pricing, stores, or budget
  if (query.includes('זול') || query.includes('מחיר') || query.includes('רשת') || query.includes('יוחננוף') || query.includes('שופרסל') || query.includes('רמי לוי') || query.includes('תקציב')) {
    return `שלום ${userName}! 📊 במאגר האפליקציה מסונכרנים מעל **12,000 מוצרים רשמיים** מרשתות השיווק בישראל:
${bestStore ? `- הרשת הזולה ביותר לסל הנוכחי שלך היא **${bestStore}**.` : '- ניתן לבצע השוואת סל מלא בין יוחננוף, שופרסל, רמי לוי, ויקטורי, קרפור ואושר עד בלשונית השוואת מחירים.'}
${budgetLimit ? `- תקציב היעד שלך: ₪${budgetLimit}.` : ''}

האם תרצה לברר מחיר עבור מוצר ספציפי או לחשב חיסכון חכם?`;
  }

  // Summary query
  if (query.includes('סיכום') || query.includes('תמצית') || query.includes('summarize')) {
    return `### 📝 סיכום קולינרי מרוכז עבור ${userName}

- **פרופיל אישי**: ${dietary ? `תזונה: ${dietary} • ` : ''}${kosher ? `כשרות: ${kosher}` : ''}
- **סטטוס אפליקציה**: ${cartItems.length} מוצרים בסל הקניות (עלות: ₪${cartTotal.toFixed(2)}).
- **צעדים להמשך**: תכנון תפריט, עדכון מחירי סל וסנכרון משימות ביצוע.`;
  }

  // Default Chef AI Welcome/Response
  return `שלום וברוכים הבאים לשף של PriceWise! 🍳🍷
אני העוזר הקולינרי האישי שלך. אני כבר מכיר את הטעם שלך, רואה מה יש לך בסל, ומחובר למחירי הרשתות. אז מה מתחשק לך לבשל היום?`;
}
