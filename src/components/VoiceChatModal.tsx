import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PersonaMode, CustomPersonaConfig, PersonalGeminiConfig, AppContextData, UserProfileContext } from '../types';
import { streamChatMessage } from '../services/aiService';
import { createSpeechStreamer, SpeechStreamer, stopSpeaking, getSpeechRecognition } from '../utils/speech';
import { Mic, MicOff, Volume2, VolumeX, X, Sparkles, Loader2, RotateCcw, Zap, CheckCircle2 } from 'lucide-react';

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  persona?: PersonaMode | string;
  personaName?: string;
  customPersona?: CustomPersonaConfig;
  geminiConfig?: PersonalGeminiConfig;
  userProfile?: UserProfileContext;
  appContext?: AppContextData;
  historyMessages: Array<{ role: 'user' | 'model'; content: string }>;
  onNewMessagePair: (userText: string, aiText: string) => void;
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  persona,
  personaName = 'השף של PriceWise',
  customPersona,
  geminiConfig,
  userProfile,
  appContext,
  historyMessages,
  onNewMessagePair,
}) => {
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastAiResponse, setLastAiResponse] = useState('');
  const [currentSpokenSentence, setCurrentSpokenSentence] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const streamerRef = useRef<SpeechStreamer | null>(null);
  const silenceTimerRef = useRef<any>(null);
  const requestStartTimeRef = useRef<number>(0);
  const latestTranscriptRef = useRef<string>('');
  const isSendingRef = useRef<boolean>(false);
  const isContinuousModeRef = useRef<boolean>(isContinuousMode);
  isContinuousModeRef.current = isContinuousMode;

  // Cleanup helper
  const cleanUpAll = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }
    stopSpeaking();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    isSendingRef.current = false;
  }, []);

  const handleSendVoiceText = useCallback(
    async (textToSend: string) => {
      const trimmed = textToSend.trim();
      if (!trimmed || isSendingRef.current) return;

      isSendingRef.current = true;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Stop recognition while AI is answering
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }

      // Stop any prior speech
      if (streamerRef.current) {
        streamerRef.current.stop();
      }
      stopSpeaking();

      setVoiceState('processing');
      setLastAiResponse('');
      setCurrentSpokenSentence('');
      requestStartTimeRef.current = Date.now();

      // Zero-Latency sentence streamer
      if (!isMuted) {
        streamerRef.current = createSpeechStreamer({
          onStart: () => {
            // First sentence began playing in the browser! Record Time-To-First-Audio
            const elapsed = Date.now() - requestStartTimeRef.current;
            setLatencyMs(elapsed);
            setVoiceState('speaking');
          },
          onSentence: (sentence) => {
            setCurrentSpokenSentence(sentence);
          },
          onEnd: () => {
            setCurrentSpokenSentence('');
            setVoiceState('idle');
            isSendingRef.current = false;
            // In continuous mode, seamlessly resume listening for the next user query
            if (isContinuousModeRef.current) {
              setTimeout(() => {
                startListening();
              }, 400);
            }
          },
          onError: () => {
            setVoiceState('idle');
            isSendingRef.current = false;
          },
        });
      }

      try {
        await streamChatMessage(
          {
            message: trimmed,
            history: historyMessages,
            persona,
            systemInstruction: persona === 'custom' ? customPersona?.systemPrompt : undefined,
            userApiKey: geminiConfig?.isEnabled && geminiConfig?.apiKey ? geminiConfig.apiKey : undefined,
            model: geminiConfig?.selectedModel,
            temperature: geminiConfig?.temperature,
            userProfile,
            personalProfile: geminiConfig
              ? {
                  dietary: geminiConfig.dietaryPreference,
                  kosher: geminiConfig.kosherPreference,
                  culinaryStyle: geminiConfig.culinaryStyle,
                  notes: geminiConfig.personalNotes,
                }
              : undefined,
            appContext,
            isVoice: true, // Triggers ultra-fast model, no heavy tools, and voice-optimized prompt
          },
          (deltaChunk, accumulated) => {
            setLastAiResponse(accumulated);
            if (!isMuted && streamerRef.current) {
              // Sentence-by-sentence streaming: feeds token delta into sentence breaker
              streamerRef.current.feedChunk(deltaChunk);
            }
          },
          (finalText) => {
            setLastAiResponse(finalText);
            onNewMessagePair(trimmed, finalText);
            if (!isMuted && streamerRef.current) {
              streamerRef.current.finish();
            } else {
              setVoiceState('idle');
              isSendingRef.current = false;
              if (isContinuousModeRef.current) {
                setTimeout(() => {
                  startListening();
                }, 400);
              }
            }
          },
          (err) => {
            console.error('[VoiceChatModal] Stream error:', err);
            setErrorText(err.message || 'שגיאה בקבלת מענה קולי. נא לנסות שוב.');
            setVoiceState('idle');
            isSendingRef.current = false;
          }
        );
      } catch (err) {
        console.error('[VoiceChatModal] Send voice text failed:', err);
        setErrorText('שגיאה בתקשורת הקולית. אנא נסה שוב.');
        setVoiceState('idle');
        isSendingRef.current = false;
      }
    },
    [
      historyMessages,
      persona,
      customPersona,
      geminiConfig,
      userProfile,
      appContext,
      isMuted,
      onNewMessagePair,
    ]
  );

  // Setup Web Speech API (webkitSpeechRecognition) for Live real-time STT
  const startListening = useCallback(() => {
    cleanUpAll();
    setErrorText(null);
    setTranscript('');
    latestTranscriptRef.current = '';

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setErrorText('דפדפן זה אינו תומך ב-Web Speech API. מומלץ להשתמש ב-Google Chrome או Microsoft Edge.');
      setVoiceState('idle');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'he-IL';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState('listening');
        setErrorText(null);
      };

      recognition.onspeechstart = () => {
        setVoiceState('listening');
      };

      recognition.onspeechend = () => {
        // Browser detected that speech audio stopped: expedite dispatch
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        if (latestTranscriptRef.current.trim() && !isSendingRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (latestTranscriptRef.current.trim() && !isSendingRef.current) {
              handleSendVoiceText(latestTranscriptRef.current.trim());
            }
          }, 450);
        }
      };

      recognition.onresult = (event: any) => {
        let liveTranscript = '';
        let hasFinalResult = false;
        for (let i = 0; i < event.results.length; i++) {
          liveTranscript += event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            hasFinalResult = true;
          }
        }

        const trimmed = liveTranscript.trim();
        setTranscript(trimmed);
        latestTranscriptRef.current = trimmed;

        // Fast Voice Activity Detection (VAD) / Silence Detection:
        // Text is already transcribed in real-time. Wait 500ms (if final) or 750ms before auto-sending
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        if (trimmed.length > 0) {
          const timeoutMs = hasFinalResult ? 500 : 750;
          silenceTimerRef.current = setTimeout(() => {
            if (latestTranscriptRef.current.trim() && !isSendingRef.current) {
              handleSendVoiceText(latestTranscriptRef.current.trim());
            }
          }, timeoutMs);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceChatModal] Speech recognition warning/error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorText('אנא אשר גישה למיקרופון בהגדרות הדפדפן כדי לדבר עם השף.');
          setVoiceState('idle');
        } else if (event.error === 'no-speech') {
          // Normal timeout when silent, continue listening if in continuous mode
        } else if (event.error !== 'aborted') {
          // ignore aborted
        }
      };

      recognition.onend = () => {
        // If recognition closed but user was still talking or finished with text, send it
        if (latestTranscriptRef.current.trim() && !isSendingRef.current) {
          handleSendVoiceText(latestTranscriptRef.current.trim());
          return;
        }

        setVoiceState((current) => (current === 'listening' ? 'idle' : current));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('[VoiceChatModal] Failed to start recognition:', e);
      setVoiceState('idle');
    }
  }, [cleanUpAll, handleSendVoiceText]);

  // Handle open / close lifecycle
  useEffect(() => {
    if (!isOpen) {
      cleanUpAll();
      setVoiceState('idle');
      setTranscript('');
      setLastAiResponse('');
      setCurrentSpokenSentence('');
      setLatencyMs(null);
      return;
    }

    // Auto-start listening on modal open
    startListening();

    return () => {
      cleanUpAll();
    };
  }, [isOpen, startListening, cleanUpAll]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-slate-100 flex flex-col items-center justify-between min-h-[520px] relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="w-full flex items-center justify-between border-b border-slate-800/80 pb-3.5 z-10">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-extrabold text-white">שיחה קולית במהירות-על</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Zap className="h-3 w-3 fill-amber-400 text-amber-400" />
                  Latency &lt; 3s
                </span>
              </div>
              <p className="text-xs text-amber-200/70">{personaName} • תמלול חי והקראה באפס השהיה</p>
            </div>
          </div>

          <button
            onClick={() => {
              cleanUpAll();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            title="סגור שיחה קולית"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Center Dynamic Visualizer Ring */}
        <div className="my-6 flex flex-col items-center justify-center z-10 space-y-5">
          <div className="relative flex items-center justify-center">
            {/* Outer Pulsing Waves for Listening */}
            {voiceState === 'listening' && (
              <>
                <div className="absolute w-44 h-44 rounded-full bg-amber-500/20 animate-ping" />
                <div className="absolute w-36 h-36 rounded-full bg-amber-500/30 animate-pulse" />
              </>
            )}

            {/* Speaking Waves */}
            {voiceState === 'speaking' && (
              <>
                <div className="absolute w-44 h-44 rounded-full bg-emerald-500/25 animate-pulse" />
                <div className="absolute w-36 h-36 rounded-full bg-emerald-500/35 animate-ping" />
              </>
            )}

            {/* Processing Spinner Ring */}
            {voiceState === 'processing' && (
              <div className="absolute w-40 h-40 rounded-full bg-indigo-500/20 animate-spin border-2 border-indigo-500/40 border-t-transparent" />
            )}

            {/* Central Action Button */}
            <button
              id="btn-voice-chat-action"
              onClick={() => {
                if (voiceState === 'listening') {
                  if (transcript.trim()) {
                    handleSendVoiceText(transcript);
                  } else {
                    cleanUpAll();
                    setVoiceState('idle');
                  }
                } else if (voiceState === 'speaking') {
                  stopSpeaking();
                  setVoiceState('idle');
                } else if (voiceState === 'processing') {
                  // Wait for completion
                } else {
                  startListening();
                }
              }}
              className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all border-2 cursor-pointer ${
                voiceState === 'listening'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 scale-105 shadow-amber-500/50'
                  : voiceState === 'speaking'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 scale-105 shadow-emerald-500/50 animate-pulse'
                  : voiceState === 'processing'
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-slate-800 text-amber-400 border-amber-500/40 hover:border-amber-400'
              }`}
            >
              {voiceState === 'listening' && <Mic className="h-10 w-10 animate-bounce" />}
              {voiceState === 'speaking' && <Volume2 className="h-10 w-10 animate-pulse" />}
              {voiceState === 'processing' && <Loader2 className="h-10 w-10 animate-spin" />}
              {voiceState === 'idle' && <Mic className="h-10 w-10" />}

              <span className="text-[11px] font-black mt-1">
                {voiceState === 'listening' && 'מקשיב...'}
                {voiceState === 'speaking' && 'מקריא...'}
                {voiceState === 'processing' && 'מעבד...'}
                {voiceState === 'idle' && 'לחץ לדבר'}
              </span>
            </button>
          </div>

          {/* Status Label & Latency Indicator */}
          <div className="text-center space-y-1.5 max-w-sm px-4">
            {voiceState === 'listening' && (
              <div>
                <p className="text-xs text-amber-300 font-bold animate-pulse">
                  דבר בחופשיות – זיהוי חי (Live STT) פועל ברקע
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  כשתסיים לדבר, השאלה תישלח אוטומטית תוך שנייה
                </p>
              </div>
            )}
            {voiceState === 'speaking' && (
              <div>
                <p className="text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {personaName} מקריא משפט אחר משפט בזמן אמת
                </p>
                {latencyMs !== null && (
                  <span className={`inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full border ${
                    latencyMs <= 3000
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-md shadow-emerald-500/20'
                      : 'bg-amber-950/90 text-amber-300 border-amber-500/50'
                  }`}>
                    <Zap className="h-3.5 w-3.5 fill-current text-emerald-400" />
                    <span>זמן תגובה עד דיבור: {(latencyMs / 1000).toFixed(2)} שניות ({latencyMs <= 3000 ? 'מהיר מ-3 שניות! ⚡' : 'הושלם'})</span>
                  </span>
                )}
              </div>
            )}
            {voiceState === 'processing' && (
              <div>
                <p className="text-xs text-indigo-300 font-bold">
                  הזרמת משפטים מהירה מ-Gemini Flash...
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  המשפט הראשון מוקרא מיידית ברגע הגעתו
                </p>
              </div>
            )}
            {voiceState === 'idle' && (
              <p className="text-xs text-slate-400">
                לחץ על המיקרופון כדי להתחיל לדבר עם השף
              </p>
            )}
          </div>
        </div>

        {/* Live Streaming Box: User Transcript & AI Real-Time Spoken Sentences */}
        <div className="w-full bg-slate-950/90 border border-slate-800/90 rounded-2xl p-4 min-h-[120px] max-h-[170px] overflow-y-auto text-xs z-10 leading-relaxed shadow-inner">
          {transcript && (
            <div className="mb-2.5 pb-2 border-b border-slate-800/60">
              <span className="font-bold text-amber-400">{userProfile?.name || 'אורח'}: </span>
              <span className="text-slate-100">{transcript}</span>
              {voiceState === 'listening' && (
                <span className="inline-block w-1.5 h-3.5 bg-amber-400 ml-1 animate-pulse align-middle" />
              )}
            </div>
          )}

          {currentSpokenSentence && (
            <div className="mb-2 p-2 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-200 animate-fadeIn">
              <span className="font-bold text-emerald-300">מקריא כעת: </span>
              <span>"{currentSpokenSentence}"</span>
            </div>
          )}

          {lastAiResponse && !currentSpokenSentence && (
            <div>
              <span className="font-bold text-emerald-400">{personaName}: </span>
              <span className="text-slate-200">{lastAiResponse}</span>
            </div>
          )}

          {!transcript && !lastAiResponse && !currentSpokenSentence && (
            <div className="text-slate-500 text-center italic py-4">
              "נסה לומר: מה אפשר להכין עם פטריות ובצל? או בנה לי תפריט שף זריז"
            </div>
          )}
        </div>

        {/* Error Notification */}
        {errorText && (
          <div className="w-full text-center text-rose-300 text-xs bg-rose-950/60 border border-rose-800/80 rounded-xl p-2.5 my-2 z-10 shadow">
            {errorText}
          </div>
        )}

        {/* Bottom Control Bar */}
        <div className="w-full flex items-center justify-between border-t border-slate-800/80 pt-3.5 mt-3 z-10 text-xs">
          <div className="flex items-center space-x-2 space-x-reverse">
            <button
              onClick={() => setIsContinuousMode(!isContinuousMode)}
              className={`px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isContinuousMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>שיחה רציפה: {isContinuousMode ? 'מופעלת' : 'כבויה'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            {voiceState === 'listening' && transcript.trim() && (
              <button
                onClick={() => handleSendVoiceText(transcript)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-4 py-1.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
              >
                <span>שלח עכשיו</span>
                <Zap className="h-3.5 w-3.5 fill-slate-950" />
              </button>
            )}

            <button
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                } else {
                  setIsMuted(true);
                  stopSpeaking();
                }
              }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/40 border-rose-800 text-rose-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={isMuted ? 'בטל השתקת הקראה' : 'השתק הקראה'}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
