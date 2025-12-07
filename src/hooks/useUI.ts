/**
 * Custom hooks for UI Store
 * Provides convenient access to UI state and actions
 */

import type { Notification, NotificationPriority, ViewType } from '../store/uiStore.js';
import { useUIStore } from '../store/uiStore.js';

/**
 * Hook to access the current view
 *
 * @returns The current view type
 *
 * @example
 * ```tsx
 * const currentView = useCurrentView();
 * if (currentView === 'dashboard') {
 *   return <DashboardView />;
 * }
 * ```
 */
export const useCurrentView = (): ViewType => {
  return useUIStore.use.currentView();
};

/**
 * Hook to access the selected index
 *
 * @returns The currently selected index
 *
 * @example
 * ```tsx
 * const selectedIndex = useSelectedIndex();
 * console.log('Selected row:', selectedIndex);
 * ```
 */
export const useSelectedIndex = (): number => {
  return useUIStore.use.selectedIndex();
};

/**
 * Hook to access all notifications
 *
 * @returns Array of current notifications
 *
 * @example
 * ```tsx
 * const notifications = useNotifications();
 * return <NotificationDisplay notifications={notifications} />;
 * ```
 */
export const useNotifications = (): Notification[] => {
  return useUIStore.use.notifications();
};

/**
 * Hook to access UI actions
 *
 * @returns Object containing all UI manipulation functions
 *
 * @example
 * ```tsx
 * const { setView, showNotification } = useUIActions();
 *
 * const handleSuccess = () => {
 *   showNotification('Plan saved successfully!', 'success');
 *   setView('dashboard');
 * };
 * ```
 */
export const useUIActions = (): {
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
      position?: import('../store/uiStore.js').NotificationPosition;
    },
  ) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  setMaxVisibleNotifications: (max: number) => void;
} => {
  const setView = useUIStore.use.setView();
  const setSelectedIndex = useUIStore.use.setSelectedIndex();
  const moveSelectionUp = useUIStore.use.moveSelectionUp();
  const moveSelectionDown = useUIStore.use.moveSelectionDown();
  const showNotification = useUIStore.use.showNotification();
  const dismissNotification = useUIStore.use.dismissNotification();
  const clearNotifications = useUIStore.use.clearNotifications();
  const setMaxVisibleNotifications = useUIStore.use.setMaxVisibleNotifications();

  return {
    setView,
    setSelectedIndex,
    moveSelectionUp,
    moveSelectionDown,
    showNotification,
    dismissNotification,
    clearNotifications,
    setMaxVisibleNotifications,
  };
};

/**
 * Hook to access navigation helpers
 *
 * @returns Object with navigation helper functions
 *
 * @example
 * ```tsx
 * const { goToDashboard, goToWelcome } = useNavigation();
 *
 * const handleComplete = () => {
 *   goToDashboard();
 * };
 * ```
 */
export const useNavigation = (): {
  goToWelcome: () => void;
  goToDashboard: () => void;
  goToDetail: () => void;
  goToHelp: () => void;
} => {
  const setView = useUIStore.use.setView();

  return {
    goToWelcome: (): void => setView('welcome'),
    goToDashboard: (): void => setView('dashboard'),
    goToDetail: (): void => setView('detail'),
    goToHelp: (): void => setView('help'),
  };
};

/**
 * Hook to access notification helpers
 *
 * @returns Object with notification helper functions
 *
 * @example
 * ```tsx
 * const { success, error, info, warning } = useNotify();
 *
 * const handleSave = async () => {
 *   try {
 *     await save();
 *     success('Plan saved!');
 *   } catch (err) {
 *     error('Failed to save plan');
 *   }
 * };
 * ```
 */
export const useNotify = (): {
  success: (message: string, priority?: NotificationPriority) => void;
  error: (message: string, priority?: NotificationPriority) => void;
  info: (message: string, priority?: NotificationPriority) => void;
  warning: (message: string, priority?: NotificationPriority) => void;
} => {
  const showNotification = useUIStore.use.showNotification();

  return {
    success: (message: string, priority?: NotificationPriority): void =>
      showNotification(message, 'success', { priority }),
    error: (message: string, priority?: NotificationPriority): void =>
      showNotification(message, 'error', { priority }),
    info: (message: string, priority?: NotificationPriority): void =>
      showNotification(message, 'info', { priority }),
    warning: (message: string, priority?: NotificationPriority): void =>
      showNotification(message, 'warning', { priority }),
  };
};

/**
 * Hook to access selection navigation with wrap-around support
 *
 * @param maxIndex - Maximum selectable index (total items - 1)
 * @returns Object with selection navigation functions
 *
 * @example
 * ```tsx
 * const { selectedIndex, moveUp, moveDown, select } = useSelection(maxIndex);
 *
 * useInput((input, key) => {
 *   if (key.upArrow) moveUp();
 *   if (key.downArrow) moveDown();
 * });
 * ```
 */
export const useSelection = (
  maxIndex: number,
): {
  selectedIndex: number;
  select: (index: number) => void;
  moveUp: () => void;
  moveDown: () => void;
} => {
  const selectedIndex = useUIStore.use.selectedIndex();
  const setSelectedIndex = useUIStore.use.setSelectedIndex();
  const moveSelectionUp = useUIStore.use.moveSelectionUp();
  const moveSelectionDown = useUIStore.use.moveSelectionDown();

  // Convert maxIndex to totalItems (maxIndex = totalItems - 1)
  const totalItems = maxIndex + 1;

  return {
    selectedIndex,
    select: setSelectedIndex,
    moveUp: (): void => moveSelectionUp(totalItems),
    moveDown: (): void => moveSelectionDown(totalItems),
  };
};
