import { Note } from '../types';

export interface ExtractedRecipe {
  isRecipe: boolean;
  title: string;
  formattedContent: string;
  ingredientsCount: number;
  tags: string[];
}

/**
 * מזהה האם טקסט של שף AI מכיל מתכון קולינרי מלא (כותרת/שם מנה, מצרכים ו/או אופן הכנה)
 */
export function detectRecipeFromText(text: string): ExtractedRecipe | null {
  if (!text || !text.trim()) return null;

  const raw = text.trim();

  // בדיקת מילות מפתח מובהקות של מתכונים
  const hasRecipeWord = /(?:מתכון|אופן\s+(?:ה)?הכנה|הוראות\s+הכנה|שלבי\s+הכנה|מצרכים|רכיבים|חומרים|זמן\s+בישול|זמן\s+אפייה|רמת\s+קושי|מנות)/i.test(raw);
  const hasIngredients = /(?:מצרכים|חומרים|רכיבים|רשימת\s+מצרכים|ingredients)/i.test(raw);
  const hasInstructions = /(?:אופן\s+(?:ה)?הכנה|הוראות\s+(?:הכנה|בישול|אפייה)|שלבי\s+הכנה|אופן\s+הבישול|הכנה:|הוראות:|שלב\s*1|instructions|preparation)/i.test(raw);

  // תנאי לזיהוי מתכון:
  // או שיש "מתכון" יחד עם מצרכים או הוראות הכנה
  // או שיש במפורש גם סעיף מצרכים וגם סעיף אופן הכנה
  const isRecipe = (hasRecipeWord && (hasIngredients || hasInstructions)) || (hasIngredients && hasInstructions);

  if (!isRecipe) return null;

  // חילוץ כותרת המתכון
  let title = '';
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // פורמט 1: כותרת Markdown עם המילה מתכון (# מתכון ל... / ### מתכון: ...)
    const mdRecipeMatch = line.match(/^(?:#{1,4}\s*|\*+\s*)?(?:מתכון(?:\s+שף)?(?:\s+ל|\s*[:\-–])?\s*)([^\n*#]+)/i);
    if (mdRecipeMatch && mdRecipeMatch[1]) {
      title = mdRecipeMatch[1].replace(/[*#_:]/g, '').trim();
      break;
    }

    // פורמט 2: כותרת שמתחילה ב-# או ## (במידה וזה ב-4 השורות הראשונות)
    if (lines.indexOf(line) <= 4) {
      const headerMatch = line.match(/^#{1,3}\s+([^#\n]+)/);
      if (headerMatch && headerMatch[1]) {
        const candidate = headerMatch[1].replace(/[*#_:]/g, '').trim();
        if (!candidate.includes('מצרכים') && !candidate.includes('הכנה') && candidate.length < 60) {
          title = candidate;
          break;
        }
      }

      // פורמט 3: שורה מודגשת **שם מתכון**
      const boldMatch = line.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch && boldMatch[1]) {
        const candidate = boldMatch[1].trim();
        if (candidate.length < 60 && !candidate.includes('מצרכים') && !candidate.includes('הכנה')) {
          title = candidate.replace(/^מתכון(?:\s*[:\-–]|\s+ל)?\s*/i, '').trim();
          break;
        }
      }
    }
  }

  // ברירת מחדל לכותרת במידה ולא אותרה
  if (!title) {
    if (lines[0] && lines[0].length <= 50 && !lines[0].startsWith('-') && !lines[0].startsWith('•')) {
      title = lines[0].replace(/[*#_:]/g, '').replace(/^(?:הנה\s+)?מתכון(?:\s*[:\-–]|\s+ל)?\s*/i, '').trim();
    }
  }

  if (!title || title.length < 3) {
    title = 'מתכון שף מותאם אישית';
  }

  // קידומת אחידה ואלגנטית לכותרת המתכון
  if (!title.startsWith('מתכון')) {
    title = `מתכון: ${title}`;
  }

  // זיהוי תגיות קולינריות רלוונטיות
  const tags: string[] = ['מתכונים', 'שף צ\'אט שף'];
  if (/דג|סלמון|דניס|לברק|טונה/i.test(raw)) tags.push('דגים');
  if (/בשר|עוף|בקר|כבש|חזה עוף|קציצות|אסאדו/i.test(raw)) tags.push('בשר ועוף');
  if (/גבינ|שמנת|חלב|פרמז|חמאה|יוגורט/i.test(raw)) tags.push('חלבי');
  if (/טבעונ|צמחונ|טופו|קטניות/i.test(raw)) tags.push('צמחוני');
  if (/פסטה|איטלק|פיצה/i.test(raw)) tags.push('איטלקי');
  if (/אפיי|לחם|עוג|עוגיות|בצק|קינוח/i.test(raw)) tags.push('אפייה וקינוחים');
  if (/סלט|ירקות/i.test(raw)) tags.push('סלטים');
  if (/מרק/i.test(raw)) tags.push('מרקים');

  // ספירת מצרכים משוערת
  const bulletMatches = raw.match(/^[•\-\*]\s+[^\n]+/gm);
  const ingredientsCount = bulletMatches ? bulletMatches.length : 0;

  // עיצוב תוכן המתכון
  let formattedContent = raw;
  if (!formattedContent.startsWith('#')) {
    formattedContent = `# ${title}\n\n${formattedContent}`;
  }

  return {
    isRecipe: true,
    title,
    formattedContent,
    ingredientsCount,
    tags,
  };
}

/**
 * בדיקה האם מתכון כבר שמור ברשימת המתכונים לפי כותרת
 */
export function isRecipeAlreadySaved(title: string, notes: Note[]): boolean {
  if (!title || !notes) return false;
  const clean = title.toLowerCase().replace(/^(?:מתכון(?:\s*[:\-–]|\s+ל)?\s*)/i, '').trim();
  return notes.some((n) => {
    const noteClean = n.title.toLowerCase().replace(/^(?:מתכון(?:\s*[:\-–]|\s+ל)?\s*)/i, '').trim();
    return noteClean === clean || n.title.toLowerCase().includes(clean);
  });
}
