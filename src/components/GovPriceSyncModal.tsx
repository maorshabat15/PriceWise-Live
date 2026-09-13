import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, 
  Sparkles, Database, ArrowDownToLine, RefreshCw, Layers, ShieldCheck, 
  ExternalLink, Check, ShoppingCart, Zap, FileCode, Tag
} from 'lucide-react';
import { 
  ISRAEL_GOV_CHAINS, 
  GovChainInfo, 
  GovParsedItem, 
  GovParseResult, 
  decompressGzipFile, 
  parseGovPricesXml, 
  generateSampleGovPriceXml 
} from '../services/govXmlParserService';
import { GroceryItem } from '../types';

interface GovPriceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: (importedItems: GovParsedItem[]) => void;
  onAddItemsToCart?: (items: GroceryItem[]) => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const GovPriceSyncModal: React.FC<GovPriceSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
  onAddItemsToCart,
  showToast = (_msg: string, _type?: 'success' | 'info' | 'error') => {},
}) => {
  const [activeTab, setActiveTab] = useState<'auto' | 'upload' | 'sample' | 'chains'>('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<GovParseResult | null>(null);
  const [selectedChain, setSelectedChain] = useState<GovChainInfo>(ISRAEL_GOV_CHAINS[2]); // Yohananof by default
  const [enrichWithAi, setEnrichWithAi] = useState(true);
  const [isCommitted, setIsCommitted] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [autoSyncSummary, setAutoSyncSummary] = useState<{ totalImported: number; chains: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Run autonomous AI cloud crawler directly from government repositories
  const handleRunAutoCrawler = async (targetChainId: string) => {
    setIsProcessing(true);
    setParsedResult(null);
    setIsCommitted(false);
    setAutoSyncSummary(null);
    
    const chainNameDisplay = targetChainId === 'all' 
      ? 'כל רשתות השיווק בישראל' 
      : ISRAEL_GOV_CHAINS.find(c => c.id === targetChainId)?.name || 'יוחננוף';

    setProcessingStep(`רובוט ה-AI מתחבר לשרת מחירי השקיפות של ${chainNameDisplay}...`);

    try {
      await new Promise((r) => setTimeout(r, 400));
      setProcessingStep(`מפענח קטלוג ומנרמל שמות וברקודים באמצעות Gemini AI...`);

      const response = await fetch('/api/sync/auto-fetch-gov', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: targetChainId,
          enrichWithAi,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'שגיאה בשאיבת הנתונים');
      }

      const data = await response.json();
      setAutoSyncSummary({
        totalImported: data.totalImported,
        chains: data.chains || [],
      });
      setIsCommitted(true);
      showToast(data.message || `סונכרנו בהצלחה מוצרי ${chainNameDisplay}!`, 'success');

      if (onSyncComplete) {
        onSyncComplete([]);
      }
    } catch (err: any) {
      console.error('Auto crawler error:', err);
      showToast(err?.message || 'שגיאה בהפעלת הרובוט האוטומטי', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Process selected file (GZ or XML)
  const handleFileProcess = async (file: File) => {
    setIsProcessing(true);
    setParsedResult(null);
    setIsCommitted(false);
    setProcessingStep(`פורק קובץ ${file.name}...`);

    try {
      // Step 1: Decompress GZ / Read text
      const xmlString = await decompressGzipFile(file);
      setProcessingStep(`מפענח מבנה XML של חוק שקיפות מחירים...`);

      // Small delay for UI smoothness
      await new Promise((r) => setTimeout(r, 150));

      // Step 2: Parse XML structure
      const result = parseGovPricesXml(xmlString, file.name);

      if (result.items.length === 0 && result.errors.length > 0) {
        throw new Error(result.errors[0] || 'לא נמצאו פריטים תקניים בקובץ');
      }

      setParsedResult(result);
      showToast(`זוהו בהצלחה ${result.totalItems} מוצרים מקובץ ${result.chainName}!`, 'success');
    } catch (err: any) {
      console.error('File parsing error:', err);
      showToast(err?.message || 'שגיאה בפענוח הקובץ', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Generate and process sample government XML
  const handleGenerateSample = async (chain: GovChainInfo) => {
    setIsProcessing(true);
    setParsedResult(null);
    setIsCommitted(false);
    setSelectedChain(chain);
    setProcessingStep(`מייצר קובץ XML תקני עבור ${chain.name}...`);

    try {
      await new Promise((r) => setTimeout(r, 300));
      const sampleXml = generateSampleGovPriceXml(chain);
      const result = parseGovPricesXml(sampleXml, `PriceFull_${chain.code}_001.xml`);
      setParsedResult(result);
      showToast(`נטען קובץ שקיפות לדוגמה של ${chain.name} (${result.totalItems} מוצרים)`, 'info');
    } catch (err: any) {
      showToast('שגיאה בטעינת קובץ לדוגמה', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Commit items to Cloud Database & update Cart in chunks
  const handleCommitToDatabase = async () => {
    if (!parsedResult || parsedResult.items.length === 0) return;

    setIsProcessing(true);
    setProcessingStep(`מעלה ומסנכרן ${parsedResult.items.length} מוצרים למסד הנתונים בענן...`);

    try {
      const allItems = parsedResult.items;
      const CHUNK_SIZE = 1500;
      let totalSynced = 0;

      for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
        const chunk = allItems.slice(i, i + CHUNK_SIZE);
        setProcessingStep(`מסנכרן מקטע ${Math.floor(i / CHUNK_SIZE) + 1} מתוך ${Math.ceil(allItems.length / CHUNK_SIZE)} (${chunk.length} פריטים)...`);

        const response = await fetch('/api/sync/gov-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: chunk,
            chainName: parsedResult.chainName,
            enrichWithAi,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'שגיאה בסנכרון השרת');
        }

        const resData = await response.json();
        totalSynced += resData.updatedCount || chunk.length;
      }

      setIsCommitted(true);
      showToast(`סונכרנו ${totalSynced} מוצרים בהצלחה למסד הנתונים עבור רשת ${parsedResult.chainName}!`, 'success');

      if (onSyncComplete) {
        onSyncComplete(parsedResult.items);
      }
    } catch (err: any) {
      console.error('Commit error:', err);
      showToast(err?.message || 'שגיאה בעדכון מסד הנתונים', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-white">סנכרון חוק שקיפות המחירים</h3>
                  <span className="bg-amber-400/10 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/20">
                    XML / .gz Live Sync
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  קליטה, פענוח והזנה אוטומטית של קובצי מחירים ומבצעים ממשלתיים
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 px-6 pt-2 bg-slate-950/40 overflow-x-auto">
            <button
              onClick={() => setActiveTab('auto')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'auto'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>שאיבה אוטומטית ע״י AI (מומלץ)</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'upload'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>העלאת קובץ XML / GZ</span>
            </button>

            <button
              onClick={() => setActiveTab('sample')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'sample'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>בדיקת קובץ שקיפות לדוגמה</span>
            </button>

            <button
              onClick={() => setActiveTab('chains')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'chains'
                  ? 'border-amber-400 text-amber-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              <span>מאגרי הרשתות</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {activeTab === 'auto' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 text-[11px] font-black px-3 py-1 rounded-full border border-amber-400/30 mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>רובוט ענן אוטונומי לשאיבת שקיפות מחירים</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-white">
                        ה-AI שואב, מפענח ומסנכרן את הנתונים ישירות – ללא צורך בהורדת קבצים!
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        הרובוט מתחבר לשרתים הממשלתיים של הרשתות, מחלץ את מחירי המוצרים, מנרמל שמות וברקודים ומעדכן את מסד הנתונים בענן.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleRunAutoCrawler('yohananof')}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm px-5 py-3 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                      <span>שאב וסנכרן את יוחננוף עכשיו</span>
                    </button>

                    <button
                      onClick={() => handleRunAutoCrawler('all')}
                      disabled={isProcessing}
                      className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs sm:text-sm px-4 py-3 rounded-2xl active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      <Layers className="w-4 h-4 text-amber-400" />
                      <span>שאב וסנכרן את כל הרשתות ביחד</span>
                    </button>
                  </div>
                </div>

                {/* Quick Individual Chain Crawlers */}
                <div>
                  <h5 className="text-xs font-bold text-slate-300 mb-2.5">
                    שאיבה ממוקדת לפי רשת ספציפית:
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {ISRAEL_GOV_CHAINS.map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => handleRunAutoCrawler(chain.id)}
                        disabled={isProcessing}
                        className="p-3 bg-slate-950/60 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-2xl text-right transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chain.color }} />
                          <span className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">{chain.name.split(' ')[0]}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">סנכרן AI ←</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary after sync */}
                {autoSyncSummary && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between text-emerald-300">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">סנכרון ה-AI הושלם בהצלחה!</p>
                        <p className="text-[11px] text-emerald-400/80">סונכרנו {autoSyncSummary.totalImported} מחירים חדשים למאגר הנתונים בענן.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                {/* Dropzone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileProcess(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    dragOver
                      ? 'border-amber-400 bg-amber-400/10'
                      : 'border-slate-700 hover:border-amber-500/50 bg-slate-950/40 hover:bg-slate-950/70'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,.gz,.tar.gz"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">גרור לכאן קובץ PriceFull / Promo (.xml או .gz)</h4>
                    <p className="text-xs text-slate-400 mt-1">או לחץ לבחירת קובץ מהמחשב שלך</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                    <span>תומך בקובצי שקיפות של כל הרשתות בישראל</span>
                  </div>
                </div>

                {/* Options */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-xs font-bold text-slate-200">נרמול שמות וסיווג חכם באמצעות Gemini AI</p>
                      <p className="text-[11px] text-slate-400">מתקן קיצורי קופה, מזהה קטגוריות וממפה תחליפים זולים</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enrichWithAi}
                      onChange={(e) => setEnrichWithAi(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'sample' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  בחר רשת שיווק להרצת סימולציה ופענוח קובץ שקיפות מחירים ממשלתי בזמן אמת:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ISRAEL_GOV_CHAINS.slice(0, 6).map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => handleGenerateSample(chain)}
                      disabled={isProcessing}
                      className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between group ${
                        selectedChain.id === chain.id
                          ? 'border-amber-400 bg-amber-500/10'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3.5 h-3.5 rounded-full" 
                          style={{ backgroundColor: chain.color }}
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{chain.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">קוד: {chain.code}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-amber-400 group-hover:translate-x-[-2px] transition-transform">
                        טען XML ←
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'chains' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  קישורים ישירים למאגרי הקבצים הציבוריים של רשתות השיווק (מתעדכנים מדי יום עפ״י חוק):
                </p>
                <div className="space-y-2">
                  {ISRAEL_GOV_CHAINS.map((chain) => (
                    <div
                      key={chain.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: chain.color }}
                        />
                        <div>
                          <p className="text-xs font-bold text-white">{chain.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{chain.url}</p>
                        </div>
                      </div>
                      <a
                        href={chain.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-300 hover:text-amber-200 bg-slate-900 border border-amber-500/30 px-3 py-1.5 rounded-xl hover:bg-slate-850 transition-all"
                      >
                        <span>פתח שרת קבצים</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-300">
                <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                <div>
                  <p className="text-xs font-bold">{processingStep}</p>
                  <p className="text-[10px] text-amber-400/80">מעבד אלפי שורות XML בזיכרון ומבצע אופטימיזציה...</p>
                </div>
              </div>
            )}

            {/* Parsed Results Preview Table */}
            {parsedResult && parsedResult.items.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      תוצאות פענוח: {parsedResult.items.length} מוצרים מרשת {parsedResult.chainName}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    קוד רשת: {parsedResult.chainId}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/60 divide-y divide-slate-850">
                  {parsedResult.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-900/60">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-slate-200">{item.cleanName}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="font-mono">ברקוד: {item.barcode}</span>
                            {item.manufacturerName && <span>• {item.manufacturerName}</span>}
                            <span>• {item.unitOfMeasure}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="font-black text-amber-400 text-sm">₪{item.price.toFixed(2)}</span>
                        {item.unitPrice && (
                          <p className="text-[9px] text-slate-400">₪{item.unitPrice.toFixed(2)} / יח'</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>תואם פורמט משרד הכלכלה לחוק שקיפות מחירים</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl cursor-pointer"
              >
                סגור
              </button>

              {parsedResult && parsedResult.items.length > 0 && (
                <button
                  onClick={handleCommitToDatabase}
                  disabled={isProcessing || isCommitted}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg transition-all cursor-pointer ${
                    isCommitted
                      ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                  } disabled:opacity-50`}
                >
                  {isCommitted ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>הנתונים סונכרנו למאגר הענן!</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>שמור {parsedResult.items.length} מוצרים למסד הנתונים</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
