/**
 * Network Plan Service
 * Centralized business logic for network plan operations
 */

import {
  calculateAvailableSpace,
  findSourceBlock,
} from '../core/calculators/availability-calculator.js';
import { detectOverlaps, type OverlapResult } from '../core/calculators/overlap-detector.js';
import {
  calculateBroadcast,
  calculateHostMax,
  calculateHostMin,
  calculateSubnetSize,
  calculateUsableHosts,
} from '../core/calculators/subnet-calculator.js';
import type { AssignedBlock, NetworkPlan, Subnet } from '../core/models/network-plan.js';
import { calculateSubnetRanges, generateBlockId } from '../core/models/network-plan.js';
import { ErrorCode, ValidationError } from '../errors/network-plan-errors.js';

/**
 * Service class for managing network plan operations
 */
export class NetworkPlanService {
  /**
   * Calculate or recalculate the network plan
   * Returns a new plan with updated subnet information, supernet, and network addresses
   * Uses the plan's growthPercentage setting
   *
   * @param plan - Network plan to calculate
   * @returns New NetworkPlan with calculated values
   */
  calculatePlan(plan: NetworkPlan): NetworkPlan {
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
    const calculated = calculateSubnetRanges(plan);

    return {
      ...calculated,
      updatedAt: new Date(),
    };
  }

  /**
   * Add a subnet to the network plan and recalculate
   *
   * @param plan - Network plan to modify
   * @param subnet - Subnet to add
   * @returns New NetworkPlan with subnet added and recalculated
   */
  addSubnet(plan: NetworkPlan, subnet: Subnet): NetworkPlan {
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

    const withSubnet: NetworkPlan = {
      ...plan,
      subnets: [...plan.subnets, subnet],
    };

    // Automatically recalculate the plan
    return this.calculatePlan(withSubnet);
  }

  /**
   * Remove a subnet from the network plan and recalculate
   *
   * @param plan - Network plan to modify
   * @param index - Index of subnet to remove
   * @returns Object with new plan and removed subnet (null if not found)
   */
  removeSubnet(plan: NetworkPlan, index: number): { plan: NetworkPlan; removed: Subnet | null } {
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

    const removed = plan.subnets[index] ?? null;
    const withoutSubnet: NetworkPlan = {
      ...plan,
      subnets: plan.subnets.filter((_, i) => i !== index),
      updatedAt: new Date(),
    };

    // Recalculate plan if subnets remain, otherwise clear supernet
    if (withoutSubnet.subnets.length > 0) {
      return { plan: this.calculatePlan(withoutSubnet), removed };
    }

    return {
      plan: { ...withoutSubnet, supernet: undefined },
      removed,
    };
  }

  /**
   * Update the base IP address and recalculate network addresses
   *
   * @param plan - Network plan to modify
   * @param newBaseIp - New base IP address
   * @returns New NetworkPlan with updated base IP
   */
  updateBaseIp(plan: NetworkPlan, newBaseIp: string): NetworkPlan {
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

    const withNewBaseIp: NetworkPlan = {
      ...plan,
      baseIp: newBaseIp,
      updatedAt: new Date(),
    };

    // Recalculate plan if there are subnets
    if (withNewBaseIp.subnets.length > 0) {
      return this.calculatePlan(withNewBaseIp);
    }

    return withNewBaseIp;
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
   * @returns New NetworkPlan with updated subnet
   */
  updateSubnet(
    plan: NetworkPlan,
    index: number,
    name: string,
    vlanId: number,
    expectedDevices: number,
    description?: string,
  ): NetworkPlan {
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

    const withUpdatedSubnet: NetworkPlan = {
      ...plan,
      subnets: plan.subnets.map((s, i) =>
        i === index ? { ...s, name, vlanId, expectedDevices, description } : s,
      ),
    };

    // Automatically recalculate the plan
    return this.calculatePlan(withUpdatedSubnet);
  }

  /**
   * Update the growth percentage for the plan and recalculate
   *
   * @param plan - Network plan to modify
   * @param growthPercentage - New growth percentage (0-300%)
   * @returns New NetworkPlan with updated growth percentage
   */
  setGrowthPercentage(plan: NetworkPlan, growthPercentage: number): NetworkPlan {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot set growth percentage: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    const withGrowth: NetworkPlan = {
      ...plan,
      growthPercentage,
      updatedAt: new Date(),
    };

    // Recalculate plan if there are subnets
    if (withGrowth.subnets.length > 0) {
      return this.calculatePlan(withGrowth);
    }

    return withGrowth;
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
   * @returns New NetworkPlan with updated manual network address
   */
  setManualNetworkAddress(
    plan: NetworkPlan,
    index: number,
    networkAddress: string,
    lock: boolean,
  ): NetworkPlan {
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
    const updatedSubnets = plan.subnets.map((s, i) => {
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

    return {
      ...plan,
      subnets: updatedSubnets,
      updatedAt: new Date(),
    };
  }

  /**
   * Set network lock status for a subnet
   *
   * @param plan - Network plan to modify
   * @param index - Index of subnet to update
   * @param locked - Whether to lock the subnet
   * @returns New NetworkPlan with updated lock status
   */
  setNetworkLocked(plan: NetworkPlan, index: number, locked: boolean): NetworkPlan {
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

    return {
      ...plan,
      subnets: plan.subnets.map((s, i) => (i === index ? { ...s, networkLocked: locked } : s)),
      updatedAt: new Date(),
    };
  }

  // ============================================
  // IPAM-lite: Assigned Blocks & Space Tracking
  // ============================================

  /**
   * Set the assigned blocks for the plan
   *
   * @param plan - Network plan to modify
   * @param blocks - Array of assigned blocks
   * @returns New NetworkPlan with assigned blocks and updated space report
   */
  setAssignedBlocks(plan: NetworkPlan, blocks: AssignedBlock[]): NetworkPlan {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot set assigned blocks: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    const withBlocks: NetworkPlan = {
      ...plan,
      assignedBlocks: blocks,
      updatedAt: new Date(),
    };

    // Regenerate space report
    return this.updateSpaceReport(withBlocks);
  }

  /**
   * Add a single assigned block to the plan
   *
   * @param plan - Network plan to modify
   * @param block - Block to add (without id, will be generated)
   * @returns Object with new plan and the created block
   */
  addAssignedBlock(
    plan: NetworkPlan,
    block: Omit<AssignedBlock, 'id' | 'assignedAt'>,
  ): { plan: NetworkPlan; block: AssignedBlock } {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot add assigned block: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    const newBlock: AssignedBlock = {
      ...block,
      id: generateBlockId(),
      assignedAt: new Date(),
    };

    const withBlock: NetworkPlan = {
      ...plan,
      assignedBlocks: [...(plan.assignedBlocks ?? []), newBlock],
      updatedAt: new Date(),
    };

    // Regenerate space report
    return {
      plan: this.updateSpaceReport(withBlock),
      block: newBlock,
    };
  }

  /**
   * Remove an assigned block by ID
   *
   * @param plan - Network plan to modify
   * @param blockId - ID of the block to remove
   * @returns Object with new plan and whether block was removed
   */
  removeAssignedBlock(plan: NetworkPlan, blockId: string): { plan: NetworkPlan; removed: boolean } {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot remove assigned block: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    if (!plan.assignedBlocks) {
      return { plan, removed: false };
    }

    const filteredBlocks = plan.assignedBlocks.filter((b) => b.id !== blockId);

    if (filteredBlocks.length < plan.assignedBlocks.length) {
      // Clear sourceBlockId from any subnets that referenced this block
      const withRemovedBlock: NetworkPlan = {
        ...plan,
        assignedBlocks: filteredBlocks,
        subnets: plan.subnets.map((s) =>
          s.sourceBlockId === blockId ? { ...s, sourceBlockId: undefined } : s,
        ),
        updatedAt: new Date(),
      };

      // Regenerate space report
      return {
        plan: this.updateSpaceReport(withRemovedBlock),
        removed: true,
      };
    }

    return { plan, removed: false };
  }

  /**
   * Set sourceBlockId for a subnet at index
   *
   * @param plan - Network plan to modify
   * @param index - Index of subnet
   * @param sourceBlockId - ID of the source assigned block
   * @returns New NetworkPlan with updated source block
   */
  setSourceBlockId(
    plan: NetworkPlan,
    index: number,
    sourceBlockId: string | undefined,
  ): NetworkPlan {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      throw new ValidationError(
        'Cannot set source block: Plan is null or undefined',
        ErrorCode.NO_PLAN_LOADED,
      );
    }

    if (index < 0 || index >= plan.subnets.length) {
      throw new ValidationError(
        `Cannot set source block: Index ${index} is out of bounds`,
        ErrorCode.NO_SUBNETS_DEFINED,
      );
    }

    return {
      ...plan,
      subnets: plan.subnets.map((s, i) => (i === index ? { ...s, sourceBlockId } : s)),
      updatedAt: new Date(),
    };
  }

  /**
   * Update the space allocation report
   * Called automatically when assigned blocks or subnets change
   *
   * @param plan - Network plan to update
   * @returns New NetworkPlan with updated space report
   */
  updateSpaceReport(plan: NetworkPlan): NetworkPlan {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan) {
      return plan;
    }

    if (!plan.assignedBlocks || plan.assignedBlocks.length === 0) {
      return {
        ...plan,
        spaceReport: undefined,
      };
    }

    return {
      ...plan,
      spaceReport: calculateAvailableSpace(plan.assignedBlocks, plan.subnets),
    };
  }

  /**
   * Auto-detect and set sourceBlockId for a subnet based on its network address
   * Used when manually setting network addresses
   *
   * @param plan - Network plan
   * @param index - Index of subnet
   * @returns Object with new plan and detected sourceBlockId (undefined if no match)
   */
  autoDetectSourceBlock(
    plan: NetworkPlan,
    index: number,
  ): { plan: NetworkPlan; sourceBlockId: string | undefined } {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
    if (!plan || index < 0 || index >= plan.subnets.length) {
      return { plan, sourceBlockId: undefined };
    }

    const subnet = plan.subnets[index];
    if (!subnet) return { plan, sourceBlockId: undefined };

    const networkAddress = subnet.subnetInfo?.networkAddress ?? subnet.manualNetworkAddress;
    if (!networkAddress) return { plan, sourceBlockId: undefined };

    const sourceBlockId = findSourceBlock(networkAddress, plan.assignedBlocks);
    if (sourceBlockId) {
      return {
        plan: this.setSourceBlockId(plan, index, sourceBlockId),
        sourceBlockId,
      };
    }

    return { plan, sourceBlockId: undefined };
  }
}
