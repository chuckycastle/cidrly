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
 * const fileService = useMemo(() => new FileService(baseDir), [baseDir]);
 *
 * useAutoSave({
 *   plan,
 *   fileService,
 *   onError: (err) => showNotification(err.message, 'error'),
 *   onSuccess: () => showNotification('Plan auto-saved', 'success', { priority: 'low' }),
 * });
 * ```
 */
export function useAutoSave({ plan, fileService, onError, onSuccess }: UseAutoSaveOptions): void {
  const preferences = usePreferencesStore.use.preferences();
  const debouncedSaveRef = useRef<
    (((plan: NetworkPlan) => void) & { flush: () => void; cancel: () => void }) | null
  >(null);
  const lastSavedPlanRef = useRef<string | null>(null);

  // Create debounced save function
  useEffect(() => {
    if (!preferences.autoSave) {
      return;
    }

    const savePlan = async (planToSave: NetworkPlan): Promise<void> => {
      try {
        await fileService.savePlan(planToSave, planToSave.name);
        lastSavedPlanRef.current = JSON.stringify(planToSave);
        onSuccess?.();
      } catch (error) {
        onError?.(error as Error);
      }
    };

    debouncedSaveRef.current = debouncedWithFlush(savePlan, preferences.saveDelay);

    return () => {
      // Cleanup: flush any pending saves when component unmounts
      debouncedSaveRef.current?.flush();
    };
  }, [preferences.autoSave, preferences.saveDelay, fileService, onError, onSuccess]);

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
