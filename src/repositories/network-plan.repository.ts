/**
 * Network Plan Repository
 * Abstract data persistence layer for network plans
 */

import type { NetworkPlan } from '../core/models/network-plan.js';

/**
 * Repository interface for network plan persistence
 * Defines contract for CRUD operations independent of storage mechanism
 */
export interface INetworkPlanRepository {
  /**
   * Save a network plan
   * @param plan The network plan to save
   * @param identifier Unique identifier (e.g., filename)
   * @returns The full identifier/path of the saved plan
   */
  save(plan: NetworkPlan, identifier: string): Promise<string>;

  /**
   * Load a network plan by identifier
   * @param identifier Unique identifier of the plan to load
   * @returns The loaded network plan
   */
  load(identifier: string): Promise<NetworkPlan>;

  /**
   * Find all saved plans
   * @returns Array of plan metadata sorted by modification date
   */
  findAll(): Promise<SavedPlan[]>;

  /**
   * Delete a network plan
   * @param identifier Unique identifier of the plan to delete
   */
  delete(identifier: string): Promise<void>;

  /**
   * Check if a plan exists
   * @param identifier Unique identifier to check
   * @returns True if plan exists, false otherwise
   */
  exists(identifier: string): Promise<boolean>;
}

/**
 * Metadata for a saved plan
 */
export interface SavedPlan {
  identifier: string;
  name?: string;
  path: string;
  modifiedAt: Date;
  size?: number;
}
