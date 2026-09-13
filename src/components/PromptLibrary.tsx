import React, { useState } from 'react';
import { PromptItem } from '../types';
import { Sparkles, Copy, Check, Send, Plus, Tag, Trash2, Edit2, Search } from 'lucide-react';

interface PromptLibraryProps {
  prompts: PromptItem[];
  onSavePrompt: (prompt: PromptItem) => void;
  onDeletePrompt: (id: string) => void;
  onSendToChat: (promptText: string) => void;
  searchQuery: string;
}

export const PromptLibrary: React.FC<PromptLibraryProps> = ({
  prompts,
  onSavePrompt,
  onDeletePrompt,
  onSendToChat,
  searchQuery,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('פיתוח');
  const [description, setDescription] = useState('');
  const [promptText, setPromptText] = useState('');
  const [tags, setTags] = useState('');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreatePrompt = () => {
    if (!title.trim() || !promptText.trim()) return;

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const newPrompt: PromptItem = {
      id: `prompt-${Date.now()}`,
      title,
      category: category || 'כללי',
      description,
      promptText,
      tags: parsedTags.length > 0 ? parsedTags : ['פרומפט'],
    };

    onSavePrompt(newPrompt);
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
    setPromptText('');
    setTags('');
  };

  const categories = Array.from(new Set(prompts.map((p) => p.category)));

  const filteredPrompts = prompts.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.promptText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/85 border border-amber-500/25 p-4 rounded-2xl shadow-2xl backdrop-blur-xl text-slate-100">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white">ספריית רעיונות והשראה קולינרית</h2>
            <p className="text-xs text-amber-200/70">
              רעיונות ותבניות שף מוכנות מראש לפיתוח מתכונים, בניית תפריטים, התאמות יין ואירוח מושלם.
            </p>
          </div>
        </div>

        <button
          id="new-prompt-btn"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 space-x-reverse bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs px-3.5 py-2 rounded-xl font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>רעיון שף חדש</span>
        </button>
      </div>

      {/* Category Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3.5 py-1.5 rounded-full font-bold text-xs transition-all shrink-0 ${
              selectedCategory === null
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:bg-slate-800 backdrop-blur-md'
            }`}
          >
            כל הקטגוריות
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`px-3.5 py-1.5 rounded-full font-bold text-xs transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:bg-slate-800 backdrop-blur-md'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Prompts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrompts.length === 0 ? (
          <div className="col-span-full border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
            לא נמצאו תבניות פרומפט התואמות לחיפוש שלך.
          </div>
        ) : (
          filteredPrompts.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900/85 border border-amber-500/20 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/40 shadow-2xl backdrop-blur-xl transition-all group text-slate-100"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.category}
                  </span>

                  <button
                    onClick={() => onDeletePrompt(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-opacity cursor-pointer"
                    title="מחק רעיון"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-amber-100/70 mb-3 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                {/* Prompt Text Preview Box */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-200/90 leading-relaxed max-h-32 overflow-y-auto mb-3 whitespace-pre-wrap scrollbar-thin">
                  {item.promptText}
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-slate-800 text-amber-300 font-medium px-2 py-0.5 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleCopy(item.id, item.promptText)}
                  className="flex items-center space-x-1 space-x-reverse text-xs text-slate-400 hover:text-amber-300 font-medium px-2 py-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">הועתק!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>העתק</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onSendToChat(item.promptText)}
                  className="flex items-center space-x-1.5 space-x-reverse bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs px-3 py-1.5 rounded-xl font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 rotate-180" />
                  <span>שלח לצ'אט השף</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal for adding new prompt */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-100">
            <h3 className="font-extrabold text-white text-base border-b border-slate-800 pb-2">
              הוספת רעיון שף / תבנית חדשה
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  כותרת הרעיון
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="לדוגמה: בניית תפריט 5 מנות חורפי עשיר בירקות שורש"
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  קטגוריה
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="לדוגמה: תפריט שף, התאמת יין, מנות עיקריות, פטיסרי"
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  תיאור קצר
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תקציר של מה שהרעיון מספק"
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  תוכן ההנחיה לצ'אט השף
                </label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="הזן את ההנחיה המלאה לשף הפרטי..."
                  rows={4}
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  תגיות (מופרדות בפסיקים)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="לדוגמה: שף, יין, חורף, בשר, אירוח"
                  className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 space-x-reverse pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                ביטול
              </button>
              <button
                onClick={handleCreatePrompt}
                disabled={!title.trim() || !promptText.trim()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                שמור רעיון שף
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
