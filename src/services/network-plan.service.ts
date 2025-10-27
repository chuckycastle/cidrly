/**
 * Network Plan Service
 * Centralized business logic for network plan operations
 */

import type { NetworkPlan, Subnet } from '../core/models/network-plan.js';
import { calculateSubnetRanges } from '../core/models/network-plan.js';
import { ErrorCode, ValidationError } from '../errors/network-plan-errors.js';

/**
 * Service class for managing network plan operations
 */
export class NetworkPlanService {
  /**
   * Calculate or recalculate the network plan
   * Updates subnet information, supernet, and network addresses
   */
  calculatePlan(plan: NetworkPlan): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot calculate plan: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    if (plan.subnets.length === 0) {
      throw new ValidationError(
        'Cannot calculate plan: No subnets defined',
        ErrorCode.NO_SUBNETS_DEFINED,
      );
    }

    // Use VLSM optimization for subnet allocation
    const updatedPlan = calculateSubnetRanges(plan);

    // Copy results back to the plan (mutate in place)
    plan.subnets = updatedPlan.subnets;
    plan.supernet = updatedPlan.supernet;
    plan.updatedAt = updatedPlan.updatedAt;
  }

  /**
   * Add a subnet to the network plan and recalculate
   */
  addSubnet(plan: NetworkPlan, subnet: Subnet): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot add subnet: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!subnet) {
      throw new ValidationError(
        'Cannot add subnet: Subnet is null or undefined',
        ErrorCode.INVALID_SUBNET_NAME,
      );
    }

    plan.subnets.push(subnet);
    plan.updatedAt = new Date();

    // Automatically recalculate the plan
    this.calculatePlan(plan);
  }

  /**
   * Remove a subnet from the network plan and recalculate
   * Returns the removed subnet
   */
  removeSubnet(plan: NetworkPlan, index: number): Subnet {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot remove subnet: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    if (index < 0 || index >= plan.subnets.length) {
      throw new ValidationError(
        `Cannot remove subnet: Index ${index} is out of bounds (0-${plan.subnets.length - 1})`,
        ErrorCode.NO_SUBNETS_DEFINED,
      );
    }

    const removedSubnet = plan.subnets[index];
    if (!removedSubnet) {
      throw new ValidationError(
        `Failed to remove subnet at index ${index}`,
        ErrorCode.NO_SUBNETS_DEFINED,
      );
    }
    plan.subnets = plan.subnets.filter((_, i) => i !== index);
    plan.updatedAt = new Date();

    // Recalculate plan if subnets remain, otherwise clear supernet
    if (plan.subnets.length > 0) {
      this.calculatePlan(plan);
    } else {
      plan.supernet = undefined;
    }

    return removedSubnet;
  }

  /**
   * Update the base IP address and recalculate network addresses
   */
  updateBaseIp(plan: NetworkPlan, newBaseIp: string): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot update base IP: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    if (!newBaseIp || newBaseIp.trim().length === 0) {
      throw new ValidationError(
        'Cannot update base IP: New IP address is empty',
        ErrorCode.INVALID_IP_ADDRESS,
      );
    }

    plan.baseIp = newBaseIp;
    plan.updatedAt = new Date();

    // Recalculate plan if there are subnets
    if (plan.subnets.length > 0) {
      this.calculatePlan(plan);
    }
  }

  /**
   * Update an existing subnet and recalculate
   */
  updateSubnet(
    plan: NetworkPlan,
    index: number,
    name: string,
    vlanId: number,
    expectedDevices: number,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot update subnet: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    if (index < 0 || index >= plan.subnets.length) {
      throw new ValidationError(
        `Cannot update subnet: Index ${index} is out of bounds (0-${plan.subnets.length - 1})`,
        ErrorCode.NO_SUBNETS_DEFINED,
      );
    }

    const subnet = plan.subnets[index];
    if (!subnet) {
      throw new ValidationError(`Subnet at index ${index} not found`, ErrorCode.NO_SUBNETS_DEFINED);
    }
    plan.subnets = plan.subnets.map((s, i) =>
      i === index ? { ...s, name, vlanId, expectedDevices } : s,
    );
    plan.updatedAt = new Date();

    // Automatically recalculate the plan
    this.calculatePlan(plan);
  }
}
