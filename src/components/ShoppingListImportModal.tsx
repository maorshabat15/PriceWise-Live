import React, { useState } from 'react';
import { GroceryItem } from '../types';
import { 
  X, Check, Plus, Minus, Trash2, ShoppingCart, 
  ArrowRight, Sparkles, Store, CheckSquare, Square, 
  Layers, RefreshCw, DollarSign
} from 'lucide-react';

interface ShoppingListImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems: GroceryItem[];
  currentCartCount?: number;
  onConfirmImport: (items: GroceryItem[], replaceCart: boolean, navigateToPricewise: boolean) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ShoppingListImportModal: React.FC<ShoppingListImportModalProps> = ({
  isOpen,
  onClose,
  initialItems,
  currentCartCount = 0,
  onConfirmImport,
  showToast,
}) => {
  const [items, setItems] = useState<GroceryItem[]>(initialItems);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(initialItems.map((i) => i.id))
  );
  const [shouldNavigate, setShouldNavigate] = useState<boolean>(true);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newItemUnit, setNewItemUnit] = useState('יחידה');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Sync state if initialItems changes
  React.useEffect(() => {
    setItems(initialItems);
    setSelectedIds(new Set(initialItems.map((i) => i.id)));
  }, [initialItems]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    setSelectedIds(new Set(items.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(0.25, Number((item.quantity + delta).toFixed(2)));
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleUpdateName = (id: string, name: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleAddNewItem = () => {
    if (!newItemName.trim()) return;
    const qty = parseFloat(newItemQty) || 1;
    const newItem: GroceryItem = {
      id: `manual-add-${Date.now()}`,
      name: newItemName.trim(),
      category: 'dry',
      quantity: qty,
      unit: newItemUnit.trim() || 'יחידה',
      prices: {
        ramiLevy: 8.90,
        osherAd: 8.50,
        yohananof: 9.20,
        shufersal: 11.90,
        carrefour: 9.00,
        victory: 10.50,
      },
    };

    setItems((prev) => [newItem, ...prev]);
    setSelectedIds((prev) => new Set([...prev, newItem.id]));
    setNewItemName('');
    setNewItemQty('1');
    setIsAddingNew(false);
  };

  const selectedItems = items.filter((item) => selectedIds.has(item.id));

  // Compute estimated price for selected items
  const estimatedTotal = selectedItems.reduce((acc, item) => {
    if (!item.prices) return acc + 10 * item.quantity;
    const priceNumbers = (Object.values(item.prices) as (number | undefined)[])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v) && v > 0);
    const p = priceNumbers.length > 0 ? Math.min(...priceNumbers) : 10;
    return acc + p * item.quantity;
  }, 0);

  const getLowestPriceInfo = (item: GroceryItem) => {
    if (!item.prices) return null;
    const entries = (Object.entries(item.prices) as [string, number][]).filter(
      (e): e is [string, number] => typeof e[1] === 'number' && !isNaN(e[1]) && e[1] > 0
    );
    if (entries.length === 0) return null;
    const sorted = entries.sort((a, b) => a[1] - b[1]);
    const lowest = sorted[0];
    const storeNamesHebrew: Record<string, string> = {
      ramiLevy: 'רמי לוי',
      osherAd: 'אושר עד',
      yohananof: 'יוחננוף',
      carrefour: 'קרפור',
      shufersal: 'שופרסל',
      victory: 'ויקטורי',
    };
    return {
      price: lowest[1],
      store: storeNamesHebrew[lowest[0]] || lowest[0],
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full shadow-2xl text-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  שילוב רשימת קניות בהשוואת מחירים
                </h3>
                <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0">
                  PriceWise
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5 truncate">
                זוהו {items.length} מצרכים מהצ'אט • השוואת מחירים בזמן אמת ברשתות המובילות
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar: Select all / deselect / add item */}
        <div className="px-4 py-2.5 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="flex items-center gap-1 text-slate-300 hover:text-amber-300 font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <CheckSquare className="h-3.5 w-3.5 text-amber-400" />
              <span>בחר הכל ({items.length})</span>
            </button>
            <button
              onClick={deselectAll}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Square className="h-3.5 w-3.5" />
              <span>בטל בחירה</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>הוסף מוצר נוסף</span>
          </button>
        </div>

        {/* Manual Add Item Form */}
        {isAddingNew && (
          <div className="p-3 bg-slate-950/80 border-b border-amber-500/20 flex flex-wrap items-center gap-2 text-xs animate-fadeIn">
            <input
              type="text"
              placeholder="שם המוצר (למשל: שמן זית, חלב, בצל)..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 min-w-[160px] bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-center text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                placeholder="יחידה/ק״ג"
                className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-center text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              onClick={handleAddNewItem}
              disabled={!newItemName.trim()}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              הוסף לרשימה
            </button>
          </div>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
          {items.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <ShoppingCart className="h-10 w-10 text-slate-600 mx-auto mb-2" />
              <p>לא נמצאו מצרכים ברשימה.</p>
              <button
                onClick={() => setIsAddingNew(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline font-bold"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>הוסף מוצר ראשון</span>
              </button>
            </div>
          ) : (
            items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const lowestInfo = getLowestPriceInfo(item);

              return (
                <div
                  key={item.id}
                  className={`pt-2.5 first:pt-0 flex items-center justify-between gap-2.5 p-2 rounded-2xl transition-all ${
                    isSelected
                      ? 'bg-slate-800/50 border border-slate-700/60'
                      : 'bg-slate-950/30 opacity-60 border border-transparent'
                  }`}
                >
                  {/* Selection Checkbox & Item Name */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className={`h-6 w-6 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 text-slate-950'
                          : 'border-slate-700 hover:border-slate-500 text-transparent'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateName(item.id, e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-slate-100 hover:bg-slate-900/60 focus:bg-slate-900 border border-transparent focus:border-slate-700 rounded-lg px-1.5 py-0.5 outline-none transition-colors"
                      />
                      {lowestInfo && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 px-1.5">
                          <span className="text-emerald-400 font-semibold">
                            ~₪{lowestInfo.price.toFixed(2)}
                          </span>
                          <span>•</span>
                          <span className="text-slate-400">
                            הכי זול: <strong className="text-amber-300">{lowestInfo.store}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity and Unit Stepper */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="p-1 hover:text-amber-400 text-slate-400 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold w-9 text-center text-white">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="p-1 hover:text-amber-400 text-slate-400 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-400 w-12 text-center truncate">
                      {item.unit || 'יח\''}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title="הסר מוצר מהרשימה"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer & Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          {/* Summary & Option to auto navigate */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">
                נבחרו: <span className="text-amber-400">{selectedItems.length}</span> מתוך {items.length}
              </span>
              {selectedItems.length > 0 && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300">
                    עלות משוערת: <strong className="text-emerald-400 font-black">₪{estimatedTotal.toFixed(2)}</strong>
                  </span>
                </>
              )}
            </div>

            <label className="flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={shouldNavigate}
                onChange={(e) => setShouldNavigate(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5"
              />
              <span className="font-medium">עבור ישירות ללוח השוואת המחירים (PriceWise)</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              ביטול
            </button>

            {currentCartCount > 0 && (
              <button
                type="button"
                disabled={selectedItems.length === 0}
                onClick={() => {
                  onConfirmImport(selectedItems, true, shouldNavigate);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer disabled:opacity-50"
                title="מוחק את הסל הנוכחי ומציב רק את המוצרים שנבחרו"
              >
                החלף את הסל כולו ({selectedItems.length})
              </button>
            )}

            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={() => {
                onConfirmImport(selectedItems, false, shouldNavigate);
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>
                {currentCartCount > 0
                  ? `הוסף לסל הקיים (+${selectedItems.length})`
                  : `שלב להשוואת מחירים (${selectedItems.length})`}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
