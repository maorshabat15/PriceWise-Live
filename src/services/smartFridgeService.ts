import { SmartFridgeDish, UserProfileContext, AppContextData } from '../types';
import { sendChatMessage } from './aiService';

export interface GenerateDishesParams {
  ingredients: string[];
  diners: string;
  mealStyle: string;
  notes?: string;
  userProfile?: UserProfileContext;
  appContext?: AppContextData;
}

export interface GenerateRecipeParams {
  dish: SmartFridgeDish;
  ingredients: string[];
  diners: string;
  mealStyle: string;
  notes?: string;
  userProfile?: UserProfileContext;
  appContext?: AppContextData;
}

export interface FridgeCookingChatParams {
  message: string;
  dish: SmartFridgeDish;
  ingredients: string[];
  diners: string;
  mealStyle: string;
  notes?: string;
  history: { role: 'user' | 'model'; content: string }[];
  userProfile?: UserProfileContext;
}

/**
 * Generates 3 visual dish cards based on available fridge ingredients and user meal profile.
 */
export async function generateSmartFridgeDishes(params: GenerateDishesParams): Promise<SmartFridgeDish[]> {
  const { ingredients, diners, mealStyle, notes, userProfile } = params;
  const ingredientsStr = ingredients.join(', ');

  const prompt = `אתה "השף של המקרר החכם". ברשות המשתמש המצרכים הבאים במקרר ובמזווה:
מצרכים: ${ingredientsStr}
מספר סועדים: ${diners}
סגנון ארוחה מבוקש: ${mealStyle}
${notes ? `הערות מיוחדות לגבי המצרכים והכמויות: ${notes}` : ''}
${userProfile?.dietary ? `העדפת תזונה: ${userProfile.dietary}` : ''}
${userProfile?.kosher ? `כשרות: ${userProfile.kosher}` : ''}

הצע בדיוק 3 אפשרויות שונות ומגוונות של מנות (למשל אחת מהירה וקלילה, אחת עשירה ומנחמת, ואחת יצירתית או מרעננת).
החזר אך ורק תשובת JSON תקינה ללא שום טקסט נוסף לפני או אחרי, במבנה המדויק הבא:
[
  {
    "id": "dish-1",
    "name": "שם המנה בעברית",
    "style": "סגנון (למשל: מהיר וזריז / חם ומנחם / קליל ומרענן)",
    "prepTime": "זמן משוער (למשל: 15 דקות / 25 דקות / 35 דקות)",
    "description": "תיאור קצר ומגרה של המנה וכיצד היא מנצלת את המצרכים שהוזנו"
  },
  {
    "id": "dish-2",
    "name": "שם מנה שניה",
    "style": "סגנון",
    "prepTime": "זמן משוער",
    "description": "תיאור קצר"
  },
  {
    "id": "dish-3",
    "name": "שם מנה שלישית",
    "style": "סגנון",
    "prepTime": "זמן משוער",
    "description": "תיאור קצר"
  }
]`;

  try {
    const rawReply = await sendChatMessage({
      message: prompt,
      temperature: 0.7,
      userProfile,
    });

    // Attempt to parse JSON from AI reply
    const jsonMatch = rawReply.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.slice(0, 3).map((item, idx) => ({
          id: item.id || `dish-${idx + 1}`,
          name: item.name || `מנה מוצעת ${idx + 1}`,
          style: item.style || mealStyle || 'טעים ומהיר',
          prepTime: item.prepTime || '20 דקות',
          description: item.description || '',
        }));
      }
    }
  } catch (err) {
    console.warn('Smart Fridge AI generation returned non-JSON, using intelligent culinary fallback:', err);
  }

  // Robust intelligent fallback based on ingredients and meal style
  return createFallbackDishes(ingredients, diners, mealStyle, notes);
}

/**
 * Creates 3 high-quality fallback dishes tailored to ingredients
 */
function createFallbackDishes(
  ingredients: string[],
  diners: string,
  mealStyle: string,
  notes?: string
): SmartFridgeDish[] {
  const ingLower = ingredients.map((i) => i.toLowerCase()).join(' ');
  const hasEggs = ingLower.includes('ביצ') || ingLower.includes('egg');
  const hasTomatoes = ingLower.includes('עגבנ') || ingLower.includes('רסק');
  const hasChicken = ingLower.includes('עוף') || ingLower.includes('חזה עוף') || ingLower.includes('פרגית');
  const hasPasta = ingLower.includes('פסטה') || ingLower.includes('מקרוני') || ingLower.includes('ספגטי');
  const hasRice = ingLower.includes('אורז');
  const hasCheese = ingLower.includes('גבינ') || ingLower.includes('צהובה') || ingLower.includes('פרמזן') || ingLower.includes('מוצרלה');
  const hasCream = ingLower.includes('שמנת');
  const hasMushrooms = ingLower.includes('פטר');
  const hasPotatoes = ingLower.includes('תפוח') || ingLower.includes('תפו"א');

  const topIngStr = ingredients.slice(0, 3).join(' ו-') || 'מצרכי המקרר';

  // Option 1: Quick & Easy
  let dish1: SmartFridgeDish;
  if (hasEggs && hasTomatoes) {
    dish1 = {
      id: 'dish-1',
      name: 'שקשוקה ים-תיכונית פיקנטית עם שום ועשבי תיבול',
      style: 'מהיר וזריז',
      prepTime: '15 דקות',
      description: `מנצלת את העגבניות, הביצים והשום לארוחה לוהטת וטעימה שמתאימה בול ל-${diners} סועדים.`,
    };
  } else if (hasEggs && hasCheese) {
    dish1 = {
      id: 'dish-1',
      name: 'פריטטה עשירה של ירקות וגבינה מושחמת',
      style: 'מהיר וקליל',
      prepTime: '15 דקות',
      description: `חביתה איטלקית תפוחה עם ביצים, ירקות וגבינה מותכת ללא מאמץ.`,
    };
  } else if (hasPasta) {
    dish1 = {
      id: 'dish-1',
      name: 'פסטה זריזה בשמן זית, שום וירקות מוקפצים',
      style: 'מהיר וקליל',
      prepTime: '18 דקות',
      description: `ארוחה נפלאה המנצלת את הפסטה יחד עם ${topIngStr} להקפצה פשוטה ומנצחת.`,
    };
  } else {
    dish1 = {
      id: 'dish-1',
      name: `מוקפץ מקרר מהיר מבוסס ${topIngStr}`,
      style: 'מהיר וקליל',
      prepTime: '15 דקות',
      description: `הקפצה זריזה במחבת לוהטת עם שום, תבלינים וכל הירקות והמצרכים שנמצאו.`,
    };
  }

  // Option 2: Rich & Comforting
  let dish2: SmartFridgeDish;
  if (hasChicken && (hasRice || hasPotatoes)) {
    dish2 = {
      id: 'dish-2',
      name: 'תבשיל עוף זהוב עם ירקות ותפוחי אדמה במחבת אחת',
      style: 'חם ומנחם',
      prepTime: '35 דקות',
      description: `קדירה ביתית מפנקת של חזה עוף/נתחים בבישול עדין עם ניחוחות שום ותבלינים.`,
    };
  } else if (hasPasta && (hasCream || hasCheese || hasMushrooms)) {
    dish2 = {
      id: 'dish-2',
      name: 'פסטה מוקרמת עשירה ברוטב שמנת, פטריות וגבינה',
      style: 'מפנק ומנחם',
      prepTime: '22 דקות',
      description: `רוטב קטיפתי ונימוח שמחבר את השמנת והגבינה לארוחה מפנקת ברמת מסעדה.`,
    };
  } else if (hasRice) {
    dish2 = {
      id: 'dish-2',
      name: 'ריזוטו מקרר כפרי עם ירקות צלויים ושום',
      style: 'חם ומנחם',
      prepTime: '25 דקות',
      description: `אורז מבושל בנחת עם ציר ירקות עשיר, שום וירקות מבושלים לרכות מושלמת.`,
    };
  } else {
    dish2 = {
      id: 'dish-2',
      name: `תבשיל קדירה חם ומנחם עם ${topIngStr}`,
      style: 'חם ומנחם',
      prepTime: '30 דקות',
      description: `בישול איטי ונינוח שמוציא את מקסימום הטעמים והמיצים מכל מה שנמצא במקרר.`,
    };
  }

  // Option 3: Creative / Chef Special
  let dish3: SmartFridgeDish;
  if (hasCheese || hasEggs) {
    dish3 = {
      id: 'dish-3',
      name: 'מאפה שכבות מחבת זהוב וקריספי בסגנון בורקס פתוח',
      style: 'קריספי ומיוחד',
      prepTime: '25 דקות',
      description: `קראנצ'י מבחוץ ונימוח מבפנים, מנצל גבינות וירקות במעטפת מושלמת.`,
    };
  } else {
    dish3 = {
      id: 'dish-3',
      name: `סלט שף חם-קר עם רוטב ויניגרט עשיר ותוספות צלויות`,
      style: 'מרענן ויצירתי',
      prepTime: '20 דקות',
      description: `שילוב ניגודים מרתק בין ירקות צלויים במחבת לרעננות פריכה ותיבול מדויק.`,
    };
  }

  return [dish1, dish2, dish3];
}

/**
 * Generates the full initial recipe message when a dish is selected.
 */
export async function generateDetailedRecipe(params: GenerateRecipeParams): Promise<string> {
  const { dish, ingredients, diners, mealStyle, notes, userProfile } = params;

  const prompt = `אתה "השף של המקרר החכם". המשתמש בחר להכין את המנה הבאה מהמקרר שלו:
מנה: ${dish.name}
סגנון: ${dish.style}
זמן משוער: ${dish.prepTime}
מצרכים זמינים במקרר: ${ingredients.join(', ')}
מספר סועדים: ${diners}
סגנון ארוחה: ${mealStyle}
${notes ? `הערות מיוחדות על כמויות: ${notes}` : ''}
${userProfile?.dietary ? `תזונה: ${userProfile.dietary}` : ''}
${userProfile?.kosher ? `כשרות: ${userProfile.kosher}` : ''}

אנא כתוב למשתמש את הודעת הפתיחה המלאה והמפורטת לחדר הבישול הייעודי עבור מנה זו.
המבנה חייב לכלול:
1. ברכת פתיחה נלהבת מהשף של המקרר החכם.
2. פירוט מצרכים וכמויות מדויקות המותאמות במדויק ל-${diners} סועדים (סמן במפורש מה מתוך מה שיש במקרר ומה תבליני בסיס).
3. שלבי הכנה ברורים, ממוספרים, פשוטים ומקצועיים צעד-אחר-צעד.
4. טיפ השף לבישול מושלם ולמניעת בזבוז מזון.
5. משפט סיום חם שמזמין את המשתמש לשאול כל שאלה במהלך הבישול (למשל על תחליפים, זמנים וטמפרטורות).

השתמש ב-Markdown ברור עם כותרות והדגשות.`;

  try {
    const reply = await sendChatMessage({
      message: prompt,
      temperature: 0.7,
      userProfile,
    });
    if (reply && reply.length > 100) {
      return reply;
    }
  } catch (err) {
    console.warn('AI recipe generation error, using fallback:', err);
  }

  // High-quality fallback recipe
  return `## 🍳 השף של המקרר החכם: ${dish.name}

שלום וברוכים הבאים לחדר הבישול הייעודי שלך! בחרת להכין **${dish.name}** (${dish.style}), והרכבתי עבורך את המתכון המדויק ממה שיש לך בבית.

- 👥 **מותאם ל**: ${diners} סועדים
- ⏱️ **זמן הכנה משוער**: ${dish.prepTime}
- 🌿 **סגנון ארוחה**: ${mealStyle}

---

### 🛒 מצרכים וכמויות מדויקות (ל-${diners} סועדים):
${ingredients.map((ing) => `- **${ing}**: לפי הכמות שיש במקרר ${notes ? `(${notes})` : ''}`).join('\n')}
- **תבלינים ושמנים מהמזווה**: 2-3 כפות שמן זית, מלח גס, פלפל שחור גרוס, ושום לפי הטעם.

---

### 👨‍🍳 שלבי ההכנה (צעד אחר צעד):

1. **הכנת המצרכים (Mise en place)**:
   שוטפים וחותכים את הירקות לקוביות או רצועות אחידות כדי שיקבלו בישול שווה. אם משתמשים בבצל או שום - קוצצים דק.

2. **חימום הבסיס**:
   מחממים מחבת רחבה או סיר עם 2 כפות שמן זית על אש בינונית. מוסיפים את הבצל והשום ומטגנים 2–3 דקות עד לשקיפות וריח נפלא.

3. **שילוב המרכיבים העיקריים**:
   מוסיפים את יתר המצרכים לפי דרגת הקושי שלהם (ירקות קשים תחילה, ולאחר מכן ביצים/גבינות/רטבים/שמנת). מתבלים במלח, פלפל ועשבי תיבול.

4. **איחוד טעמים וצלייה/בישול**:
   מנמיכים מעט את האש ומבשלים למשך הזמן הדרוש (${dish.prepTime}) עד שהמנה מזהיבה, מבעבעת וריחנית.

5. **הגשה לשולחן**:
   מכבים את האש, נותנים למנה לנוח 2 דקות לספיגת טעמים, ומגישים חם לצד לחם טרי או תוספת קלה.

---

💡 **טיפ השף לחיסכון ומניעת בזבוז**:
אם נשארו לכם גבעולי עשבי תיבול או קצוות ירקות, אל תזרקו! אפשר להקפיא אותם בשקית ולשמור לציר ירקות מדהים בעתיד.

---
💬 **אני כאן איתך לאורך כל הבישול!** 
מרגיש שמשהו חסר? רוצה לדעת במה אפשר להחליף מצרך מסוים, כמה זמן בדיוק להשאיר על האש או איך לתבל? פשוט שאל אותי כאן למטה!`;
}

/**
 * Handles ongoing conversation inside the dedicated cooking session.
 */
export async function sendFridgeCookingMessage(params: FridgeCookingChatParams): Promise<string> {
  const { message, dish, ingredients, diners, mealStyle, notes, history, userProfile } = params;

  const cookingSystemPrompt = `אתה "השף של המקרר החכם" בתוך חדר בישול ייעודי ונפרד.
המשתמש מבשל כעת את המנה: "${dish.name}"
סגנון: ${dish.style}
מצרכים: ${ingredients.join(', ')}
מספר סועדים: ${diners}
סגנון ארוחה: ${mealStyle}
${notes ? `הערות מצרכים: ${notes}` : ''}

הנחיות קריטיות:
1. ענה אך ורק בעברית, בצורה חמה, מעודדת, סבלנית ומקצועית של שף אמיתי.
2. התמקד אך ורק במנה הנוכחית ("${dish.name}"), בתהליך הבישול שלה, בהחלפות מצרכים אפשריות, בזמנים ובדיוקי טעמים.
3. שמור על תשובות ברורות, קולעות ומעשיות כדי שהמשתמש יוכל לחזור מיד למחבת/לתנור.`;

  return sendChatMessage({
    message,
    history,
    systemInstruction: cookingSystemPrompt,
    temperature: 0.7,
    userProfile,
  });
}
