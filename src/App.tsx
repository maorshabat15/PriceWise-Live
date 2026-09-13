import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { getUserDataFromCloud, saveUserDataToCloud } from './firebase';
import { Note, Task, PromptItem, GroceryItem, IProduct, IPrice, AppUser } from './types';
import { INITIAL_NOTES, INITIAL_TASKS, INITIAL_PROMPTS } from './data/initialData';
import {
  INITIAL_GROCERY_ITEMS,
  CATALOG_PRODUCTS,
  getAdjustedPricesForProduct,
  getRealChainPricesForText,
} from './data/priceWiseData';
import { applyChpVerificationToItem } from './services/chpVerificationService';
import { Navbar } from './components/Navbar';
import { ChatStudio } from './components/ChatStudio';
import { NotesStudio } from './components/NotesStudio';
import { TaskBoard } from './components/TaskBoard';
import { PromptLibrary } from './components/PromptLibrary';
import { SmartFridgeView } from './components/SmartFridgeView';
import { PriceWiseStudio } from './components/PriceWiseStudio';
import { BackgroundMedia } from './components/BackgroundMedia';
import { OnboardingExplainerModal } from './components/OnboardingExplainerModal';
import DataIngestionModal from './components/DataIngestionModal';
import { GovPriceSyncModal } from './components/GovPriceSyncModal';
import { SplitShoppingProposalModal } from './components/SplitShoppingProposalModal';
import { AccessibilityMenu } from './components/AccessibilityMenu';
import { AppSettingsModal } from './components/AppSettingsModal';
import { 
  calculateSplitShopping, 
  createTasksFromSplitGroups, 
  createTaskFromSingleStore, 
  SplitCalculationResult 
} from './utils/splitShoppingHelper';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pricewise' | 'chat' | 'notes' | 'tasks' | 'prompts'>('pricewise');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "gap">("default");
  const [activeCategory, setActiveCategory] = useState<string>("הכל");
  const [allProducts, setAllProducts] = useState<IProduct[]>(CATALOG_PRODUCTS);
  const [products, setProducts] = useState<IProduct[]>(CATALOG_PRODUCTS);
  const [prices, setPrices] = useState<IPrice[]>([]);
  const [budgetLimit, setBudgetLimit] = useState<number | null>(null);
  const [isSettingBudget, setIsSettingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [initialChatPrompt, setInitialChatPrompt] = useState<string | undefined>(undefined);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isGovSyncModalOpen, setIsGovSyncModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | User | null>(null);
  const isInitialCloudLoadDone = useRef(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Split Shopping State
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return localStorage.getItem('cw_selected_city') || 'תל אביב - יפו';
  });
  const [splitProposalResult, setSplitProposalResult] = useState<SplitCalculationResult | null>(null);
  const [isSplitProposalModalOpen, setIsSplitProposalModalOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(undefined);

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    localStorage.setItem('cw_selected_city', city);
  };

  // Toast notification helper
  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const combined = [...data];
          CATALOG_PRODUCTS.forEach((cp) => {
            if (!combined.some((p) => p.barcode === cp.barcode || p.name === cp.name)) {
              combined.push(cp);
            }
          });
          setAllProducts(combined);
        }
      }
      const pricesRes = await fetch('/api/prices');
      if (pricesRes.ok) {
        const pricesData = await pricesRes.json();
        if (Array.isArray(pricesData)) {
          setPrices(pricesData);
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);
  
  // Show Onboarding Explainer Video on first visit
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(() => {
    const hasSeen = localStorage.getItem('cw_has_seen_onboarding_video');
    return hasSeen !== 'true';
  });

  // Persistent Grocery Items for PriceWise
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() => {
    const saved = localStorage.getItem('cw_grocery_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_GROCERY_ITEMS;
  });

  // Persistent Notes
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('cw_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_NOTES;
  });

  // Persistent Tasks
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('cw_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_TASKS;
  });

  // Persistent Prompts
  const [prompts, setPrompts] = useState<PromptItem[]>(() => {
    const saved = localStorage.getItem('cw_prompts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_PROMPTS;
  });

  // Cloud Data Synchronization on Login
  useEffect(() => {
    if (!currentUser) {
      isInitialCloudLoadDone.current = false;
      return;
    }

    const loadCloudData = async () => {
      try {
        const cloudData = await getUserDataFromCloud(currentUser.uid);
        if (cloudData) {
          if (cloudData.groceryItems && Array.isArray(cloudData.groceryItems)) {
            setGroceryItems(cloudData.groceryItems);
          }
          if (cloudData.notes && Array.isArray(cloudData.notes)) {
            setNotes(cloudData.notes);
          }
          if (cloudData.tasks && Array.isArray(cloudData.tasks)) {
            setTasks(cloudData.tasks);
          }
          if (cloudData.prompts && Array.isArray(cloudData.prompts)) {
            setPrompts(cloudData.prompts);
          }
          if (typeof cloudData.budgetLimit === 'number') {
            setBudgetLimit(cloudData.budgetLimit);
          }
        } else {
          // If no cloud data yet, save current local state to cloud
          await saveUserDataToCloud(currentUser.uid, {
            groceryItems,
            notes,
            tasks,
            prompts,
            budgetLimit,
          });
        }
      } catch (err) {
        console.warn('Failed to load user cloud data:', err);
      } finally {
        isInitialCloudLoadDone.current = true;
      }
    };

    loadCloudData();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('cw_grocery_items', JSON.stringify(groceryItems));
    if (currentUser && isInitialCloudLoadDone.current) {
      saveUserDataToCloud(currentUser.uid, { groceryItems });
    }
  }, [groceryItems, currentUser]);

  useEffect(() => {
    localStorage.setItem('cw_notes', JSON.stringify(notes));
    if (currentUser && isInitialCloudLoadDone.current) {
      saveUserDataToCloud(currentUser.uid, { notes });
    }
  }, [notes, currentUser]);

  useEffect(() => {
    localStorage.setItem('cw_tasks', JSON.stringify(tasks));
    if (currentUser && isInitialCloudLoadDone.current) {
      saveUserDataToCloud(currentUser.uid, { tasks });
    }
  }, [tasks, currentUser]);

  useEffect(() => {
    localStorage.setItem('cw_prompts', JSON.stringify(prompts));
    if (currentUser && isInitialCloudLoadDone.current) {
      saveUserDataToCloud(currentUser.uid, { prompts });
    }
  }, [prompts, currentUser]);

  // Grocery Handlers
  const handleSaveGroceryItem = (itemToSave: GroceryItem) => {
    setGroceryItems((prev) => {
      const exists = prev.some((i) => i.id === itemToSave.id);
      if (exists) {
        return prev.map((i) => (i.id === itemToSave.id ? itemToSave : i));
      }
      return [itemToSave, ...prev];
    });
  };

  const handleDeleteGroceryItem = (id: string) => {
    setGroceryItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearGroceryCart = () => {
    setGroceryItems([]);
  };

  const handleConfirmSplitShopping = () => {
    if (!splitProposalResult) return;
    const newTasks = createTasksFromSplitGroups(
      splitProposalResult.splitGroups,
      selectedCity,
      splitProposalResult.savings
    );
    setTasks((prev) => [...newTasks, ...prev]);
    setIsSplitProposalModalOpen(false);
    setActiveTab('tasks');
    showToast(
      `נוצרו ${newTasks.length} משימות פיצול קניות בטאב 'פיצול קניות' עם חיסכון של ₪${splitProposalResult.savings.toFixed(1)}!`,
      'success'
    );
  };

  const handleConfirmSingleStoreShopping = () => {
    if (!splitProposalResult) return;
    const newTask = createTaskFromSingleStore(
      splitProposalResult.cheapestSingleStore.storeName,
      splitProposalResult.cheapestSingleStore.branchName,
      splitProposalResult.cheapestSingleStore.total,
      splitProposalResult.singleStoreItems,
      selectedCity
    );
    setTasks((prev) => [newTask, ...prev]);
    setIsSplitProposalModalOpen(false);
    setActiveTab('tasks');
    showToast(
      `נוצרה משימת קנייה מרוכזת ב-${splitProposalResult.cheapestSingleStore.storeName.split(' ')[0]} בטאב 'פיצול קניות'!`,
      'success'
    );
  };

  const handleCheckSplitFromCart = (itemsToCheck: GroceryItem[], isManualClick: boolean = false) => {
    if (!itemsToCheck || itemsToCheck.length < 2) {
      if (isManualClick) {
        showToast('הוסף לפחות 2 מוצרים לסל כדי לבדוק אפשרות לפיצול קנייה וחיסכון', 'info');
      }
      setIsSplitProposalModalOpen(false);
      return;
    }

    const splitEval = calculateSplitShopping(itemsToCheck, selectedCity);
    if (splitEval.needsSplit) {
      setSplitProposalResult(splitEval);
      setIsSplitProposalModalOpen(true);
    } else {
      setIsSplitProposalModalOpen(false);
      if (isManualClick) {
        showToast(
          `בדקנו את הסל שלך (${itemsToCheck.length} מוצרים): אין צורך לפצל! קנייה ב-${splitEval.cheapestSingleStore.storeName.split(' ')[0]} היא המשתלמת ביותר (₪${splitEval.cheapestSingleStore.total.toFixed(1)}).`,
          'info'
        );
      }
    }
  };

  const handleAddShoppingListToComparison = (
    newItems: GroceryItem[],
    replace: boolean = false,
    navigateToComparison: boolean = false
  ) => {
    if (!newItems || newItems.length === 0) return;

    let computedFinalItems: GroceryItem[] = [];

    setGroceryItems((prev) => {
      if (replace) {
        computedFinalItems = newItems;
        return newItems;
      }

      const updated = [...prev];
      for (const item of newItems) {
        const existingIdx = updated.findIndex(
          (existing) =>
            existing.name.trim().toLowerCase() === item.name.trim().toLowerCase() ||
            (existing.barcode && item.barcode && existing.barcode === item.barcode)
        );

        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: Number((updated[existingIdx].quantity + item.quantity).toFixed(2)),
            prices: item.prices || updated[existingIdx].prices,
          };
        } else {
          updated.unshift(item);
        }
      }
      computedFinalItems = updated;
      return updated;
    });

    showToast(
      replace
        ? `סל השוואת המחירים עודכן עם ${newItems.length} מוצרים! רוצה לחסוך? בדוק פיצול קניות חכם בבאנר המוצע.`
        : `נוספו בהצלחה ${newItems.length} מוצרים להשוואת המחירים! רוצה לחסוך? בדוק פיצול קניות חכם בבאנר המוצע.`,
      'success'
    );

    if (navigateToComparison) {
      setActiveTab('pricewise');
    }

    // Automatically evaluate if a split purchase proposal is beneficial
    const splitEval = calculateSplitShopping(computedFinalItems, selectedCity);
    setSplitProposalResult(splitEval);
    // Keep proposal modal ready for user action via contextual banner or suggestion
    if (!splitEval.needsSplit) {
      setIsSplitProposalModalOpen(false);
    }
  };

  // Note Handlers
  const handleSaveNote = (noteToSave: Note) => {
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === noteToSave.id);
      if (exists) {
        return prev.map((n) => (n.id === noteToSave.id ? noteToSave : n));
      }
      return [noteToSave, ...prev];
    });
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  // Task Handlers
  const handleSaveTask = (taskToSave: Task) => {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === taskToSave.id);
      if (exists) {
        return prev.map((t) => (t.id === taskToSave.id ? taskToSave : t));
      }
      return [taskToSave, ...prev];
    });
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Prompt Handlers
  const handleSavePrompt = (promptToSave: PromptItem) => {
    setPrompts((prev) => {
      const exists = prev.some((p) => p.id === promptToSave.id);
      if (exists) {
        return prev.map((p) => (p.id === promptToSave.id ? promptToSave : p));
      }
      return [promptToSave, ...prev];
    });
  };

  const handleDeletePrompt = (id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  };

  // Cross-tab dispatching
  const handleSendToChat = (text: string) => {
    setInitialChatPrompt(text);
    setActiveTab('chat');
  };

  // Filter & Sort Catalog
  useEffect(() => {
    let filtered = [...allProducts];

    // 1. סינון לפי קטגוריה
    if (activeCategory !== 'הכל') {
      filtered = filtered.filter((p) => p.category === activeCategory);
    }

    // 2. סינון לפי חיפוש טקסטואלי או ברקוד
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.barcode?.includes(searchQuery)
      );
    }

    // 3. מיון מתקדם
    if (sortBy !== 'default') {
      filtered.sort((a, b) => {
        const pricesA = getAdjustedPricesForProduct(a._id, prices).map((pr) => pr.price);
        const pricesB = getAdjustedPricesForProduct(b._id, prices).map((pr) => pr.price);

        const minA = pricesA.length > 0 ? Math.min(...pricesA) : 0;
        const minB = pricesB.length > 0 ? Math.min(...pricesB) : 0;

        const maxA = pricesA.length > 0 ? Math.max(...pricesA) : 0;
        const maxB = pricesB.length > 0 ? Math.max(...pricesB) : 0;

        const gapA = maxA - minA;
        const gapB = maxB - minB;

        if (sortBy === 'price-asc') {
          return minA - minB;
        } else if (sortBy === 'price-desc') {
          return minB - minA;
        } else if (sortBy === 'gap') {
          return gapB - gapA;
        }
        return 0;
      });
    }

    setProducts(filtered);
  }, [searchQuery, activeCategory, allProducts, sortBy, prices]);

  const cart = groceryItems.map((item) => ({
    productId: item.id,
    name: item.name,
    quantity: item.quantity,
  }));

  const addToCart = (productId: string, quantity = 1) => {
    const prod = allProducts.find((p) => p._id === productId);
    if (!prod) return;

    const matched = getRealChainPricesForText(prod.name);
    const existingIndex = groceryItems.findIndex(
      (i) => i.id === prod._id || i.name === prod.name
    );

    if (existingIndex >= 0) {
      const updated = [...groceryItems];
      updated[existingIndex].quantity += quantity;
      setGroceryItems(updated);
    } else {
      const newItem: GroceryItem = {
        id: prod._id,
        name: prod.name,
        category: (matched.category as any) || 'dairy',
        quantity,
        unit: matched.unit || 'יחידה',
        prices: matched.prices,
        cheaperAlternative: matched.alternative,
      };
      const verifiedItem = applyChpVerificationToItem(newItem, true);
      setGroceryItems((prev) => [verifiedItem, ...prev]);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 antialiased flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Dynamic Culinary Background Video / Photo Engine */}
      <BackgroundMedia />

      {/* Header Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        notesCount={notes.length}
        tasksCount={tasks.length}
        promptsCount={prompts.length}
        cartCount={groceryItems.reduce((acc, item) => acc + item.quantity, 0)}
        hasActiveShoppingList={groceryItems.length > 0 || tasks.some(t => t.tags.includes('פיצול_קניות') || t.storeName)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        showToast={showToast}
      />

      {/* Explainer Video & First-time Onboarding Modal */}
      <OnboardingExplainerModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
      />

      {/* AI Data Feed Ingestion Modal */}
      <DataIngestionModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onSyncComplete={() => {
          setIsIngestModalOpen(false);
          fetchProducts();
        }}
        showToast={showToast}
      />

      {/* Government XML / GZ Price Transparency Sync Hub Modal */}
      <GovPriceSyncModal
        isOpen={isGovSyncModalOpen}
        onClose={() => setIsGovSyncModalOpen(false)}
        onSyncComplete={() => {
          fetchProducts();
          showToast('מאגר המחירים הממשלתי עודכן בהצלחה!', 'success');
        }}
        showToast={showToast}
      />

      {/* Split Shopping Proposal Modal (Conditional: only renders/opens if split is beneficial) */}
      <SplitShoppingProposalModal
        isOpen={isSplitProposalModalOpen}
        onClose={() => setIsSplitProposalModalOpen(false)}
        splitResult={splitProposalResult}
        selectedCity={selectedCity}
        onConfirmSplit={handleConfirmSplitShopping}
        onConfirmSingleStore={handleConfirmSingleStoreShopping}
      />

      {/* Application Settings Modal (Culinary Background, Display, Accessibility) */}
      <AppSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border animate-fadeIn text-xs sm:text-sm font-bold max-w-md ${
          toastMessage.type === 'success'
            ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-900/30'
            : toastMessage.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-500/50 shadow-rose-900/30'
            : 'bg-slate-900/90 text-amber-200 border-amber-500/50 shadow-amber-900/30'
        }`}>
          {toastMessage.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
          {toastMessage.type === 'error' && <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />}
          {toastMessage.type === 'info' && <Info className="h-4 w-4 text-amber-400 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Floating Accessibility Menu (WCAG 2.1 AA Compliant) */}
      <AccessibilityMenu />

      {/* Main Content View Container over backdrop */}
      <main className="relative z-10 flex-1 overflow-x-hidden p-2 sm:p-4">
        {activeTab === 'pricewise' && (
          <PriceWiseStudio
            groceryItems={groceryItems}
            onSaveItem={handleSaveGroceryItem}
            onDeleteItem={handleDeleteGroceryItem}
            onClearCart={handleClearGroceryCart}
            onSendToChat={handleSendToChat}
            showToast={showToast}
            onOpenGovSyncModal={() => setIsGovSyncModalOpen(true)}
            budgetLimit={budgetLimit}
            setBudgetLimit={setBudgetLimit}
            isSettingBudget={isSettingBudget}
            setIsSettingBudget={setIsSettingBudget}
            budgetInput={budgetInput}
            setBudgetInput={setBudgetInput}
            selectedCity={selectedCity}
            onSelectCity={handleSelectCity}
            onCheckSplitRecommendation={handleCheckSplitFromCart}
          />
        )}

        {activeTab === 'chat' && (
          <ChatStudio
            initialPrompt={initialChatPrompt}
            onClearInitialPrompt={() => setInitialChatPrompt(undefined)}
            showToast={showToast}
            currentUser={currentUser}
            groceryItems={groceryItems}
            products={products}
            prices={prices}
            notes={notes}
            tasks={tasks}
            budgetLimit={budgetLimit}
            onAddItemsToCart={handleAddShoppingListToComparison}
            onNavigateToComparison={() => setActiveTab('pricewise')}
            onSaveNote={handleSaveNote}
            onNavigateToNotes={(noteId) => {
              if (noteId) setSelectedNoteId(noteId);
              setActiveTab('notes');
            }}
          />
        )}

        {activeTab === 'notes' && (
          <NotesStudio
            notes={notes}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            onSendToChat={handleSendToChat}
            searchQuery={searchQuery}
            selectedNoteId={selectedNoteId}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskBoard
            tasks={tasks}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onSendToChat={handleSendToChat}
            searchQuery={searchQuery}
            onNavigateToComparison={() => setActiveTab('pricewise')}
          />
        )}

        {activeTab === 'prompts' && (
          <SmartFridgeView
            onSendToChat={handleSendToChat}
            searchQuery={searchQuery}
            currentUser={currentUser}
            showToast={showToast}
            onSaveNote={handleSaveNote}
            onNavigateToNotes={(noteId) => {
              if (noteId) setSelectedNoteId(noteId);
              setActiveTab('notes');
            }}
          />
        )}
      </main>
    </div>
  );
}


