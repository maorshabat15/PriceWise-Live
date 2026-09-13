import React from 'react';
import { SplitCalculationResult } from '../utils/splitShoppingHelper';
import { 
  Split, ShoppingBag, ArrowRight, CheckCircle2, TrendingDown, 
  MapPin, Clock, ShieldCheck, X, Sparkles, AlertCircle, Store
} from 'lucide-react';

interface SplitShoppingProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  splitResult: SplitCalculationResult | null;
  selectedCity: string;
  onConfirmSplit: () => void;
  onConfirmSingleStore: () => void;
}

export const SplitShoppingProposalModal: React.FC<SplitShoppingProposalModalProps> = ({
  isOpen,
  onClose,
  splitResult,
  selectedCity,
  onConfirmSplit,
  onConfirmSingleStore,
}) => {
  // If not open or no result or split is not needed, do not render at all!
  if (!isOpen || !splitResult || !splitResult.needsSplit) {
    return null;
  }

  const { cheapestSingleStore, splitTotal, savings, savingsPercent, splitGroups, totalItemsCount } =
    splitResult;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl text-slate-100 space-y-4 max-h-[90vh] flex flex-col relative overflow-hidden">
        {/* Glow backdrop decorative */}
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3 relative z-10">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Split className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white">
                  המלצה חכמה: כדאי לפצל את הקנייה!
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  חיסכון של ₪{savings.toFixed(1)} ({savingsPercent}%)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                זיהינו פער מחירים משמעותי עבור {totalItemsCount} המוצרים שלך ברשתות ב{selectedCity}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
            title="סגור חלונית"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content - Comparison of 2 Strategies */}
        <div className="overflow-y-auto pr-1 space-y-4 flex-1 relative z-10">
          {/* Strategy 1: Recommended Split */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-950/80 to-teal-950/30 border-2 border-emerald-500/50 rounded-2xl p-4 space-y-3 relative shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                  <Sparkles className="h-3 w-3" /> מומלץ ביותר (הכי זול)
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  פיצול קנייה בין {splitGroups.length} סופרים
                </span>
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold">סה"כ לתשלום</div>
                <div className="text-lg font-black text-emerald-300">₪{splitTotal.toFixed(2)}</div>
              </div>
            </div>

            {/* Split breakdown by store */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {splitGroups.map((group) => (
                <div
                  key={group.storeKey}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full ${group.logoColor} shrink-0`} />
                      <span className="text-xs font-extrabold text-white truncate">
                        {group.storeName}
                      </span>
                    </div>
                    <span className="text-xs font-black text-emerald-400">
                      ₪{group.subtotal.toFixed(1)}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
                    <span className="truncate">{group.branchName}</span>
                  </div>

                  <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800/80">
                    <span className="font-bold text-amber-300">{group.items.length} מוצרים: </span>
                    <span className="text-slate-400">
                      {group.items.slice(0, 3).map((it) => it.name).join(', ')}
                      {group.items.length > 3 ? ` ועוד ${group.items.length - 3}...` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Action button to confirm split */}
            <button
              onClick={onConfirmSplit}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Split className="h-4 w-4 stroke-[2.5]" />
              <span>אשר פיצול והעבר לרשימת 'פיצול קניות' (חיסכון ₪{savings.toFixed(1)})</span>
            </button>
          </div>

          {/* Strategy 2: Single Supermarket (Convenience / No Split) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                  <ShoppingBag className="h-4 w-4 text-amber-400" />
                  <span>קנייה מרוכזת בסופר יחיד (נוחות מרבית ללא מעבר בין סניפים)</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  קנה את כל {totalItemsCount} המוצרים ב{cheapestSingleStore.storeName} ({cheapestSingleStore.branchName})
                </div>
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 font-bold">מחיר בסופר יחיד</div>
                <div className="text-base font-bold text-amber-300">₪{cheapestSingleStore.total.toFixed(2)}</div>
              </div>
            </div>

            <button
              onClick={onConfirmSingleStore}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Store className="h-4 w-4 text-amber-400" />
              <span>השאר בסופר יחיד ({cheapestSingleStore.storeName.split(' ')[0]}) והעבר ל'פיצול קניות'</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 relative z-10 text-xs">
          <span className="text-[11px] text-slate-400">
            הנתונים יסודרו אוטומטית כמשימות רכישה עם רשימת צ'ק-ליסט בסניפים
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            הישאר בהשוואת מחירים
          </button>
        </div>
      </div>
    </div>
  );
};
