import React, { useState, useEffect } from 'react';
import { Note } from '../types';
import { Plus, Pin, Trash2, Edit2, Sparkles, Tag, Calendar, Check, Save, FileText, Share2 } from 'lucide-react';

interface NotesStudioProps {
  notes: Note[];
  onSaveNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onSendToChat: (prompt: string) => void;
  searchQuery: string;
  selectedNoteId?: string;
}

export const NotesStudio: React.FC<NotesStudioProps> = ({
  notes,
  onSaveNote,
  onDeleteNote,
  onSendToChat,
  searchQuery,
  selectedNoteId,
}) => {
  const [activeNoteId, setActiveNoteId] = useState<string>(selectedNoteId || notes[0]?.id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Sync when selectedNoteId prop updates
  useEffect(() => {
    if (selectedNoteId) {
      const target = notes.find((n) => n.id === selectedNoteId);
      if (target) {
        selectNote(target);
      }
    }
  }, [selectedNoteId, notes]);

  // Active note state form
  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const [editTitle, setEditTitle] = useState(activeNote?.title || '');
  const [editContent, setEditContent] = useState(activeNote?.content || '');
  const [editTags, setEditTags] = useState(activeNote?.tags.join(', ') || '');

  // Update editor values when active note selection changes
  const selectNote = (note: Note) => {
    setActiveNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditTags(note.tags.join(', '));
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'מסמך ללא שם',
      content: '# מסמך חדש במרחב העבודה\n\nהתחל להקליד את התוכן שלך כאן...',
      tags: ['טיוטה'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
    };
    onSaveNote(newNote);
    selectNote(newNote);
    setIsEditing(true);
  };

  const handleSaveCurrent = () => {
    if (!activeNote) return;
    const updatedTags = editTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updatedNote: Note = {
      ...activeNote,
      title: editTitle || 'מסמך ללא שם',
      content: editContent,
      tags: updatedTags.length > 0 ? updatedTags : ['כללי'],
      updatedAt: new Date().toISOString(),
    };

    onSaveNote(updatedNote);
    setIsEditing(false);
  };

  const handleTogglePin = (note: Note) => {
    onSaveNote({
      ...note,
      isPinned: !note.isPinned,
    });
  };

  // Collect all unique tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      searchQuery === '' ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = !selectedTag || n.tags.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-5rem)]">
      {/* Left Sidebar: Note List */}
      <div className="lg:col-span-4 bg-slate-900/85 border border-amber-500/25 backdrop-blur-xl rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl text-slate-100">
        {/* Top Header Controls */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2 space-x-reverse">
            <FileText className="h-5 w-5 text-amber-400" />
            <h2 className="font-bold text-white text-sm">מתכונים ומסמכים</h2>
          </div>
          <button
            id="create-note-btn"
            onClick={handleCreateNew}
            className="flex items-center space-x-1 space-x-reverse bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs px-3 py-1.5 rounded-xl font-bold transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="h-3.5 w-3.5 stroke-[3]" />
            <span>מתכון חדש</span>
          </button>
        </div>

        {/* Tag Filter Pills */}
        {allTags.length > 0 && (
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                selectedTag === null
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              הכל
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 flex items-center space-x-1 space-x-reverse ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Tag className="h-3 w-3" />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        )}

        {/* Note Cards List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              לא נמצאו פתקים התואמים לחיפוש שלך.
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = note.id === activeNote?.id;
              return (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`group p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800 text-xs sm:text-sm line-clamp-1">
                      {note.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(note);
                      }}
                      className={`p-1 rounded hover:bg-slate-200/60 transition-colors ${
                        note.isPinned ? 'text-amber-500' : 'text-slate-300 opacity-0 group-hover:opacity-100'
                      }`}
                      title={note.isPinned ? 'בטל נעץ' : 'נעץ פתק'}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-slate-500 text-xs line-clamp-2 mb-2 leading-snug">
                    {note.content.replace(/#|\*|`/g, '')}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100/60">
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((t) => (
                        <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                    <span className="shrink-0">
                      {new Date(note.updatedAt).toLocaleDateString('he-IL', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Content Area: Reader or Editor */}
      <div className="lg:col-span-8 bg-slate-900/85 border border-amber-500/25 backdrop-blur-xl rounded-2xl flex flex-col h-full overflow-hidden shadow-2xl text-slate-100">
        {activeNote ? (
          <>
            {/* Top Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-xs text-slate-400 flex items-center space-x-1 space-x-reverse">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    עודכן לאחרונה בשעה{' '}
                    {new Date(activeNote.updatedAt).toLocaleTimeString('he-IL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </span>
              </div>

              {/* Toolbar Action Buttons */}
              <div className="flex items-center space-x-2 space-x-reverse">
                {/* AI Integration Tools */}
                <button
                  onClick={() =>
                    onSendToChat(
                      `אנא נתח וסכם את הנקודות המרכזיות של הפתק הבא בכותרת "${activeNote.title}":\n\n${activeNote.content}`
                    )
                  }
                  className="flex items-center space-x-1 space-x-reverse bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs px-2.5 py-1.5 rounded-lg font-medium border border-indigo-200/60 transition-colors"
                  title="סיכום פתק באמצעות AI"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span>סכם באמצעות AI</span>
                </button>

                {isEditing ? (
                  <button
                    onClick={handleSaveCurrent}
                    className="flex items-center space-x-1 space-x-reverse bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shadow-2xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>שמור שינויים</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditTitle(activeNote.title);
                      setEditContent(activeNote.content);
                      setEditTags(activeNote.tags.join(', '));
                      setIsEditing(true);
                    }}
                    className="flex items-center space-x-1 space-x-reverse bg-slate-800 hover:bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>ערוך מסמך</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (window.confirm('האם אתה בטוח שברצונך למחוק פתק זה?')) {
                      onDeleteNote(activeNote.id);
                      if (notes.length > 1) {
                        const remaining = notes.filter((n) => n.id !== activeNote.id);
                        selectNote(remaining[0]);
                      }
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="מחק פתק"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Note Body Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {isEditing ? (
                <div className="space-y-4 max-w-3xl">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      כותרת
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full text-lg font-bold text-slate-800 border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      תגיות (מופרדות בפסיקים)
                    </label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="w-full text-xs text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      תוכן (תמיכה ב-Markdown)
                    </label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={14}
                      className="w-full text-sm font-mono text-slate-800 border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
                    />
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl space-y-4">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    {activeNote.title}
                  </h1>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    {activeNote.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium border border-slate-200/60"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <hr className="border-slate-100 my-4" />

                  <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-sans whitespace-pre-wrap text-sm sm:text-base">
                    {activeNote.content}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <FileText className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium">בחר פתק מהרשימה מימין או צור פתק חדש.</p>
          </div>
        )}
      </div>
    </div>
  );
};
