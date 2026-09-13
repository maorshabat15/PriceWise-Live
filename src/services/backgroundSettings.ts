import { useState, useEffect } from 'react';

export interface BackgroundScene {
  id: string;
  name: string;
  type: 'video' | 'image';
  src: string;
  poster?: string;
  description: string;
}

export const BACKGROUND_SCENES: BackgroundScene[] = [
  {
    id: 'chef-kitchen',
    name: 'מטבח שף תוסס',
    type: 'video',
    src: 'https://cdn.coverr.co/videos/coverr-preparing-a-dish-in-a-restaurant-kitchen-5473/1080p.mp4',
    poster: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
    description: 'סרטון תוסס של הכנת מנות שף במטבח מקצועי',
  },
  {
    id: 'coffee-bakery',
    name: 'בית קפה ומאפייה',
    type: 'video',
    src: 'https://cdn.coverr.co/videos/coverr-pouring-coffee-into-a-cup-2384/1080p.mp4',
    poster: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1600&q=80',
    description: 'מזקקת קפה איכותית ומאפים נאפים בתנור',
  },
  {
    id: 'gourmet-pasta',
    name: 'פסטה ובישול גורמה',
    type: 'video',
    src: 'https://cdn.coverr.co/videos/coverr-chef-adding-herbs-to-a-meal-4389/1080p.mp4',
    poster: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1600&q=80',
    description: 'בישול פסטה טרייה עם תיבול עשבי תיבול מרהיב',
  },
  {
    id: 'photo-gourmet-feast',
    name: 'גלריית סעודת גורמה (תמונה)',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1920&q=80',
    description: 'שולחן מנות גורמה מעוצב בצורה מרהיבה',
  },
  {
    id: 'photo-woodfired-pizza',
    name: 'פיצה טאבון שף (תמונה)',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1920&q=80',
    description: 'פיצה איטלקית פריכה עם גבינה נמסת',
  },
  {
    id: 'photo-sweet-dessert',
    name: 'קינוחי שוקולד ופירות (תמונה)',
    type: 'image',
    src: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=1920&q=80',
    description: 'צלחת קינוחים יוקרתית עם שוקולד ופירות יער',
  },
];

export interface BackgroundSettings {
  sceneId: string;
  opacity: number; // 0.05 to 0.75
  blur: number; // 0 to 12
  isVideoPlaying: boolean;
  isEnabled: boolean;
}

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  sceneId: 'chef-kitchen',
  opacity: 0.35,
  blur: 3,
  isVideoPlaying: true,
  isEnabled: true,
};

const STORAGE_KEY = 'pricewise_bg_settings';
const EVENT_NAME = 'pricewise_bg_settings_changed';

export function getBackgroundSettings(): BackgroundSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_BACKGROUND_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load bg settings', e);
  }
  return DEFAULT_BACKGROUND_SETTINGS;
}

export function saveBackgroundSettings(settings: BackgroundSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: settings }));
  } catch (e) {
    console.error('Failed to save bg settings', e);
  }
}

export function useBackgroundSettings() {
  const [settings, setSettingsState] = useState<BackgroundSettings>(getBackgroundSettings);

  useEffect(() => {
    const handleStorage = () => {
      setSettingsState(getBackgroundSettings());
    };

    window.addEventListener(EVENT_NAME, handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const updateSettings = (updates: Partial<BackgroundSettings>) => {
    const next = { ...settings, ...updates };
    setSettingsState(next);
    saveBackgroundSettings(next);
  };

  const currentScene = BACKGROUND_SCENES.find(s => s.id === settings.sceneId) || BACKGROUND_SCENES[0];

  return {
    settings,
    currentScene,
    scenes: BACKGROUND_SCENES,
    updateSettings,
    resetSettings: () => {
      setSettingsState(DEFAULT_BACKGROUND_SETTINGS);
      saveBackgroundSettings(DEFAULT_BACKGROUND_SETTINGS);
    },
  };
}
