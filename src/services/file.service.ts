/**
 * File Service
 * Handles file operations for network plans
 */

import fs from 'fs';
import path from 'path';
import type { NetworkPlan } from '../core/models/network-plan.js';
import { ErrorFactory, isFileOperationError } from '../errors/index.js';
import { ErrorCode, ValidationError } from '../errors/network-plan-errors.js';
import { resolveUserPath, validateFilename } from '../infrastructure/security/security-utils.js';
import { parseNetworkPlan } from '../schemas/network-plan.schema.js';

export interface SavedPlanFile {
  filename: string;
  path: string;
  modifiedAt: Date;
}

/**
 * Service class for managing file operations on network plans
 */
export class FileService {
  private planListCache: SavedPlanFile[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly CACHE_TTL_MS = 5000; // Cache for 5 seconds

  constructor(private readonly baseDirectory: string) {
    // Ensure base directory exists
    if (!fs.existsSync(this.baseDirectory)) {
      fs.mkdirSync(this.baseDirectory, { recursive: true });
    }
  }

  /**
   * Invalidate the plan list cache
   * Called after save, delete, or other operations that modify the filesystem
   */
  private invalidateCache(): void {
    this.planListCache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.planListCache || !this.cacheTimestamp) {
      return false;
    }
    const now = Date.now();
    return now - this.cacheTimestamp < this.CACHE_TTL_MS;
  }

  /**
   * Save a network plan to a file
   */
  async savePlan(plan: NetworkPlan, filename: string): Promise<string> {
    if (!plan) {
      throw new ValidationError(
        'Cannot save plan: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    if (!filename || filename.trim().length === 0) {
      throw ErrorFactory.invalidFilename('', 'Filename cannot be empty');
    }

    // Add .json extension if not present
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

    // Validate the final filename (including extension)
    const filenameValidation = validateFilename(finalFilename);
    if (filenameValidation !== true) {
      throw ErrorFactory.invalidFilename(finalFilename, filenameValidation);
    }

    try {
      // Resolve user path (supports filenames, relative paths, absolute paths, ~ paths)
      const filepath = resolveUserPath(finalFilename, this.baseDirectory);

      // Ensure parent directory exists
      const dirPath = path.dirname(filepath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(filepath, JSON.stringify(plan, null, 2), 'utf-8');

      // Invalidate cache after modifying filesystem
      this.invalidateCache();

      return filepath;
    } catch (error) {
      if (isFileOperationError(error)) {
        throw error;
      }
      throw ErrorFactory.fileWriteError(finalFilename, error as Error);
    }
  }

  /**
   * Load a network plan from a file
   */
  async loadPlan(filename: string): Promise<NetworkPlan> {
    if (!filename || filename.trim().length === 0) {
      throw ErrorFactory.invalidFilename('', 'Filename cannot be empty');
    }

    // Add .json extension if not present
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

    try {
      // Resolve user path (supports filenames, relative paths, absolute paths, ~ paths)
      const filepath = resolveUserPath(finalFilename, this.baseDirectory);

      // Check if file exists
      if (!fs.existsSync(filepath)) {
        throw ErrorFactory.fileNotFound(filepath);
      }

      // Read the file
      const fileContent = fs.readFileSync(filepath, 'utf-8');

      // Parse and validate using Zod schema
      const loadedPlan = parseNetworkPlan(JSON.parse(fileContent), filepath);

      return loadedPlan;
    } catch (error) {
      if (isFileOperationError(error)) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw ErrorFactory.fileParseError(finalFilename, error);
      }
      throw ErrorFactory.fileReadError(finalFilename, error as Error);
    }
  }

  /**
   * List all saved plans in the directory
   * Results are cached for 5 seconds to improve performance
   */
  async listPlans(): Promise<SavedPlanFile[]> {
    // Return cached result if still valid
    if (this.isCacheValid() && this.planListCache) {
      return this.planListCache;
    }

    try {
      // Ensure directory exists
      if (!fs.existsSync(this.baseDirectory)) {
        return [];
      }

      const files = fs.readdirSync(this.baseDirectory);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      const savedPlans: SavedPlanFile[] = jsonFiles.map((filename) => {
        const filepath = path.join(this.baseDirectory, filename);
        const stats = fs.statSync(filepath);

        return {
          filename,
          path: filepath,
          modifiedAt: stats.mtime,
        };
      });

      // Sort by modified date, most recent first
      savedPlans.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

      // Update cache
      this.planListCache = savedPlans;
      this.cacheTimestamp = Date.now();

      return savedPlans;
    } catch (error) {
      throw ErrorFactory.fileReadError(this.baseDirectory, error as Error);
    }
  }

  /**
   * Delete a saved plan file
   */
  async deletePlan(filename: string): Promise<void> {
    if (!filename || filename.trim().length === 0) {
      throw ErrorFactory.invalidFilename('', 'Filename cannot be empty');
    }

    // Add .json extension if not present
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

    try {
      // Resolve the file path
      const filepath = path.resolve(this.baseDirectory, finalFilename);

      // Check if path is within allowed directory
      if (!filepath.startsWith(this.baseDirectory + path.sep) && filepath !== this.baseDirectory) {
        throw ErrorFactory.pathTraversalDetected(filepath);
      }

      // Check if file exists
      if (!fs.existsSync(filepath)) {
        throw ErrorFactory.fileNotFound(filepath);
      }

      // Delete the file
      fs.unlinkSync(filepath);

      // Invalidate cache after modifying filesystem
      this.invalidateCache();
    } catch (error) {
      if (isFileOperationError(error)) {
        throw error;
      }
      throw ErrorFactory.fileWriteError(finalFilename, error as Error);
    }
  }
}
