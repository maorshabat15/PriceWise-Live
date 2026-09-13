import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { 
  Plus, CheckSquare, Clock, AlertCircle, Sparkles, Trash2, Edit3, 
  Check, X, ArrowRight, Split, ShoppingCart, Store, MapPin, CheckCircle2 
} from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  onSaveTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onSendToChat: (prompt: string) => void;
  searchQuery: string;
  onNavigateToComparison?: () => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onSaveTask,
  onDeleteTask,
  onSendToChat,
  searchQuery,
  onNavigateToComparison,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [tags, setTags] = useState('');

  const handleToggleShoppingItem = (taskId: string, itemIdx: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.shoppingItems) return;
    const updated = task.shoppingItems.map((item, idx) => {
      if (idx === itemIdx) {
        return { ...item, isChecked: !item.isChecked };
      }
      return item;
    });
    const allChecked = updated.length > 0 && updated.every((i) => i.isChecked);
    onSaveTask({
      ...task,
      shoppingItems: updated,
      status: allChecked ? 'done' : task.status === 'done' ? 'in_progress' : task.status,
    });
  };

  const openNewTaskModal = (initialStatus: TaskStatus = 'todo') => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setStatus(initialStatus);
    setPriority('medium');
    setTags('');
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setTags(task.tags.join(', '));
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const taskToSave: Task = {
      id: editingTask ? editingTask.id : `task-${Date.now()}`,
      title,
      description,
      status,
      priority,
      tags: parsedTags.length > 0 ? parsedTags : ['כללי'],
      createdAt: editingTask ? editingTask.createdAt : new Date().toISOString(),
    };

    onSaveTask(taskToSave);
    setIsModalOpen(false);
  };

  const moveTaskStatus = (task: Task, nextStatus: TaskStatus) => {
    onSaveTask({
      ...task,
      status: nextStatus,
    });
  };

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'todo', label: 'לביצוע', color: 'bg-slate-100 text-slate-700' },
    { id: 'in_progress', label: 'בביצוע', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { id: 'review', label: 'בסקירה', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { id: 'done', label: 'הושלם', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ];

  const filteredTasks = tasks.filter((t) => {
    return (
      searchQuery === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'high':
        return <span className="text-[10px] bg-rose-100 text-rose-700 font-semibold px-2 py-0.5 rounded">גבוהה</span>;
      case 'medium':
        return <span className="text-[10px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded">בינונית</span>;
      case 'low':
        return <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded">נמוכה</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-2 sm:p-4 space-y-6">
      {/* Board Top Action Header */}
      <div className="flex items-center justify-between bg-slate-900/85 border border-amber-500/25 p-4 rounded-2xl shadow-2xl backdrop-blur-xl text-slate-100">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Split className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">לוח פיצול קניות ומשימות</h2>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                {tasks.length} משימות ורשימות
              </span>
            </div>
            <p className="text-xs text-amber-200/70">
              ניהול רשימות קנייה מפוצלות לפי סופרמרקטים, מעקב תקציבי וארגון משימות קולינריות.
            </p>
          </div>
        </div>

        <button
          id="add-task-btn"
          onClick={() => openNewTaskModal('todo')}
          className="flex items-center space-x-1.5 space-x-reverse bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs px-3.5 py-2 rounded-xl font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>הוסף משימה</span>
        </button>
      </div>

      {/* Active Split Shopping Routes Banner */}
      {tasks.some((t) => t.tags.includes('פיצול_קניות') || t.storeName) && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 shadow-xl backdrop-blur-xl text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">מסלול פיצול קניות פעיל בסופרמרקטים</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {tasks.filter((t) => t.tags.includes('פיצול_קניות') || t.storeName).length} סופרים ברשימה
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                עבור בסניפים וסמן מוצרים כפי שנרכשו בצ'ק-ליסט של כל כרטיסיית סופר.
              </p>
            </div>
          </div>

          {onNavigateToComparison && (
            <button
              onClick={onNavigateToComparison}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>חזור להשוואת מחירים (PriceWise)</span>
            </button>
          )}
        </div>
      )}

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className="bg-slate-900/80 border border-amber-500/20 backdrop-blur-xl rounded-2xl p-3 flex flex-col min-h-[500px] shadow-2xl"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-2 mb-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${col.color}`}>
                    {col.label}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{colTasks.length}</span>
                </div>

                <button
                  onClick={() => openNewTaskModal(col.id)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                  title="הוסף משימה לעמודה זו"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Task Cards Column List */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-xs my-2">
                    אין משימות בסטטוס {col.label}
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all group relative"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-slate-800 text-xs sm:text-sm leading-snug">
                          {task.title}
                        </h3>
                        {getPriorityBadge(task.priority)}
                      </div>

                      {/* Store Badge if this is a split shopping task */}
                      {task.storeName && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 mb-2.5 flex items-center justify-between">
                          <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-amber-600" />
                            <span>{task.storeName}</span>
                          </span>
                          {task.subtotal !== undefined && (
                            <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ₪{task.subtotal.toFixed(1)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Interactive Shopping Items Checklist */}
                      {task.shoppingItems && task.shoppingItems.length > 0 && (
                        <div className="space-y-1.5 my-2.5 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pb-1 border-b border-slate-200">
                            <span className="flex items-center gap-1">
                              <ShoppingCart className="h-3 w-3 text-amber-600" />
                              <span>מצרכים לקנייה בסניף:</span>
                            </span>
                            <span className="text-emerald-700 font-bold">
                              {task.shoppingItems.filter((i) => i.isChecked).length} / {task.shoppingItems.length} נרכשו
                            </span>
                          </div>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                            {task.shoppingItems.map((sItem, sIdx) => (
                              <div
                                key={sIdx}
                                onClick={() => handleToggleShoppingItem(task.id, sIdx)}
                                className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer transition-colors ${
                                  sItem.isChecked
                                    ? 'bg-emerald-50 text-slate-400 line-through'
                                    : 'hover:bg-white text-slate-800'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                                      sItem.isChecked
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    {sItem.isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                                  </div>
                                  <span className="truncate">
                                    {sItem.name} ({sItem.quantity} {sItem.unit})
                                  </span>
                                </div>
                                <span className="font-bold text-[11px] shrink-0 mr-1">
                                  ₪{sItem.price.toFixed(1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {task.description && !task.shoppingItems?.length && (
                        <p className="text-xs text-slate-600 mb-3 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {task.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-slate-100 text-slate-600 font-medium px-1.5 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                        <button
                          onClick={() =>
                            onSendToChat(
                              `אנא עזור לי לפרק את המשימה הזו "${task.title}" ל-3 תת-משימות טכניות מפורטות עם צעדי יישום ברורים.`
                            )
                          }
                          className="flex items-center space-x-1 space-x-reverse text-indigo-600 hover:text-indigo-800 font-medium"
                          title="צור תת-משימות באמצעות AI"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>תת-משימות ב-AI</span>
                        </button>

                        <div className="flex items-center space-x-1 space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(task)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500"
                            title="ערוך משימה"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 hover:bg-rose-50 rounded text-rose-600"
                            title="מחק משימה"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Move Status Controls */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]">
                        <span className="text-slate-400">העבר:</span>
                        <div className="flex items-center space-x-1 space-x-reverse">
                          {col.id !== 'todo' && (
                            <button
                              onClick={() => moveTaskStatus(task, 'todo')}
                              className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                            >
                              לביצוע
                            </button>
                          )}
                          {col.id !== 'in_progress' && (
                            <button
                              onClick={() => moveTaskStatus(task, 'in_progress')}
                              className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded font-medium"
                            >
                              בביצוע
                            </button>
                          )}
                          {col.id !== 'review' && (
                            <button
                              onClick={() => moveTaskStatus(task, 'review')}
                              className="px-1.5 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded font-medium"
                            >
                              בסקירה
                            </button>
                          )}
                          {col.id !== 'done' && (
                            <button
                              onClick={() => moveTaskStatus(task, 'done')}
                              className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded font-medium"
                            >
                              הושלם
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                {editingTask ? 'עריכת משימה' : 'יצירת משימה חדשה'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  כותרת המשימה
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="לדוגמה: הגדרת תהליך אימות משתמשים"
                  className="w-full text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  תיאור
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ספק הקשר, קריטריוני קבלה או קישורים..."
                  rows={3}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    שלב סטטוס
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="todo">לביצוע</option>
                    <option value="in_progress">בביצוע</option>
                    <option value="review">בסקירה</option>
                    <option value="done">הושלם</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    רמת דחיפות
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full text-xs border border-slate-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="low">נמוכה</option>
                    <option value="medium">בינונית</option>
                    <option value="high">גבוהה</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  תגיות (מופרדות בפסיקים)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="לדוגמה: פיתוח, ממשק, דחוף"
                  className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 space-x-reverse pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={!title.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-medium text-xs rounded-xl shadow-2xs"
              >
                שמור משימה
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
