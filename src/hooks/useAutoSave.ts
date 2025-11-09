/**
 * Auto-save Hook
 * Automatically saves plan when changes are detected (if enabled in preferences)
 */

import { useEffect, useRef } from 'react';
import type { NetworkPlan } from '../core/models/network-plan.js';
import type { FileService } from '../services/file.service.js';
import { usePreferencesStore } from '../store/preferencesStore.js';
import { debouncedWithFlush } from '../utils/debounce.js';

interface UseAutoSaveOptions {
  plan: NetworkPlan | null;
  currentFilename: string | null; // Filename to save to (not plan.name)
  fileService: FileService;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
}

/**
 * Hook to automatically save plan changes with debouncing
 *
 * @param options - Auto-save configuration
 *
 * @example
 * ```tsx
 * const plan = usePlanStore.use.plan();
 * const currentFilename = usePlanStore.use.currentFilename();
 * const fileService = useMemo(() => new FileService(baseDir), [baseDir]);
 *
 * useAutoSave({
 *   plan,
 *   currentFilename,
 *   fileService,
 *   onError: (err) => showNotification(err.message, 'error'),
 *   onSuccess: () => showNotification('Plan auto-saved', 'success', { priority: 'low' }),
 * });
 * ```
 */
export function useAutoSave({
  plan,
  currentFilename,
  fileService,
  onError,
  onSuccess,
}: UseAutoSaveOptions): void {
  const preferences = usePreferencesStore.use.preferences();
  const debouncedSaveRef = useRef<
    (((plan: NetworkPlan) => void) & { flush: () => void; cancel: () => void }) | null
  >(null);
  const lastSavedPlanRef = useRef<string | null>(null);

  // Create debounced save function
  useEffect((): (() => void) | undefined => {
    if (!preferences.autoSave || !currentFilename) {
      return;
    }

    const savePlan = async (planToSave: NetworkPlan): Promise<void> => {
      try {
        // Use currentFilename to prevent duplicate file bug
        await fileService.savePlan(planToSave, currentFilename);
        lastSavedPlanRef.current = JSON.stringify(planToSave);
        onSuccess?.();
      } catch (error) {
        onError?.(error as Error);
      }
    };

    debouncedSaveRef.current = debouncedWithFlush(savePlan, preferences.saveDelay);

    return () => {
      // Cleanup: cancel pending operations to prevent memory leaks and race conditions
      // When dependencies change, we cancel the old debounced function before creating a new one
      // When component unmounts, we also cancel to prevent saves after unmount
      debouncedSaveRef.current?.cancel();
    };
  }, [
    preferences.autoSave,
    preferences.saveDelay,
    currentFilename,
    fileService,
    onError,
    onSuccess,
  ]);

  // Watch for plan changes and trigger auto-save
  useEffect(() => {
    if (!preferences.autoSave || !plan || !debouncedSaveRef.current) {
      return;
    }

    // Don't save if plan hasn't changed
    const currentPlanJson = JSON.stringify(plan);
    if (currentPlanJson === lastSavedPlanRef.current) {
      return;
    }

    // Trigger debounced save
    debouncedSaveRef.current(plan);
  }, [plan, preferences.autoSave]);
}
