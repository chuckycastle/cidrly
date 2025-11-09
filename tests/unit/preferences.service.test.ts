/**
 * Unit tests for PreferencesService
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';
import { defaultPreferences, type Preferences } from '../../src/schemas/preferences.schema.js';
import { PreferencesService } from '../../src/services/preferences.service.js';

describe('PreferencesService', () => {
  let tempDir: string;
  let service: PreferencesService;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cidrly-prefs-test-'));

    // Create service with temp directory
    service = new PreferencesService(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadPreferences', () => {
    it('should return default preferences when file does not exist', async () => {
      const preferences = await service.loadPreferences();

      expect(preferences).toEqual(defaultPreferences);
      expect(preferences.growthPercentage).toBe(100);
      expect(preferences.version).toBe(1);
    });

    it('should load valid preferences from file', async () => {
      // Create preferences file
      const prefsDir = path.join(tempDir, 'cidrly');
      const prefsFile = path.join(prefsDir, 'preferences.json');
      fs.mkdirSync(prefsDir, { recursive: true });

      const testPrefs: Preferences = {
        growthPercentage: 200,
        version: 1,
      };
      fs.writeFileSync(prefsFile, JSON.stringify(testPrefs, null, 2));

      const preferences = await service.loadPreferences();

      expect(preferences.growthPercentage).toBe(200);
      expect(preferences.version).toBe(1);
    });

    it('should return defaults when JSON is invalid', async () => {
      // Create invalid JSON file
      const prefsDir = path.join(tempDir, 'cidrly');
      const prefsFile = path.join(prefsDir, 'preferences.json');
      fs.mkdirSync(prefsDir, { recursive: true });
      fs.writeFileSync(prefsFile, 'not valid json{{{');

      const preferences = await service.loadPreferences();

      expect(preferences).toEqual(defaultPreferences);
    });

    it('should return defaults when preferences fail Zod validation', async () => {
      // Create file with invalid preferences data
      const prefsDir = path.join(tempDir, 'cidrly');
      const prefsFile = path.join(prefsDir, 'preferences.json');
      fs.mkdirSync(prefsDir, { recursive: true });

      const invalidPrefs = {
        growthPercentage: 400, // Exceeds max of 300
        version: 1,
      };
      fs.writeFileSync(prefsFile, JSON.stringify(invalidPrefs, null, 2));

      const preferences = await service.loadPreferences();

      expect(preferences).toEqual(defaultPreferences);
    });

    it('should return defaults when growthPercentage is not an integer', async () => {
      // Create file with non-integer growth percentage
      const prefsDir = path.join(tempDir, 'cidrly');
      const prefsFile = path.join(prefsDir, 'preferences.json');
      fs.mkdirSync(prefsDir, { recursive: true });

      const invalidPrefs = {
        growthPercentage: 100.5, // Not an integer
        version: 1,
      };
      fs.writeFileSync(prefsFile, JSON.stringify(invalidPrefs, null, 2));

      const preferences = await service.loadPreferences();

      expect(preferences).toEqual(defaultPreferences);
    });

    it('should handle negative growthPercentage by returning defaults', async () => {
      const prefsDir = path.join(tempDir, 'cidrly');
      const prefsFile = path.join(prefsDir, 'preferences.json');
      fs.mkdirSync(prefsDir, { recursive: true });

      const invalidPrefs = {
        growthPercentage: -10,
        version: 1,
      };
      fs.writeFileSync(prefsFile, JSON.stringify(invalidPrefs, null, 2));

      const preferences = await service.loadPreferences();

      expect(preferences).toEqual(defaultPreferences);
    });

    it('should accept valid edge case values', async () => {
      const prefsDir = path.join(tempDir, 'cidrly');
      const prefsFile = path.join(prefsDir, 'preferences.json');
      fs.mkdirSync(prefsDir, { recursive: true });

      // Test minimum valid value (0)
      const minPrefs: Preferences = {
        growthPercentage: 0,
        version: 1,
      };
      fs.writeFileSync(prefsFile, JSON.stringify(minPrefs, null, 2));

      let preferences = await service.loadPreferences();
      expect(preferences.growthPercentage).toBe(0);

      // Test maximum valid value (300)
      const maxPrefs: Preferences = {
        growthPercentage: 300,
        version: 1,
      };
      fs.writeFileSync(prefsFile, JSON.stringify(maxPrefs, null, 2));

      preferences = await service.loadPreferences();
      expect(preferences.growthPercentage).toBe(300);
    });

    it('should return defaults when file has missing required fields', async () => {
      const prefsDir = path.join(tempDir, 'cidrly');
      const prefsFile = path.join(prefsDir, 'preferences.json');
      fs.mkdirSync(prefsDir, { recursive: true });

      const incompletePrefs = {
        // Missing planningPercentage
        version: 1,
      };
      fs.writeFileSync(prefsFile, JSON.stringify(incompletePrefs, null, 2));

      const preferences = await service.loadPreferences();

      // Should use defaults when required fields are missing
      expect(preferences).toEqual(defaultPreferences);
    });
  });

  describe('savePreferences', () => {
    it('should save valid preferences to file', async () => {
      const testPrefs: Preferences = {
        growthPercentage: 150,
        version: 1,
      };

      await service.savePreferences(testPrefs);

      // Verify file was created
      const prefsFile = path.join(tempDir, 'cidrly', 'preferences.json');
      expect(fs.existsSync(prefsFile)).toBe(true);

      // Verify file contents
      const fileContent = fs.readFileSync(prefsFile, 'utf-8');
      const savedPrefs = JSON.parse(fileContent);

      expect(savedPrefs.growthPercentage).toBe(150);
      expect(savedPrefs.version).toBe(1);
    });

    it('should create directory if it does not exist', async () => {
      const prefsDir = path.join(tempDir, 'cidrly');

      // Ensure directory doesn't exist
      if (fs.existsSync(prefsDir)) {
        fs.rmSync(prefsDir, { recursive: true, force: true });
      }
      expect(fs.existsSync(prefsDir)).toBe(false);

      await service.savePreferences(defaultPreferences);

      // Directory should now exist
      expect(fs.existsSync(prefsDir)).toBe(true);
    });

    it('should throw error for invalid preferences (exceeds max)', async () => {
      const invalidPrefs = {
        growthPercentage: 350, // Exceeds max of 300
        version: 1,
      };

      await expect(service.savePreferences(invalidPrefs as Preferences)).rejects.toThrow();
    });

    it('should throw error for invalid preferences (below min)', async () => {
      const invalidPrefs = {
        growthPercentage: -5, // Below min of 0
        version: 1,
      };

      await expect(service.savePreferences(invalidPrefs as Preferences)).rejects.toThrow();
    });

    it('should throw error for non-integer growthPercentage', async () => {
      const invalidPrefs = {
        growthPercentage: 100.5,
        version: 1,
      };

      await expect(service.savePreferences(invalidPrefs as Preferences)).rejects.toThrow();
    });

    it('should overwrite existing preferences', async () => {
      const prefs1: Preferences = {
        growthPercentage: 100,
        version: 1,
      };

      const prefs2: Preferences = {
        growthPercentage: 200,
        version: 1,
      };

      await service.savePreferences(prefs1);
      await service.savePreferences(prefs2);

      const loaded = await service.loadPreferences();
      expect(loaded.growthPercentage).toBe(200);
    });

    it('should format JSON with proper indentation', async () => {
      await service.savePreferences(defaultPreferences);

      const prefsFile = path.join(tempDir, 'cidrly', 'preferences.json');
      const fileContent = fs.readFileSync(prefsFile, 'utf-8');

      // Check for proper JSON formatting (2-space indent)
      expect(fileContent).toContain('{\n  "growthPercentage"');
      expect(fileContent).toContain('\n}');
    });

    it('should save edge case values successfully', async () => {
      // Test minimum value (0)
      const minPrefs: Preferences = {
        growthPercentage: 0,
        version: 1,
      };
      await service.savePreferences(minPrefs);

      let loaded = await service.loadPreferences();
      expect(loaded.growthPercentage).toBe(0);

      // Test maximum value (300)
      const maxPrefs: Preferences = {
        growthPercentage: 300,
        version: 1,
      };
      await service.savePreferences(maxPrefs);

      loaded = await service.loadPreferences();
      expect(loaded.growthPercentage).toBe(300);
    });
  });

  describe('resetPreferences', () => {
    it('should delete preferences file if it exists', async () => {
      // Create preferences file
      await service.savePreferences(defaultPreferences);

      const prefsFile = path.join(tempDir, 'cidrly', 'preferences.json');
      expect(fs.existsSync(prefsFile)).toBe(true);

      // Reset preferences
      await service.resetPreferences();

      // File should be deleted
      expect(fs.existsSync(prefsFile)).toBe(false);
    });

    it('should not throw error if file does not exist', async () => {
      const prefsFile = path.join(tempDir, 'cidrly', 'preferences.json');
      expect(fs.existsSync(prefsFile)).toBe(false);

      // Should not throw
      await expect(service.resetPreferences()).resolves.not.toThrow();
    });

    it('should allow saving new preferences after reset', async () => {
      // Save, reset, save again
      await service.savePreferences({ growthPercentage: 200, version: 1 });
      await service.resetPreferences();
      await service.savePreferences({ growthPercentage: 150, version: 1 });

      const loaded = await service.loadPreferences();
      expect(loaded.growthPercentage).toBe(150);
    });

    it('should handle multiple reset calls safely', async () => {
      // Create preferences file
      await service.savePreferences(defaultPreferences);

      // Reset multiple times - should not throw
      await service.resetPreferences();
      await service.resetPreferences();
      await service.resetPreferences();

      // File should stay deleted
      const prefsFile = path.join(tempDir, 'cidrly', 'preferences.json');
      expect(fs.existsSync(prefsFile)).toBe(false);
    });

    it('should return defaults after reset', async () => {
      // Save custom preferences
      await service.savePreferences({ growthPercentage: 200, version: 1 });

      // Reset
      await service.resetPreferences();

      // Should now return defaults
      const loaded = await service.loadPreferences();
      expect(loaded).toEqual(defaultPreferences);
    });
  });

  describe('getPreferencesPath', () => {
    it('should return correct path to preferences file', () => {
      const prefsPath = service.getPreferencesPath();

      expect(prefsPath).toContain('cidrly');
      expect(prefsPath).toContain('preferences.json');
      expect(prefsPath).toContain(tempDir); // Should be in our temp directory
    });

    it('should return absolute path', () => {
      const prefsPath = service.getPreferencesPath();

      expect(path.isAbsolute(prefsPath)).toBe(true);
    });

    it('should return path that ends with preferences.json', () => {
      const prefsPath = service.getPreferencesPath();

      expect(prefsPath.endsWith('preferences.json')).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow: save, load, modify, save, load', async () => {
      // Initial save
      await service.savePreferences({ growthPercentage: 100, version: 1 });

      // Load
      let prefs = await service.loadPreferences();
      expect(prefs.growthPercentage).toBe(100);

      // Modify and save
      await service.savePreferences({ growthPercentage: 200, version: 1 });

      // Load again
      prefs = await service.loadPreferences();
      expect(prefs.growthPercentage).toBe(200);
    });

    it('should handle corrupted file gracefully', async () => {
      // Save valid preferences
      await service.savePreferences({ growthPercentage: 150, version: 1 });

      // Corrupt the file
      const prefsFile = path.join(tempDir, 'cidrly', 'preferences.json');
      fs.writeFileSync(prefsFile, 'corrupted{{{');

      // Should return defaults instead of crashing
      const prefs = await service.loadPreferences();
      expect(prefs).toEqual(defaultPreferences);
    });

    it('should handle rapid save operations', async () => {
      // Rapid saves should all succeed
      await service.savePreferences({ growthPercentage: 0, version: 1 });
      await service.savePreferences({ growthPercentage: 100, version: 1 });
      await service.savePreferences({ growthPercentage: 200, version: 1 });
      await service.savePreferences({ growthPercentage: 300, version: 1 });

      const prefs = await service.loadPreferences();
      expect(prefs.growthPercentage).toBe(300); // Last save wins
    });

    it('should create custom savedPlansDir when specified', async () => {
      const customDir = path.join(tempDir, 'custom-plans');
      const prefs: Preferences = {
        growthPercentage: 100,
        version: 1,
        savedPlansDir: customDir,
      };

      await service.savePreferences(prefs);

      // Verify custom directory was created
      expect(fs.existsSync(customDir)).toBe(true);

      // Verify preferences were saved correctly
      const loaded = await service.loadPreferences();
      expect(loaded.savedPlansDir).toBe(customDir);
    });

    it('should create custom exportsDir when specified', async () => {
      const customDir = path.join(tempDir, 'custom-exports');
      const prefs: Preferences = {
        growthPercentage: 100,
        version: 1,
        exportsDir: customDir,
      };

      await service.savePreferences(prefs);

      // Verify custom directory was created
      expect(fs.existsSync(customDir)).toBe(true);

      // Verify preferences were saved correctly
      const loaded = await service.loadPreferences();
      expect(loaded.exportsDir).toBe(customDir);
    });

    it('should handle tilde expansion in custom directories', async () => {
      const prefs: Preferences = {
        growthPercentage: 100,
        version: 1,
        savedPlansDir: '~/cidrly-custom-plans',
      };

      await service.savePreferences(prefs);

      // Verify the directory was created with expanded path
      const expandedPath = path.join(os.homedir(), 'cidrly-custom-plans');
      expect(fs.existsSync(expandedPath)).toBe(true);

      // Clean up
      fs.rmSync(expandedPath, { recursive: true, force: true });
    });

    it('should handle both custom directories together', async () => {
      const customPlansDir = path.join(tempDir, 'both-plans');
      const customExportsDir = path.join(tempDir, 'both-exports');
      const prefs: Preferences = {
        growthPercentage: 100,
        version: 1,
        savedPlansDir: customPlansDir,
        exportsDir: customExportsDir,
      };

      await service.savePreferences(prefs);

      // Verify both directories were created
      expect(fs.existsSync(customPlansDir)).toBe(true);
      expect(fs.existsSync(customExportsDir)).toBe(true);
    });
  });

  describe('error handling scenarios', () => {
    it('should propagate mkdir errors that are not EEXIST in ensureDirectoryExists', async () => {
      // Spy on fs.mkdir to force a non-EEXIST error
      const mkdirSpy = jest.spyOn(fsPromises, 'mkdir').mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), {
          code: 'EACCES',
          errno: -13,
          syscall: 'mkdir',
        } as NodeJS.ErrnoException),
      );

      const prefs: Preferences = {
        growthPercentage: 100,
        version: 1,
      };

      // Should throw because mkdir fails with EACCES (not EEXIST)
      await expect(service.savePreferences(prefs)).rejects.toThrow();

      mkdirSpy.mockRestore();
    });

    it('should propagate mkdir errors that are not EEXIST in validateAndCreateDirectory', async () => {
      const customDir = path.join(tempDir, 'custom-with-error');

      // Spy on fs.mkdir to force a non-EEXIST error on the second call (first is ensureDirectoryExists, second is validateAndCreateDirectory)
      let callCount = 0;
      const mkdirSpy = jest
        .spyOn(fsPromises, 'mkdir')
        .mockImplementation(async (_dirPath, _options) => {
          callCount++;
          if (callCount === 1) {
            // Let ensureDirectoryExists succeed
            return undefined;
          }
          // Force validateAndCreateDirectory to fail with EPERM
          const error = new Error('Operation not permitted') as NodeJS.ErrnoException;
          error.code = 'EPERM';
          error.errno = -1;
          error.syscall = 'mkdir';
          throw error;
        });

      const prefs: Preferences = {
        growthPercentage: 100,
        version: 1,
        savedPlansDir: customDir,
      };

      // Should throw because mkdir fails with EPERM (not EEXIST)
      await expect(service.savePreferences(prefs)).rejects.toThrow();

      mkdirSpy.mockRestore();
    });

    it('should propagate unlink errors that are not ENOENT in resetPreferences', async () => {
      // Create a preferences file first
      await service.savePreferences({ growthPercentage: 100, version: 1 });

      // Spy on fs.unlink to force a non-ENOENT error
      const unlinkSpy = jest.spyOn(fsPromises, 'unlink').mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), {
          code: 'EACCES',
          errno: -13,
          syscall: 'unlink',
        } as NodeJS.ErrnoException),
      );

      // Should throw because unlink fails with EACCES (not ENOENT)
      // The error gets wrapped in FileOperationError
      await expect(service.resetPreferences()).rejects.toThrow();

      unlinkSpy.mockRestore();
    });

    it('should ignore ENOENT errors in resetPreferences when file does not exist', async () => {
      // File doesn't exist, so unlink will fail with ENOENT
      // This should NOT throw - it should be silently ignored
      await expect(service.resetPreferences()).resolves.not.toThrow();
    });

    it('should ignore EEXIST errors in ensureDirectoryExists when directory already exists', async () => {
      // Create directory first
      const prefsDir = path.join(tempDir, 'cidrly');
      fs.mkdirSync(prefsDir, { recursive: true });

      // Spy on mkdir to simulate EEXIST error
      const mkdirSpy = jest.spyOn(fsPromises, 'mkdir').mockRejectedValueOnce(
        Object.assign(new Error('File exists'), {
          code: 'EEXIST',
          errno: -17,
          syscall: 'mkdir',
        } as NodeJS.ErrnoException),
      );

      // Should not throw - EEXIST is expected and ignored
      await expect(
        service.savePreferences({ growthPercentage: 100, version: 1 }),
      ).resolves.not.toThrow();

      mkdirSpy.mockRestore();
    });

    it('should ignore EEXIST errors in validateAndCreateDirectory when directory already exists', async () => {
      const customDir = path.join(tempDir, 'existing-custom');
      // Create both the custom dir and the preferences dir
      fs.mkdirSync(customDir, { recursive: true });
      const prefsDir = path.join(tempDir, 'cidrly');
      fs.mkdirSync(prefsDir, { recursive: true });

      // Spy on mkdir - only mock the call for customDir
      const mkdirSpy = jest
        .spyOn(fsPromises, 'mkdir')
        .mockImplementation(async (dirPath, _options) => {
          // If it's the custom directory, simulate EEXIST
          if (typeof dirPath === 'string' && dirPath.includes('existing-custom')) {
            const error = new Error('File exists') as NodeJS.ErrnoException;
            error.code = 'EEXIST';
            error.errno = -17;
            error.syscall = 'mkdir';
            throw error;
          }
          // Otherwise, call the real mkdir (for preferences dir)
          return undefined;
        });

      const prefs: Preferences = {
        growthPercentage: 100,
        version: 1,
        savedPlansDir: customDir,
      };

      // Should not throw - EEXIST is expected and ignored
      await expect(service.savePreferences(prefs)).resolves.not.toThrow();

      mkdirSpy.mockRestore();
    });
  });
});
