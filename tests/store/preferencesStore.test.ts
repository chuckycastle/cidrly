/**
 * Tests for Preferences Store
 */

import { defaultPreferences } from '../../src/schemas/preferences.schema.js';
import { usePreferencesStore } from '../../src/store/preferencesStore.js';

describe('preferencesStore', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    // Use spread to ensure we get a fresh copy of defaults
    usePreferencesStore.setState({
      preferences: { ...defaultPreferences },
      isLoaded: false,
    });
  });

  describe('initial state', () => {
    it('should have default preferences initially', () => {
      const state = usePreferencesStore.getState();
      expect(state.preferences).toEqual(defaultPreferences);
    });

    it('should have isLoaded false initially', () => {
      const state = usePreferencesStore.getState();
      expect(state.isLoaded).toBe(false);
    });

    it('should have default autoSave disabled', () => {
      const state = usePreferencesStore.getState();
      expect(state.preferences.autoSave).toBe(false);
    });

    it('should have default saveDelay of 500ms', () => {
      const state = usePreferencesStore.getState();
      expect(state.preferences.saveDelay).toBe(500);
    });

    it('should have default growthPercentage of 100', () => {
      const state = usePreferencesStore.getState();
      expect(state.preferences.growthPercentage).toBe(100);
    });
  });

  describe('setPreferences', () => {
    it('should update single preference', () => {
      const { setPreferences } = usePreferencesStore.getState();

      setPreferences({ autoSave: false });

      const state = usePreferencesStore.getState();
      expect(state.preferences.autoSave).toBe(false);
    });

    it('should update multiple preferences', () => {
      const { setPreferences } = usePreferencesStore.getState();

      setPreferences({
        autoSave: true,
        saveDelay: 5000,
        growthPercentage: 30,
      });

      const state = usePreferencesStore.getState();
      expect(state.preferences.autoSave).toBe(true);
      expect(state.preferences.saveDelay).toBe(5000);
      expect(state.preferences.growthPercentage).toBe(30);
    });

    it('should preserve unmodified preferences', () => {
      const { setPreferences } = usePreferencesStore.getState();

      setPreferences({ autoSave: true });

      const state = usePreferencesStore.getState();
      expect(state.preferences.autoSave).toBe(true);
      expect(state.preferences.saveDelay).toBe(500); // Unchanged
      expect(state.preferences.growthPercentage).toBe(100); // Unchanged
    });

    it('should handle partial preference updates', () => {
      const { setPreferences } = usePreferencesStore.getState();

      // Update only one field
      setPreferences({ growthPercentage: 50 });

      const state = usePreferencesStore.getState();
      expect(state.preferences.growthPercentage).toBe(50);
      expect(state.preferences.autoSave).toBe(false); // Unchanged
      expect(state.preferences.saveDelay).toBe(500); // Unchanged
    });

    it('should handle empty preference updates', () => {
      const { setPreferences } = usePreferencesStore.getState();
      const initialState = usePreferencesStore.getState().preferences;

      setPreferences({});

      const state = usePreferencesStore.getState();
      expect(state.preferences).toEqual(initialState);
    });
  });

  describe('setGrowthPercentage', () => {
    it('should set growth percentage', () => {
      const { setGrowthPercentage } = usePreferencesStore.getState();

      setGrowthPercentage(50);

      const state = usePreferencesStore.getState();
      expect(state.preferences.growthPercentage).toBe(50);
    });

    it('should preserve other preferences', () => {
      const { setGrowthPercentage } = usePreferencesStore.getState();

      setGrowthPercentage(50);

      const state = usePreferencesStore.getState();
      expect(state.preferences.autoSave).toBe(false); // Unchanged
      expect(state.preferences.saveDelay).toBe(500); // Unchanged
    });

    it('should handle zero percentage', () => {
      const { setGrowthPercentage } = usePreferencesStore.getState();

      setGrowthPercentage(0);

      const state = usePreferencesStore.getState();
      expect(state.preferences.growthPercentage).toBe(0);
    });

    it('should handle large percentages', () => {
      const { setGrowthPercentage } = usePreferencesStore.getState();

      setGrowthPercentage(100);

      const state = usePreferencesStore.getState();
      expect(state.preferences.growthPercentage).toBe(100);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all preferences to defaults', () => {
      const { setPreferences, resetToDefaults } = usePreferencesStore.getState();

      // Modify preferences
      setPreferences({
        autoSave: true,
        saveDelay: 10000,
        growthPercentage: 50,
      });

      // Reset
      resetToDefaults();

      const state = usePreferencesStore.getState();
      expect(state.preferences).toEqual(defaultPreferences);
    });

    it('should reset autoSave to default (false)', () => {
      const { setPreferences, resetToDefaults } = usePreferencesStore.getState();

      setPreferences({ autoSave: true });
      resetToDefaults();

      const state = usePreferencesStore.getState();
      expect(state.preferences.autoSave).toBe(false);
    });

    it('should reset saveDelay to default (500ms)', () => {
      const { setPreferences, resetToDefaults } = usePreferencesStore.getState();

      setPreferences({ saveDelay: 10000 });
      resetToDefaults();

      const state = usePreferencesStore.getState();
      expect(state.preferences.saveDelay).toBe(500);
    });

    it('should reset growthPercentage to default (100)', () => {
      const { setGrowthPercentage, resetToDefaults } = usePreferencesStore.getState();

      setGrowthPercentage(75);
      resetToDefaults();

      const state = usePreferencesStore.getState();
      expect(state.preferences.growthPercentage).toBe(100);
    });
  });

  describe('setLoaded', () => {
    it('should set isLoaded to true', () => {
      const { setLoaded } = usePreferencesStore.getState();

      setLoaded(true);

      const state = usePreferencesStore.getState();
      expect(state.isLoaded).toBe(true);
    });

    it('should set isLoaded to false', () => {
      const { setLoaded } = usePreferencesStore.getState();

      setLoaded(true);
      setLoaded(false);

      const state = usePreferencesStore.getState();
      expect(state.isLoaded).toBe(false);
    });

    it('should not affect preferences when setting isLoaded', () => {
      const { setLoaded } = usePreferencesStore.getState();
      const initialPrefs = usePreferencesStore.getState().preferences;

      setLoaded(true);

      const state = usePreferencesStore.getState();
      expect(state.preferences).toEqual(initialPrefs);
    });
  });

  describe('cascading preference operations', () => {
    it('should handle multiple sequential updates', () => {
      const { setPreferences, setGrowthPercentage } = usePreferencesStore.getState();

      setPreferences({ autoSave: false });
      setPreferences({ saveDelay: 5000 });
      setGrowthPercentage(30);

      const state = usePreferencesStore.getState();
      expect(state.preferences.autoSave).toBe(false);
      expect(state.preferences.saveDelay).toBe(5000);
      expect(state.preferences.growthPercentage).toBe(30);
    });

    it('should handle update -> reset -> update workflow', () => {
      const { setPreferences, resetToDefaults } = usePreferencesStore.getState();

      // Update
      setPreferences({ autoSave: true, saveDelay: 10000 });
      expect(usePreferencesStore.getState().preferences.autoSave).toBe(true);

      // Reset
      resetToDefaults();
      expect(usePreferencesStore.getState().preferences.autoSave).toBe(false);
      expect(usePreferencesStore.getState().preferences.saveDelay).toBe(500);

      // Update again
      setPreferences({ growthPercentage: 50 });
      expect(usePreferencesStore.getState().preferences.growthPercentage).toBe(50);
    });

    it('should handle load -> modify -> save workflow simulation', () => {
      const { setLoaded, setPreferences } = usePreferencesStore.getState();

      // Simulate load
      setLoaded(true);
      expect(usePreferencesStore.getState().isLoaded).toBe(true);

      // Modify
      setPreferences({ autoSave: true });
      expect(usePreferencesStore.getState().preferences.autoSave).toBe(true);

      // Simulate save (would trigger PreferencesService.save in real app)
      expect(usePreferencesStore.getState().isLoaded).toBe(true);
      expect(usePreferencesStore.getState().preferences.autoSave).toBe(true);
    });
  });

  describe('saveDelay preference', () => {
    it('should update saveDelay preference', () => {
      const { setPreferences } = usePreferencesStore.getState();

      setPreferences({ saveDelay: 1000 });

      const state = usePreferencesStore.getState();
      expect(state.preferences.saveDelay).toBe(1000);
    });

    it('should handle minimum saveDelay', () => {
      const { setPreferences } = usePreferencesStore.getState();

      setPreferences({ saveDelay: 500 });

      const state = usePreferencesStore.getState();
      expect(state.preferences.saveDelay).toBe(500);
    });

    it('should handle maximum saveDelay', () => {
      const { setPreferences } = usePreferencesStore.getState();

      setPreferences({ saveDelay: 60000 });

      const state = usePreferencesStore.getState();
      expect(state.preferences.saveDelay).toBe(60000);
    });
  });
});
