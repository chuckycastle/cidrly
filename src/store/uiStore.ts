/**
 * UI Store
 * Zustand store for managing UI state (views, selection, notifications) with auto-generated selectors and Immer middleware
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createSelectors } from './createSelectors.js';

export type ViewType = 'welcome' | 'dashboard' | 'detail' | 'help';

export type NotificationPriority = 'low' | 'normal' | 'high';
export type NotificationPosition = 'top-right' | 'bottom-right' | 'bottom-left' | 'top-center';

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  timestamp: number;
  priority?: NotificationPriority;
  duration?: number; // milliseconds, 0 = no auto-dismiss
  position?: NotificationPosition;
}

interface UIState {
  // State
  currentView: ViewType;
  selectedIndex: number;
  notifications: Notification[];
  maxVisibleNotifications: number;

  // Actions
  setView: (view: ViewType) => void;
  setSelectedIndex: (index: number) => void;
  moveSelectionUp: (maxIndex: number) => void;
  moveSelectionDown: (maxIndex: number) => void;
  showNotification: (
    message: string,
    type?: 'info' | 'success' | 'error' | 'warning',
    options?: {
      priority?: NotificationPriority;
      duration?: number;
      position?: NotificationPosition;
    },
  ) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  setMaxVisibleNotifications: (max: number) => void;
}

const useUIStoreBase = create<UIState>()(
  immer((set, get) => {
    return {
      // Initial state
      currentView: 'welcome',
      selectedIndex: 0,
      notifications: [],
      maxVisibleNotifications: 5,

      // Actions
      setView: (view: ViewType): void => {
        set((state) => {
          state.currentView = view;
          state.selectedIndex = 0;
        });
      },

      setSelectedIndex: (index: number): void => {
        set((state) => {
          state.selectedIndex = index;
        });
      },

      moveSelectionUp: (_maxIndex: number): void => {
        set((state) => {
          state.selectedIndex = Math.max(0, state.selectedIndex - 1);
        });
      },

      moveSelectionDown: (maxIndex: number): void => {
        set((state) => {
          state.selectedIndex = Math.min(maxIndex, state.selectedIndex + 1);
        });
      },

      showNotification: (
        message: string,
        type: 'info' | 'success' | 'error' | 'warning' = 'info',
        options?: {
          priority?: NotificationPriority;
          duration?: number;
          position?: NotificationPosition;
        },
      ): void => {
        const priority = options?.priority ?? 'normal';
        const position = options?.position ?? 'bottom-right';

        // Calculate duration based on priority if not explicitly provided
        let duration = options?.duration;
        if (duration === undefined) {
          switch (priority) {
            case 'low':
              duration = 1500; // 1.5 seconds
              break;
            case 'high':
              duration = 4000; // 4 seconds
              break;
            case 'normal':
            default:
              duration = 2500; // 2.5 seconds
              break;
          }
        }

        const notification: Notification = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          message,
          type,
          timestamp: Date.now(),
          priority,
          duration,
          position,
        };

        set((state) => {
          // Add notification using Immer (direct mutation)
          state.notifications.push(notification);

          // Keep only the most recent maxVisibleNotifications
          if (state.notifications.length > state.maxVisibleNotifications) {
            state.notifications = state.notifications.slice(-state.maxVisibleNotifications);
          }
        });

        // Auto-dismiss if duration > 0
        if (duration > 0) {
          setTimeout(() => {
            get().dismissNotification(notification.id);
          }, duration);
        }
      },

      dismissNotification: (id: string): void => {
        set((state) => {
          // With Immer, we can mutate directly
          state.notifications = state.notifications.filter((n) => n.id !== id);
        });
      },

      clearNotifications: (): void => {
        set((state) => {
          state.notifications = [];
        });
      },

      setMaxVisibleNotifications: (max: number): void => {
        set((state) => {
          state.maxVisibleNotifications = max;
        });
      },
    };
  }),
);

/**
 * UI Store with auto-generated selectors
 *
 * @example
 * ```tsx
 * // Old way:
 * const currentView = useUIStore((s) => s.currentView)
 * const showNotification = useUIStore((s) => s.showNotification)
 *
 * // New way (both still work!):
 * const currentView = useUIStore.use.currentView()
 * const showNotification = useUIStore.use.showNotification()
 * ```
 */
export const useUIStore = createSelectors(useUIStoreBase);
