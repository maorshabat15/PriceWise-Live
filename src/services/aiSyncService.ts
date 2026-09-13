import { GoogleGenAI, Type } from "@google/genai";
import { ProductModel, PriceModel } from "../db/models.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface RawScrapedItem {
  rawText?: string;
  itemCode?: string;
  price: number;
  chainName: string;
}

// Helper to call Gemini with retry on 503/429/UNAVAILABLE and model fallback
async function callGeminiWithRetry(params: {
  contents: any;
  config?: any;
  models?: string[];
  maxRetries?: number;
}) {
  const models = params.models || ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"];
  const maxRetries = params.maxRetries ?? 3;
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const isTransient =
          err?.status === 503 ||
          err?.status === "UNAVAILABLE" ||
          err?.status === 429 ||
          err?.message?.includes("503") ||
          err?.message?.includes("high demand") ||
          err?.message?.includes("UNAVAILABLE");

        if (isTransient && attempt < maxRetries) {
          const waitTime = attempt * 800 + Math.random() * 400;
          console.warn(`[AI Retry] Model ${model} returned transient error. Retrying in ${Math.round(waitTime)}ms (attempt ${attempt}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          break; // Try next model if available
        }
      }
    }
  }

  throw lastError;
}

// פענוח חכם של פריטים גולמיים בעזרת Gemini
export async function parseAndEnrichWithAI(rawItems: RawScrapedItem[]) {
  if (!rawItems || rawItems.length === 0) return [];

  const prompt = `אתה מומחה לקטלוג מוצרי סופרמרקט בישראל עבור אפליקציית PriceWise.
קבל רשימת פריטים גולמית שהגיעה מרשתות השיווק, ונקה/פענח אותה למבנה תקני:
1. barcode: הברקוד המקורי או ברקוד מנוקה.
2. name: שם מוצר מלא, נקי וברור בעברית (ללא קיצורי קופה מוזרים).
3. category: אחת מהקטגוריות בלבד: מוצרי חלב וביצים, בשר ודגים, לחם ומאפים, פירות וירקות, שימורים ובישול, סלטים וממרחים, ניקיון ובית, משקאות וקפה.
4. imageUrl: קישור תמונה גנרי מתאים מ-Unsplash.
5. isPrivateLabel: true אם מדובר במותג פרטי (שופרסל, רמי לוי, מותג הבית), אחרת false.

רשימת פריטים גולמית:
${JSON.stringify(rawItems, null, 2)}`;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        barcode: { type: Type.STRING },
        name: { type: Type.STRING },
        category: { type: Type.STRING },
        imageUrl: { type: Type.STRING },
        isPrivateLabel: { type: Type.BOOLEAN }
      },
      required: ["barcode", "name", "category", "isPrivateLabel"]
    }
  };

  try {
    const response = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    const enriched = JSON.parse(response.text || "[]");
    return enriched;
  } catch (error) {
    console.error("AI Parsing Error:", error);
    // Fallback: return basic enriched items without crashing
    return rawItems.map((item, idx) => ({
      barcode: item.itemCode || `bar_${Date.now()}_${idx}`,
      name: item.rawText || "מוצר כללי",
      category: "שימורים ובישול",
      imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop",
      isPrivateLabel: false,
    }));
  }
}

// העלאת הנתונים המפוענחים ישירות למאגר הנתונים
export async function syncItemsToDatabase(rawItems: RawScrapedItem[]) {
  const enrichedProducts = await parseAndEnrichWithAI(rawItems);
  let updatedCount = 0;

  for (let i = 0; i < rawItems.length; i++) {
    const raw = rawItems[i];
    const enriched = enrichedProducts[i] || {
      barcode: raw.itemCode || `bar_${Date.now()}_${i}`,
      name: raw.rawText || "מוצר כללי",
      category: "שימורים ובישול",
      imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop"
    };

    // 1. שמירה או איתור המוצר בקטלוג
    const existingProducts = await ProductModel.find({ barcode: enriched.barcode });
    let product = existingProducts.length > 0 ? existingProducts[0] : null;

    if (!product) {
      product = await ProductModel.create({
        name: enriched.name,
        barcode: enriched.barcode,
        image_url: enriched.imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop",
        category: enriched.category
      });
    }

    // 2. עדכון המחיר ברשת המתאימה
    await PriceModel.create({
      productId: product._id,
      supermarketName: raw.chainName,
      price: Number(raw.price),
      lastUpdated: new Date()
    });

    updatedCount++;
  }

  return { success: true, updatedCount };
}

// פענוח חשבונית או טקסט חופשי לחילוץ פריטים ומחירים
export async function parseRawReceiptText(receiptText: string) {
  if (!receiptText || !receiptText.trim()) return [];

  const prompt = `אתה מומחה לפענוח חשבוניות קנייה וסלי מוצרים מסופרמרקטים בישראל עבור PriceWise.
קבל טקסט חופשי/גולמי של חשבונית או רשימת מחירים (יכול לכלול קיצורי קופה, מחירים ושמות רשתות), וחלץ את כל המוצרים למבנה מובנה:
1. rawText: שם הפריט המקורי כפי שמופיע בטקסט.
2. cleanName: שם מוצר תקני, נקי וקריא בעברית.
3. price: מחיר המוצר (מספר עשרוני).
4. chainName: שם הרשת (אם זוהה מתוך הטקסט כמו שופרסל/רמי לוי/יוחננוף, ברירת מחדל: "שופרסל").
5. category: אחת מהקטגוריות: מוצרי חלב וביצים, בשר ודגים, לחם ומאפים, פירות וירקות, שימורים ובישול, סלטים וממרחים, ניקיון ובית, משקאות וקפה.

טקסט החשבונית/המחירים:
"""
${receiptText}
"""`;

  const responseSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        rawText: { type: Type.STRING },
        cleanName: { type: Type.STRING },
        price: { type: Type.NUMBER },
        chainName: { type: Type.STRING },
        category: { type: Type.STRING }
      },
      required: ["rawText", "cleanName", "price", "chainName", "category"]
    }
  };

  try {
    const response = await callGeminiWithRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Receipt Parsing Error:", error);

    // Fallback heuristic regex parser if Gemini is temporarily unavailable (503 / network issue)
    return parseReceiptHeuristic(receiptText);
  }
}

// גיבוי אוטונומי לפענוח חשבוניות במקרה של עומס רגעי על שרתי ה-AI
function parseReceiptHeuristic(receiptText: string) {
  const lines = receiptText.split("\n").map(l => l.trim()).filter(Boolean);
  let defaultChain = "שופרסל";

  // Check if header contains a chain name
  for (const line of lines) {
    if (line.includes("רמי לוי")) {
      defaultChain = "רמי לוי";
      break;
    } else if (line.includes("יוחננוף")) {
      defaultChain = "יוחננוף";
      break;
    } else if (line.includes("שופרסל") || line.includes("סופרסל")) {
      defaultChain = "שופרסל";
      break;
    }
  }

  const items: any[] = [];
  const priceRegex = /(\d+(?:\.\d{1,2})?)\s*(?:₪|ש"ח)?$/;

  for (const line of lines) {
    // skip purely decorative/store-header lines
    if (line.startsWith("===") || line.startsWith("---") || line.includes("חשבונית") || line.includes("סניף")) {
      continue;
    }

    const match = line.match(priceRegex);
    if (match) {
      const price = parseFloat(match[1]);
      const rawText = line.replace(priceRegex, "").trim();
      if (rawText.length > 1 && price > 0 && price < 1000) {
        let category = "שימורים ובישול";
        if (/חלב|גבינה|יוגורט|חמאה|קוטג|שמנת|ביצים/i.test(rawText)) category = "מוצרי חלב וביצים";
        else if (/בשר|עוף|דג|בקר|טחון|נקניק/i.test(rawText)) category = "בשר ודגים";
        else if (/לחם|חלה|פיתה|לחמני|באגט/i.test(rawText)) category = "לחם ומאפים";
        else if (/קולה|מים|מיץ|סודה|בירה|קפה|תה|משקה/i.test(rawText)) category = "משקאות וקפה";
        else if (/עגבנ|מלפפון|בצל|תפוח|בננה|לימון|תפוז/i.test(rawText)) category = "פירות וירקות";
        else if (/שמפו|סבון|מרכך|נייר|אקונומיקה|טואלט/i.test(rawText)) category = "ניקיון ובית";

        items.push({
          rawText,
          cleanName: rawText,
          price,
          chainName: defaultChain,
          category,
        });
      }
    }
  }

  return items;
}

