/**
 * UI Store
 * Zustand store for managing UI state (views, selection, notifications) with auto-generated selectors and Immer middleware
 */

import { enableMapSet } from 'immer';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createSelectors } from './createSelectors.js';

// Enable Map/Set support in Immer for notificationTimers Map
enableMapSet();

export type ViewType = 'welcome' | 'dashboard' | 'detail' | 'help';

export type NotificationPriority = 'low' | 'normal' | 'high';
export type NotificationPosition = 'top-right' | 'bottom-right' | 'bottom-left' | 'top-center';

export type SortColumn =
  | 'name'
  | 'vlan'
  | 'expected'
  | 'planned'
  | 'network'
  | 'usable'
  | 'description';
export type SortDirection = 'asc' | 'desc';

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
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
  notificationTimers: Map<string, NodeJS.Timeout>; // Timer tracking for cleanup

  // Viewport state for row virtualization
  viewportStart: number; // First visible row index
  viewportSize: number; // Number of visible rows (based on terminal height)

  // Actions
  setView: (view: ViewType) => void;
  setSelectedIndex: (index: number) => void;
  moveSelectionUp: (totalItems: number) => void;
  moveSelectionDown: (totalItems: number) => void;
  setViewportSize: (size: number) => void;
  adjustViewport: (selectedIndex: number, totalItems: number) => void;
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
  setSortColumn: (column: SortColumn) => void;
  clearSort: () => void;
}

const useUIStoreBase = create<UIState>()(
  immer((set, get) => {
    return {
      // Initial state
      currentView: 'welcome',
      selectedIndex: 0,
      notifications: [],
      maxVisibleNotifications: 5,
      sortColumn: null,
      sortDirection: 'asc',
      notificationTimers: new Map(),
      viewportStart: 0,
      viewportSize: 12, // Default minimum rows

      // Actions
      setView: (view: ViewType): void => {
        set((state) => {
          state.currentView = view;
          state.selectedIndex = 0;
          state.viewportStart = 0;
        });
      },

      setSelectedIndex: (index: number): void => {
        set((state) => {
          state.selectedIndex = index;
        });
      },

      moveSelectionUp: (totalItems: number): void => {
        set((state) => {
          if (totalItems === 0) return;

          // Wrap-around: if at first item, go to last
          if (state.selectedIndex === 0) {
            state.selectedIndex = totalItems - 1;
            // Adjust viewport to show last item
            state.viewportStart = Math.max(0, totalItems - state.viewportSize);
          } else {
            state.selectedIndex = state.selectedIndex - 1;
            // Scroll viewport up if selection goes above visible area
            if (state.selectedIndex < state.viewportStart) {
              state.viewportStart = state.selectedIndex;
            }
          }
        });
      },

      moveSelectionDown: (totalItems: number): void => {
        set((state) => {
          if (totalItems === 0) return;

          // Wrap-around: if at last item, go to first
          if (state.selectedIndex >= totalItems - 1) {
            state.selectedIndex = 0;
            state.viewportStart = 0;
          } else {
            state.selectedIndex = state.selectedIndex + 1;
            // Scroll viewport down if selection goes below visible area
            if (state.selectedIndex >= state.viewportStart + state.viewportSize) {
              state.viewportStart = state.selectedIndex - state.viewportSize + 1;
            }
          }
        });
      },

      setViewportSize: (size: number): void => {
        set((state) => {
          state.viewportSize = Math.max(1, size);
          // Ensure viewport start is still valid
          const maxStart = Math.max(0, state.selectedIndex - state.viewportSize + 1);
          if (state.viewportStart > maxStart + state.viewportSize - 1) {
            state.viewportStart = Math.max(0, state.selectedIndex);
          }
        });
      },

      adjustViewport: (selectedIndex: number, totalItems: number): void => {
        set((state) => {
          // Ensure selection is within bounds
          state.selectedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, totalItems - 1));

          // Adjust viewport to keep selection visible
          if (state.selectedIndex < state.viewportStart) {
            state.viewportStart = state.selectedIndex;
          } else if (state.selectedIndex >= state.viewportStart + state.viewportSize) {
            state.viewportStart = state.selectedIndex - state.viewportSize + 1;
          }

          // Ensure viewport start is valid
          const maxViewportStart = Math.max(0, totalItems - state.viewportSize);
          state.viewportStart = Math.min(state.viewportStart, maxViewportStart);
          state.viewportStart = Math.max(0, state.viewportStart);
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
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
          const timerId = setTimeout(() => {
            get().dismissNotification(notification.id);
          }, duration);

          set((state) => {
            state.notificationTimers.set(notification.id, timerId);
          });
        }
      },

      dismissNotification: (id: string): void => {
        set((state) => {
          // Clear timer if exists
          const timerId = state.notificationTimers.get(id);
          if (timerId) {
            clearTimeout(timerId);
            state.notificationTimers.delete(id);
          }

          // With Immer, we can mutate directly
          state.notifications = state.notifications.filter((n) => n.id !== id);
        });
      },

      clearNotifications: (): void => {
        set((state) => {
          // Clear all timers
          state.notificationTimers.forEach((timerId) => {
            clearTimeout(timerId);
          });
          state.notificationTimers.clear();

          state.notifications = [];
        });
      },

      setMaxVisibleNotifications: (max: number): void => {
        set((state) => {
          state.maxVisibleNotifications = max;
        });
      },

      setSortColumn: (column: SortColumn): void => {
        set((state) => {
          // If clicking the same column, toggle direction
          if (state.sortColumn === column) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            // New column, default to ascending
            state.sortColumn = column;
            state.sortDirection = 'asc';
          }
        });
      },

      clearSort: (): void => {
        set((state) => {
          state.sortColumn = null;
          state.sortDirection = 'asc';
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
