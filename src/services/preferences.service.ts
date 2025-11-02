/**
 * Preferences Service
 * Handles loading and saving user preferences
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { ErrorFactory } from '../errors/index.js';
import {
  defaultPreferences,
  safeParsePreferences,
  validatePreferences,
  type Preferences,
} from '../schemas/preferences.schema.js';

/**
 * Service class for managing user preferences
 */
export class PreferencesService {
  private readonly preferencesDir: string;
  private readonly preferencesFile: string;

  /**
   * @param homeDir - Optional home directory override (primarily for testing)
   */
  constructor(homeDir?: string) {
    // Preferences stored in ~/.cidrly/preferences.json
    const home = homeDir ?? os.homedir();
    this.preferencesDir = path.join(home, 'cidrly');
    this.preferencesFile = path.join(this.preferencesDir, 'preferences.json');
  }

  /**
   * Ensure the preferences directory exists
   */
  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.preferencesDir)) {
      fs.mkdirSync(this.preferencesDir, { recursive: true });
    }
  }

  /**
   * Validate and create a directory if it doesn't exist
   * Expands ~ to home directory
   */
  private validateAndCreateDirectory(dirPath: string): void {
    const expandedPath = dirPath.replace(/^~/, os.homedir());
    if (!fs.existsSync(expandedPath)) {
      fs.mkdirSync(expandedPath, { recursive: true });
    }
  }

  /**
   * Load preferences from file
   * Returns default preferences if file doesn't exist or is invalid
   */
  async loadPreferences(): Promise<Preferences> {
    try {
      // If file doesn't exist, return defaults
      if (!fs.existsSync(this.preferencesFile)) {
        return defaultPreferences;
      }

      // Read and parse the file
      const fileContent = fs.readFileSync(this.preferencesFile, 'utf-8');
      const data = JSON.parse(fileContent) as unknown;

      // Validate and return (with fallback to defaults on error)
      return safeParsePreferences(data);
    } catch (error) {
      // On any error, return defaults and optionally log
      console.warn('Failed to load preferences, using defaults:', error);
      return defaultPreferences;
    }
  }

  /**
   * Save preferences to file
   * Validates preferences before saving
   */
  async savePreferences(preferences: Preferences): Promise<void> {
    try {
      // Validate preferences
      const validatedPreferences = validatePreferences(preferences);

      // Validate and create custom directories if specified
      if (validatedPreferences.savedPlansDir) {
        this.validateAndCreateDirectory(validatedPreferences.savedPlansDir);
      }
      if (validatedPreferences.exportsDir) {
        this.validateAndCreateDirectory(validatedPreferences.exportsDir);
      }

      // Ensure preferences directory exists
      this.ensureDirectoryExists();

      // Write to file
      fs.writeFileSync(
        this.preferencesFile,
        JSON.stringify(validatedPreferences, null, 2),
        'utf-8',
      );
    } catch (error) {
      throw ErrorFactory.fileWriteError(this.preferencesFile, error as Error);
    }
  }

  /**
   * Reset preferences to defaults
   * Deletes the preferences file
   */
  async resetPreferences(): Promise<void> {
    try {
      // Attempt to delete the file directly
      // If it doesn't exist, catch ENOENT and ignore
      fs.unlinkSync(this.preferencesFile);
    } catch (error) {
      // Ignore "file not found" errors - file is already deleted
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw ErrorFactory.fileWriteError(this.preferencesFile, error as Error);
      }
    }
  }

  /**
   * Get the path to the preferences file
   */
  getPreferencesPath(): string {
    return this.preferencesFile;
  }
}
