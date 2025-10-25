/**
 * Tests for useUI custom hooks
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import {
  useCurrentView,
  useNavigation,
  useNotifications,
  useNotify,
  useSelectedIndex,
  useSelection,
  useUIActions,
} from '../../src/hooks/useUI.js';
import { useUIStore } from '../../src/store/uiStore.js';

describe('useUI hooks', () => {
  beforeEach(() => {
    // Reset UI store before each test
    const store = useUIStore.getState();
    act(() => {
      store.setView('welcome');
      store.setSelectedIndex(0);
      store.clearNotifications();
    });
  });

  describe('useCurrentView', () => {
    it('should return welcome as initial view', () => {
      const { result } = renderHook(() => useCurrentView());
      expect(result.current).toBe('welcome');
    });

    it('should return updated view after setView', () => {
      const { result: viewResult } = renderHook(() => useCurrentView());
      const { result: actionsResult } = renderHook(() => useUIActions());

      expect(viewResult.current).toBe('welcome');

      act(() => {
        actionsResult.current.setView('dashboard');
      });

      expect(viewResult.current).toBe('dashboard');
    });
  });

  describe('useSelectedIndex', () => {
    it('should return 0 as initial selected index', () => {
      const { result } = renderHook(() => useSelectedIndex());
      expect(result.current).toBe(0);
    });

    it('should update when setSelectedIndex is called', () => {
      const { result: indexResult } = renderHook(() => useSelectedIndex());
      const { result: actionsResult } = renderHook(() => useUIActions());

      expect(indexResult.current).toBe(0);

      act(() => {
        actionsResult.current.setSelectedIndex(5);
      });

      expect(indexResult.current).toBe(5);
    });
  });

  describe('useNotifications', () => {
    it('should return empty array initially', () => {
      const { result } = renderHook(() => useNotifications());
      expect(result.current).toEqual([]);
    });

    it('should return notifications after showNotification', () => {
      const { result: notificationsResult } = renderHook(() => useNotifications());
      const { result: actionsResult } = renderHook(() => useUIActions());

      act(() => {
        actionsResult.current.showNotification('Test message', 'success');
      });

      expect(notificationsResult.current).toHaveLength(1);
      expect(notificationsResult.current[0]?.message).toBe('Test message');
      expect(notificationsResult.current[0]?.type).toBe('success');
    });
  });

  describe('useUIActions', () => {
    it('should provide all UI actions', () => {
      const { result } = renderHook(() => useUIActions());

      expect(result.current.setView).toBeInstanceOf(Function);
      expect(result.current.setSelectedIndex).toBeInstanceOf(Function);
      expect(result.current.moveSelectionUp).toBeInstanceOf(Function);
      expect(result.current.moveSelectionDown).toBeInstanceOf(Function);
      expect(result.current.showNotification).toBeInstanceOf(Function);
      expect(result.current.dismissNotification).toBeInstanceOf(Function);
      expect(result.current.clearNotifications).toBeInstanceOf(Function);
      expect(result.current.setMaxVisibleNotifications).toBeInstanceOf(Function);
    });
  });

  describe('useNavigation', () => {
    it('should provide navigation helper functions', () => {
      const { result } = renderHook(() => useNavigation());

      expect(result.current.goToWelcome).toBeInstanceOf(Function);
      expect(result.current.goToDashboard).toBeInstanceOf(Function);
      expect(result.current.goToDetail).toBeInstanceOf(Function);
      expect(result.current.goToHelp).toBeInstanceOf(Function);
    });

    it('should navigate to dashboard', () => {
      const { result: navigationResult } = renderHook(() => useNavigation());
      const { result: viewResult } = renderHook(() => useCurrentView());

      expect(viewResult.current).toBe('welcome');

      act(() => {
        navigationResult.current.goToDashboard();
      });

      expect(viewResult.current).toBe('dashboard');
    });

    it('should navigate to welcome', () => {
      const { result: navigationResult } = renderHook(() => useNavigation());
      const { result: viewResult } = renderHook(() => useCurrentView());

      act(() => {
        navigationResult.current.goToDashboard();
      });

      expect(viewResult.current).toBe('dashboard');

      act(() => {
        navigationResult.current.goToWelcome();
      });

      expect(viewResult.current).toBe('welcome');
    });
  });

  describe('useNotify', () => {
    it('should provide notification helper functions', () => {
      const { result } = renderHook(() => useNotify());

      expect(result.current.success).toBeInstanceOf(Function);
      expect(result.current.error).toBeInstanceOf(Function);
      expect(result.current.info).toBeInstanceOf(Function);
      expect(result.current.warning).toBeInstanceOf(Function);
    });

    it('should create success notification', () => {
      const { result: notifyResult } = renderHook(() => useNotify());
      const { result: notificationsResult } = renderHook(() => useNotifications());

      act(() => {
        notifyResult.current.success('Success message');
      });

      expect(notificationsResult.current).toHaveLength(1);
      expect(notificationsResult.current[0]?.type).toBe('success');
      expect(notificationsResult.current[0]?.message).toBe('Success message');
    });

    it('should create error notification', () => {
      const { result: notifyResult } = renderHook(() => useNotify());
      const { result: notificationsResult } = renderHook(() => useNotifications());

      act(() => {
        notifyResult.current.error('Error message');
      });

      expect(notificationsResult.current).toHaveLength(1);
      expect(notificationsResult.current[0]?.type).toBe('error');
      expect(notificationsResult.current[0]?.message).toBe('Error message');
    });

    it('should create info notification', () => {
      const { result: notifyResult } = renderHook(() => useNotify());
      const { result: notificationsResult } = renderHook(() => useNotifications());

      act(() => {
        notifyResult.current.info('Info message');
      });

      expect(notificationsResult.current).toHaveLength(1);
      expect(notificationsResult.current[0]?.type).toBe('info');
      expect(notificationsResult.current[0]?.message).toBe('Info message');
    });

    it('should create warning notification', () => {
      const { result: notifyResult } = renderHook(() => useNotify());
      const { result: notificationsResult } = renderHook(() => useNotifications());

      act(() => {
        notifyResult.current.warning('Warning message');
      });

      expect(notificationsResult.current).toHaveLength(1);
      expect(notificationsResult.current[0]?.type).toBe('warning');
      expect(notificationsResult.current[0]?.message).toBe('Warning message');
    });
  });

  describe('useSelection', () => {
    it('should provide selection state and actions', () => {
      const { result } = renderHook(() => useSelection(10));

      expect(result.current.selectedIndex).toBe(0);
      expect(result.current.select).toBeInstanceOf(Function);
      expect(result.current.moveUp).toBeInstanceOf(Function);
      expect(result.current.moveDown).toBeInstanceOf(Function);
    });

    it('should select specific index', () => {
      const { result } = renderHook(() => useSelection(10));

      expect(result.current.selectedIndex).toBe(0);

      act(() => {
        result.current.select(5);
      });

      expect(result.current.selectedIndex).toBe(5);
    });

    it('should move selection down', () => {
      const { result } = renderHook(() => useSelection(10));

      expect(result.current.selectedIndex).toBe(0);

      act(() => {
        result.current.moveDown();
      });

      expect(result.current.selectedIndex).toBe(1);
    });

    it('should move selection up', () => {
      const { result } = renderHook(() => useSelection(10));

      act(() => {
        result.current.select(5);
      });

      expect(result.current.selectedIndex).toBe(5);

      act(() => {
        result.current.moveUp();
      });

      expect(result.current.selectedIndex).toBe(4);
    });

    it('should clamp to 0 when moving up from 0', () => {
      const { result } = renderHook(() => useSelection(10));

      expect(result.current.selectedIndex).toBe(0);

      act(() => {
        result.current.moveUp();
      });

      expect(result.current.selectedIndex).toBe(0);
    });

    it('should clamp to max when moving down from max', () => {
      const { result } = renderHook(() => useSelection(10));

      act(() => {
        result.current.select(10);
      });

      expect(result.current.selectedIndex).toBe(10);

      act(() => {
        result.current.moveDown();
      });

      expect(result.current.selectedIndex).toBe(10);
    });
  });
});
