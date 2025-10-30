/**
 * Preferences Store
 * Zustand store for managing user preferences with auto-generated selectors and Immer middleware
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { defaultPreferences, type Preferences } from '../schemas/preferences.schema.js';
import { createSelectors } from './createSelectors.js';

interface PreferencesState {
  // State
  preferences: Preferences;
  isLoaded: boolean;

  // Actions
  setPreferences: (preferences: Partial<Preferences>) => void;
  setGrowthPercentage: (percentage: number) => void;
  resetToDefaults: () => void;
  setLoaded: (loaded: boolean) => void;
}

const usePreferencesStoreBase = create<PreferencesState>()(
  immer((set) => ({
    // Initial State
    preferences: defaultPreferences,
    isLoaded: false,

    // Actions
    setPreferences: (newPreferences): void => {
      set((state) => {
        state.preferences = { ...state.preferences, ...newPreferences };
      });
    },

    setGrowthPercentage: (percentage): void => {
      set((state) => {
        state.preferences.growthPercentage = percentage;
      });
    },

    resetToDefaults: (): void => {
      set((state) => {
        state.preferences = defaultPreferences;
      });
    },

    setLoaded: (loaded): void => {
      set((state) => {
        state.isLoaded = loaded;
      });
    },
  })),
);

/**
 * Preferences store with auto-generated selectors
 * Usage:
 *   const planningPercentage = usePreferencesStore.use.preferences().planningPercentage;
 *   const setPlanningPercentage = usePreferencesStore.use.setPlanningPercentage();
 */
export const usePreferencesStore = createSelectors(usePreferencesStoreBase);
