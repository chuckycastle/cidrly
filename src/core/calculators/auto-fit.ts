/**
 * Auto-Fit Algorithm
 * Bin-packing optimization for subnet allocation into available IP blocks
 */

/**
 * Calculate 2^n using bit shifting for performance
 * Uses `>>> 0` to convert to unsigned 32-bit integer
 * Falls back to Math.pow for n >= 32 (edge case for /0 supernets)
 */
function pow2(n: number): number {
  return n < 32 ? (1 << n) >>> 0 : Math.pow(2, n);
}

import type { AvailableBlock } from '../../utils/block-parser.js';
import type { AssignedBlock, Subnet } from '../models/network-plan.js';
import { generateBlockId } from '../models/network-plan.js';
import type { SubnetInfo } from './subnet-calculator.js';

export interface SubnetAllocation {
  subnetIndex: number;
  subnetInfo: SubnetInfo;
  blockIndex: number;
  networkAddress: string;
}

export interface BlockUtilization {
  blockIndex: number;
  block: AvailableBlock;
  allocatedSubnets: SubnetAllocation[];
  usedCapacity: number;
  remainingCapacity: number;
  utilizationPercent: number;
}

export interface AutoFitResult {
  success: boolean;
  allocations: SubnetAllocation[];
  blockUtilizations: BlockUtilization[];
  unallocatedSubnets: number[];
  errors: string[];
  warnings: string[];
}

/**
 * Convert 32-bit integer to IP address string
 */
function intToIp(int: number): string {
  return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
}

/**
 * Find the next valid network address within a block that aligns with CIDR boundary
 */
function findNextAlignedAddress(
  blockStartInt: number,
  blockEndInt: number,
  currentInt: number,
  cidrPrefix: number,
): number | null {
  const subnetSize = pow2(32 - cidrPrefix);
  const mask = ~(subnetSize - 1);

  // Start from current position or block start
  let candidateInt = Math.max(currentInt, blockStartInt);

  // Align to network boundary
  if ((candidateInt & mask) !== candidateInt) {
    candidateInt = (candidateInt & mask) + subnetSize;
  }

  // Check if aligned address fits within block
  const endOfSubnet = candidateInt + subnetSize - 1;
  if (endOfSubnet <= blockEndInt) {
    return candidateInt;
  }

  return null;
}

/**
 * Try to allocate a subnet into a specific block
 */
function tryAllocateInBlock(
  subnetInfo: SubnetInfo,
  block: AvailableBlock,
  currentPosition: number,
): number | null {
  const subnetSize = pow2(32 - subnetInfo.cidrPrefix);

  // Find next aligned address in block
  const alignedAddress = findNextAlignedAddress(
    block.startInt,
    block.endInt,
    currentPosition,
    subnetInfo.cidrPrefix,
  );

  if (alignedAddress === null) {
    return null;
  }

  // Verify subnet fits
  const endOfSubnet = alignedAddress + subnetSize - 1;
  if (endOfSubnet <= block.endInt) {
    return alignedAddress;
  }

  return null;
}

/**
 * Auto-fit subnets into available IP blocks using best-fit bin-packing
 *
 * Algorithm:
 * 1. Sort subnets by VLAN ID (ascending), then by size (descending) - ensures logical order
 * 2. For each subnet, find smallest block that fits
 * 3. Allocate at next aligned address within block
 * 4. Track utilization per block
 *
 * @param subnets - Array of subnets to allocate
 * @param blocks - Array of available IP blocks
 * @returns Allocation result with assignments and utilization
 */
export function autoFitSubnets(subnets: Subnet[], blocks: AvailableBlock[]): AutoFitResult {
  const result: AutoFitResult = {
    success: true,
    allocations: [],
    blockUtilizations: [],
    unallocatedSubnets: [],
    errors: [],
    warnings: [],
  };

  // Initialize block utilization tracking
  const blockStates = blocks.map((block, index) => ({
    blockIndex: index,
    block,
    allocatedSubnets: [] as SubnetAllocation[],
    currentPosition: block.startInt,
    usedCapacity: 0,
    remainingCapacity: block.totalCapacity,
  }));

  // Sort subnets by size descending (largest first) for optimal VLSM bin-packing
  // VLAN ID ascending as tie-breaker for deterministic allocation order
  const sortedSubnets = subnets
    .map((subnet, index) => ({ subnet, index }))
    .sort((a, b) => {
      // Primary sort: size descending (larger subnets first)
      const aSize = a.subnet.subnetInfo?.subnetSize ?? 0;
      const bSize = b.subnet.subnetInfo?.subnetSize ?? 0;
      const sizeCompare = bSize - aSize;
      if (sizeCompare !== 0) return sizeCompare;

      // Secondary sort: VLAN ID ascending (tie-breaker for consistent results)
      return a.subnet.vlanId - b.subnet.vlanId;
    });

  // Try to allocate each subnet
  for (const { subnet, index: subnetIndex } of sortedSubnets) {
    const subnetInfo = subnet.subnetInfo;
    if (!subnetInfo) {
      result.unallocatedSubnets.push(subnetIndex);
      result.success = false;
      continue;
    }
    let allocated = false;

    // Find best-fit block (smallest block that fits the subnet)
    const candidateBlocks = blockStates
      .filter((state) => state.remainingCapacity >= subnetInfo.subnetSize)
      .sort((a, b) => a.remainingCapacity - b.remainingCapacity);

    for (const blockState of candidateBlocks) {
      const allocatedAddress = tryAllocateInBlock(
        subnetInfo,
        blockState.block,
        blockState.currentPosition,
      );

      if (allocatedAddress !== null) {
        const networkAddress = `${intToIp(allocatedAddress)}/${subnetInfo.cidrPrefix}`;

        const allocation: SubnetAllocation = {
          subnetIndex,
          subnetInfo: {
            ...subnetInfo,
            networkAddress,
          },
          blockIndex: blockState.blockIndex,
          networkAddress,
        };

        blockState.allocatedSubnets.push(allocation);
        blockState.currentPosition = allocatedAddress + subnetInfo.subnetSize;
        blockState.usedCapacity += subnetInfo.subnetSize;
        blockState.remainingCapacity -= subnetInfo.subnetSize;

        result.allocations.push(allocation);
        allocated = true;
        break;
      }
    }

    if (!allocated) {
      result.unallocatedSubnets.push(subnetIndex);
      result.success = false;
    }
  }

  // Calculate final block utilizations
  result.blockUtilizations = blockStates.map((state) => ({
    blockIndex: state.blockIndex,
    block: state.block,
    allocatedSubnets: state.allocatedSubnets,
    usedCapacity: state.usedCapacity,
    remainingCapacity: state.remainingCapacity,
    utilizationPercent:
      state.block.totalCapacity > 0 ? (state.usedCapacity / state.block.totalCapacity) * 100 : 0,
  }));

  // Generate errors and warnings
  if (result.unallocatedSubnets.length > 0) {
    result.errors.push(
      `Failed to allocate ${result.unallocatedSubnets.length} subnet(s). Insufficient capacity or fragmentation.`,
    );
  }

  // Warn about low utilization blocks
  for (const util of result.blockUtilizations) {
    if (util.allocatedSubnets.length > 0 && util.utilizationPercent < 50) {
      result.warnings.push(
        `Block ${util.block.networkAddress} has low utilization (${util.utilizationPercent.toFixed(1)}%). Consider manual optimization.`,
      );
    }
  }

  // Warn about unused blocks
  const unusedBlocks = result.blockUtilizations.filter(
    (util) => util.allocatedSubnets.length === 0,
  );
  if (unusedBlocks.length > 0) {
    result.warnings.push(
      `${unusedBlocks.length} block(s) remain unused. All subnets allocated to other blocks.`,
    );
  }

  return result;
}

/**
 * Convert AvailableBlock array to AssignedBlock array for IPAM-lite tracking
 * Each block gets a unique ID that can be referenced by subnets
 *
 * @param blocks - Array of AvailableBlock from block parser
 * @returns Array of AssignedBlock for storage in NetworkPlan
 */
export function convertToAssignedBlocks(blocks: AvailableBlock[]): AssignedBlock[] {
  return blocks.map((block) => ({
    id: generateBlockId(),
    networkAddress: block.networkAddress,
    cidrPrefix: block.cidrPrefix,
    totalCapacity: block.totalCapacity,
    startInt: block.startInt,
    endInt: block.endInt,
    assignedAt: new Date(),
  }));
}

/**
 * Create a mapping from block index to AssignedBlock ID
 * Used when applying auto-fit results to set sourceBlockId on subnets
 *
 * @param availableBlocks - Original AvailableBlock array used in auto-fit
 * @param assignedBlocks - Converted AssignedBlock array
 * @returns Map from blockIndex to assignedBlock.id
 */
export function createBlockIndexMap(
  availableBlocks: AvailableBlock[],
  assignedBlocks: AssignedBlock[],
): Map<number, string> {
  const map = new Map<number, string>();

  // Match by networkAddress since blocks are in same order
  for (let i = 0; i < availableBlocks.length && i < assignedBlocks.length; i++) {
    map.set(i, assignedBlocks[i]!.id);
  }

  return map;
}
