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
  // Track last saved timestamp instead of JSON string for O(1) comparison
  const lastSavedTimestampRef = useRef<number | null>(null);

  // Create debounced save function
  useEffect((): (() => void) | undefined => {
    if (!preferences.autoSave || !currentFilename) {
      return;
    }

    const abortController = new AbortController();

    const savePlan = async (planToSave: NetworkPlan): Promise<void> => {
      if (abortController.signal.aborted) {
        return;
      }

      try {
        // Use currentFilename to prevent duplicate file bug
        await fileService.savePlan(planToSave, currentFilename);

        if (abortController.signal.aborted) {
          return;
        }

        // Store timestamp of saved plan for efficient O(1) comparison
        lastSavedTimestampRef.current = planToSave.updatedAt.getTime();
        onSuccess?.();
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        if (error instanceof Error) {
          onError?.(error);
        }
      }
    };

    debouncedSaveRef.current = debouncedWithFlush(savePlan, preferences.saveDelay);

    return () => {
      // Cleanup: cancel pending operations to prevent memory leaks and race conditions
      // When dependencies change, we cancel the old debounced function before creating a new one
      // When component unmounts, we also cancel to prevent saves after unmount
      abortController.abort();
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

    // Don't save if plan hasn't changed - O(1) timestamp comparison
    const currentTimestamp = plan.updatedAt.getTime();
    if (currentTimestamp === lastSavedTimestampRef.current) {
      return;
    }

    // Trigger debounced save
    debouncedSaveRef.current(plan);
  }, [plan, preferences.autoSave]);
}
