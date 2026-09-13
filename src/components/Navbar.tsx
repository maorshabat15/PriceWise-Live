import React from 'react';
import { Bot, FileText, UtensilsCrossed, ShoppingCart, Split, Settings, Refrigerator } from 'lucide-react';
import { UserAuthButton } from './UserAuthButton';
import { PriceWiseLogo } from './PriceWiseLogo';
import { User } from 'firebase/auth';
import { AppUser } from '../types';

interface NavbarProps {
  activeTab: 'chat' | 'notes' | 'tasks' | 'prompts' | 'pricewise';
  setActiveTab: (tab: 'chat' | 'notes' | 'tasks' | 'prompts' | 'pricewise') => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  notesCount: number;
  tasksCount: number;
  promptsCount: number;
  cartCount?: number;
  hasActiveShoppingList?: boolean;
  onOpenOnboardingVideo?: () => void;
  onOpenIngestModal?: () => void;
  onOpenGovSyncModal?: () => void;
  onOpenSettingsModal?: () => void;
  searchSlot?: React.ReactNode;
  currentUser?: AppUser | User | null;
  setCurrentUser?: (user: AppUser | User | null) => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  notesCount,
  tasksCount,
  promptsCount: _promptsCount,
  cartCount = 0,
  hasActiveShoppingList = false,
  onOpenSettingsModal,
  currentUser = null,
  setCurrentUser = () => {},
  showToast = () => {},
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 border-b border-amber-500/20 text-slate-100 shadow-xl backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand Identity */}
          <button
            type="button"
            onClick={() => setActiveTab('pricewise')}
            className="flex items-center gap-3 shrink-0 cursor-pointer text-right group hover:opacity-95 transition-opacity"
            title="PriceWise - חיסכון משתלם זה אנחנו"
          >
            <div className="bg-white/95 rounded-xl px-2.5 py-1 shadow-md shadow-amber-500/10 border border-slate-700/60 flex items-center justify-center">
              <PriceWiseLogo variant="full" theme="light" size="sm" showTagline={true} />
            </div>
          </button>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800/80">
            <button
              id="tab-pricewise"
              onClick={() => setActiveTab('pricewise')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pricewise'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/60'
                  : 'text-amber-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>השוואת מחירים</span>
              {cartCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'pricewise' ? 'bg-slate-950 text-amber-400' : 'bg-amber-400 text-slate-950'
                }`}>
                  {cartCount}
                </span>
              )}
            </button>

            <button
              id="tab-chat"
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'chat'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-amber-200 hover:bg-slate-800/60'
              }`}
            >
              <Bot className="h-3.5 w-3.5" />
              <span>צ'אט שף</span>
            </button>

            <button
              id="tab-notes"
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'notes'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-amber-200 hover:bg-slate-800/60'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>מתכונים</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                {notesCount}
              </span>
            </button>

            <button
              id="tab-prompts"
              onClick={() => setActiveTab('prompts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'prompts'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-amber-200 hover:bg-slate-800/60'
              }`}
            >
              <Refrigerator className="h-3.5 w-3.5" />
              <span>המקרר החכם</span>
            </button>

            {/* Contextual Tab: פיצול קניות - מופיע רק באופן מותנה לאחר שהמשתמש כבר הזין או שלח רשימת קניות בפועל */}
            {(hasActiveShoppingList || activeTab === 'tasks') && (
              <button
                id="tab-tasks-split"
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all animate-fadeIn ${
                  activeTab === 'tasks'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/60'
                    : 'text-purple-300 hover:text-white hover:bg-purple-950/60 border border-purple-500/30'
                }`}
                title="פיצול קניות חכם בין רשתות סופרמרקט (שלב מתקדם ברשימה פעילה)"
              >
                <Split className="h-3.5 w-3.5 text-purple-300" />
                <span>פיצול קניות</span>
                {tasksCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeTab === 'tasks' ? 'bg-slate-950 text-purple-300' : 'bg-purple-500 text-slate-950'
                  }`}>
                    {tasksCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Settings & User Profile Controls */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* App Settings & Culinary Background Button */}
            {onOpenSettingsModal && (
              <button
                id="btn-app-settings"
                onClick={onOpenSettingsModal}
                className="bg-slate-900/90 hover:bg-slate-800 border border-amber-500/30 text-amber-300 hover:text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer shrink-0"
                title="הגדרות האפליקציה ורקע קולינרי"
                aria-label="פתח הגדרות אפליקציה"
              >
                <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span className="hidden sm:inline">הגדרות</span>
              </button>
            )}

            {/* Google Sign In / User Profile Button */}
            <UserAuthButton
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              showToast={showToast}
            />
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab('pricewise')}
            className={`flex flex-col items-center p-1 text-[11px] ${
              activeTab === 'pricewise' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <ShoppingCart className="h-4 w-4 mb-0.5" />
            <span>השוואת מחירים</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center p-1 text-[11px] ${
              activeTab === 'chat' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Bot className="h-4 w-4 mb-0.5" />
            <span>צ'אט שף</span>
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex flex-col items-center p-1 text-[11px] ${
              activeTab === 'notes' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <FileText className="h-4 w-4 mb-0.5" />
            <span>מתכונים ({notesCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex flex-col items-center p-1 text-[11px] ${
              activeTab === 'prompts' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Refrigerator className="h-4 w-4 mb-0.5" />
            <span>המקרר החכם</span>
          </button>
          {(hasActiveShoppingList || activeTab === 'tasks') && (
            <button
              id="mobile-tab-tasks-split"
              onClick={() => setActiveTab('tasks')}
              className={`flex flex-col items-center p-1 text-[11px] animate-fadeIn transition-colors ${
                activeTab === 'tasks' ? 'text-purple-400 font-bold' : 'text-purple-300 hover:text-purple-200'
              }`}
            >
              <Split className="h-4 w-4 mb-0.5 text-purple-400" />
              <span>פיצול קניות</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


