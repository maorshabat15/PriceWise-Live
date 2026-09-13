import { GroceryItem, StoreKey, Task } from '../types';
import { STORES, CITY_BRANCHES } from '../data/priceWiseData';

export interface SplitGroupItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  isChecked?: boolean;
}

export interface SplitGroup {
  storeKey: StoreKey;
  storeName: string;
  branchName: string;
  address: string;
  logoColor: string;
  subtotal: number;
  items: SplitGroupItem[];
}

export interface SplitCalculationResult {
  needsSplit: boolean;
  reason: string;
  totalItemsCount: number;
  cheapestSingleStore: {
    storeKey: StoreKey;
    storeName: string;
    total: number;
    branchName: string;
  };
  splitTotal: number;
  savings: number;
  savingsPercent: number;
  splitGroups: SplitGroup[];
  singleStoreItems: SplitGroupItem[];
}

/**
 * Calculates whether splitting a purchase between 2 (or more) supermarkets is beneficial.
 * Strict Rule:
 * - If savings is zero or negligible (< 15 NIS or < 5%), OR if only 1 store is used,
 *   needsSplit is FALSE -> The split proposal modal will NOT be shown!
 * - Only if there is meaningful real savings (>= 15 NIS and >= 5% saving),
 *   needsSplit is TRUE -> Present the user with the split vs single store choice.
 */
export function calculateSplitShopping(
  groceryItems: GroceryItem[],
  city: string = 'תל אביב - יפו'
): SplitCalculationResult {
  if (!groceryItems || groceryItems.length < 2) {
    return {
      needsSplit: false,
      reason: 'פחות מ-2 פריטים בסל הקניות',
      totalItemsCount: groceryItems?.length || 0,
      cheapestSingleStore: {
        storeKey: 'ramiLevy',
        storeName: 'רמי לוי',
        total: 0,
        branchName: '',
      },
      splitTotal: 0,
      savings: 0,
      savingsPercent: 0,
      splitGroups: [],
      singleStoreItems: [],
    };
  }

  const branches = CITY_BRANCHES[city] || [];

  // 1. Calculate Single Store Totals
  const singleStoreTotals: Record<StoreKey, number> = {
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
      singleStoreTotals[store.key] += price * item.quantity;
    });
  });

  let cheapestSingleKey: StoreKey = 'ramiLevy';
  let cheapestSingleTotal = Infinity;

  STORES.forEach((store) => {
    const total = singleStoreTotals[store.key];
    if (total < cheapestSingleTotal) {
      cheapestSingleTotal = total;
      cheapestSingleKey = store.key;
    }
  });

  const cheapestStoreObj = STORES.find((s) => s.key === cheapestSingleKey);
  const cheapestBranchObj = branches.find((b) => b.storeKey === cheapestSingleKey);

  // 2. Determine Best Store for Each Item (Split Strategy)
  // To avoid unfeasible splits across 6 supermarkets for 1 item each,
  // we group items by their cheapest store.
  const storeItemMap: Partial<Record<StoreKey, SplitGroupItem[]>> = {};

  groceryItems.forEach((item) => {
    let bestKey: StoreKey = cheapestSingleKey;
    let lowestPrice = Infinity;

    STORES.forEach((store) => {
      const p = item.prices[store.key] ?? 10;
      if (p < lowestPrice) {
        lowestPrice = p;
        bestKey = store.key;
      }
    });

    if (!storeItemMap[bestKey]) {
      storeItemMap[bestKey] = [];
    }

    storeItemMap[bestKey]!.push({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || 'יח׳',
      pricePerUnit: lowestPrice,
      totalPrice: Number((lowestPrice * item.quantity).toFixed(2)),
      isChecked: false,
    });
  });

  // Calculate split total and groups
  const splitGroups: SplitGroup[] = [];
  let splitTotal = 0;

  Object.entries(storeItemMap).forEach(([key, items]) => {
    if (!items || items.length === 0) return;
    const sKey = key as StoreKey;
    const storeInfo = STORES.find((s) => s.key === sKey);
    const branchInfo = branches.find((b) => b.storeKey === sKey);

    const subtotal = items.reduce((acc, i) => acc + i.totalPrice, 0);
    splitTotal += subtotal;

    splitGroups.push({
      storeKey: sKey,
      storeName: storeInfo?.name || sKey,
      branchName: branchInfo?.branchName || `${storeInfo?.name || sKey} סניף מרכזי`,
      address: branchInfo?.address || city,
      logoColor: storeInfo?.logoColor || 'bg-amber-600',
      subtotal: Number(subtotal.toFixed(2)),
      items,
    });
  });

  // Sort split groups by number of items or subtotal descending
  splitGroups.sort((a, b) => b.subtotal - a.subtotal);

  const rawSavings = Math.max(0, cheapestSingleTotal - splitTotal);
  const savings = Number(rawSavings.toFixed(2));
  const savingsPercent =
    cheapestSingleTotal > 0 ? Math.round((savings / cheapestSingleTotal) * 100) : 0;

  // Decision Logic for needsSplit:
  // - Needs at least 2 distinct stores in the split
  // - Real savings must be at least 15 NIS
  // - Real savings percent must be at least 5%
  const distinctStoresCount = splitGroups.length;
  const isSavingsMeaningful = savings >= 15 && savingsPercent >= 5;
  const needsSplit = distinctStoresCount > 1 && isSavingsMeaningful;

  const reason = !needsSplit
    ? distinctStoresCount <= 1
      ? 'כל המוצרים במחיר הזול ביותר בסופרמרקט יחיד'
      : `החיסכון בפיצול קל בלבד (₪${savings}), עדיף לקנות הכל במקום אחד`
    : `חיסכון משמעותי של ₪${savings} (${savingsPercent}%) בין ${distinctStoresCount} סופרמרקטים!`;

  const singleStoreItems: SplitGroupItem[] = groceryItems.map((item) => {
    const price = item.prices[cheapestSingleKey] ?? 10;
    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit || 'יח׳',
      pricePerUnit: price,
      totalPrice: Number((price * item.quantity).toFixed(2)),
      isChecked: false,
    };
  });

  return {
    needsSplit,
    reason,
    totalItemsCount: groceryItems.length,
    cheapestSingleStore: {
      storeKey: cheapestSingleKey,
      storeName: cheapestStoreObj?.name || 'רמי לוי',
      total: Number(cheapestSingleTotal.toFixed(2)),
      branchName: cheapestBranchObj?.branchName || `${cheapestStoreObj?.name || ''} סניף ${city}`,
    },
    splitTotal: Number(splitTotal.toFixed(2)),
    savings,
    savingsPercent,
    splitGroups,
    singleStoreItems,
  };
}

/**
 * Converts split groups into persistent Task objects for the "פיצול קניות" tab
 */
export function createTasksFromSplitGroups(
  splitGroups: SplitGroup[],
  city: string,
  savings: number
): Task[] {
  const timestamp = new Date().toISOString();

  return splitGroups.map((group, index) => {
    const itemsDescription = group.items
      .map(
        (item, i) =>
          `${i + 1}. [ ] ${item.name} (${item.quantity} ${item.unit}) - ₪${item.totalPrice.toFixed(2)}`
      )
      .join('\n');

    const desc = `🛒 רשימת קנייה מפוצלת עבור ${group.storeName}\n📍 סניף: ${group.branchName} (${group.address})\n💵 סה"כ לתשלום בסניף זה: ₪${group.subtotal.toFixed(2)} (${group.items.length} מוצרים)\n\nפירוט המוצרים לקנייה:\n${itemsDescription}`;

    return {
      id: `split-task-${Date.now()}-${index}`,
      title: `קנייה ב${group.storeName.split(' ')[0]} - סניף ${group.branchName.replace(group.storeName, '').trim() || city} (₪${group.subtotal.toFixed(0)})`,
      description: desc,
      status: 'todo',
      priority: index === 0 ? 'high' : 'medium',
      tags: ['פיצול_קניות', group.storeName.split(' ')[0], city],
      createdAt: timestamp,
      storeName: group.storeName,
      subtotal: group.subtotal,
      shoppingItems: group.items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unit: it.unit,
        price: it.totalPrice,
        isChecked: false,
      })),
    };
  });
}

/**
 * Converts a single store purchase into a persistent Task object for "פיצול קניות" tab
 */
export function createTaskFromSingleStore(
  storeName: string,
  branchName: string,
  total: number,
  items: SplitGroupItem[],
  city: string
): Task {
  const itemsDescription = items
    .map(
      (item, i) =>
        `${i + 1}. [ ] ${item.name} (${item.quantity} ${item.unit}) - ₪${item.totalPrice.toFixed(2)}`
    )
    .join('\n');

  const desc = `🛒 קנייה מרוכזת בסופר יחיד ללא פיצול\n🏪 רשת: ${storeName}\n📍 סניף: ${branchName}\n💵 סה"כ לתשלום: ₪${total.toFixed(2)} (${items.length} מוצרים)\n\nפירוט המוצרים בסל:\n${itemsDescription}`;

  return {
    id: `single-task-${Date.now()}`,
    title: `קנייה מרוכזת ב${storeName.split(' ')[0]} (${items.length} מוצרים - ₪${total.toFixed(0)})`,
    description: desc,
    status: 'todo',
    priority: 'high',
    tags: ['קנייה_מרוכזת', storeName.split(' ')[0], city],
    createdAt: new Date().toISOString(),
    storeName,
    subtotal: total,
    shoppingItems: items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      unit: it.unit,
      price: it.totalPrice,
      isChecked: false,
    })),
  };
}
