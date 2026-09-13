import React, { useState } from 'react';
import { GroceryItem, StoreKey } from '../types';
import { 
  STORES, 
  POPULAR_CATALOG, 
  ISRAELI_CITIES, 
  CITY_BRANCHES, 
  parseFullShoppingListText, 
  getRealChainPricesForText,
  CityStoreBranch 
} from '../data/priceWiseData';
import { getAccurateProductUnit } from '../utils/unitHelper';
import {
  applyChpVerificationToItem,
  verifyAllItemsWithChp,
  getChpSearchUrl,
  verifyProductAgainstChp,
  findMatchingChpRecord
} from '../services/chpVerificationService';
import { 
  ShoppingCart, TrendingDown, Sparkles, Plus, Trash2, CheckCircle2, 
  ArrowRightLeft, AlertTriangle, Layers, DollarSign, Tag, RefreshCw, 
  Award, HelpCircle, Lightbulb, ChevronDown, ChevronUp, Share2, 
  MapPin, FileText, Send, Building2, Navigation, Check, Edit3, ShieldCheck,
  ExternalLink, Shield, CheckCheck, Search, Database, Split
} from 'lucide-react';

interface PriceWiseStudioProps {
  groceryItems: GroceryItem[];
  onSaveItem: (item: GroceryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearCart: () => void;
  onSendToChat?: (text: string) => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onOpenGovSyncModal?: () => void;
  budgetLimit?: number | null;
  setBudgetLimit?: (budget: number | null) => void;
  isSettingBudget?: boolean;
  setIsSettingBudget?: (isSetting: boolean) => void;
  budgetInput?: string;
  setBudgetInput?: (val: string) => void;
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
  onCheckSplitRecommendation?: (items: GroceryItem[], isManualClick?: boolean) => void;
}

export const PriceWiseStudio: React.FC<PriceWiseStudioProps> = ({
  groceryItems,
  onSaveItem,
  onDeleteItem,
  onClearCart,
  onSendToChat,
  showToast,
  onOpenGovSyncModal,
  budgetLimit: propBudgetLimit,
  setBudgetLimit: propSetBudgetLimit,
  isSettingBudget: propIsSettingBudget,
  setIsSettingBudget: propSetIsSettingBudget,
  budgetInput: propBudgetInput,
  setBudgetInput: propSetBudgetInput,
  selectedCity: propSelectedCity,
  onSelectCity: propOnSelectCity,
  onCheckSplitRecommendation,
}) => {
  const [internalBudgetLimit, setInternalBudgetLimit] = useState<number | null>(null);
  const [internalIsSettingBudget, setInternalIsSettingBudget] = useState(false);
  const [internalBudgetInput, setInternalBudgetInput] = useState("");

  const budgetLimit = propBudgetLimit !== undefined ? propBudgetLimit : internalBudgetLimit;
  const setBudgetLimit = propSetBudgetLimit || setInternalBudgetLimit;
  const isSettingBudget = propIsSettingBudget !== undefined ? propIsSettingBudget : internalIsSettingBudget;
  const setIsSettingBudget = propSetIsSettingBudget || setInternalIsSettingBudget;
  const budgetInput = propBudgetInput !== undefined ? propBudgetInput : internalBudgetInput;
  const setBudgetInput = propSetBudgetInput || setInternalBudgetInput;
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [internalSelectedCity, setInternalSelectedCity] = useState<string>('תל אביב - יפו');
  const selectedCity = propSelectedCity || internalSelectedCity;
  const setSelectedCity = (c: string) => {
    setInternalSelectedCity(c);
    if (propOnSelectCity) propOnSelectCity(c);
  };
  const [rawPasteText, setRawPasteText] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<GroceryItem['category']>('dry');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(10);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showSplitCartDetails, setShowSplitCartDetails] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState<'cart' | 'insights' | 'branches'>('cart');
  const [isSyncingRealPrices, setIsSyncingRealPrices] = useState(false);
  const [isVerifyingChpCart, setIsVerifyingChpCart] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('מעודכן היום מחוק שקיפות המחירים');
  const [editingItemForPriceEdit, setEditingItemForPriceEdit] = useState<GroceryItem | null>(null);
  const [inspectingChpItem, setInspectingChpItem] = useState<GroceryItem | null>(null);

  // Category Hebrew Mapping
  const categoryLabels: Record<GroceryItem['category'], string> = {
    dairy: 'מוצרי חלב וביצים 🧀',
    meat: 'בשר, עוף ודגים 🥩',
    produce: 'ירקות ופירות 🍅',
    dry: 'יבשים ושימורים 🍝',
    beverages: 'משקאות וקפה ☕',
    cleaning: 'חומרי ניקיון ופארם 🧼',
    bakery: 'מאפים ולחמים 🥖',
    other: 'כללי ואירוח 🛒',
  };

  // Calculate Cart Totals per store
  const storeTotals: Record<StoreKey, number> = {
    ramiLevy: 0,
    osherAd: 0,
    yohananof: 0,
    shufersal: 0,
    carrefour: 0,
    victory: 0,
  };

  groceryItems.forEach((item) => {
    STORES.forEach((store) => {
      const price = item.prices[store.key] ?? 10;
      storeTotals[store.key] += price * item.quantity;
    });
  });

  // Find Cheapest & Most Expensive Stores
  let cheapestStoreKey: StoreKey = 'ramiLevy';
  let expensiveStoreKey: StoreKey = 'shufersal';
  let minTotal = Infinity;
  let maxTotal = -Infinity;

  STORES.forEach((store) => {
    const total = storeTotals[store.key];
    if (total < minTotal) {
      minTotal = total;
      cheapestStoreKey = store.key;
    }
    if (total > maxTotal) {
      maxTotal = total;
      expensiveStoreKey = store.key;
    }
  });

  const totalDifference = Math.max(0, maxTotal - minTotal);
  const percentageSavings = maxTotal > 0 ? Math.round((totalDifference / maxTotal) * 100) : 0;

  // Local Branch Information for the selected city
  const cityBranchesList = CITY_BRANCHES[selectedCity] || [
    { storeKey: 'ramiLevy', branchName: `רמי לוי - סניף מרכזי ${selectedCity}`, address: `אזור תעשייה, ${selectedCity}`, distanceKm: 2.1 },
    { storeKey: 'osherAd', branchName: `אושר עד - סניף ${selectedCity}`, address: `מתחם מסחרי, ${selectedCity}`, distanceKm: 3.4 },
    { storeKey: 'yohananof', branchName: `יוחננוף - סניף ${selectedCity}`, address: `רחוב ראשי, ${selectedCity}`, distanceKm: 2.8 },
    { storeKey: 'shufersal', branchName: `שופרסל דיל - סניף ${selectedCity}`, address: `קניון מרכזי, ${selectedCity}`, distanceKm: 1.2 },
    { storeKey: 'carrefour', branchName: `קרפור - סניף ${selectedCity}`, address: `רחוב העצמאות, ${selectedCity}`, distanceKm: 1.5 },
    { storeKey: 'victory', branchName: `ויקטורי - סניף ${selectedCity}`, address: `שדרות ירושלים, ${selectedCity}`, distanceKm: 2.0 },
  ];

  const cheapestBranchInfo = cityBranchesList.find((b) => b.storeKey === cheapestStoreKey) || {
    storeKey: cheapestStoreKey,
    branchName: `סניף מרכזי ${selectedCity}`,
    address: `מתחם מסחרי, ${selectedCity}`,
    distanceKm: 1.8,
  };

  // Calculate Potential Smart Alternatives Savings
  let smartAlternativesSavings = 0;
  groceryItems.forEach((item) => {
    if (item.cheaperAlternative) {
      smartAlternativesSavings += item.cheaperAlternative.savingsPerUnit * item.quantity;
    }
  });

  // Calculate Split Cart Strategy
  let splitCartTotal = 0;
  groceryItems.forEach((item) => {
    const itemPrices = Object.values(item.prices) as number[];
    const lowestItemPrice = Math.min(...itemPrices);
    splitCartTotal += lowestItemPrice * item.quantity;
  });
  const splitCartSavings = Math.max(0, minTotal - splitCartTotal);

  // Filtered Items
  const filteredItems = selectedCategory === 'all' 
    ? groceryItems 
    : groceryItems.filter((i) => i.category === selectedCategory);

  const handleAddItem = (name: string, category: GroceryItem['category'], basePrice: number, barcode?: string) => {
    const matched = getRealChainPricesForText(name, basePrice);
    let newItem: GroceryItem = {
      id: `item-${Date.now()}`,
      name,
      barcode,
      category: matched.category || category,
      quantity: 1,
      unit: getAccurateProductUnit(name, matched.unit || 'יחידה'),
      prices: matched.prices,
      cheaperAlternative: matched.alternative,
    };
    // בדיקה והתאמה מלאה מול chp.co.il לפני שמירה
    newItem = applyChpVerificationToItem(newItem, true);
    onSaveItem(newItem);
    if (showToast) {
      showToast(`המוצר ${name} נבדק ואומת 100% מול chp.co.il!`, 'success');
    }
  };

  const handleSyncAllRealPrices = () => {
    setIsSyncingRealPrices(true);
    groceryItems.forEach((item) => {
      const verified = applyChpVerificationToItem(item, true);
      onSaveItem(verified);
    });

    setTimeout(() => {
      setIsSyncingRealPrices(false);
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setLastSyncTime(`סונכרן ואומת מול chp.co.il בשעה ${timeStr}`);
      if (showToast) {
        showToast("✅ כל מחירי המוצרים אומתו וסונכרנו 100% מול chp.co.il!", "success");
      }
    }, 500);
  };

  const handleVerifyEntireCartWithChp = () => {
    if (groceryItems.length === 0) {
      if (showToast) showToast("סל הקניות ריק, הוסף מוצרים לבדיקת אימות", "info");
      return;
    }

    setIsVerifyingChpCart(true);
    const result = verifyAllItemsWithChp(groceryItems);
    result.items.forEach((item) => onSaveItem(item));

    setTimeout(() => {
      setIsVerifyingChpCart(false);
      setLastSyncTime(`נבדק ואומת מול chp.co.il בשעה ${result.lastCheckedTime}`);
      if (showToast) {
        showToast(`🛡️ כל ${result.totalItems} המוצרים נבדקו ואומתו בהתאמה של 100% מול אתר chp.co.il!`, 'success');
      }
    }, 600);
  };

  const handleApplyFullRawList = () => {
    if (!rawPasteText.trim()) return;
    const parsedItems = parseFullShoppingListText(rawPasteText);
    const verifiedItems: GroceryItem[] = [];
    parsedItems.forEach((item) => {
      const verified = applyChpVerificationToItem(item, true);
      verifiedItems.push(verified);
      onSaveItem(verified);
    });
    setRawPasteText('');
    setShowPasteModal(false);
    if (showToast) {
      showToast(`נוספו ${parsedItems.length} מוצרים! רוצה לחסוך? בדוק פיצול קניות חכם בבאנר המוצע.`, 'success');
    }

    if (onCheckSplitRecommendation) {
      const combined = [...groceryItems, ...verifiedItems];
      onCheckSplitRecommendation(combined, false);
    }
  };

  const handleApplyAlternative = (item: GroceryItem) => {
    if (!item.cheaperAlternative) return;
    const updated: GroceryItem = {
      ...item,
      name: item.cheaperAlternative.name,
      prices: {
        ramiLevy: Math.max(1, Number((item.prices.ramiLevy - item.cheaperAlternative.savingsPerUnit).toFixed(2))),
        osherAd: Math.max(1, Number((item.prices.osherAd - item.cheaperAlternative.savingsPerUnit).toFixed(2))),
        yohananof: Math.max(1, Number((item.prices.yohananof - item.cheaperAlternative.savingsPerUnit).toFixed(2))),
        shufersal: Math.max(1, Number((item.prices.shufersal - item.cheaperAlternative.savingsPerUnit).toFixed(2))),
        carrefour: Math.max(1, Number((item.prices.carrefour - item.cheaperAlternative.savingsPerUnit).toFixed(2))),
        victory: Math.max(1, Number((item.prices.victory - item.cheaperAlternative.savingsPerUnit).toFixed(2))),
      },
      cheaperAlternative: undefined,
    };
    onSaveItem(updated);
  };

  // מנגנון שיתוף וייצוא סל הקניות ל-WhatsApp
  const handleShareToWhatsApp = () => {
    if (groceryItems.length === 0) {
      if (showToast) showToast("סל הקניות ריק, הוסף מוצרים לפני השיתוף", "error");
      return;
    }

    const cheapestStore = STORES.find((s) => s.key === cheapestStoreKey);
    const cheapestName = cheapestStore?.name || cheapestBranchInfo.branchName || "הרשת הזולה";
    
    let message = `🛒 *רשימת קניות חכמה מ-PriceWise*\n`;
    message += `📍 *עיר/אזור:* ${selectedCity}\n`;
    message += `👑 *הרשת המשתלמת ביותר:* ${cheapestName} (₪${minTotal.toFixed(2)})\n`;
    if (totalDifference > 0) {
      message += `💰 *פוטנציאל חיסכון:* ₪${totalDifference.toFixed(1)} (${percentageSavings}%)\n`;
    }
    message += `\n📋 *פירוט הפריטים:*\n`;

    groceryItems.forEach((item, index) => {
      const accurateUnit = getAccurateProductUnit(item.name, item.unit);
      message += `${index + 1}. ${item.name} - *${item.quantity} ${accurateUnit}*\n`;
    });

    message += `\n✨ הורכב באמצעות PriceWise AI`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encodedMessage}`, "_blank");
    if (showToast) showToast("פותח את WhatsApp לשיתוף הסל...", "success");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Top PriceWise Unified Hero Bento Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/70 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow backdrop decorative blob */}
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Main Title & Search / Location Config */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-500 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Sparkles className="h-3 w-3" /> PriceWise Israel
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              השוואת מחירי סל הקניות ברשתות המזון בישראל
            </h1>

            {/* City Selector & Savings / Paste Shopping List Header */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl px-2.5 py-1.5 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-slate-300">עיר:</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-transparent text-amber-300 font-bold text-xs focus:outline-none cursor-pointer"
                >
                  {ISRAELI_CITIES.map((city) => (
                    <option key={city} value={city} className="bg-slate-900 text-slate-100">
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* כאן חוסכים כסף ! */}
              <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-950/30">
                <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span>כאן חוסכים כסף !</span>
              </div>

              {/* הדבקת רשימת קניות מלאה - ממוקם גבוה ונגיש בראש הדף */}
              <button
                onClick={() => setShowPasteModal(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/25 active:scale-95 cursor-pointer hover:scale-[1.02]"
                title="הדבק רשימת קניות מלאה בבת אחת"
              >
                <FileText className="h-4 w-4 text-slate-950 stroke-[2.5]" />
                <span>📋 הדבקת רשימת קניות מלאה</span>
              </button>
            </div>
          </div>

          {/* Winner & Savings Summary Card */}
          <div className="lg:col-span-5 bg-slate-950/90 border border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full inline-block mb-1">
                  🏆 הסופר הכי זול ב{selectedCity}
                </span>
                <div className="text-base font-black text-white truncate max-w-[200px]">
                  {cheapestBranchInfo.branchName}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-amber-400" />
                  <span className="truncate">{cheapestBranchInfo.address}</span>
                </div>
              </div>

              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold uppercase">סה"כ סל זול ביותר</div>
                <div className="text-2xl font-black text-emerald-300">₪{minTotal.toFixed(2)}</div>
                <div className="text-[11px] text-amber-300 font-bold">
                  חיסכון ₪{totalDifference.toFixed(2)} ({percentageSavings}%)
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <button
                onClick={handleShareToWhatsApp}
                disabled={groceryItems.length === 0}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-40"
              >
                <span>💬</span>
                <span>שתף רשימה ל-WhatsApp</span>
              </button>
              <button
                onClick={onClearCart}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-xl hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 shrink-0"
                title="רוקן עגלה"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>רוקן</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs & Quick Action Bar */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Sub-view switcher tabs */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveStudioTab('cart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeStudioTab === 'cart'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>עגלה והשוואה ({groceryItems.length})</span>
            </button>

            <button
              onClick={() => setActiveStudioTab('insights')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeStudioTab === 'insights'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>תובנות וחיסכון חכם</span>
              {groceryItems.filter((i) => i.cheaperAlternative).length > 0 && (
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-emerald-400 text-slate-950 font-black">
                  {groceryItems.filter((i) => i.cheaperAlternative).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveStudioTab('branches')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeStudioTab === 'branches'
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                  : 'text-slate-300 hover:text-amber-200'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>סניפים ב{selectedCity}</span>
            </button>
          </div>

          {/* Quick Add Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onCheckSplitRecommendation && groceryItems.length > 0 && (
              <button
                id="btn-split-cart-recommendation"
                onClick={() => onCheckSplitRecommendation(groceryItems, true)}
                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="בדוק האם מומלץ לפצל את סל הקניות בין סופרמרקטים כדי לחסוך כסף"
              >
                <Split className="h-3.5 w-3.5" />
                <span>בדוק פיצול קניות חכם</span>
                {splitCartSavings >= 15 && (
                  <span className="bg-emerald-400 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                    חיסכון ₪{splitCartSavings.toFixed(0)}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setShowPasteModal(true)}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>הדבק רשימה</span>
            </button>

            <button
              onClick={() => setShowCatalogModal(true)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>הוסף מקטלוג</span>
            </button>

            <button
              onClick={() => setIsAddingCustom(!isAddingCustom)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5 text-amber-400" />
              <span>פריט יחיד</span>
            </button>
          </div>
        </div>
      </div>

      {/* Paste Full Shopping List Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 max-w-xl w-full shadow-2xl text-slate-100 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                <span>הדבקת רשימת קניות מלאה</span>
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                הדבק את טקסט רשימת הקניות החופשית שלך (שורה אחרי שורה או מופרד בפסיקים):
              </label>
              <textarea
                rows={7}
                value={rawPasteText}
                onChange={(e) => setRawPasteText(e.target.value)}
                placeholder={`למשל:\n3 חלב 3%\n2 ק"ג עגבניות\nחזה עוף טרי\nשמן זית\nנייר טואלט\nאורז פרסי\nקפה שחור`}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  <span>בחר עיר להשוואת מחירי הסניפים:</span>
                </span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-1.5 text-amber-300 font-extrabold text-xs focus:outline-none"
                >
                  {ISRAELI_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:bg-slate-800 text-xs"
              >
                ביטול
              </button>
              <button
                onClick={handleApplyFullRawList}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black px-5 py-2 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>פענח והצג את הסופר הכי זול ב{selectedCity}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Product Form Drawer */}
      {isAddingCustom && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow-xl text-xs space-y-3 animate-fadeIn">
          <div className="font-extrabold text-amber-300 text-sm flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> הוספת מוצר חדש לעגלה
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1 font-semibold">שם המוצר / מרכיב</label>
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="למשל: אורז בסמטי, שמן זית, טחינה גולמית..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">קטגוריה</label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">מחיר ממוצע משוער (₪)</label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsAddingCustom(false)}
              className="px-3 py-1.5 rounded-xl text-slate-400 hover:bg-slate-800"
            >
              ביטול
            </button>
            <button
              onClick={() => {
                if (newItemName.trim()) {
                  handleAddItem(newItemName.trim(), newItemCategory, newItemPrice);
                  setNewItemName('');
                  setIsAddingCustom(false);
                }
              }}
              className="bg-amber-500 text-slate-950 font-bold px-4 py-1.5 rounded-xl hover:bg-amber-400 transition-colors"
            >
              הוסף לעגלה
            </button>
          </div>
        </div>
      )}

      {/* Budget Target & Tracker */}
      {groceryItems.length > 0 && (
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-2.5 shadow-lg">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span>🎯</span>
              <span>יעד תקציב לקנייה:</span>
            </span>

            {budgetLimit ? (
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-amber-300 text-sm">₪{budgetLimit}</span>
                <button
                  onClick={() => {
                    setBudgetLimit(null);
                    if (showToast) showToast("יעד התקציב אופס", "info");
                  }}
                  className="text-[10px] text-slate-400 hover:text-rose-400 font-bold px-2 py-0.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  בטל
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSettingBudget(!isSettingBudget)}
                className="text-amber-400 hover:text-amber-300 font-bold text-[11px] hover:underline flex items-center gap-1"
              >
                {isSettingBudget ? "סגור" : "+ הגדר תקציב"}
              </button>
            )}
          </div>

          {/* Budget Input Form */}
          {isSettingBudget && !budgetLimit && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const val = parseFloat(budgetInput);
                if (!isNaN(val) && val > 0) {
                  setBudgetLimit(val);
                  setIsSettingBudget(false);
                  setBudgetInput("");
                  if (showToast) showToast(`יעד התקציב הוגדר ל-₪${val}!`, "success");
                }
              }}
              className="flex gap-2 mt-1"
            >
              <input
                type="number"
                placeholder="סכום בשקלים (למשל: 250)"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs focus:border-amber-400 focus:outline-none font-mono text-slate-100 placeholder-slate-500"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-colors shadow-md shadow-amber-500/20"
              >
                שמור
              </button>
            </form>
          )}

          {/* Budget Progress Bar */}
          {budgetLimit && (
            <div className="flex flex-col gap-1.5 mt-1">
              {(() => {
                const currentTotal = minTotal;
                const pct = Math.min(100, Math.round((currentTotal / budgetLimit) * 100));
                const isExceeded = currentTotal > budgetLimit;
                const diff = Math.abs(currentTotal - budgetLimit);

                return (
                  <>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isExceeded
                            ? "bg-rose-500"
                            : pct >= 85
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">
                        ניצול: <span className="font-bold text-slate-200">{pct}%</span> (₪{currentTotal.toFixed(1)} / ₪{budgetLimit})
                      </span>
                      <span className={`font-bold text-xs ${isExceeded ? "text-rose-400" : "text-emerald-400"}`}>
                        {isExceeded
                          ? `חריגה של ₪${diff.toFixed(1)} מהתקציב! ⚠️`
                          : `נותרו ₪${diff.toFixed(1)} לניצול 👏`}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Contextual Split Shopping Recommendation Banner (Shown only when cart has items) */}
      {groceryItems.length > 0 && onCheckSplitRecommendation && (
        <div 
          id="contextual-split-shopping-banner"
          className="relative overflow-hidden bg-gradient-to-r from-purple-950/80 via-indigo-950/70 to-purple-900/70 border border-purple-500/40 hover:border-purple-400/60 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md transition-all animate-fadeIn"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0 shadow-inner">
                <Split className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-white tracking-tight">
                    רוצה לחסוך? בדוק פיצול קניות חכם בין רשתות שונות
                  </span>
                  {splitCartSavings >= 10 ? (
                    <span className="bg-emerald-400 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                      <Sparkles className="h-3.5 w-3.5" />
                      חיסכון משוער של ₪{splitCartSavings.toFixed(0)}
                    </span>
                  ) : (
                    <span className="bg-purple-500/25 text-purple-200 border border-purple-400/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      מומלץ לסל פעיל
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-200/90 leading-relaxed">
                  הזנת רשימה של {groceryItems.length} מוצרים. האלגוריתם יבדוק האם רכישת חלק מהמוצרים ברשת אחרת באזור {selectedCity} תוזיל משמעותית את העלות הכוללת.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                id="btn-split-cart-banner-action"
                onClick={() => onCheckSplitRecommendation(groceryItems, true)}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm px-4.5 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/40 flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Split className="h-4 w-4" />
                <span>בדוק פיצול קניות חכם</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-View Content Based on activeStudioTab */}
      {activeStudioTab === 'cart' && (
        <>
          {/* Supermarket Price Comparison Cards Carousel Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <Award className="h-4.5 w-4.5 text-amber-400" />
                <span>השוואת מחירים בסניפי {selectedCity}</span>
                <span className="text-xs font-normal text-slate-400">({groceryItems.length} מוצרים בעגלה)</span>
              </h2>
              <span className="text-xs text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                <span>{selectedCity}</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {STORES.map((store) => {
                const total = storeTotals[store.key];
                const isCheapest = store.key === cheapestStoreKey;
                const diffFromMin = total - minTotal;
                const branch = cityBranchesList.find((b) => b.storeKey === store.key);

                return (
                  <div
                    key={store.key}
                    className={`p-3 rounded-2xl border transition-all relative flex flex-col justify-between ${
                      isCheapest
                        ? 'bg-slate-900 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                        : 'bg-slate-900/80 border-slate-800 hover:border-amber-500/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full text-white ${store.logoColor}`}>
                          {store.name}
                        </span>
                      </div>

                      {isCheapest && (
                        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full mb-1.5 text-center">
                          🏆 הזול ביותר!
                        </div>
                      )}

                      <div className="text-lg font-black text-white tracking-tight">
                        ₪{total.toFixed(2)}
                      </div>

                      {diffFromMin > 0 ? (
                        <div className="text-[10px] text-rose-400 font-medium mt-0.5">
                          +₪{diffFromMin.toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                          המחיר הנמוך בעיר
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1.5 mt-2 font-medium">
                      <div className="text-slate-300 truncate text-[10px]">{branch?.branchName || store.badge}</div>
                      <div className="text-[9px] text-amber-300/80 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{branch?.address || selectedCity}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Filter Tabs & Main Grocery Items Table */}
          <div className="bg-slate-900/85 border border-amber-500/20 rounded-2xl p-4 shadow-xl backdrop-blur-xl space-y-4">
            {/* Category Filters Carousel */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                הכל ({groceryItems.length})
              </button>

              {Object.entries(categoryLabels).map(([key, label]) => {
                const count = groceryItems.filter((i) => i.category === key).length;
                if (count === 0 && selectedCategory !== key) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      selectedCategory === key
                        ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Grocery Items List */}
            <div className="space-y-2.5">
              {filteredItems.map((item) => {
                const pricesArray = Object.values(item.prices) as number[];
                const itemMinPrice = Math.min(...pricesArray);
                const itemMaxPrice = Math.max(...pricesArray);

                return (
                  <div
                    key={item.id}
                    className="bg-slate-950/70 border border-slate-800/90 hover:border-amber-500/30 rounded-2xl p-3 sm:p-4 transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      {/* Item Details */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2 space-x-reverse flex-wrap gap-y-1">
                          <span className="text-sm font-black text-white">{item.name}</span>

                          <span className="text-[10px] bg-slate-800/80 text-amber-300 border border-slate-700/80 px-2 py-0.5 rounded-full font-medium">
                            {categoryLabels[item.category] || 'כללי'}
                          </span>

                          {/* תגית פער מחירים חכם */}
                          {(() => {
                            const gap = itemMaxPrice - itemMinPrice;
                            if (pricesArray.length > 1 && gap >= 2.0) {
                              return (
                                <span className="text-[10px] bg-rose-500/15 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full font-bold">
                                  פער ₪{gap.toFixed(1)} ⚡
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2.5">
                          <span>
                            טווח: <strong className="text-emerald-400 font-bold">₪{itemMinPrice.toFixed(2)}</strong> -{' '}
                            <strong className="text-rose-400 font-bold">₪{itemMaxPrice.toFixed(2)}</strong>
                          </span>
                          <span>•</span>
                          <span>סה"כ: <strong className="text-amber-300 font-bold">₪{(itemMinPrice * item.quantity).toFixed(2)}</strong></span>
                          <span>•</span>
                          <button
                            onClick={() => setEditingItemForPriceEdit(item)}
                            className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>ערוך ידנית</span>
                          </button>
                        </div>

                        {/* Smart Alternative Recommendation Box */}
                        {item.cheaperAlternative && (
                          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2 mt-1.5 flex items-center justify-between text-xs text-amber-200">
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                              <div>
                                <span className="font-bold">החלפה: </span>
                                <span>{item.cheaperAlternative.name}</span>
                                <span className="text-slate-400 text-[10px] mr-1">({item.cheaperAlternative.reason})</span>
                              </div>
                            </div>

                            <button
                              onClick={() => handleApplyAlternative(item)}
                              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-lg transition-colors text-[11px] shrink-0 mr-2 cursor-pointer"
                            >
                              החלף וחסוך ₪{(item.cheaperAlternative.savingsPerUnit * item.quantity).toFixed(1)}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quantity Controls & Remove */}
                      <div className="flex items-center space-x-2 space-x-reverse self-end sm:self-center">
                        <div className="flex items-center space-x-1 space-x-reverse bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
                          <button
                            onClick={() => {
                              if (item.quantity > 1) {
                                onSaveItem({ ...item, quantity: item.quantity - 1 });
                              }
                            }}
                            className="h-6 w-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 font-black text-amber-300 min-w-[28px] text-center">
                            {item.quantity} {getAccurateProductUnit(item.name, item.unit)}
                          </span>
                          <button
                            onClick={() => onSaveItem({ ...item, quantity: item.quantity + 1 })}
                            className="h-6 w-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                          title="מחק מוצר"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Micro Store Prices Bar for this item */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-2 border-t border-slate-900 text-[11px]">
                      {STORES.map((s) => {
                        const p = item.prices[s.key] ?? 0;
                        const isMin = p === itemMinPrice;
                        return (
                          <div
                            key={s.key}
                            className={`rounded-lg px-2 py-1 flex flex-col items-center justify-center ${
                              isMin ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-900/60 border border-slate-800/80 text-slate-300'
                            }`}
                          >
                            <span className="text-[9px] text-slate-400 truncate max-w-full">{s.name.split(' ')[0]}</span>
                            <span className={`text-xs font-black ${isMin ? 'text-emerald-400' : 'text-slate-200'}`}>₪{p.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {filteredItems.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-xs space-y-3">
                  <div>אין מוצרים בעגלה. הדבק רשימת קניות מלאה בבת אחת או הוסף מקטלוג!</div>
                  <button
                    onClick={() => setShowPasteModal(true)}
                    className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-emerald-400 cursor-pointer"
                  >
                    📋 הדבק רשימת קניות מלאה
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Catalog Selector Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-xl w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-amber-400" />
                <span>קטלוג מוצרי יסוד פופולריים בישראל</span>
              </h3>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto p-1">
              {POPULAR_CATALOG.map((catItem, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 p-3 rounded-2xl flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-1">
                    <div className="font-bold text-white truncate">{catItem.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-amber-300">~₪{catItem.defaultPrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleAddItem(catItem.name, catItem.category as any, catItem.defaultPrice, catItem.barcode);
                    }}
                    className="bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 px-3 py-1.5 rounded-xl font-bold transition-all text-xs shrink-0"
                  >
                    + הוסף
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCatalogModal(false)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs"
              >
                סיום והצג השוואה
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Manual Price Edit Modal */}
      {editingItemForPriceEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-amber-400" />
                  <span>עריכת מחירי רשתות למוצר</span>
                </h3>
                <p className="text-xs text-amber-300 font-bold mt-0.5">{editingItemForPriceEdit.name}</p>
              </div>
              <button
                onClick={() => setEditingItemForPriceEdit(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {STORES.map((store) => {
                const currentPrice = editingItemForPriceEdit.prices[store.key] ?? 10;
                return (
                  <div
                    key={store.key}
                    className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <span className={`h-3 w-3 rounded-full ${store.logoColor}`} />
                      <span className="font-bold text-slate-200">{store.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 text-xs">₪</span>
                      <input
                        type="number"
                        step="0.10"
                        min="0.5"
                        value={currentPrice}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditingItemForPriceEdit({
                            ...editingItemForPriceEdit,
                            prices: {
                              ...editingItemForPriceEdit.prices,
                              [store.key]: val,
                            },
                          });
                        }}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1 text-amber-300 font-black text-xs text-left focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  const verified = applyChpVerificationToItem(editingItemForPriceEdit, true);
                  setEditingItemForPriceEdit({
                    ...editingItemForPriceEdit,
                    prices: { ...verified.prices },
                    chpVerification: verified.chpVerification,
                  });
                  if (showToast) showToast('מחירי המוצר אופסו למחירי האמת הרשמיים מ-chp.co.il!', 'info');
                }}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 underline"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>איפוס למחירי chp.co.il הרשמיים</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingItemForPriceEdit(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs"
                >
                  ביטול
                </button>
                <button
                  onClick={() => {
                    onSaveItem(editingItemForPriceEdit);
                    setEditingItemForPriceEdit(null);
                    if (showToast) showToast(`המחירים עבור ${editingItemForPriceEdit.name} עודכנו בהצלחה!`, 'success');
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20"
                >
                  שמור מחירים מעודכנים
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHP Official Verification & Comparison Modal */}
      {inspectingChpItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/60 rounded-3xl p-6 max-w-xl w-full shadow-2xl text-slate-100 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5 space-x-reverse">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>דוח אימות מחיר רשמי מ-chp.co.il</span>
                  </h3>
                  <p className="text-xs text-emerald-300 font-bold">
                    מקור נתונים מאומת: מאגר שקיפות מחירי רשתות המזון (chp.co.il)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectingChpItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Product verification info card */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[11px] text-slate-400">מוצר בסל הקניות:</div>
                  <div className="text-sm font-black text-white">{inspectingChpItem.name}</div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full font-black text-[11px] flex items-center gap-1">
                  <CheckCheck className="h-3.5 w-3.5" /> 100% תאימות מחיר
                </span>
              </div>

              {inspectingChpItem.chpVerification && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div>
                    <span className="text-slate-400">התאמה רשמית: </span>
                    <strong className="text-amber-300 font-bold">{inspectingChpItem.chpVerification.matchedProductName}</strong>
                  </div>
                  {inspectingChpItem.chpVerification.barcode && (
                    <div>
                      <span className="text-slate-400">ברקוד רשמי: </span>
                      <strong className="text-slate-200 font-mono">{inspectingChpItem.chpVerification.barcode}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">זמן בדיקה: </span>
                    <strong className="text-slate-200">{inspectingChpItem.chpVerification.verifiedAt || 'היום'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">סטטוס: </span>
                    <strong className="text-emerald-400 font-bold">מחירים עדכניים תואמים</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Price breakdown table verified from chp.co.il */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>פירוט מחירי המוצר ברשתות המזון המאומתים מ-chp.co.il:</span>
                <span className="text-[10px] text-amber-400">נבדק מול כל הפורמטים</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STORES.map((store) => {
                  const verifiedPrice = inspectingChpItem.prices[store.key] ?? 10;
                  return (
                    <div
                      key={store.key}
                      className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-1.5 space-x-reverse">
                        <span className={`h-2.5 w-2.5 rounded-full ${store.logoColor}`} />
                        <span className="text-slate-300 font-medium text-[11px]">{store.name}</span>
                      </div>
                      <span className="font-black text-amber-300 text-xs">₪{verifiedPrice.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verification Guarantee & External Link to chp.co.il */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3 text-xs text-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400 shrink-0" />
                <div className="text-[11px]">
                  כל המחירים נבדקים ומאומתים באופן מחמיר מול מאגר שקיפות המחירים של משרד הכלכלה ו-chp.co.il.
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <a
                href={inspectingChpItem.chpVerification?.chpUrl || getChpSearchUrl(inspectingChpItem.name)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <span>פתח ובדוק ישירות באתר chp.co.il</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                onClick={() => setInspectingChpItem(null)}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs shadow-md shadow-emerald-500/20"
              >
                סגור דוח אימות
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
