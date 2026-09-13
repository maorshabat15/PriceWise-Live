import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, ChevronRight, 
  ChevronLeft, Sparkles, ShoppingCart, Bot, FileText, 
  Music, MapPin, TrendingDown, X, Volume1, Radio, Check, 
  Headphones, RefreshCw
} from 'lucide-react';

interface OnboardingExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMusic?: () => void;
}

interface VideoChapter {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  highlightColor: string;
  badge: string;
  narrationSentences: string[];
  chordNotes: number[]; // Frequencies for warm ambient backing
}

const CHAPTERS: VideoChapter[] = [
  {
    id: 'intro',
    title: 'ברוכים הבאים למרחב הקולינרי ו-PriceWise',
    subtitle: 'האפליקציה המתקדמת בישראל לחיסכון במצרכים, ניהול מתכונים וסיוע קולינרי חכם',
    icon: <Sparkles className="h-6 w-6 text-amber-400" />,
    highlightColor: 'from-amber-500/20 via-amber-600/10 to-transparent',
    badge: 'מבוא כללי ✨',
    narrationSentences: [
      'שלום וברוכים הבאים למרחב הקולינרי החכם.',
      'כאן תיהנו ממנוע השוואת מחירי סופרמרקטים בישראל, עוזר שף חכם, ספר מתכונים אישי, ומוזיקת רקע נעימה.',
      'בואו נכיר את כל הכלים שעומדים לרשותכם.'
    ],
    chordNotes: [261.63, 329.63, 392.0, 523.25], // C Major
  },
  {
    id: 'pricewise',
    title: 'השוואת מחירי סופרמרקטים לפי עיר (PriceWise)',
    subtitle: 'מדביקים רשימת קניות שלמה ומגלים מיידית היכן הכי זול לקנות בעיר שלכם',
    icon: <ShoppingCart className="h-6 w-6 text-emerald-400" />,
    highlightColor: 'from-emerald-500/20 via-teal-600/10 to-transparent',
    badge: 'השוואת מחירים 🛒',
    narrationSentences: [
      'בלשונית השוואת מחירים, תוכלו להדביק רשימת קניות שלמה בבת אחת או לבחור מצרכים מהקטלוג.',
      'המערכת משווה בזמן אמת בין רמי לוי, אושר עד, יוחננוף, שופרסל, קרפור וויקטורי.',
      'כך תדעו בדיוק היכן הסל המשתלם ביותר בעיר שלכם, ותחסכו מאות שקלים בכל קנייה.'
    ],
    chordNotes: [220.0, 261.63, 329.63, 440.0], // A Minor
  },
  {
    id: 'ai-chef',
    title: 'עוזר שף ויועץ קולינרי חכם (AI Assistant)',
    subtitle: 'מתכונים מותאמים אישית למה שיש במקרר, המרות מידה ושיחה קולית בזמן הבישול',
    icon: <Bot className="h-6 w-6 text-indigo-400" />,
    highlightColor: 'from-indigo-500/20 via-purple-600/10 to-transparent',
    badge: 'עוזר בינה מלאכותית 🤖',
    narrationSentences: [
      'עוזר השף האישי עומד לרשותכם בכל שאלה קולינרית.',
      'ספרו לו אילו מצרכים יש לכם במקרר, והוא ירכיב עבורכם מתכון מדויק שלב אחר שלב.',
      'ניתן גם לשוחח איתו בקול ולהתייעץ על התאמת יינות וטכניקות בישול מתקדמות.'
    ],
    chordNotes: [174.61, 220.0, 261.63, 349.23], // F Major
  },
  {
    id: 'notes-tasks',
    title: 'ספר מתכונים אישי וניהול משימות אירוח',
    subtitle: 'שמירת מתכונים מועדפים, רשימות הכנה לארוחות חג וסדר מופתי במטבח',
    icon: <FileText className="h-6 w-6 text-rose-400" />,
    highlightColor: 'from-rose-500/20 via-pink-600/10 to-transparent',
    badge: 'מתכונים ומשימות 📝',
    narrationSentences: [
      'בספר המתכונים תוכלו לשמור רעיונות ומתכונים מועדפים, ולשלוח אותם בלחיצה אחת לצ\'אט או לסל הקניות.',
      'לוח המשימות יעזור לכם לתכנן ארוחות חג ואירוח בלי לשכוח אף פרט.'
    ],
    chordNotes: [196.0, 246.94, 293.66, 392.0], // G Major
  },
  {
    id: 'music',
    title: 'מוזיקת רקע נעימה ואווירה קולינרית',
    subtitle: 'צלילי לופי מרגיעים, פסנתר שקט וג\'אז לליווי הבישול, הקריאה והקניות',
    icon: <Music className="h-6 w-6 text-amber-400" />,
    highlightColor: 'from-amber-500/20 via-orange-600/10 to-transparent',
    badge: 'מוזיקת רקע 🎵',
    narrationSentences: [
      'בראש המסך מחכה לכם נגן מוזיקת רקע מרגיע עם מבחר מקטעי לופי, פסנתר וג\'אז.',
      'המוזיקה תלווה אתכם בנעימות לאורך כל זמן הבישול והשימוש באפליקציה.',
      'שתהיה לכם חוויה קולינרית מהנה וחיסכון משמעותי!'
    ],
    chordNotes: [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
  },
];

export const OnboardingExplainerModal: React.FC<OnboardingExplainerModalProps> = ({
  isOpen,
  onClose,
  onStartMusic,
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isSoundTrackEnabled, setIsSoundTrackEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.6);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  // Audio & speech state references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthLoopRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const currentChapterIndexRef = useRef(currentChapterIndex);
  const isPlayingRef = useRef(isPlaying);
  const isVoiceEnabledRef = useRef(isVoiceEnabled);
  const soundVolumeRef = useRef(soundVolume);

  currentChapterIndexRef.current = currentChapterIndex;
  isPlayingRef.current = isPlaying;
  isVoiceEnabledRef.current = isVoiceEnabled;
  soundVolumeRef.current = soundVolume;

  const currentChapter = CHAPTERS[currentChapterIndex];

  // Helper to init/resume audio context
  const getOrCreateAudioContext = useCallback(() => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  // Find the most natural-sounding Hebrew voice
  const getBestHebrewVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Filter Hebrew voices
    const hebrewVoices = voices.filter(v => 
      v.lang.startsWith('he') || 
      v.lang.toLowerCase().includes('iw') || 
      v.lang.toLowerCase().includes('hebrew') ||
      v.name.includes('עברית') ||
      v.name.includes('Carmit') ||
      v.name.includes('Asaf') ||
      v.name.includes('Hila')
    );

    if (hebrewVoices.length === 0) return null;

    // Priority ranking for human-like voices
    const naturalVoice = hebrewVoices.find(v => 
      v.name.includes('Natural') || 
      v.name.includes('Neural') || 
      v.name.includes('Enhanced') || 
      v.name.includes('Google') || 
      v.name.includes('Carmit') ||
      v.name.includes('Siri')
    );

    return naturalVoice || hebrewVoices[0];
  }, []);

  // Play high quality acoustic chime on chapter transitions
  const playChapterChime = useCallback((notes: number[]) => {
    if (!isSoundTrackEnabled) return;
    try {
      const ctx = getOrCreateAudioContext();
      if (!ctx || ctx.state !== 'running') return;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

        noteGain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
        noteGain.gain.linearRampToValueAtTime(0.12 * soundVolumeRef.current, ctx.currentTime + i * 0.1 + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.1 + 1.4);

        osc.connect(noteGain);
        noteGain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 1.5);
      });
    } catch {
      // Audio context might be restricted
    }
  }, [getOrCreateAudioContext, isSoundTrackEnabled]);

  // Gentle acoustic ambient pad loop (low-pass warm synthesis that stays clear of speech)
  const startVideoAmbient = useCallback(() => {
    if (!isSoundTrackEnabled) return;
    try {
      const ctx = getOrCreateAudioContext();
      if (!ctx) return;

      if (synthLoopRef.current) {
        window.clearInterval(synthLoopRef.current);
      }

      let step = 0;
      const playStep = () => {
        if (!ctx || ctx.state !== 'running' || !isPlayingRef.current) return;
        const currentCh = CHAPTERS[currentChapterIndexRef.current];
        if (!currentCh) return;

        const baseFreqs = currentCh.chordNotes;
        const freq = baseFreqs[step % baseFreqs.length];
        step++;

        // Dual detuned oscillators for rich acoustic warmth
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, ctx.currentTime);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.002, ctx.currentTime); // subtle chorus detune

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, ctx.currentTime); // Low-pass warmth leaves 1-4kHz vocal range crystal clear
        filter.Q.setValueAtTime(1.2, ctx.currentTime);

        const targetGain = 0.04 * soundVolumeRef.current;
        noteGain.gain.setValueAtTime(0, ctx.currentTime);
        noteGain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 0.4);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.8);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 2.9);
        osc2.stop(ctx.currentTime + 2.9);
      };

      playStep();
      synthLoopRef.current = window.setInterval(playStep, 1600);
    } catch {
      // Ignore
    }
  }, [getOrCreateAudioContext, isSoundTrackEnabled]);

  const stopVideoAmbient = useCallback(() => {
    if (synthLoopRef.current) {
      window.clearInterval(synthLoopRef.current);
      synthLoopRef.current = null;
    }
  }, []);

  // Ambient sound management
  useEffect(() => {
    if (isOpen && isPlaying && isSoundTrackEnabled) {
      startVideoAmbient();
    } else {
      stopVideoAmbient();
    }
    return () => stopVideoAmbient();
  }, [isOpen, isPlaying, isSoundTrackEnabled, currentChapterIndex, soundVolume, startVideoAmbient, stopVideoAmbient]);

  // Load available voice name for UI indicator
  useEffect(() => {
    const updateVoice = () => {
      const voice = getBestHebrewVoice();
      if (voice) {
        setSelectedVoiceName(voice.name);
      }
    };
    updateVoice();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoice;
    }
  }, [getBestHebrewVoice]);

  // Advance to next chapter safely after text finishes
  const advanceToNextChapter = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    if (currentChapterIndexRef.current < CHAPTERS.length - 1) {
      const nextIdx = currentChapterIndexRef.current + 1;
      setCurrentChapterIndex(nextIdx);
      setActiveSentenceIndex(0);
      playChapterChime(CHAPTERS[nextIdx].chordNotes);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 300);
    } else {
      // Final chapter completed
      setIsPlaying(false);
      setIsSpeaking(false);
      isTransitioningRef.current = false;
    }
  }, [playChapterChime]);

  // Main Narration Engine: Speaks sentence by sentence, ensures full completion before moving
  useEffect(() => {
    if (!isOpen) return;

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (!isPlaying) {
      setIsSpeaking(false);
      return;
    }

    const sentences = currentChapter.narrationSentences;
    let isCancelled = false;
    let sentenceTimeout: NodeJS.Timeout | null = null;
    let transitionTimeout: NodeJS.Timeout | null = null;

    if (isVoiceEnabled && 'speechSynthesis' in window) {
      let currentSentence = 0;
      setActiveSentenceIndex(0);
      setIsSpeaking(true);

      const speakSentence = (index: number) => {
        if (isCancelled || !isPlayingRef.current || index >= sentences.length) {
          if (!isCancelled && isPlayingRef.current && index >= sentences.length) {
            // Entire chapter text has finished speaking!
            setIsSpeaking(false);
            // Give a relaxed 1.3-second breathing pause for visual comprehension before next chapter
            transitionTimeout = setTimeout(() => {
              if (!isCancelled && isPlayingRef.current) {
                advanceToNextChapter();
              }
            }, 1300);
          }
          return;
        }

        setActiveSentenceIndex(index);
        const text = sentences[index];
        const utterance = new SpeechSynthesisUtterance(text);
        
        const bestVoice = getBestHebrewVoice();
        if (bestVoice) {
          utterance.voice = bestVoice;
          utterance.lang = bestVoice.lang;
        } else {
          utterance.lang = 'he-IL';
        }

        // Natural, warm human vocal tuning (0.92 rate prevents rushed mechanical sound)
        utterance.rate = 0.92;
        utterance.pitch = 1.0;
        utterance.volume = soundVolumeRef.current;

        utterance.onend = () => {
          if (isCancelled || !isPlayingRef.current) return;
          // Natural breathing pause (400ms) between sentences
          sentenceTimeout = setTimeout(() => {
            if (!isCancelled && isPlayingRef.current) {
              currentSentence++;
              speakSentence(currentSentence);
            }
          }, 450);
        };

        utterance.onerror = (e) => {
          console.warn('Speech synthesis notice:', e);
          if (isCancelled || !isPlayingRef.current) return;
          // Graceful fallback to next sentence
          sentenceTimeout = setTimeout(() => {
            currentSentence++;
            speakSentence(currentSentence);
          }, 400);
        };

        window.speechSynthesis.speak(utterance);
      };

      speakSentence(0);
    } else {
      // Voice narration disabled fallback: calculate reading time proportionally to words
      const totalWords = sentences.join(' ').split(' ').length;
      const readingDurationMs = Math.max(7000, totalWords * 420);
      const sentenceInterval = readingDurationMs / sentences.length;

      let sIndex = 0;
      const interval = setInterval(() => {
        sIndex++;
        if (sIndex < sentences.length) {
          setActiveSentenceIndex(sIndex);
        } else {
          clearInterval(interval);
          transitionTimeout = setTimeout(() => {
            advanceToNextChapter();
          }, 1200);
        }
      }, sentenceInterval);

      return () => {
        clearInterval(interval);
        if (transitionTimeout) clearTimeout(transitionTimeout);
      };
    }

    return () => {
      isCancelled = true;
      if (sentenceTimeout) clearTimeout(sentenceTimeout);
      if (transitionTimeout) clearTimeout(transitionTimeout);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentChapterIndex, isVoiceEnabled, isPlaying, isOpen, getBestHebrewVoice, advanceToNextChapter]);

  const handleSeekChapter = (index: number) => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCurrentChapterIndex(index);
    setActiveSentenceIndex(0);
    setIsPlaying(true);
    getOrCreateAudioContext();
    playChapterChime(CHAPTERS[index].chordNotes);
  };

  const handleRestartCurrentChapter = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setActiveSentenceIndex(0);
    setIsPlaying(true);
    getOrCreateAudioContext();
    playChapterChime(currentChapter.chordNotes);
  };

  const handleRestartVideo = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCurrentChapterIndex(0);
    setActiveSentenceIndex(0);
    setIsPlaying(true);
    getOrCreateAudioContext();
    playChapterChime(CHAPTERS[0].chordNotes);
  };

  const handleTogglePlay = () => {
    getOrCreateAudioContext();
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (!nextState && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleFinish = () => {
    if (dontShowAgain) {
      localStorage.setItem('cw_has_seen_onboarding_video', 'true');
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopVideoAmbient();
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    if (onStartMusic) {
      onStartMusic();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col text-slate-100 my-auto relative">
        
        {/* Modal Top Header with Sound Bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <span className="h-8 w-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center shadow-md">
              🎬
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>סרטון הדרכה עם קריינות וסאונד מלא</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                  PriceWise Culinary Studio
                </span>
              </h2>
            </div>
          </div>

          {/* Sound & Voice Controls Header Bar */}
          <div className="flex items-center space-x-2 space-x-reverse">
            {/* Voice Narration Switch */}
            <button
              onClick={() => {
                getOrCreateAudioContext();
                setIsVoiceEnabled(!isVoiceEnabled);
              }}
              className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold transition-all border ${
                isVoiceEnabled
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-400/30'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="הפעל או כבה קריינות קולית בעברית"
            >
              {isVoiceEnabled ? <Volume2 className="h-3.5 w-3.5 text-amber-400 animate-pulse" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span>{isVoiceEnabled ? 'קריינות אנושית: פעילה 🗣️' : 'קריינות: כבויה'}</span>
            </button>

            {/* Ambient Soundtrack Switch */}
            <button
              onClick={() => {
                getOrCreateAudioContext();
                setIsSoundTrackEnabled(!isSoundTrackEnabled);
              }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold transition-all border ${
                isSoundTrackEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="הפעל או כבה מוזיקת רקע"
            >
              <Music className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isSoundTrackEnabled ? 'מוזיקה' : 'ללא מוזיקה'}</span>
            </button>

            <button
              onClick={handleFinish}
              className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition-colors"
              title="סגור סרטון"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video Simulation Screen / Animated Display */}
        <div className="relative aspect-video w-full bg-slate-950 border-b border-slate-800 overflow-hidden flex flex-col justify-between p-4 sm:p-6 select-none group">
          {/* Dynamic Background visual theme per chapter */}
          <div className={`absolute inset-0 bg-gradient-to-br ${currentChapter.highlightColor} opacity-80 pointer-events-none transition-all duration-700`} />
          
          {/* Animated decorative grid lines */}
          <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

          {/* Top Video Status & Animated Sound Equalizer Waves */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                {currentChapter.badge}
              </span>
              <span className="text-[11px] text-slate-300 font-bold bg-slate-900/80 border border-slate-700 px-2.5 py-0.5 rounded-full">
                פרק {currentChapterIndex + 1} מתוך {CHAPTERS.length}
              </span>
            </div>

            {/* Live Narration & Sound Equalizer Display */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-amber-500/30 px-3 py-1 rounded-full shadow-inner">
              <div className="flex items-end gap-0.5 h-3.5 w-6">
                <span className={`w-1 bg-amber-400 rounded-full transition-all duration-150 ${isSpeaking && isPlaying ? 'h-3.5 animate-pulse' : 'h-1'}`} />
                <span className={`w-1 bg-emerald-400 rounded-full transition-all duration-200 ${isSpeaking && isPlaying ? 'h-2 animate-bounce' : 'h-1.5'}`} />
                <span className={`w-1 bg-amber-400 rounded-full transition-all duration-150 ${isSpeaking && isPlaying ? 'h-3 animate-pulse' : 'h-1'}`} />
                <span className={`w-1 bg-emerald-400 rounded-full transition-all duration-300 ${isSpeaking && isPlaying ? 'h-2.5 animate-bounce' : 'h-1'}`} />
              </div>
              <span className="text-[10px] font-bold text-amber-300">
                {isSpeaking && isPlaying ? 'מקריא כעת...' : isPlaying ? 'פסקול פעיל 🎵' : 'מושהה'}
              </span>
            </div>
          </div>

          {/* Center Stage: Interactive Feature Visual Animation */}
          <div className="relative z-10 my-auto text-center space-y-3 px-2 sm:px-6">
            <div className="inline-flex p-3 rounded-2xl bg-slate-900/90 border border-amber-500/50 shadow-2xl backdrop-blur-xl animate-bounce">
              {currentChapter.icon}
            </div>

            <h3 className="text-lg sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
              {currentChapter.title}
            </h3>

            {/* Teleprompter / Live Narration Text Highlighting */}
            <div className="bg-slate-950/80 p-3.5 sm:p-4 rounded-2xl border border-slate-800/90 backdrop-blur-md shadow-xl max-w-xl mx-auto space-y-1.5 text-right">
              {currentChapter.narrationSentences.map((sentence, sIdx) => {
                const isActive = sIdx === activeSentenceIndex;
                const isPassed = sIdx < activeSentenceIndex;
                return (
                  <p
                    key={sIdx}
                    className={`text-xs sm:text-sm leading-relaxed transition-all duration-300 ${
                      isActive
                        ? 'text-amber-300 font-bold bg-amber-500/10 px-2 py-1 rounded-lg border-r-2 border-amber-400 scale-[1.01]'
                        : isPassed
                        ? 'text-slate-300 opacity-85 px-2 py-0.5'
                        : 'text-slate-400 opacity-60 px-2 py-0.5'
                    }`}
                  >
                    {sentence}
                  </p>
                );
              })}
            </div>

            {/* Interactive Live Screen Highlight Demo Snippet */}
            {currentChapter.id === 'pricewise' && (
              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap text-xs animate-fadeIn">
                <span className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-md">
                  <TrendingDown className="h-3.5 w-3.5" /> חיסכון של עשרות אחוזים
                </span>
                <span className="bg-slate-900/90 border border-slate-700 text-amber-300 font-bold px-3 py-1 rounded-xl flex items-center gap-1 shadow-md">
                  <MapPin className="h-3.5 w-3.5" /> מותאם אישית לכל עיר בישראל
                </span>
              </div>
            )}
          </div>

          {/* Bottom Video Controls & Progress Bar */}
          <div className="relative z-10 space-y-2 pt-2">
            {/* Multi-Segment Timeline Progress Bar */}
            <div className="grid grid-cols-5 gap-1.5 w-full">
              {CHAPTERS.map((ch, idx) => {
                const isPassed = idx < currentChapterIndex;
                const isCurrent = idx === currentChapterIndex;
                return (
                  <button
                    key={ch.id}
                    onClick={() => handleSeekChapter(idx)}
                    className="h-1.5 rounded-full overflow-hidden bg-slate-800 transition-all hover:h-2 relative"
                    title={`עבור לפרק ${idx + 1}: ${ch.title}`}
                  >
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isPassed
                          ? 'bg-amber-400 w-full'
                          : isCurrent
                          ? 'bg-gradient-to-r from-amber-500 to-emerald-400 animate-pulse w-full'
                          : 'w-0'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTogglePlay}
                  className="h-8 w-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold hover:bg-amber-400 transition-colors shadow-md active:scale-95"
                  title={isPlaying ? 'השהה' : 'נגן'}
                >
                  {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                </button>

                <button
                  onClick={handleRestartCurrentChapter}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                  title="הקרא פרק זה מחדש"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="text-[10px] hidden sm:inline">הקרא שוב</span>
                </button>

                <button
                  onClick={handleRestartVideo}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="התחל סרטון מההתחלה"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Volume Slider Control */}
              <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-800">
                <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={soundVolume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setSoundVolume(v);
                    getOrCreateAudioContext();
                  }}
                  className="w-14 sm:w-20 h-1 accent-amber-500 cursor-pointer"
                  title="עוצמת סאונד וקריינות"
                />
              </div>

              {/* Chapter Navigation Buttons */}
              <div className="flex items-center gap-1">
                <button
                  disabled={currentChapterIndex === 0}
                  onClick={() => handleSeekChapter(currentChapterIndex - 1)}
                  className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-1"
                  title="פרק קודם"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-[10px] hidden sm:inline">הקודם</span>
                </button>

                <button
                  disabled={currentChapterIndex === CHAPTERS.length - 1}
                  onClick={() => handleSeekChapter(currentChapterIndex + 1)}
                  className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent flex items-center gap-1"
                  title="פרק הבא"
                >
                  <span className="text-[10px] hidden sm:inline">הבא</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chapter Selection Grid */}
        <div className="p-4 sm:p-5 bg-slate-900/95 space-y-4">
          <div className="text-xs font-black text-slate-300 flex items-center justify-between">
            <span>פרקי הסרטון וההסברים:</span>
            <span className="text-amber-400 text-[11px] font-medium">לחיצה על פרק תעבור אליו מיידית</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {CHAPTERS.map((ch, idx) => {
              const isCurrent = idx === currentChapterIndex;
              const isPassed = idx < currentChapterIndex;
              return (
                <button
                  key={ch.id}
                  onClick={() => handleSeekChapter(idx)}
                  className={`p-2.5 rounded-2xl border text-right transition-all flex items-start gap-2.5 ${
                    isCurrent
                      ? 'bg-slate-800 border-amber-500 text-white shadow-lg ring-1 ring-amber-400/50'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isPassed ? <Check className="h-4 w-4 text-emerald-400" /> : ch.icon}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="text-xs font-bold truncate text-slate-100">{ch.title}</div>
                    <div className="text-[10px] text-amber-400/90 font-medium">{ch.badge}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Actions and Auto-Show Settings */}
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-200">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-amber-400 h-4 w-4 bg-slate-950"
              />
              <span>אל תציג סרטון זה שוב באופן אוטומטי בכניסות הבאות</span>
            </label>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleFinish}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>התחל להשתמש באפליקציה</span>
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
