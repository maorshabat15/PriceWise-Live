import React from 'react';
import { useBackgroundSettings } from '../services/backgroundSettings';

export const BackgroundMedia: React.FC = () => {
  const { settings, currentScene } = useBackgroundSettings();

  if (!settings.isEnabled) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 bg-slate-950/80" />
    );
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-700"
      style={{
        opacity: settings.opacity,
        filter: `blur(${settings.blur}px)`,
      }}
    >
      {currentScene.type === 'video' ? (
        <video
          key={currentScene.src}
          autoPlay
          loop
          muted
          playsInline
          poster={currentScene.poster}
          ref={(video) => {
            if (video) {
              if (settings.isVideoPlaying) {
                video.play().catch(() => {});
              } else {
                video.pause();
              }
            }
          }}
          className="w-full h-full object-cover scale-105"
        >
          <source src={currentScene.src} type="video/mp4" />
        </video>
      ) : (
        <img
          src={currentScene.src}
          alt={currentScene.name}
          className="w-full h-full object-cover scale-105 transition-all duration-1000"
        />
      )}

      {/* Ambient Warm Gradient Overlay to unify UI contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-900/60 mix-blend-multiply pointer-events-none" />
    </div>
  );
};
