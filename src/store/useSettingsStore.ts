import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';
import { createDefaultSettings } from '@/types';

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  setSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  setLoaded: (loaded: boolean) => void;
}

// Migrate legacy settings storage key if present
if (typeof window !== 'undefined') {
  try {
    if (!localStorage.getItem('invoicepro-settings') && localStorage.getItem('billflow-settings')) {
      localStorage.setItem('invoicepro-settings', localStorage.getItem('billflow-settings')!);
    }
  } catch {
    // Ignore storage access errors
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: createDefaultSettings(),
      isLoaded: false,
      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () =>
        set({ settings: createDefaultSettings() }),
      setLoaded: (loaded) => set({ isLoaded: loaded }),
    }),
    {
      name: 'invoicepro-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
