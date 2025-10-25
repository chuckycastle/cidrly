/**
 * FileSystem Repository Implementation
 * Implements network plan repository using filesystem as storage
 */

import fs from 'fs';
import type { NetworkPlan } from '../core/models/network-plan.js';
import type { FileService, SavedPlanFile } from '../services/file.service.js';
import type { INetworkPlanRepository, SavedPlan } from './network-plan.repository.js';

/**
 * Repository implementation that uses filesystem for storage
 * Wraps FileService to provide repository interface
 */
export class FileSystemRepository implements INetworkPlanRepository {
  constructor(private readonly fileService: FileService) {}

  /**
   * Save a network plan to filesystem
   */
  async save(plan: NetworkPlan, identifier: string): Promise<string> {
    return await this.fileService.savePlan(plan, identifier);
  }

  /**
   * Load a network plan from filesystem
   */
  async load(identifier: string): Promise<NetworkPlan> {
    return await this.fileService.loadPlan(identifier);
  }

  /**
   * Find all saved plans in the filesystem
   */
  async findAll(): Promise<SavedPlan[]> {
    const savedFiles: SavedPlanFile[] = await this.fileService.listPlans();

    return savedFiles.map((file) => {
      // Get file size if file exists
      let size: number | undefined;
      try {
        const stats = fs.statSync(file.path);
        size = stats.size;
      } catch {
        // File may have been deleted between listing and stat
        size = undefined;
      }

      return {
        identifier: file.filename,
        name: file.filename.replace(/\.json$/, ''),
        path: file.path,
        modifiedAt: file.modifiedAt,
        size,
      };
    });
  }

  /**
   * Delete a network plan from filesystem
   */
  async delete(identifier: string): Promise<void> {
    await this.fileService.deletePlan(identifier);
  }

  /**
   * Check if a plan exists in the filesystem
   */
  async exists(identifier: string): Promise<boolean> {
    try {
      // Attempt to load the plan (will throw if doesn't exist)
      await this.fileService.loadPlan(identifier);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all saved plan filenames
   */
  async listAll(): Promise<string[]> {
    const savedFiles = await this.fileService.listPlans();
    return savedFiles.map((file) => file.filename);
  }
}
