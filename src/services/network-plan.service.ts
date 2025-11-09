/**
 * Network Plan Service
 * Centralized business logic for network plan operations
 */

import { detectOverlaps, type OverlapResult } from '../core/calculators/overlap-detector.js';
import {
  calculateBroadcast,
  calculateHostMax,
  calculateHostMin,
  calculateSubnetSize,
  calculateUsableHosts,
} from '../core/calculators/subnet-calculator.js';
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
   * Uses the plan's growthPercentage setting
   *
   * @param plan - Network plan to calculate
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

    // Use VLSM optimization for subnet allocation with plan's growth percentage
    const updatedPlan = calculateSubnetRanges(plan);

    // Copy results back to the plan (mutate in place)
    plan.subnets = updatedPlan.subnets;
    plan.supernet = updatedPlan.supernet;
    plan.updatedAt = updatedPlan.updatedAt;
  }

  /**
   * Add a subnet to the network plan and recalculate
   *
   * @param plan - Network plan to modify
   * @param subnet - Subnet to add
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
   *
   * @param plan - Network plan to modify
   * @param index - Index of subnet to remove
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
   *
   * @param plan - Network plan to modify
   * @param newBaseIp - New base IP address
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
   *
   * @param plan - Network plan to modify
   * @param index - Index of subnet to update
   * @param name - New subnet name
   * @param vlanId - New VLAN ID
   * @param expectedDevices - New expected device count
   * @param description - Optional subnet description
   */
  updateSubnet(
    plan: NetworkPlan,
    index: number,
    name: string,
    vlanId: number,
    expectedDevices: number,
    description?: string,
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
      i === index ? { ...s, name, vlanId, expectedDevices, description } : s,
    );
    plan.updatedAt = new Date();

    // Automatically recalculate the plan
    this.calculatePlan(plan);
  }

  /**
   * Update the growth percentage for the plan and recalculate
   *
   * @param plan - Network plan to modify
   * @param growthPercentage - New growth percentage (0-300%)
   */
  setGrowthPercentage(plan: NetworkPlan, growthPercentage: number): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot set growth percentage: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    plan.growthPercentage = growthPercentage;
    plan.updatedAt = new Date();

    // Recalculate plan if there are subnets
    if (plan.subnets.length > 0) {
      this.calculatePlan(plan);
    }
  }

  /**
   * Check for subnet overlaps in the network plan
   *
   * @param plan - Network plan to validate
   * @returns Overlap detection result with conflict details
   *
   * @remarks
   * This method detects IP address range overlaps between subnets.
   * VLSM allocation should prevent overlaps, but this validates the plan's integrity.
   *
   * @example
   * ```typescript
   * const result = service.checkOverlaps(plan);
   * if (result.hasOverlap) {
   *   console.log(`Found ${result.conflicts.length} overlaps`);
   *   result.conflicts.forEach(conflict => {
   *     console.log(`${conflict.subnet1} overlaps with ${conflict.subnet2}`);
   *   });
   * }
   * ```
   */
  checkOverlaps(plan: NetworkPlan): OverlapResult {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot check overlaps: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    // Filter subnets with network addresses assigned
    const subnetsWithAddresses = plan.subnets
      .filter((subnet) => subnet.subnetInfo?.networkAddress !== undefined)
      .map((subnet) => ({
        networkAddress: subnet.subnetInfo!.networkAddress!,
        name: subnet.name,
      }));

    return detectOverlaps(subnetsWithAddresses);
  }

  /**
   * Set manual network address for a subnet and lock it
   *
   * @param plan - Network plan to modify
   * @param index - Index of subnet to update
   * @param networkAddress - Manual network address in CIDR format
   * @param lock - Whether to lock the subnet to prevent recalculation
   */
  setManualNetworkAddress(
    plan: NetworkPlan,
    index: number,
    networkAddress: string,
    lock: boolean,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot set manual network address: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    if (index < 0 || index >= plan.subnets.length) {
      throw new ValidationError(
        `Cannot set manual network address: Index ${index} is out of bounds (0-${plan.subnets.length - 1})`,
        ErrorCode.NO_SUBNETS_DEFINED,
      );
    }

    const subnet = plan.subnets[index];
    if (!subnet) {
      throw new ValidationError(`Subnet at index ${index} not found`, ErrorCode.NO_SUBNETS_DEFINED);
    }

    // Parse network address to update subnetInfo
    const parts = networkAddress.split('/');
    const ipAddress = parts[0];
    const cidrPrefix = parseInt(parts[1] ?? '24', 10);

    if (!ipAddress || isNaN(cidrPrefix)) {
      throw new ValidationError(
        'Invalid network address format. Expected: x.x.x.x/prefix',
        ErrorCode.INVALID_IP_ADDRESS,
      );
    }

    // Calculate subnet information
    const subnetSize = calculateSubnetSize(cidrPrefix);
    const usableHosts = calculateUsableHosts(subnetSize);
    const broadcastAddress = calculateBroadcast(networkAddress);
    const hostMin = calculateHostMin(networkAddress);
    const hostMax = calculateHostMax(networkAddress);

    // Update subnet with manual network address
    plan.subnets = plan.subnets.map((s, i) => {
      if (i !== index) return s;

      // Calculate or use existing subnet info fields
      const existingInfo = s.subnetInfo ?? {
        expectedDevices: s.expectedDevices,
        plannedDevices: s.expectedDevices,
        requiredHosts: s.expectedDevices + 2,
        subnetSize,
      };

      return {
        ...s,
        manualNetworkAddress: networkAddress,
        networkLocked: lock,
        subnetInfo: {
          expectedDevices: existingInfo.expectedDevices,
          plannedDevices: existingInfo.plannedDevices,
          requiredHosts: existingInfo.requiredHosts,
          subnetSize: existingInfo.subnetSize,
          cidrPrefix,
          usableHosts,
          networkAddress,
          broadcastAddress,
          usableHostRange: { first: hostMin, last: hostMax },
          totalHosts: subnetSize,
        },
      };
    });
    plan.updatedAt = new Date();
  }

  /**
   * Set network lock status for a subnet
   *
   * @param plan - Network plan to modify
   * @param index - Index of subnet to update
   * @param locked - Whether to lock the subnet
   */
  setNetworkLocked(plan: NetworkPlan, index: number, locked: boolean): void {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot set network lock: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    if (index < 0 || index >= plan.subnets.length) {
      throw new ValidationError(
        `Cannot set network lock: Index ${index} is out of bounds (0-${plan.subnets.length - 1})`,
        ErrorCode.NO_SUBNETS_DEFINED,
      );
    }

    const subnet = plan.subnets[index];
    if (!subnet) {
      throw new ValidationError(`Subnet at index ${index} not found`, ErrorCode.NO_SUBNETS_DEFINED);
    }

    plan.subnets = plan.subnets.map((s, i) => (i === index ? { ...s, networkLocked: locked } : s));
    plan.updatedAt = new Date();
  }
}
