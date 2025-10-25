/**
 * Keyboard Shortcuts Hook
 * Centralized keyboard shortcut management for the dashboard
 */

import { useInput } from 'ink';
import { useCallback, useEffect, useRef } from 'react';

export interface KeyboardShortcut {
  /** Keyboard key to trigger the shortcut */
  key: string;
  /** Human-readable description of what the shortcut does */
  description: string;
  /** Callback function to execute when the key is pressed */
  handler: () => void;
  /** Whether this shortcut is currently enabled */
  enabled?: boolean;
  /** Category for grouping shortcuts in help displays */
  category?: 'navigation' | 'actions' | 'system';
}

export interface KeyboardShortcutConfig {
  /** List of keyboard shortcuts to register */
  shortcuts: KeyboardShortcut[];
  /** Whether keyboard input should be captured (useful for dialogs) */
  enabled?: boolean;
}

/**
 * useKeyboardShortcuts Hook
 *
 * Provides centralized keyboard shortcut management with:
 * - Registration of multiple shortcuts with descriptions
 * - Enable/disable functionality for modal contexts
 * - Categorization for help displays
 * - Conflict detection and warnings
 *
 * @example
 * ```tsx
 * const shortcuts = useKeyboardShortcuts({
 *   shortcuts: [
 *     {
 *       key: 'a',
 *       description: 'Add subnet',
 *       handler: handleAdd,
 *       category: 'actions'
 *     },
 *     {
 *       key: 'q',
 *       description: 'Quit',
 *       handler: () => exit(),
 *       category: 'system'
 *     }
 *   ],
 *   enabled: dialog === 'none'
 * });
 *
 * // Get shortcuts for help display
 * const helpText = shortcuts.getShortcuts();
 * ```
 */
export const useKeyboardShortcuts = (config: KeyboardShortcutConfig) => {
  const { shortcuts, enabled = true } = config;
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when config changes
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  // Detect and warn about duplicate key bindings
  useEffect(() => {
    const keyMap = new Map<string, number>();
    shortcuts.forEach((shortcut) => {
      const count = keyMap.get(shortcut.key) || 0;
      keyMap.set(shortcut.key, count + 1);
    });

    keyMap.forEach((count, key) => {
      if (count > 1) {
        console.warn(
          `[useKeyboardShortcuts] Duplicate key binding detected: "${key}" is bound ${count} times`,
        );
      }
    });
  }, [shortcuts]);

  // Handle keyboard input
  useInput(
    useCallback(
      (input, key) => {
        if (!enabled) return;

        // Check for special keys
        const specialKeys: Record<string, string> = {
          upArrow: 'upArrow',
          downArrow: 'downArrow',
          leftArrow: 'leftArrow',
          rightArrow: 'rightArrow',
          return: 'return',
          escape: 'escape',
          tab: 'tab',
          backspace: 'backspace',
          delete: 'delete',
        };

        let matchedKey: string | null = null;

        // Check if it's a special key
        for (const [specialKeyName, specialKeyValue] of Object.entries(specialKeys)) {
          if (key[specialKeyName as keyof typeof key]) {
            matchedKey = specialKeyValue;
            break;
          }
        }

        // If not a special key, use the input character
        if (!matchedKey && input) {
          matchedKey = input;
        }

        if (!matchedKey) return;

        // Find and execute matching shortcut
        const shortcut = shortcutsRef.current.find(
          (s) => s.key === matchedKey && (s.enabled === undefined || s.enabled === true),
        );

        if (shortcut) {
          shortcut.handler();
        }
      },
      [enabled],
    ),
  );

  /**
   * Get all registered shortcuts for display purposes (e.g., help view)
   * Returns shortcuts grouped by category
   */
  const getShortcuts = useCallback(() => {
    return shortcuts.filter((s) => s.enabled !== false);
  }, [shortcuts]);

  /**
   * Get shortcuts grouped by category
   */
  const getShortcutsByCategory = useCallback(() => {
    const grouped: Record<string, KeyboardShortcut[]> = {
      navigation: [],
      actions: [],
      system: [],
      other: [],
    };

    shortcuts
      .filter((s) => s.enabled !== false)
      .forEach((shortcut) => {
        const category = shortcut.category || 'other';
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(shortcut);
      });

    return grouped;
  }, [shortcuts]);

  /**
   * Check if a specific key is currently bound
   */
  const isKeyBound = useCallback(
    (key: string): boolean => {
      return shortcuts.some(
        (s) => s.key === key && (s.enabled === undefined || s.enabled === true),
      );
    },
    [shortcuts],
  );

  return {
    getShortcuts,
    getShortcutsByCategory,
    isKeyBound,
  };
};
