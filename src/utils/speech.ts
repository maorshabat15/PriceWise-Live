// Zero-Latency Speech Synthesis (TTS) & Real-Time Speech Recognition (STT) Helpers

// Cache for best Hebrew voice
let cachedHebrewVoice: SpeechSynthesisVoice | null = null;

export function getBestHebrewVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  if (cachedHebrewVoice) return cachedHebrewVoice;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Search Hebrew voices
  const hebrewVoices = voices.filter(
    (v) => v.lang.toLowerCase().includes('he') || v.lang.toLowerCase().includes('il')
  );

  if (hebrewVoices.length > 0) {
    // Prefer natural / high quality online voices if available
    const preferredVoice =
      hebrewVoices.find((v) => v.name.includes('Natural') || v.name.includes('Online')) ||
      hebrewVoices.find((v) => v.name.includes('Google') || v.name.includes('Carmit') || v.name.includes('Asaf')) ||
      hebrewVoices[0];

    cachedHebrewVoice = preferredVoice;
    return preferredVoice;
  }

  return null;
}

// Pre-warm voices on script load
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedHebrewVoice = null;
    getBestHebrewVoice();
  };
  getBestHebrewVoice();
}

/**
 * Strips markdown, emojis, asterisks, brackets, and code blocks for clean, natural speech pronunciation.
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s?/g, '') // Remove Markdown headers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1') // Remove bold / italics
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1') // Remove underscores
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep label
    .replace(/^[-*•]\s+/gm, '') // Remove bullet points at start of line
    .replace(/[-*•]\s+/g, ', ') // Replace inline bullets with a short comma pause
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Remove emojis
    .replace(/[\r\n]+/g, '. ') // Replace newlines with sentence pauses
    .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
    .trim();
}

/**
 * Speak standalone text using browser's built-in Web Speech API (window.speechSynthesis)
 */
export function speakText(
  text: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis is not supported in this browser.');
    onError?.();
    return null;
  }

  // Cancel any ongoing speech
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText) {
    onEnd?.();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'he-IL';
  utterance.rate = 1.05; // Slightly faster for natural responsive cadence
  utterance.pitch = 1.0;

  const voice = getBestHebrewVoice();
  if (voice) {
    utterance.voice = voice;
  }

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    onEnd?.();
  };

  utterance.onerror = (e) => {
    console.error('Speech synthesis error:', e);
    onError?.();
  };

  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Instantly stops any ongoing browser speech synthesis.
 */
export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  }
}

export interface SpeechStreamer {
  feedChunk: (chunk: string) => void;
  finish: () => void;
  stop: () => void;
  cancel: () => void;
  isSpeaking: () => boolean;
}

/**
 * Zero-Latency Sentence-by-Sentence Streaming Speech Synthesizer:
 *
 * Rather than waiting for the entire LLM response to complete:
 * 1. Accumulates incoming token chunks in real-time.
 * 2. As soon as ANY punctuation mark (period, comma, exclamation, question mark, newline) is encountered,
 *    it splits out that sentence/phrase and immediately starts speaking it via window.speechSynthesis.
 * 3. While the browser is speaking sentence #1, the LLM continues streaming tokens in the background!
 * 4. Ensures response latency is strictly under 1-3 seconds.
 */
export function createSpeechStreamer(options?: {
  onStart?: () => void;
  onSentence?: (sentence: string) => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}): SpeechStreamer {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return {
      feedChunk: () => {},
      finish: () => options?.onEnd?.(),
      stop: () => {},
      cancel: () => {},
      isSpeaking: () => false,
    };
  }

  let textBuffer = '';
  const sentenceQueue: string[] = [];
  let isCurrentlySpeaking = false;
  let isFinishedFeeding = false;
  let isStopped = false;
  let hasTriggeredStart = false;

  const speakNextSentence = () => {
    if (isStopped) return;

    if (sentenceQueue.length === 0) {
      if (isFinishedFeeding) {
        isCurrentlySpeaking = false;
        options?.onEnd?.();
      } else {
        isCurrentlySpeaking = false;
      }
      return;
    }

    const rawSentence = sentenceQueue.shift()!;
    const cleanSentence = cleanTextForSpeech(rawSentence);

    if (!cleanSentence || cleanSentence.length < 2) {
      speakNextSentence();
      return;
    }

    isCurrentlySpeaking = true;
    if (!hasTriggeredStart) {
      hasTriggeredStart = true;
      options?.onStart?.();
    }
    options?.onSentence?.(cleanSentence);

    try {
      const utterance = new SpeechSynthesisUtterance(cleanSentence);
      utterance.lang = 'he-IL';
      utterance.rate = 1.08; // Crisp, responsive conversational speed
      utterance.pitch = 1.0;

      const voice = getBestHebrewVoice();
      if (voice) {
        utterance.voice = voice;
      }

      clearWatchdog();
      // Watchdog: If browser speech synthesis gets stuck on an utterance, advance after timeout
      const estimatedDurationMs = Math.max(2500, cleanSentence.length * 90);
      speechWatchdogTimer = setTimeout(() => {
        if (isCurrentlySpeaking && !isStopped) {
          speakNextSentence();
        }
      }, estimatedDurationMs);

      utterance.onend = () => {
        clearWatchdog();
        speakNextSentence();
      };

      utterance.onerror = (err) => {
        clearWatchdog();
        console.warn('Speech streamer utterance error:', err);
        speakNextSentence();
      };

      // Workaround for browser audio lock
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      clearWatchdog();
      console.warn('SpeechSynthesis speak error:', e);
      speakNextSentence();
    }
  };

  let speechWatchdogTimer: any = null;

  const clearWatchdog = () => {
    if (speechWatchdogTimer) {
      clearTimeout(speechWatchdogTimer);
      speechWatchdogTimer = null;
    }
  };

  /**
   * Evaluates textBuffer for sentence delimiters (periods, commas, question marks, newlines)
   * or word-count thresholds to emit sentences immediately.
   */
  const processBuffer = (forceAll: boolean = false) => {
    if (isStopped) return;

    // Matches punctuation delimiters: comma, period, exclamation, question mark, colon, newline, Arabic/Hebrew marks
    // Either followed by whitespace/end-of-token, or newline
    const delimiterRegex = /([.,!?;:\n׃،]+(?:\s+|$))/;

    while (true) {
      const match = textBuffer.match(delimiterRegex);
      if (match && match.index !== undefined) {
        // Protect decimal numbers like 1.5 or 2.5 from breaking
        const matchPos = match.index;
        const char = textBuffer[matchPos];
        if (
          char === '.' &&
          matchPos > 0 &&
          matchPos < textBuffer.length - 1 &&
          /\d/.test(textBuffer[matchPos - 1]) &&
          /\d/.test(textBuffer[matchPos + 1])
        ) {
          // It's a decimal number (e.g. 1.5), not a sentence end - skip this match
          break;
        }

        const sentenceEndIndex = match.index + match[0].length;
        const sentenceCandidate = textBuffer.slice(0, sentenceEndIndex).trim();

        // As soon as punctuation is hit (even after 1 word like "שלום," or "בטח,"), emit immediately!
        const words = sentenceCandidate.split(/\s+/).filter(Boolean);
        if (words.length >= 1 && sentenceCandidate.length >= 2) {
          sentenceQueue.push(sentenceCandidate);
          textBuffer = textBuffer.slice(sentenceEndIndex);
        } else if (sentenceCandidate.length > 0) {
          break;
        } else {
          textBuffer = textBuffer.slice(sentenceEndIndex);
        }
      } else {
        // Fallback: If buffer accumulates 7 or more words without punctuation, split at word boundary for zero-latency TTS
        const words = textBuffer.trim().split(/\s+/);
        if (words.length >= 7) {
          const splitIndex = textBuffer.lastIndexOf(' ', Math.floor(textBuffer.length * 0.85));
          if (splitIndex > 0) {
            const chunk = textBuffer.slice(0, splitIndex).trim();
            textBuffer = textBuffer.slice(splitIndex).trim();
            if (chunk) {
              sentenceQueue.push(chunk);
            }
          }
        }
        break;
      }
    }

    if (forceAll && textBuffer.trim().length > 0) {
      sentenceQueue.push(textBuffer.trim());
      textBuffer = '';
    }

    if (!isCurrentlySpeaking && sentenceQueue.length > 0) {
      speakNextSentence();
    }
  };

  return {
    feedChunk: (chunk: string) => {
      if (isStopped) return;
      textBuffer += chunk;
      processBuffer(false);
    },
    finish: () => {
      if (isStopped) return;
      isFinishedFeeding = true;
      processBuffer(true);
      if (!isCurrentlySpeaking && sentenceQueue.length === 0) {
        options?.onEnd?.();
      }
    },
    stop: () => {
      isStopped = true;
      clearWatchdog();
      textBuffer = '';
      sentenceQueue.length = 0;
      isCurrentlySpeaking = false;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      options?.onEnd?.();
    },
    cancel: () => {
      isStopped = true;
      clearWatchdog();
      textBuffer = '';
      sentenceQueue.length = 0;
      isCurrentlySpeaking = false;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      options?.onEnd?.();
    },
    isSpeaking: () => isCurrentlySpeaking,
  };
}

/**
 * Access Web Speech API SpeechRecognition (specifically webkitSpeechRecognition or SpeechRecognition)
 * for real-time live voice transcription.
 */
export function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  return new SpeechRecognition();
}
