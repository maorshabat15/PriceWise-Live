import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, ChevronDown } from 'lucide-react';

interface AudioTrack {
  id: string;
  name: string;
  category: string;
  url: string;
}

const TRACKS: AudioTrack[] = [
  {
    id: 'bistro-jazz',
    name: 'ג׳אז ביסטרו וקולינריה',
    category: 'אווירה נעימה',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=cozy-jazz-chill-112190.mp3',
  },
  {
    id: 'cafe-vibes',
    name: 'בית קפה פריזאי שקט',
    category: 'רוגע ובישול',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=lofi-study-112191.mp3',
  },
  {
    id: 'kitchen-acoustic',
    name: 'בישול אקוסטי מרגיע',
    category: 'מטבח חם',
    url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_73bb83b632.mp3?filename=acoustic-guitar-ambient-8472.mp3',
  },
];

export const AudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.4);
  const [isMuted, setIsMuted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = TRACKS[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
        });
    }
  };

  const handleTrackChange = (index: number) => {
    setCurrentTrackIndex(index);
    if (audioRef.current) {
      audioRef.current.src = TRACKS[index].url;
      if (isPlaying) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  };

  return (
    <div className="relative shrink-0">
      <audio
        ref={audioRef}
        src={currentTrack.url}
        loop
        onEnded={() => handleTrackChange((currentTrackIndex + 1) % TRACKS.length)}
      />

      <div className="flex items-center gap-1 bg-slate-900/90 border border-amber-500/30 rounded-full px-2.5 py-1.5 shadow-sm text-xs backdrop-blur-md">
        <button
          onClick={togglePlay}
          className={`p-1 rounded-full transition-all flex items-center justify-center ${
            isPlaying
              ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
              : 'text-amber-300 hover:text-white hover:bg-slate-800'
          }`}
          title={isPlaying ? 'השהה מוזיקה' : 'נגן מוזיקת רקע'}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5 fill-current" />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-slate-300 hover:text-amber-200 text-[11px] font-medium px-1 transition-colors"
          title="בחר רצועת מוזיקה"
        >
          <Music className="h-3 w-3 text-amber-400" />
          <span className="hidden lg:inline max-w-[90px] truncate">{currentTrack.name}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="text-slate-400 hover:text-amber-300 p-0.5 transition-colors"
          title={isMuted ? 'בטל השתקה' : 'השתק'}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-3.5 w-3.5 text-rose-400" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Track Selection Popover */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-slate-900/95 border border-amber-500/30 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-xl text-right text-slate-200 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Music className="h-3.5 w-3.5" />
              מוזיקת אווירה וקולינריה
            </span>
          </div>

          <div className="space-y-1 mb-3">
            {TRACKS.map((t, idx) => (
              <button
                key={t.id}
                onClick={() => {
                  handleTrackChange(idx);
                  if (!isPlaying && audioRef.current) {
                    audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                  }
                }}
                className={`w-full text-right p-2 rounded-xl text-xs transition-all flex items-center justify-between ${
                  idx === currentTrackIndex
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-[10px] text-slate-400">{t.category}</div>
                </div>
                {idx === currentTrackIndex && isPlaying && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Volume Control */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>עוצמת שמע ({Math.round(volume * 100)}%)</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVol = parseFloat(e.target.value);
                setVolume(newVol);
                if (isMuted && newVol > 0) setIsMuted(false);
              }}
              className="w-full accent-amber-400 h-1 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
