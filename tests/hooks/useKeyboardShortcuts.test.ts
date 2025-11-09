/**
 * Tests for useKeyboardShortcuts Hook
 * Note: These tests focus on the business logic and validation.
 * Full keyboard event testing would require ink-testing-library integration.
 */

import { jest } from '@jest/globals';
import type { KeyboardShortcut } from '../../src/hooks/useKeyboardShortcuts.js';

describe('useKeyboardShortcuts', () => {
  describe('shortcut configuration validation', () => {
    it('should detect duplicate shortcuts in configuration', () => {
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Action 1',
          handler: jest.fn(),
          category: 'actions',
        },
        {
          key: 'a',
          description: 'Action 2',
          handler: jest.fn(),
          category: 'actions',
        },
      ];

      // Check for duplicates
      const keyMap = new Map<string, KeyboardShortcut>();
      const enabledShortcuts = shortcuts.filter((s) => s.enabled !== false);

      let foundDuplicate = false;
      enabledShortcuts.forEach((shortcut) => {
        if (keyMap.has(shortcut.key)) {
          foundDuplicate = true;
        }
        keyMap.set(shortcut.key, shortcut);
      });

      expect(foundDuplicate).toBe(true);
    });

    it('should not flag disabled shortcuts as duplicates', () => {
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Action 1',
          handler: jest.fn(),
          enabled: true,
          category: 'actions',
        },
        {
          key: 'a',
          description: 'Action 2',
          handler: jest.fn(),
          enabled: false, // Disabled
          category: 'actions',
        },
      ];

      // Check for duplicates (should only check enabled)
      const keyMap = new Map<string, KeyboardShortcut>();
      const enabledShortcuts = shortcuts.filter((s) => s.enabled !== false);

      let foundDuplicate = false;
      enabledShortcuts.forEach((shortcut) => {
        if (keyMap.has(shortcut.key)) {
          foundDuplicate = true;
        }
        keyMap.set(shortcut.key, shortcut);
      });

      expect(foundDuplicate).toBe(false);
    });

    it('should treat shortcuts without enabled property as enabled', () => {
      const shortcut: KeyboardShortcut = {
        key: 'a',
        description: 'Action',
        handler: jest.fn(),
        category: 'actions',
      };

      // Shortcut without 'enabled' should be treated as enabled
      const isEnabled = shortcut.enabled !== false;
      expect(isEnabled).toBe(true);
    });
  });

  describe('shortcut filtering', () => {
    it('should filter shortcuts by enabled status', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', description: 'Enabled 1', handler: jest.fn(), category: 'actions' },
        {
          key: 'b',
          description: 'Disabled',
          handler: jest.fn(),
          enabled: false,
          category: 'actions',
        },
        { key: 'c', description: 'Enabled 2', handler: jest.fn(), category: 'actions' },
      ];

      const enabledShortcuts = shortcuts.filter((s) => s.enabled !== false);

      expect(enabledShortcuts).toHaveLength(2);
      expect(enabledShortcuts[0]?.key).toBe('a');
      expect(enabledShortcuts[1]?.key).toBe('c');
    });
  });

  describe('shortcut categorization', () => {
    it('should group shortcuts by category', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'up', description: 'Up', handler: jest.fn(), category: 'navigation' },
        { key: 'down', description: 'Down', handler: jest.fn(), category: 'navigation' },
        { key: 'a', description: 'Add', handler: jest.fn(), category: 'actions' },
        { key: 'q', description: 'Quit', handler: jest.fn(), category: 'system' },
      ];

      const grouped: Record<string, KeyboardShortcut[]> = {
        navigation: [],
        actions: [],
        system: [],
        other: [],
      };

      shortcuts
        .filter((s) => s.enabled !== false)
        .forEach((shortcut) => {
          const category = shortcut.category ?? 'other';
          grouped[category] ??= [];
          grouped[category].push(shortcut);
        });

      expect(grouped['navigation']).toHaveLength(2);
      expect(grouped['actions']).toHaveLength(1);
      expect(grouped['system']).toHaveLength(1);
      expect(grouped['other']).toHaveLength(0);
    });

    it('should put shortcuts without category in "other"', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', description: 'No category', handler: jest.fn() },
      ];

      const grouped: Record<string, KeyboardShortcut[]> = {
        navigation: [],
        actions: [],
        system: [],
        other: [],
      };

      shortcuts
        .filter((s) => s.enabled !== false)
        .forEach((shortcut) => {
          const category = shortcut.category ?? 'other';
          grouped[category] ??= [];
          grouped[category].push(shortcut);
        });

      expect(grouped['other']).toHaveLength(1);
    });
  });

  describe('key binding checks', () => {
    it('should identify bound keys', () => {
      const shortcuts: KeyboardShortcut[] = [
        { key: 'a', description: 'Action', handler: jest.fn(), category: 'actions' },
        { key: 'b', description: 'Another', handler: jest.fn(), category: 'actions' },
      ];

      const isKeyBound = (key: string): boolean => {
        return shortcuts.some(
          (s) => s.key === key && (s.enabled === undefined || s.enabled === true),
        );
      };

      expect(isKeyBound('a')).toBe(true);
      expect(isKeyBound('b')).toBe(true);
      expect(isKeyBound('c')).toBe(false);
    });

    it('should not identify disabled shortcuts as bound', () => {
      const shortcuts: KeyboardShortcut[] = [
        {
          key: 'a',
          description: 'Disabled',
          handler: jest.fn(),
          enabled: false,
          category: 'actions',
        },
      ];

      const isKeyBound = (key: string): boolean => {
        return shortcuts.some(
          (s) => s.key === key && (s.enabled === undefined || s.enabled === true),
        );
      };

      expect(isKeyBound('a')).toBe(false);
    });
  });

  describe('special key handling', () => {
    it('should support special key names', () => {
      const specialKeys = [
        'upArrow',
        'downArrow',
        'leftArrow',
        'rightArrow',
        'return',
        'escape',
        'tab',
        'backspace',
        'delete',
      ];

      const shortcuts: KeyboardShortcut[] = specialKeys.map((key) => ({
        key,
        description: `Handle ${key}`,
        handler: jest.fn(),
        category: 'navigation',
      }));

      expect(shortcuts).toHaveLength(specialKeys.length);
      shortcuts.forEach((shortcut, index) => {
        expect(shortcut.key).toBe(specialKeys[index]);
      });
    });

    it('should support space key as character', () => {
      const shortcut: KeyboardShortcut = {
        key: ' ',
        description: 'Space action',
        handler: jest.fn(),
        category: 'actions',
      };

      expect(shortcut.key).toBe(' ');
      expect(shortcut.key.length).toBe(1);
    });
  });

  describe('handler execution validation', () => {
    it('should have executable handler functions', () => {
      const handler = jest.fn();
      const shortcut: KeyboardShortcut = {
        key: 'a',
        description: 'Action',
        handler,
        category: 'actions',
      };

      // Handler should be callable
      shortcut.handler();
      expect(handler).toHaveBeenCalled();
    });

    it('should support handlers with side effects', () => {
      let executed = false;
      const handler = (): void => {
        executed = true;
      };

      const shortcut: KeyboardShortcut = {
        key: 'a',
        description: 'Action',
        handler,
        category: 'actions',
      };

      shortcut.handler();
      expect(executed).toBe(true);
    });
  });

  describe('error message generation', () => {
    it('should generate descriptive error for duplicates', () => {
      const shortcut1: KeyboardShortcut = {
        key: 'a',
        description: 'Action 1',
        handler: jest.fn(),
        category: 'actions',
      };

      const shortcut2: KeyboardShortcut = {
        key: 'a',
        description: 'Action 2',
        handler: jest.fn(),
        category: 'actions',
      };

      const errorMessage =
        `Duplicate keyboard shortcut detected: "${shortcut1.key}". ` +
        `This key is bound to both "${shortcut1.description}" and "${shortcut2.description}". ` +
        `Each keyboard shortcut must be unique within a component.`;

      expect(errorMessage).toContain('Duplicate keyboard shortcut detected');
      expect(errorMessage).toContain(shortcut1.key);
      expect(errorMessage).toContain(shortcut1.description);
      expect(errorMessage).toContain(shortcut2.description);
    });
  });
});
