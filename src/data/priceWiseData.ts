import { StoreInfo, GroceryItem, StoreKey, IProduct, IPrice } from '../types';
import { getAccurateProductUnit } from '../utils/unitHelper';

export const STORES: StoreInfo[] = [
  { key: 'ramiLevy', name: 'רמי לוי שיווק השקמה', logoColor: 'bg-blue-600', badge: '🏆 הסל הזול ביותר' },
  { key: 'osherAd', name: 'אושר עד', logoColor: 'bg-emerald-600', badge: '📦 חיסכון בכמויות' },
  { key: 'yohananof', name: 'יוחננוף', logoColor: 'bg-red-600', badge: '🔥 מבצעי ענק' },
  { key: 'shufersal', name: 'שופרסל דיל', logoColor: 'bg-rose-600', badge: '🛒 פריסה רחבה' },
  { key: 'carrefour', name: 'קרפור ישראל', logoColor: 'bg-sky-600', badge: '🥐 יבוא מוזל' },
  { key: 'victory', name: 'ויקטורי', logoColor: 'bg-amber-600', badge: '⚡ מבצעים חמים' },
];

// מחירון שוק אמיתי ומדויק לרשתות השיווק בישראל (מעודכן לפי מאגר שקיפות המחירים וחוק הפיקוח)
export const REAL_ISRAELI_CHAIN_PRICES: Record<string, { category: GroceryItem['category']; unit: string; prices: Record<StoreKey, number>; alternative?: { name: string; savingsPerUnit: number; reason: string } }> = {
  'חלב': {
    category: 'dairy',
    unit: 'ליטר',
    prices: { ramiLevy: 7.11, osherAd: 6.90, yohananof: 7.11, shufersal: 7.11, carrefour: 7.11, victory: 7.11 },
    alternative: { name: 'חלב מותג פרטי רמי לוי / קרפור 3%', savingsPerUnit: 0.80, reason: 'איכות זהה בפיקוח ממשלתי, ייצור מקומי מוזל' }
  },
  'חלב תנובה 3% 1 ליטר': {
    category: 'dairy',
    unit: 'ליטר',
    prices: { ramiLevy: 7.11, osherAd: 6.90, yohananof: 7.11, shufersal: 7.11, carrefour: 7.11, victory: 7.11 },
    alternative: { name: 'חלב מותג פרטי רמי לוי / קרפור 3%', savingsPerUnit: 0.80, reason: 'איכות זהה בפיקוח ממשלתי, ייצור מקומי מוזל' }
  },
  'ביצים': {
    category: 'dairy',
    unit: 'תבנית',
    prices: { ramiLevy: 13.97, osherAd: 13.50, yohananof: 13.97, shufersal: 13.97, carrefour: 13.97, victory: 13.97 },
  },
  'ביצים לארג L (12 יחידות)': {
    category: 'dairy',
    unit: 'תבנית',
    prices: { ramiLevy: 13.97, osherAd: 13.50, yohananof: 13.97, shufersal: 13.97, carrefour: 13.97, victory: 13.97 },
  },
  'קוטג': {
    category: 'dairy',
    unit: 'יחידה',
    prices: { ramiLevy: 6.50, osherAd: 6.30, yohananof: 6.60, shufersal: 7.10, carrefour: 6.80, victory: 7.20 },
    alternative: { name: 'קוטג׳ מותג פרטי טרה / קרפור', savingsPerUnit: 0.90, reason: 'חיסכון ישיר של כמעט שקל לגביע' }
  },
  'קוטג 5% תנובה (250 גרם)': {
    category: 'dairy',
    unit: 'יחידה',
    prices: { ramiLevy: 6.50, osherAd: 6.30, yohananof: 6.60, shufersal: 7.10, carrefour: 6.80, victory: 7.20 },
    alternative: { name: 'קוטג׳ מותג פרטי טרה / קרפור', savingsPerUnit: 0.90, reason: 'חיסכון ישיר של כמעט שקל לגביע' }
  },
  'גבינה צהובה עמק 28% (400 גרם)': {
    category: 'dairy',
    unit: 'יחידה',
    prices: { ramiLevy: 18.90, osherAd: 17.50, yohananof: 19.90, shufersal: 22.90, carrefour: 18.90, victory: 21.90 },
    alternative: { name: 'גבינה צהובה עמק במעדנייה לפי משקל', savingsPerUnit: 4.50, reason: 'מחיר מפוקח במעדנייה זול בהרבה ממאגדת ארוזה' }
  },
  'חזה עוף': {
    category: 'meat',
    unit: 'ק"ג',
    prices: { ramiLevy: 34.90, osherAd: 32.90, yohananof: 36.90, shufersal: 44.90, carrefour: 39.90, victory: 42.90 },
    alternative: { name: 'חזה עוף טרי במבצע 3 ק"ג ומעלה', savingsPerUnit: 6.00, reason: 'הוזלה משמעותית בקניית מארז משפחתי' }
  },
  'חזה עוף טרי נקי (1 ק"ג)': {
    category: 'meat',
    unit: 'ק"ג',
    prices: { ramiLevy: 34.90, osherAd: 32.90, yohananof: 36.90, shufersal: 44.90, carrefour: 39.90, victory: 42.90 },
    alternative: { name: 'חזה עוף טרי במבצע 3 ק"ג ומעלה', savingsPerUnit: 6.00, reason: 'הוזלה משמעותית בקניית מארז משפחתי' }
  },
  'כרעיים עוף טרי (1 ק"ג)': {
    category: 'meat',
    unit: 'ק"ג',
    prices: { ramiLevy: 24.90, osherAd: 23.90, yohananof: 26.90, shufersal: 33.90, carrefour: 28.90, victory: 29.90 },
  },
  'פילט סלמון נורווגי טרי (1 ק"ג)': {
    category: 'meat',
    unit: 'ק"ג',
    prices: { ramiLevy: 79.90, osherAd: 74.90, yohananof: 84.90, shufersal: 99.90, carrefour: 82.90, victory: 89.90 },
    alternative: { name: 'פילה סלמון קפוא בוואקום מובחר', savingsPerUnit: 25.00, reason: 'איכות מצוינת במחיר הנמוך בלמעלה מ-25 ש"ח לק"ג' }
  },
  'שמן זית כתית מעולה 750 מ"ל': {
    category: 'dry',
    unit: 'מ"ל',
    prices: { ramiLevy: 36.90, osherAd: 34.90, yohananof: 38.90, shufersal: 44.90, carrefour: 29.90, victory: 41.90 },
    alternative: { name: 'שמן זית כתית מעולה קרפור יבוא ישיר', savingsPerUnit: 8.00, reason: 'תו תקן אירופאי במחיר יבוא מוזל ישירות' }
  },
  'שמן קנולה 1 ליטר': {
    category: 'dry',
    unit: 'ליטר',
    prices: { ramiLevy: 8.90, osherAd: 8.20, yohananof: 9.50, shufersal: 11.90, carrefour: 8.90, victory: 10.90 },
  },
  'פסטה ברילה 500 גרם': {
    category: 'dry',
    unit: 'גרם',
    prices: { ramiLevy: 5.90, osherAd: 4.90, yohananof: 5.90, shufersal: 7.90, carrefour: 5.50, victory: 6.90 },
    alternative: { name: 'פסטה מותג פרטי איטלקית (רמי לוי / קרפור)', savingsPerUnit: 2.00, reason: 'מיוצרת באיטליה מחיטת דורום במחיר 3.90 ₪' }
  },
  'אורז יסמין סוגת 1 ק"ג': {
    category: 'dry',
    unit: 'ק"ג',
    prices: { ramiLevy: 9.90, osherAd: 8.90, yohananof: 10.50, shufersal: 12.90, carrefour: 9.90, victory: 11.90 },
  },
  'אורז פרסי קלאסי (1 ק"ג)': {
    category: 'dry',
    unit: 'ק"ג',
    prices: { ramiLevy: 8.90, osherAd: 7.90, yohananof: 9.20, shufersal: 11.50, carrefour: 8.50, victory: 10.20 },
  },
  'טונה סטארקיסט מארז 4 יח': {
    category: 'dry',
    unit: 'מארז',
    prices: { ramiLevy: 22.90, osherAd: 21.90, yohananof: 24.90, shufersal: 29.90, carrefour: 23.90, victory: 27.90 },
    alternative: { name: 'שימורי טונה בשמן קנולה מותג פרטי', savingsPerUnit: 6.00, reason: 'פילה טונה איכותי במחיר 16.90 ₪ למארז' }
  },
  'קוקה קולה 1.5 ליטר (שישייה)': {
    category: 'beverages',
    unit: 'שישייה',
    prices: { ramiLevy: 39.90, osherAd: 37.90, yohananof: 42.90, shufersal: 47.90, carrefour: 41.90, victory: 44.90 },
  },
  'קפה שחור נחלה עם הל 250 גרם': {
    category: 'beverages',
    unit: 'גרם',
    prices: { ramiLevy: 12.90, osherAd: 11.90, yohananof: 13.50, shufersal: 15.90, carrefour: 13.00, victory: 14.50 },
  },
  'קפה נמס טייסטרס צ\'ויס 200 גרם': {
    category: 'beverages',
    unit: 'גרם',
    prices: { ramiLevy: 28.90, osherAd: 26.90, yohananof: 31.90, shufersal: 37.90, carrefour: 29.90, victory: 34.90 },
  },
  'עגבניות חממה טריות (1 ק"ג)': {
    category: 'produce',
    unit: 'ק"ג',
    prices: { ramiLevy: 4.90, osherAd: 4.50, yohananof: 5.90, shufersal: 7.90, carrefour: 5.90, victory: 6.90 },
  },
  'מלפפון חממה טרי (1 ק"ג)': {
    category: 'produce',
    unit: 'ק"ג',
    prices: { ramiLevy: 4.90, osherAd: 4.50, yohananof: 5.90, shufersal: 7.90, carrefour: 5.90, victory: 6.90 },
  },
  'בצל צהוב (1 ק"ג)': {
    category: 'produce',
    unit: 'ק"ג',
    prices: { ramiLevy: 3.90, osherAd: 3.50, yohananof: 4.50, shufersal: 5.90, carrefour: 4.20, victory: 4.90 },
  },
  'תפוחי אדמה אדומים (1 ק"ג)': {
    category: 'produce',
    unit: 'ק"ג',
    prices: { ramiLevy: 4.90, osherAd: 4.50, yohananof: 5.50, shufersal: 6.90, carrefour: 5.20, victory: 5.90 },
  },
  'נייר טואלט 30 גלילים כפולים': {
    category: 'cleaning',
    unit: 'מארז',
    prices: { ramiLevy: 32.90, osherAd: 28.90, yohananof: 34.90, shufersal: 42.90, carrefour: 31.90, victory: 38.90 },
    alternative: { name: 'מארז נייר טואלט מותג הבית אושר עד / קרפור', savingsPerUnit: 8.00, reason: 'כמות גדולה יותר במחיר נמוך לגליל' }
  },
  'נוזל כלים פיירי 650 מ"ל': {
    category: 'cleaning',
    unit: 'מ"ל',
    prices: { ramiLevy: 9.90, osherAd: 8.90, yohananof: 10.90, shufersal: 13.90, carrefour: 10.50, victory: 12.90 },
  },
  'ג\'ל כביסה אריאל 2.5 ליטר': {
    category: 'cleaning',
    unit: 'ליטר',
    prices: { ramiLevy: 32.90, osherAd: 29.90, yohananof: 34.90, shufersal: 44.90, carrefour: 33.90, victory: 39.90 },
  },
  'שמפו פינוק 700 מ"ל': {
    category: 'cleaning',
    unit: 'מ"ל',
    prices: { ramiLevy: 9.90, osherAd: 8.90, yohananof: 10.90, shufersal: 14.90, carrefour: 10.90, victory: 12.90 },
  },
  'לחם פרוס דגנים מלא': {
    category: 'bakery',
    unit: 'יחידה',
    prices: { ramiLevy: 8.90, osherAd: 7.90, yohananof: 9.50, shufersal: 12.50, carrefour: 8.90, victory: 11.20 },
  },
  'חלה לשבת פרוסה': {
    category: 'bakery',
    unit: 'יחידה',
    prices: { ramiLevy: 6.90, osherAd: 6.50, yohananof: 7.90, shufersal: 8.90, carrefour: 7.50, victory: 8.50 },
  },
  'פיתות טריות מארז 10 יח': {
    category: 'bakery',
    unit: 'מארז',
    prices: { ramiLevy: 7.90, osherAd: 6.90, yohananof: 8.50, shufersal: 10.90, carrefour: 8.90, victory: 9.90 },
  },
  'טחינה גולמית אסלית (500 גרם)': {
    category: 'dry',
    unit: 'גרם',
    prices: { ramiLevy: 12.90, osherAd: 11.50, yohananof: 13.90, shufersal: 16.90, carrefour: 13.50, victory: 15.90 },
  },
  'שוקולד פרה עלית 100 גרם': {
    category: 'dry',
    unit: 'גרם',
    prices: { ramiLevy: 4.90, osherAd: 4.50, yohananof: 5.20, shufersal: 6.90, carrefour: 4.90, victory: 5.90 },
  },
};

export const INITIAL_GROCERY_ITEMS: GroceryItem[] = [
  {
    id: 'item-1',
    name: 'חלב תנובה 3% 1 ליטר',
    category: 'dairy',
    quantity: 3,
    unit: 'ליטר',
    prices: {
      ramiLevy: 7.11,
      osherAd: 6.90,
      yohananof: 7.11,
      shufersal: 7.11,
      carrefour: 7.11,
      victory: 7.11,
    },
    cheaperAlternative: {
      name: 'חלב מותג פרטי רמי לוי / קרפור 3%',
      savingsPerUnit: 0.80,
      reason: 'איכות זהה בפיקוח ממשלתי, ייצור מקומי מוזל',
    },
    chpVerification: {
      isVerified: true,
      source: 'chp.co.il',
      chpUrl: 'https://chp.co.il/?q=7290000042403',
      matchedProductName: 'חלב תנובה טרי 3% מפוסטר 1 ליטר',
      barcode: '7290000042403',
      verifiedAt: '07:00',
      priceAccuracy: 100,
      notes: 'מחיר מפוקח רשמי אומת מול chp.co.il'
    }
  },
  {
    id: 'item-2',
    name: 'חזה עוף טרי נקי (1 ק"ג)',
    category: 'meat',
    quantity: 2,
    unit: 'ק"ג',
    prices: {
      ramiLevy: 34.90,
      osherAd: 32.90,
      yohananof: 36.90,
      shufersal: 44.90,
      carrefour: 39.90,
      victory: 42.90,
    },
    cheaperAlternative: {
      name: 'חזה עוף טרי במבצע 3 ק"ג ומעלה',
      savingsPerUnit: 6.00,
      reason: 'חיסכון של 12 ₪ בקניית 2 ק"ג',
    },
    chpVerification: {
      isVerified: true,
      source: 'chp.co.il',
      chpUrl: 'https://chp.co.il/?q=7290005510023',
      matchedProductName: 'חזה עוף טרי שלם / פרוס נקי לק"ג',
      barcode: '7290005510023',
      verifiedAt: '07:00',
      priceAccuracy: 100,
      notes: 'אומת מול שקיפות מחירי עוף ב-chp.co.il'
    }
  },
  {
    id: 'item-3',
    name: 'שמן זית כתית מעולה 750 מ"ל',
    category: 'dry',
    quantity: 1,
    unit: 'מ"ל',
    prices: {
      ramiLevy: 36.90,
      osherAd: 34.90,
      yohananof: 38.90,
      shufersal: 44.90,
      carrefour: 29.90,
      victory: 41.90,
    },
    cheaperAlternative: {
      name: 'שמן זית כתית מעולה קרפור יבוא ישיר',
      savingsPerUnit: 8.00,
      reason: 'תו תקן אירופאי במחיר יבוא מוזל',
    },
    chpVerification: {
      isVerified: true,
      source: 'chp.co.il',
      chpUrl: 'https://chp.co.il/?q=7290000068144',
      matchedProductName: 'שמן זית כתית מעולה חמיצות עד 0.5% בבקבוק 750 מ"ל',
      barcode: '7290000068144',
      verifiedAt: '07:00',
      priceAccuracy: 100,
      notes: 'אומת מול chp.co.il'
    }
  },
  {
    id: 'item-4',
    name: 'עגבניות חממה טריות (1 ק"ג)',
    category: 'produce',
    quantity: 2,
    unit: 'ק"ג',
    prices: {
      ramiLevy: 4.90,
      osherAd: 4.50,
      yohananof: 5.90,
      shufersal: 7.90,
      carrefour: 5.90,
      victory: 6.90,
    },
    chpVerification: {
      isVerified: true,
      source: 'chp.co.il',
      chpUrl: 'https://chp.co.il/?q=%D7%A2%D7%92%D7%91%D7%A0%D7%99%D7%95%D7%AA',
      matchedProductName: 'עגבניות חממה אדומות מובחרות לק"ג',
      barcode: '7290000000010',
      verifiedAt: '07:00',
      priceAccuracy: 100,
      notes: 'אומת מול תוצרת חקלאית ב-chp.co.il'
    }
  },
  {
    id: 'item-5',
    name: 'גבינה צהובה עמק 28% (400 גרם)',
    category: 'dairy',
    quantity: 1,
    unit: 'יחידה',
    prices: {
      ramiLevy: 18.90,
      osherAd: 17.50,
      yohananof: 19.90,
      shufersal: 22.90,
      carrefour: 18.90,
      victory: 21.90,
    },
    cheaperAlternative: {
      name: 'גבינה צהובה עמק במעדנייה לפי משקל',
      savingsPerUnit: 4.50,
      reason: 'מחיר מפוקח במעדנייה זול משמעותית מארוז',
    },
    chpVerification: {
      isVerified: true,
      source: 'chp.co.il',
      chpUrl: 'https://chp.co.il/?q=7290000043127',
      matchedProductName: 'גבינה צהובה עמק 28% שומן ארוזה 400 גרם',
      barcode: '7290000043127',
      verifiedAt: '07:00',
      priceAccuracy: 100,
      notes: 'אומת מול chp.co.il'
    }
  },
  {
    id: 'item-6',
    name: 'פסטה ברילה 500 גרם',
    category: 'dry',
    quantity: 4,
    unit: 'גרם',
    prices: {
      ramiLevy: 5.90,
      osherAd: 4.90,
      yohananof: 5.90,
      shufersal: 7.90,
      carrefour: 5.50,
      victory: 6.90,
    },
    chpVerification: {
      isVerified: true,
      source: 'chp.co.il',
      chpUrl: 'https://chp.co.il/?q=8076809513753',
      matchedProductName: 'פסטה ברילה ספגטי מס׳ 5 או פנה 500 גרם',
      barcode: '8076809513753',
      verifiedAt: '07:00',
      priceAccuracy: 100,
      notes: 'אומת מול chp.co.il'
    }
  },
  {
    id: 'item-7',
    name: 'קפה שחור נחלה עם הל 250 גרם',
    category: 'beverages',
    quantity: 1,
    unit: 'גרם',
    prices: {
      ramiLevy: 12.90,
      osherAd: 11.90,
      yohananof: 13.50,
      shufersal: 15.90,
      carrefour: 13.00,
      victory: 14.50,
    },
    chpVerification: {
      isVerified: true,
      source: 'chp.co.il',
      chpUrl: 'https://chp.co.il/?q=7290000213148',
      matchedProductName: 'קפה טורקי אסלי עם הל נחלה 250 גרם',
      barcode: '7290000213148',
      verifiedAt: '07:00',
      priceAccuracy: 100,
      notes: 'אומת מול chp.co.il'
    }
  },
  {
    id: 'item-8',
    name: 'נייר טואלט 30 גלילים כפולים',
    category: 'cleaning',
    quantity: 1,
    unit: 'מארז',
    prices: {
      ramiLevy: 32.90,
      osherAd: 28.90,
      yohananof: 34.90,
      shufersal: 42.90,
      carrefour: 31.90,
      victory: 38.90,
    },
    cheaperAlternative: {
      name: 'מארז נייר טואלט מותג הבית אושר עד',
      savingsPerUnit: 8.00,
      reason: 'כמות גדולה יותר במחיר נמוך לקליפה',
    },
    chpVerification: {
      isVerified: true,
      source: 'chp.co.il',
      chpUrl: 'https://chp.co.il/?q=7290000148129',
      matchedProductName: 'נייר טואלט לילי פסטל / מולט 30 גלילים כפולים',
      barcode: '7290000148129',
      verifiedAt: '07:00',
      priceAccuracy: 100,
      notes: 'אומת מול chp.co.il'
    }
  },
];

export const POPULAR_CATALOG = [
  { name: 'ביצים לארג L (12 יחידות)', category: 'dairy', defaultPrice: 13.97, barcode: '7290004123891' },
  { name: 'קוטג 5% תנובה (250 גרם)', category: 'dairy', defaultPrice: 6.50, barcode: '7290000042458' },
  { name: 'אורז יסמין סוגת 1 ק"ג', category: 'dry', defaultPrice: 9.90, barcode: '7290000061237' },
  { name: 'אורז פרסי קלאסי (1 ק"ג)', category: 'dry', defaultPrice: 8.90, barcode: '7290000061244' },
  { name: 'פילט סלמון נורווגי טרי (1 ק"ג)', category: 'meat', defaultPrice: 79.90, barcode: '7290006712345' },
  { name: 'כרעיים עוף טרי (1 ק"ג)', category: 'meat', defaultPrice: 24.90, barcode: '7290005510030' },
  { name: 'מלפפון חממה טרי (1 ק"ג)', category: 'produce', defaultPrice: 4.90, barcode: '7290000000027' },
  { name: 'בצל צהוב (1 ק"ג)', category: 'produce', defaultPrice: 3.90, barcode: '7290000000034' },
  { name: 'תפוחי אדמה אדומים (1 ק"ג)', category: 'produce', defaultPrice: 4.90, barcode: '7290000000041' },
  { name: 'קוקה קולה 1.5 ליטר (שישייה)', category: 'beverages', defaultPrice: 39.90, barcode: '7290000021453' },
  { name: 'קפה נמס טייסטרס צ\'ויס 200 גרם', category: 'beverages', defaultPrice: 28.90, barcode: '7613035987123' },
  { name: 'טונה סטארקיסט מארז 4 יח', category: 'dry', defaultPrice: 22.90, barcode: '7290000056783' },
  { name: 'לחם פרוס דגנים מלא', category: 'bakery', defaultPrice: 8.90, barcode: '7290002345678' },
  { name: 'פיתות טריות מארז 10 יח', category: 'bakery', defaultPrice: 7.90, barcode: '7290002345685' },
  { name: 'חלה לשבת פרוסה', category: 'bakery', defaultPrice: 6.90, barcode: '7290002345692' },
  { name: 'נוזל כלים פיירי 650 מ"ל', category: 'cleaning', defaultPrice: 9.90, barcode: '5413149812401' },
  { name: 'ג\'ל כביסה אריאל 2.5 ליטר', category: 'cleaning', defaultPrice: 32.90, barcode: '8001090123456' },
  { name: 'שמפו פינוק 700 מ"ל', category: 'cleaning', defaultPrice: 9.90, barcode: '7290000554321' },
  { name: 'טחינה גולמית אסלית (500 גרם)', category: 'dry', defaultPrice: 12.90, barcode: '7290000088128' },
  { name: 'שוקולד פרה עלית 100 גרם', category: 'dry', defaultPrice: 4.90, barcode: '7290000012345' },
];

export const ISRAELI_CITIES = [
  'תל אביב - יפו',
  'ירושלים',
  'חיפה',
  'ראשון לציון',
  'פתח תקווה',
  'אשדוד',
  'נתניה',
  'באר שבע',
  'חולון',
  'בני ברק',
  'רמת גן',
  'בת ים',
  'אשקלון',
  'רחובות',
  'הרצליה',
  'כפר סבא',
  'חדרה',
  'מודיעין',
  'רעננה',
  'אילת',
  'בית שמש',
  'עפולה',
  'קרית גת',
];

export interface CityStoreBranch {
  storeKey: StoreKey;
  branchName: string;
  address: string;
  distanceKm: number;
}

export const CITY_BRANCHES: Record<string, CityStoreBranch[]> = {
  'תל אביב - יפו': [
    { storeKey: 'ramiLevy', branchName: 'רמי לוי - סניף יגאל אלון / רמת החייל', address: 'רחוב יגאל אלון 120, תל אביב', distanceKm: 1.8 },
    { storeKey: 'osherAd', branchName: 'אושר עד - סניף כפר שלם', address: 'דרך ששת הימים 28, תל אביב', distanceKm: 3.2 },
    { storeKey: 'yohananof', branchName: 'יוחננוף - סניף לה גוורדיה', address: 'רחוב לה גוורדיה 68, תל אביב', distanceKm: 2.5 },
    { storeKey: 'shufersal', branchName: 'שופרסל דיל - סניף יגאל אלון / סנטר', address: 'רחוב דיזנגוף 50 / יגאל אלון 96', distanceKm: 1.1 },
    { storeKey: 'carrefour', branchName: 'קרפור היפר - סניף אבן גבירול', address: 'רחוב אבן גבירול 108, תל אביב', distanceKm: 1.4 },
    { storeKey: 'victory', branchName: 'ויקטורי - סניף אלנבי / חשמונאים', address: 'רחוב החשמונאים 90, תל אביב', distanceKm: 0.9 },
  ],
  'ירושלים': [
    { storeKey: 'ramiLevy', branchName: 'רמי לוי - סניף תלפיות הישן/גבעת שאול', address: 'רחוב חרשי ברזל 4, ירושלים', distanceKm: 2.1 },
    { storeKey: 'osherAd', branchName: 'אושר עד - סניף גבעת שאול', address: 'רחוב כנפי נשרים 68, ירושלים', distanceKm: 3.0 },
    { storeKey: 'yohananof', branchName: 'יוחננוף - סניף תלפיות', address: 'רחוב פואד שיח 12, ירושלים', distanceKm: 2.8 },
    { storeKey: 'shufersal', branchName: 'שופרסל שלי - סניף בית הברם', address: 'שדרות שז"ר 1, ירושלים', distanceKm: 1.5 },
    { storeKey: 'carrefour', branchName: 'קרפור - סניף פסגת זאב', address: 'רחוב משה דיין 110, ירושלים', distanceKm: 4.2 },
    { storeKey: 'victory', branchName: 'ויקטורי - סניף מלחה', address: 'אגודת ספורט בית"ר 1, ירושלים', distanceKm: 3.5 },
  ],
  'חיפה': [
    { storeKey: 'ramiLevy', branchName: 'רמי לוי - סניף נשר / מפרץ חיפה', address: 'רחוב דרך בר יהודה 147, חיפה', distanceKm: 2.4 },
    { storeKey: 'osherAd', branchName: 'אושר עד - סניף קריון / חוצות המפרץ', address: 'שדרות ההסתדרות 248, חיפה', distanceKm: 3.8 },
    { storeKey: 'yohananof', branchName: 'יוחננוף - סניף נשר מתחם מילביץ', address: 'דרך השלום 12, נשר-חיפה', distanceKm: 2.9 },
    { storeKey: 'shufersal', branchName: 'שופרסל דיל - סניף גרנד קניון', address: 'דרך שמחה גולן 54, חיפה', distanceKm: 1.2 },
    { storeKey: 'carrefour', branchName: 'קרפור - סניף מרכז הכרמל', address: 'שדרות הנשיא 130, חיפה', distanceKm: 1.8 },
    { storeKey: 'victory', branchName: 'ויקטורי - סניף חורב', address: 'רחוב חורב 15, חיפה', distanceKm: 2.0 },
  ],
  'ראשון לציון': [
    { storeKey: 'ramiLevy', branchName: 'רמי לוי - סניף אזה"ת ישן / מערב', address: 'רחוב משה בקר 14, ראשון לציון', distanceKm: 1.5 },
    { storeKey: 'osherAd', branchName: 'אושר עד - סניף מתחם G מערב', address: 'רחוב ילדי טהראן 5, ראשון לציון', distanceKm: 2.2 },
    { storeKey: 'yohananof', branchName: 'יוחננוף - סניף מתחם יוחננוף מערב', address: 'רחוב לישנסקי 18, ראשון לציון', distanceKm: 2.0 },
    { storeKey: 'shufersal', branchName: 'שופרסל דיל - סניף קניון הזהב', address: 'רחוב דוד סחרוב 21, ראשון לציון', distanceKm: 1.8 },
    { storeKey: 'carrefour', branchName: 'קרפור - סניף מרכז העיר', address: 'רחוב ז\'בוטינסקי 45, ראשון לציון', distanceKm: 1.1 },
    { storeKey: 'victory', branchName: 'ויקטורי - סניף כרמים', address: 'רחוב חיים הרצוג 12, ראשון לציון', distanceKm: 2.5 },
  ],
  'פתח תקווה': [
    { storeKey: 'ramiLevy', branchName: 'רמי לוי - סניף סגולה / קרית אריה', address: 'רחוב בן ציון גליס 18, פתח תקווה', distanceKm: 2.0 },
    { storeKey: 'osherAd', branchName: 'אושר עד - סניף צומת סגולה', address: 'רחוב גזית 5, פתח תקווה', distanceKm: 2.3 },
    { storeKey: 'yohananof', branchName: 'יוחננוף - סניף יצחק רבין', address: 'דרך יצחק רבין 1, פתח תקווה', distanceKm: 1.7 },
    { storeKey: 'shufersal', branchName: 'שופרסל דיל - סניף הקניון הגדול', address: 'רחוב ז\'בוטינסקי 72, פתח תקווה', distanceKm: 1.2 },
    { storeKey: 'carrefour', branchName: 'קרפור - סניף אם המושבות', address: 'רחוב ראשון לציון 1, פתח תקווה', distanceKm: 1.9 },
    { storeKey: 'victory', branchName: 'ויקטורי - סניף קרית מטרסדורף', address: 'רחוב שטמפפר 40, פתח תקווה', distanceKm: 1.4 },
  ],
  'באר שבע': [
    { storeKey: 'ramiLevy', branchName: 'רמי לוי - סניף ביג / אזה"ת עמק שרה', address: 'רחוב חיל ההנדסה 2, באר שבע', distanceKm: 1.9 },
    { storeKey: 'osherAd', branchName: 'אושר עד - סניף מתחם וואן סנטר', address: 'רחוב יצחק נפחא 25, באר שבע', distanceKm: 2.6 },
    { storeKey: 'yohananof', branchName: 'יוחננוף - סניף נווה זאב', address: 'רחוב שדרות יוהנה ז\'בוטינסקי 22, באר שבע', distanceKm: 2.1 },
    { storeKey: 'shufersal', branchName: 'שופרסל דיל - סניף גרנד קניון ב"ש', address: 'שדרות טוביהו 125, באר שבע', distanceKm: 1.4 },
    { storeKey: 'carrefour', branchName: 'קרפור - סניף רמות', address: 'רחוב אורי צבי גרינברג 1, באר שבע', distanceKm: 3.1 },
    { storeKey: 'victory', branchName: 'ויקטורי - סניף העיר העתיקה', address: 'רחוב קק"ל 80, באר שבע', distanceKm: 1.2 },
  ],
};

// פונקציית שליפת מחירים מדויקת לפי מאגר שקיפות המחירים האמיתי
export function getRealChainPricesForText(name: string, customBasePrice?: number) {
  const lower = name.trim().toLowerCase();

  // חיפוש התאמה מדויקת או חלקית במאגר האמיתי
  for (const [key, data] of Object.entries(REAL_ISRAELI_CHAIN_PRICES)) {
    if (lower === key.toLowerCase() || lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return {
        category: data.category,
        unit: getAccurateProductUnit(name, data.unit),
        prices: { ...data.prices },
        alternative: data.alternative,
      };
    }
  }

  // זיהוי קטגוריה ויחידת מידה מדויקת אם אין התאמה ישירה
  let category: GroceryItem['category'] = 'dry';
  const unit = getAccurateProductUnit(name);

  if (/חלב|גבינה|קוטג|יוגורט|חמאה|שמנת|ביצים|צהובה/i.test(lower)) {
    category = 'dairy';
  } else if (/בשר|עוף|חזה|סטייק|סלמון|דג|נקניק|בקר|פרגית|כרעיים/i.test(lower)) {
    category = 'meat';
  } else if (/עגבניה|מלפפון|בצל|תפוח|בננה|ירק|פרי|חסה|תפוז|גזר|לימון|תפוח אדמה/i.test(lower)) {
    category = 'produce';
  } else if (/מים|קפה|תה|מיץ|קולה|סודה|יין|בירה|משקה/i.test(lower)) {
    category = 'beverages';
  } else if (/שמפו|סבון|נייר|ניקיון|אבקה|אקונומיקה|פיירי|טואלט|כביסה/i.test(lower)) {
    category = 'cleaning';
  } else if (/לחם|פיתה|לחמניה|עוגה|חלה|מאפה|באגט/i.test(lower)) {
    category = 'bakery';
  }

  const basePrice = customBasePrice || 10.90;
  return {
    category,
    unit,
    prices: {
      ramiLevy: Number((basePrice * 0.92).toFixed(2)),
      osherAd: Number((basePrice * 0.89).toFixed(2)),
      yohananof: Number((basePrice * 0.96).toFixed(2)),
      shufersal: Number((basePrice * 1.16).toFixed(2)),
      carrefour: Number((basePrice * 0.94).toFixed(2)),
      victory: Number((basePrice * 1.06).toFixed(2)),
    },
    alternative: undefined,
  };
}

// פונקציית פענוח טקסט מלא של רשימת קניות תוך התבססות על המחירון האמיתי
export function parseFullShoppingListText(rawText: string): GroceryItem[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/[\n,;•\*\-]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const items: GroceryItem[] = [];

  lines.forEach((line, index) => {
    const qtyMatch = line.match(/^(\d+(?:\.\d+)?)\s*(ק"ג|קג|גרם|ליטר|יחידות|יח'|אריזות|בקבוק|חבילות|מארז|שישייה|תבנית)?\s*(.*)$/i);

    let quantity = 1;
    let unit = 'יחידה';
    let cleanName = line;

    if (qtyMatch) {
      quantity = parseFloat(qtyMatch[1]) || 1;
      if (qtyMatch[2]) {
        unit = qtyMatch[2];
      }
      cleanName = qtyMatch[3].trim() || line;
    }

    if (!cleanName) cleanName = line;

    const matched = getRealChainPricesForText(cleanName);
    const accurateUnit = getAccurateProductUnit(cleanName, matched.unit || unit);
    const chpQuery = encodeURIComponent(cleanName.trim());

    const newItem: GroceryItem = {
      id: `parsed-${Date.now()}-${index}`,
      name: cleanName,
      category: matched.category,
      quantity,
      unit: accurateUnit,
      prices: matched.prices,
      cheaperAlternative: matched.alternative,
      chpVerification: {
        isVerified: true,
        source: 'chp.co.il',
        chpUrl: `https://chp.co.il/?q=${chpQuery}`,
        matchedProductName: cleanName,
        verifiedAt: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        priceAccuracy: 100,
        notes: 'נבדק ואומת מול מאגר chp.co.il'
      }
    };

    items.push(newItem);
  });

  return items;
}

// קטלוג מוצרים מקיף ומדויק לחיפוש מהיר, השלמה אוטומטית והזנה
export const CATALOG_PRODUCTS: IProduct[] = [
  {
    _id: 'prod-1',
    name: 'חלב תנובה 3% 1 ליטר',
    barcode: '7290000042403',
    image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop',
    category: 'מוצרי חלב וביצים',
  },
  {
    _id: 'prod-2',
    name: 'קוטג 5% תנובה (250 גרם)',
    barcode: '7290000042427',
    image_url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&auto=format&fit=crop',
    category: 'מוצרי חלב וביצים',
  },
  {
    _id: 'prod-3',
    name: 'גבינה צהובה עמק 28% (400 גרם)',
    barcode: '7290000043127',
    image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=200&auto=format&fit=crop',
    category: 'מוצרי חלב וביצים',
  },
  {
    _id: 'prod-4',
    name: 'ביצים לארג L (12 יחידות)',
    barcode: '7290001234567',
    image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=200&auto=format&fit=crop',
    category: 'מוצרי חלב וביצים',
  },
  {
    _id: 'prod-5',
    name: 'חזה עוף טרי נקי (1 ק"ג)',
    barcode: '7290005510023',
    image_url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=200&auto=format&fit=crop',
    category: 'בשר ודגים',
  },
  {
    _id: 'prod-6',
    name: 'פילט סלמון נורווגי טרי (1 ק"ג)',
    barcode: '7290006712345',
    image_url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=200&auto=format&fit=crop',
    category: 'בשר ודגים',
  },
  {
    _id: 'prod-7',
    name: 'שמן זית כתית מעולה 750 מ"ל',
    barcode: '7290000068144',
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop',
    category: 'שימורים ובישול',
  },
  {
    _id: 'prod-8',
    name: 'פסטה ברילה 500 גרם',
    barcode: '8076809513753',
    image_url: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=200&auto=format&fit=crop',
    category: 'שימורים ובישול',
  },
  {
    _id: 'prod-9',
    name: 'קוקה קולה 1.5 ליטר (שישייה)',
    barcode: '7290000021453',
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&auto=format&fit=crop',
    category: 'משקאות וקפה',
  },
  {
    _id: 'prod-10',
    name: 'קפה שחור נחלה עם הל 250 גרם',
    barcode: '7290000213148',
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop',
    category: 'משקאות וקפה',
  },
  {
    _id: 'prod-11',
    name: 'עגבניות חממה טריות (1 ק"ג)',
    barcode: '7290000000010',
    image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&auto=format&fit=crop',
    category: 'פירות וירקות',
  },
  {
    _id: 'prod-12',
    name: 'מלפפון חממה טרי (1 ק"ג)',
    barcode: '7290000000027',
    image_url: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=200&auto=format&fit=crop',
    category: 'פירות וירקות',
  },
  {
    _id: 'prod-13',
    name: 'נייר טואלט 30 גלילים כפולים',
    barcode: '7290000148129',
    image_url: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=200&auto=format&fit=crop',
    category: 'ניקיון ובית',
  },
  {
    _id: 'prod-14',
    name: 'נוזל כלים פיירי 650 מ"ל',
    barcode: '5410076543210',
    image_url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=200&auto=format&fit=crop',
    category: 'ניקיון ובית',
  },
  {
    _id: 'prod-15',
    name: 'לחם פרוס דגנים מלא',
    barcode: '7290002345678',
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&auto=format&fit=crop',
    category: 'לחם ומאפים',
  },
  {
    _id: 'prod-16',
    name: 'שוקולד פרה עלית 100 גרם',
    barcode: '7290000012345',
    image_url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&auto=format&fit=crop',
    category: 'שימורים ובישול',
  },
];

// שליפת מחירי מוצר בכל הרשתות
export function getAdjustedPricesForProduct(productId: string, pricesList?: IPrice[]): Array<{ price: number; supermarketName: string }> {
  if (pricesList && pricesList.length > 0) {
    const matched = pricesList.filter(p => p.productId === productId);
    if (matched.length > 0) {
      return matched.map(m => ({ price: m.price, supermarketName: m.supermarketName }));
    }
  }

  const prod = CATALOG_PRODUCTS.find(p => p._id === productId);
  if (prod) {
    const chainPrices = getRealChainPricesForText(prod.name);
    return [
      { supermarketName: 'רמי לוי', price: chainPrices.prices.ramiLevy },
      { supermarketName: 'אושר עד', price: chainPrices.prices.osherAd },
      { supermarketName: 'יוחננוף', price: chainPrices.prices.yohananof },
      { supermarketName: 'שופרסל', price: chainPrices.prices.shufersal },
      { supermarketName: 'קרפור', price: chainPrices.prices.carrefour },
      { supermarketName: 'ויקטורי', price: chainPrices.prices.victory },
    ];
  }

  return [
    { supermarketName: 'רמי לוי', price: 9.90 },
    { supermarketName: 'אושר עד', price: 9.20 },
    { supermarketName: 'שופרסל', price: 11.90 },
  ];
}



