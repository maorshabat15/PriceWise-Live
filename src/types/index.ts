export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskShoppingItem {
  name: string;
  quantity: number;
  unit: string;
  price: number;
  isChecked?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  tags: string[];
  createdAt: string;
  storeName?: string;
  subtotal?: number;
  shoppingItems?: TaskShoppingItem[];
}

export interface PromptItem {
  id: string;
  title: string;
  category: string;
  promptText: string;
  description: string;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export type PersonaMode = 
  | 'assistant' 
  | 'chef_head' 
  | 'sommelier' 
  | 'food_critic' 
  | 'pastry_chef' 
  | 'code_developer' 
  | 'strategy_analyst' 
  | 'custom';

export interface CustomPersonaConfig {
  id: string;
  name: string;
  role: string;
  icon: string;
  systemPrompt: string;
  temperature?: number;
}

export interface UserProfileContext {
  name?: string;
  email?: string;
  isLoggedIn?: boolean;
  dietary?: string;
  kosher?: string;
  culinaryStyle?: string;
  notes?: string;
}

export interface AppCartItemSummary {
  name: string;
  quantity: number;
  unit: string;
  cheapestPrice?: number;
  cheapestStore?: string;
  allPrices?: Record<string, number>;
}

export interface AppContextData {
  cartItems?: AppCartItemSummary[];
  cartTotal?: number;
  bestStoreForCart?: string;
  budgetLimit?: number | null;
  groceryItemsCount?: number;
  notes?: Array<{ title: string; content: string }>;
  tasks?: Array<{ title: string; status: string; priority?: string }>;
  totalProductsInDb?: number;
}

export interface PersonalGeminiConfig {
  apiKey: string;
  isEnabled: boolean;
  selectedModel: string;
  temperature: number;
  dietaryPreference?: string;
  kosherPreference?: string;
  culinaryStyle?: string;
  personalNotes?: string;
}

export interface ChpVerificationInfo {
  isVerified: boolean;
  chpUrl: string;
  matchedProductName?: string;
  barcode?: string;
  source: 'chp.co.il';
  verifiedAt: string;
  priceAccuracy: number; // e.g. 100
  discrepanciesCount?: number;
  notes?: string;
}

// PriceWise Smart Cart & Price Comparison Types
export interface GroceryItem {
  id: string;
  name: string;
  barcode?: string;
  category: 'dairy' | 'meat' | 'produce' | 'dry' | 'beverages' | 'cleaning' | 'bakery' | 'other';
  quantity: number;
  unit: string;
  prices: {
    shufersal: number;
    ramiLevy: number;
    yohananof: number;
    victory: number;
    carrefour: number;
    osherAd: number;
  };
  cheaperAlternative?: {
    name: string;
    savingsPerUnit: number;
    reason: string;
  };
  chpVerification?: ChpVerificationInfo;
}

export type StoreKey = 'shufersal' | 'ramiLevy' | 'yohananof' | 'victory' | 'carrefour' | 'osherAd';

export interface StoreInfo {
  key: StoreKey;
  name: string;
  logoColor: string;
  badge?: string;
}

export interface IProduct {
  _id: string;
  name: string;
  barcode: string;
  image_url: string;
  category: string;
  created_at?: Date | string;
}

export interface IPrice {
  _id: string;
  productId: string;
  supermarketName: string;
  price: number;
  lastUpdated: Date | string;
}

// Smart Fridge Wizard & Dedicated Session Types
export interface SmartFridgeDish {
  id: string;
  name: string;
  style: string;
  prepTime: string;
  description?: string;
  tags?: string[];
  difficulty?: 'קל' | 'בינוני' | 'מושקע';
}

export interface SmartFridgeSession {
  id: string;
  createdAt: number;
  ingredients: string[];
  diners: string;
  mealStyle: string;
  notes?: string;
  selectedDish: SmartFridgeDish;
  chatMessages: ChatMessage[];
}

// Unified Authenticated / Chef User Profile
export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified?: boolean;
  isLocalChef?: boolean;
  isGoogleAccount?: boolean;
  providerId?: string;
}

// Multi-Session Chat Management
export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  category?: 'general' | 'smart_fridge' | 'recipe' | 'budget';
}

