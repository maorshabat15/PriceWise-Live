import { useState } from "react";
import { X, Sparkles, UploadCloud, CheckCircle2, Loader2, Database, Receipt, Code2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DataIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
  showToast: (msg: string, type?: "success" | "info" | "error") => void;
}

export default function DataIngestionModal({
  isOpen,
  onClose,
  onSyncComplete,
  showToast,
}: DataIngestionModalProps) {
  const [activeTab, setActiveTab] = useState<"receipt" | "json">("receipt");
  const [receiptText, setReceiptText] = useState(
`סופרסל שלי - סניף עפולה
חלב תנובה 3% קרטון 6.80
גב צהובה עמק 200ג 14.90
קולה זירו 1.5 ליטר 7.90
לחם פרוס אחיד 7.20`
  );
  const [jsonInput, setJsonInput] = useState(`[
  { "rawText": "חל תנוב 3 אחוז 1ל", "price": 6.80, "chainName": "שופרסל" },
  { "rawText": "קוטג שטראוס 5%", "price": 5.90, "chainName": "רמי לוי" }
]`);
  
  const [isLoading, setIsLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<any[] | null>(null);

  // פענוח חשבונית לתצוגה מקדימה
  const handleParseReceipt = async () => {
    setIsLoading(true);
    setPreviewItems(null);
    try {
      const res = await fetch("/api/sync/parse-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptText }),
      });

      if (!res.ok) throw new Error("פענוח נכשל");
      const data = await res.json();
      setPreviewItems(data.items || []);
      showToast(`זוהו ${data.items.length} מוצרים בחשבונית!`, "info");
    } catch (err) {
      showToast("שגיאה בפענוח החשבונית", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // שמירה סופית למאגר
  const handleCommitToDatabase = async (itemsToSave: any[]) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/sync/raw-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSave }),
      });

      if (!res.ok) throw new Error("סנכרון נכשל");
      const result = await res.json();

      showToast(`הועלו למאגר ${result.updatedCount} מוצרים בהצלחה!`, "success");
      onSyncComplete();
    } catch (err) {
      showToast("שגיאה בעדכון מאגר הנתונים", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-6 flex flex-col gap-5 text-right max-h-[90vh] overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-5 left-5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 text-indigo-600">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">הזנת נתוני מחירים חכמה</h3>
              <p className="text-xs text-slate-500 mt-0.5">פענוח אוטומטי של חשבוניות ועדכון מחירי הסופרמרקט</p>
            </div>
          </div>

          {/* טאבים לבחירת סוג הקלט */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => { setActiveTab("receipt"); setPreviewItems(null); }}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "receipt" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>הדבקת חשבונית / טקסט קופה</span>
            </button>
            <button
              onClick={() => { setActiveTab("json"); setPreviewItems(null); }}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === "json" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>פיד נתונים ישיר (JSON)</span>
            </button>
          </div>

          {activeTab === "receipt" ? (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-700">הדבק כאן את טקסט החשבונית:</label>
              <textarea
                value={receiptText}
                onChange={(e) => setReceiptText(e.target.value)}
                rows={6}
                className="w-full bg-slate-50 text-slate-800 font-sans text-xs rounded-xl p-3 border border-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                placeholder="הדבק טקסט של קבלה או רשימת מחירים..."
              />
              
              {!previewItems && (
                <button
                  onClick={handleParseReceipt}
                  disabled={isLoading || !receiptText.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-indigo-200" />}
                  <span>פענח מוצרים מחשבונית זו</span>
                </button>
              )}

              {/* תצוגה מקדימה של הפריטים המפוענחים */}
              {previewItems && (
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span>מוצרים שפוענחו ({previewItems.length}):</span>
                    <button
                      onClick={() => setPreviewItems(null)}
                      className="text-slate-400 hover:text-slate-600 text-[11px] font-normal"
                    >
                      ערוך טקסט מחדש
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {previewItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <div>
                            <span className="font-bold text-slate-800 block">{item.cleanName}</span>
                            <span className="text-[10px] text-slate-400">{item.category} • רשת: {item.chainName}</span>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-indigo-600">₪{item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleCommitToDatabase(previewItems)}
                    disabled={isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer mt-2 shadow-md shadow-emerald-100"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>אשר והעלה הכל למאגר האתר</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-slate-700">פיד נתונים גולמי (JSON):</label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={8}
                dir="ltr"
                className="w-full bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl p-3 border border-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
              />
              <button
                onClick={() => {
                  try {
                    handleCommitToDatabase(JSON.parse(jsonInput));
                  } catch (e) {
                    showToast("JSON לא תקין", "error");
                  }
                }}
                disabled={isLoading || !jsonInput.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-indigo-200" />}
                <span>הפעל פענוח ועדכון למאגר</span>
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
