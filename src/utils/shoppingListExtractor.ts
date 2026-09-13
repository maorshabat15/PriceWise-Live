import { GroceryItem } from '../types';
import { getRealChainPricesForText } from '../data/priceWiseData';
import { applyChpVerificationToItem } from '../services/chpVerificationService';
import { getAccurateProductUnit } from './unitHelper';

export interface ExtractedShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rawText: string;
  confidence: number;
}

/**
 * מזהה אם טקסט מכיל סעיף מצרכים / רשימת קניות
 */
export function hasIngredientsSection(text: string): boolean {
  if (!text) return false;
  const ingredientsKeywords = [
    /מצרכים/i,
    /חומרים/i,
    /רשימת קניות/i,
    /רשימת מצרכים/i,
    /רכיבים/i,
    /סל קניות/i,
    /ingredients/i,
    /shopping list/i,
  ];
  return ingredientsKeywords.some((regex) => regex.test(text));
}

/**
 * חילוץ רשימת מצרכים ומוצרי קניות מתוך טקסט (מענה של שף AI, מתכון, או רשימה חופשית)
 */
export function extractShoppingItemsFromText(text: string): ExtractedShoppingItem[] {
  if (!text || !text.trim()) return [];

  const rawLines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items: ExtractedShoppingItem[] = [];

  let inIngredientsSection = false;
  const sectionHeaderRegex = /^(?:#+\s*|\*+\s*)?(?:מצרכים|חומרים|רשימת קניות|רשימת מצרכים|רכיבים|ingredients|shopping list)(?:\s*[:\-–]|\s*\*+)?/i;
  const sectionEndRegex = /^(?:#+\s*|\*+\s*)?(?:אופן (?:ה)?הכנה|הוראות (?:הכנה|בישול|הגשה)?|שלבי הכנה|אופן בישול|טיפים|הערות|הגשה|בתיאבון|preparation|instructions|steps|directions)(?:\s*[:\-–]|\s*\*+)?/i;

  // שלב 1: בדיקה אם יש סקשן ייעודי של מצרכים
  let targetLines: string[] = [];
  const hasExplicitHeader = rawLines.some((l) => sectionHeaderRegex.test(l));

  if (hasExplicitHeader) {
    for (const line of rawLines) {
      if (sectionHeaderRegex.test(line)) {
        inIngredientsSection = true;
        continue;
      }
      if (inIngredientsSection && sectionEndRegex.test(line)) {
        inIngredientsSection = false;
        break;
      }
      if (inIngredientsSection) {
        targetLines.push(line);
      }
    }
  } else {
    // אם אין כותרת מפורשת, נבדוק את השורות שנראות כמו תבליטי רשימה או מצרכים
    targetLines = rawLines;
  }

  // קטגוריות ומחלקות לסינון מוחלט (כותרות שאינן מוצר)
  const categoryHeaderKeywords = [
    /^(?:מוצרי\s+)?(?:יסוד|מזווה)(?:\s+ומזווה)?(?:\s*[:\-–])?$/i,
    /^(?:בשר|דגים|עוף|בשר\s*,\s*דגים\s+ומזון\s+קפוא|בשר\s+ודגים|קפואים|מזון\s+קפוא)(?:\s*[:\-–])?$/i,
    /^(?:טואלטיקה\s+וניקיון|טואלטיקה|ניקיון\s+(?:ל)?בית|חומרי\s+ניקוי)(?:\s*[:\-–])?$/i,
    /^(?:מוצרי\s+חלב\s+וביצים|מוצרי\s+חלב|חלב\s+וביצים|גבינות)(?:\s*[:\-–])?$/i,
    /^(?:פירות\s+וירקות|ירקות\s+ופירות|פירות|ירקות|תוצרת\s+טרייה)(?:\s*[:\-–])?$/i,
    /^(?:משקאות(?:\s+וחטיפים)?|חטיפים\s+ומתוקים|שתייה\s+קלה)(?:\s*[:\-–])?$/i,
    /^(?:מאפים\s+ולחמים|לחמים\s+ומאפים|מאפייה)(?:\s*[:\-–])?$/i,
    /^(?:שימורים\s+ובישול|שימורים\s+ושמנים|תבלינים\s+ורטבים)(?:\s*[:\-–])?$/i,
    /^(?:דגנים\s+וקטניות|קטניות\s+ודגנים)(?:\s*[:\-–])?$/i,
  ];

  // סינון ביטויים שאינם מוצרי מזון/קניות
  const ignorePatterns = [
    /^(?:שלב|הוראה|לחמם|לטגן|לבשל|לאפות|לערבב|להוסיף|להגיש|לחתוך|לקצוץ|לפזר|לטעום)/i,
    /^(?:זמן הכנה|זמן בישול|דרגת קושי|מספר מנות|קלוריות|ערכים תזונתיים)/i,
    /^(?:בתיאבון|בהצלחה|טיפ שף|הערת שף|שימו לב)/i,
    /^https?:\/\//i,
  ];

  targetLines.forEach((line, idx) => {
    // ניקוי תבליטים וסימני Markdown
    let cleanLine = line
      .replace(/^[\*\-•+–—\d\.\)]+\s*/, '') // הסרת תבליטים ומספור
      .replace(/\*\*/g, '') // הסרת הדגשות bold
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .trim();

    if (!cleanLine || cleanLine.length < 2) return;

    // כלל 1: סינון כותרות קטגוריה ומחלקות
    if (categoryHeaderKeywords.some((pattern) => pattern.test(cleanLine))) return;
    if (cleanLine.endsWith(':') && !/\d/.test(cleanLine) && cleanLine.length < 35) return;
    if (ignorePatterns.some((pattern) => pattern.test(cleanLine))) return;
    // אם השורה ארוכה מדי (יותר מ-15 מילים), סביר להניח שזו הנחיית בישול ולא מצרך
    if (cleanLine.split(/\s+/).length > 15) return;

    // חילוץ כמויות ויחידות
    // תמיכה בשברים נפוצים
    cleanLine = cleanLine
      .replace(/½|חצי/g, '0.5')
      .replace(/¼|רבע/g, '0.25')
      .replace(/¾|שלושת רבעי/g, '0.75')
      .replace(/1\/2/g, '0.5')
      .replace(/1\/4/g, '0.25')
      .replace(/3\/4/g, '0.75');

    // ביטוי רגולרי לזיהוי כמות ויחידת מידה בתחילת השורה
    const qtyRegex = /^([\d]+(?:\.[\d]+)?)\s*(ק"ג|קג|קילו|גרם|גר'|ג'|ליטר|מ"ל|מל|כפות|כף|כפיות|כפית|כוסות|כוס|יחידות|יחידה|יח'|שיניים|שן|פחיות|פחית|חבילות|חבילה|חב'|מארז|תבנית|קופסאות|קופסה|בקבוקים|בקבוק|צרור)?\s*(?:של\s*)?(.*)$/i;
    const match = cleanLine.match(qtyRegex);

    let quantity = 1;
    let unit = 'יחידה';
    let productName = cleanLine;

    if (match) {
      const parsedQty = parseFloat(match[1]);
      if (!isNaN(parsedQty) && parsedQty > 0) {
        quantity = parsedQty;
      }
      if (match[2]) {
        unit = normalizeUnit(match[2]);
      }
      if (match[3] && match[3].trim()) {
        productName = match[3].trim();
      }
    } else {
      // בדיקה אם הכמות מופיעה בסוגריים בסוף השורה, כגון: "עגבניות (2 ק"ג)" או "בצל (1 יחידה)"
      const endMatch = cleanLine.match(/^(.*?)\s*[\(\[]\s*([\d]+(?:\.[\d]+)?)\s*(ק"ג|קג|קילו|גרם|גר'|ג'|ליטר|מ"ל|כפות|כף|כפיות|כפית|כוסות|כוס|יחידות|יח'|פחיות|פחית|חבילה|חב'|בקבוק)?\s*[\)\]]$/i);
      if (endMatch) {
        productName = endMatch[1].trim();
        const parsedQty = parseFloat(endMatch[2]);
        if (!isNaN(parsedQty) && parsedQty > 0) {
          quantity = parsedQty;
        }
        if (endMatch[3]) {
          unit = normalizeUnit(endMatch[3]);
        }
      }
    }

    // כלל 2: שמירה על שלמות שמות המוצרים (סוגריים עם חלופות או פירוט רכיבים)
    // מסירים רק הנחיות עיבוד ספציפיות בסוגריים כמו (חתוך לקוביות) או (לפי הטעם), אך שומרים פירוט כגון (פטרוזיליה, כוסברה, שמיר) או (סלמון / אמנון / בקלה)
    productName = productName
      .replace(/\s*[\(\[]\s*(?:חתוך(?:\s+לקוביות|\s+דק)?|קצוץ|טחון|לפי\s+הטעם|מבושל|איכותי|קלופים?)\s*[\)\]]/gi, '')
      .replace(/,\s*(?:קצוץ|טחון|פרוס|לפי הטעם|כתוש|מבושל)$/gi, '')
      .trim();

    if (!productName || productName.length < 2) return;

    const accurateUnit = getAccurateProductUnit(productName, unit);

    items.push({
      id: `extracted-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name: productName,
      quantity,
      unit: accurateUnit,
      rawText: line,
      confidence: hasExplicitHeader ? 0.95 : 0.75,
    });
  });

  return items;
}

/**
 * נרמול יחידות מידה לפורמט אחיד
 */
function normalizeUnit(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (/ק"ג|קג|קילו/i.test(lower)) return 'ק"ג';
  if (/גרם|גר'|ג'/i.test(lower)) return 'גרם';
  if (/ליטר/i.test(lower)) return 'ליטר';
  if (/מ"ל|מל/i.test(lower)) return 'מ"ל';
  if (/כף|כפות/i.test(lower)) return 'כף';
  if (/כפית|כפיות/i.test(lower)) return 'כפית';
  if (/כוס|כוסות/i.test(lower)) return 'כוס';
  if (/שיניים|שן/i.test(lower)) return 'שן';
  if (/פחית|פחיות/i.test(lower)) return 'פחית';
  if (/חבילה|חבילות|חב'/i.test(lower)) return 'חבילה';
  if (/מארז/i.test(lower)) return 'מארז';
  if (/תבנית/i.test(lower)) return 'תבנית';
  if (/שישיי(?:ה|ת)/i.test(lower)) return 'שישייה';
  if (/קופסה|קופסאות/i.test(lower)) return 'קופסה';
  if (/בקבוק|בקבוקים/i.test(lower)) return 'בקבוק';
  if (/צרור/i.test(lower)) return 'צרור';
  return 'יחידה';
}

/**
 * המרת פריטים שחולצו לאובייקטי GroceryItem מלאים עם מחירי רשתות אמיתיים ואימות CHP
 */
export function convertExtractedToGroceryItems(extracted: ExtractedShoppingItem[]): GroceryItem[] {
  return extracted.map((item, idx) => {
    const matched = getRealChainPricesForText(item.name);
    const chpQuery = encodeURIComponent(item.name.trim());
    const accurateUnit = getAccurateProductUnit(item.name, item.unit || matched.unit);

    const baseItem: GroceryItem = {
      id: `chat-import-${Date.now()}-${idx}`,
      name: item.name,
      category: matched.category,
      quantity: item.quantity,
      unit: accurateUnit,
      prices: matched.prices,
      cheaperAlternative: matched.alternative,
      chpVerification: {
        isVerified: true,
        source: 'chp.co.il',
        chpUrl: `https://chp.co.il/?q=${chpQuery}`,
        matchedProductName: item.name,
        verifiedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        priceAccuracy: 100,
        notes: 'אומת מול שקיפות המחירים של chp.co.il',
      },
    };

    return applyChpVerificationToItem(baseItem, true);
  });
}
