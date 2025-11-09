/**
 * File Service
 * Handles file operations for network plans
 */

import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import type { NetworkPlan } from '../core/models/network-plan.js';
import { ErrorFactory, isFileOperationError } from '../errors/index.js';
import { ErrorCode, ValidationError } from '../errors/network-plan-errors.js';
import { resolveUserPath, validateFilename } from '../infrastructure/security/security-utils.js';
import { parseNetworkPlan } from '../schemas/network-plan.schema.js';
import { isErrnoException } from '../utils/error-helpers.js';

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
    // Ensure base directory exists (sync in constructor)
    try {
      fsSync.mkdirSync(this.baseDirectory, { recursive: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot save plan: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    if (!filename || filename.trim().length === 0) {
      throw ErrorFactory.invalidFilename('', 'Filename cannot be empty');
    }

    // Add .cidr extension if no valid extension present
    const hasValidExtension = filename.endsWith('.cidr') || filename.endsWith('.json');
    const finalFilename = hasValidExtension ? filename : `${filename}.cidr`;

    // Only validate filename portion (not full paths)
    // If it contains path separators, extract just the filename for validation
    const filenamePortion = finalFilename.includes('/')
      ? (finalFilename.split('/').pop() ?? finalFilename)
      : finalFilename;

    const filenameValidation = validateFilename(filenamePortion);
    if (filenameValidation !== true) {
      throw ErrorFactory.invalidFilename(filenamePortion, filenameValidation);
    }

    try {
      // Resolve user path (supports filenames, relative paths, absolute paths, ~ paths)
      const filepath = resolveUserPath(finalFilename, this.baseDirectory);

      // Ensure parent directory exists
      const dirPath = path.dirname(filepath);
      try {
        await fs.mkdir(dirPath, { recursive: true });
      } catch (error) {
        if (isErrnoException(error) && error.code !== 'EEXIST') {
          throw error;
        }
      }

      // Write the file
      await fs.writeFile(filepath, JSON.stringify(plan, null, 2), 'utf-8');

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

      // Read the file
      let fileContent: string;
      try {
        fileContent = await fs.readFile(filepath, 'utf-8');
      } catch (error) {
        if (isErrnoException(error) && error.code === 'ENOENT') {
          throw ErrorFactory.fileNotFound(filepath);
        }
        throw error;
      }

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
      // Read directory
      let files: string[];
      try {
        files = await fs.readdir(this.baseDirectory);
      } catch (error) {
        if (isErrnoException(error) && error.code === 'ENOENT') {
          return [];
        }
        throw error;
      }
      const planFiles = files.filter((f) => f.endsWith('.cidr') || f.endsWith('.json'));

      const savedPlans: SavedPlanFile[] = await Promise.all(
        planFiles.map(async (filename) => {
          const filepath = path.join(this.baseDirectory, filename);
          const stats = await fs.stat(filepath);

          return {
            filename,
            path: filepath,
            modifiedAt: stats.mtime,
          };
        }),
      );

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

      // Delete the file
      try {
        await fs.unlink(filepath);
      } catch (error) {
        if (isErrnoException(error) && error.code === 'ENOENT') {
          throw ErrorFactory.fileNotFound(filepath);
        }
        throw error;
      }

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
