/**
 * Availability Calculator
 * Calculates unallocated IP space from assigned blocks
 */

import type {
  AssignedBlock,
  AvailableFragment,
  BlockAllocationSummary,
  SpaceAllocationReport,
  Subnet,
} from '../models/network-plan.js';

/**
 * IP range representation for internal calculations
 */
interface IpRange {
  startInt: number;
  endInt: number;
}

/**
 * Convert IP address string to 32-bit unsigned integer
 */
function ipToInt(ip: string): number {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
    throw new Error(`Invalid IP address format: ${ip}`);
  }
  const [oct1, oct2, oct3, oct4] = octets;
  return ((oct1! << 24) | (oct2! << 16) | (oct3! << 8) | oct4!) >>> 0;
}

/**
 * Convert 32-bit integer to IP address string
 */
function intToIp(int: number): string {
  return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
}

/**
 * Parse CIDR notation to IP range
 */
function cidrToRange(cidr: string): IpRange {
  const [ip, prefixStr] = cidr.split('/');
  if (!ip || !prefixStr) {
    throw new Error(`Invalid CIDR notation: ${cidr}`);
  }
  const prefix = parseInt(prefixStr, 10);
  const startInt = ipToInt(ip);
  const size = Math.pow(2, 32 - prefix);
  return {
    startInt,
    endInt: startInt + size - 1,
  };
}

/**
 * Find the largest valid CIDR prefix for a start address and remaining capacity
 * Returns the prefix that creates the largest block aligned at startInt
 */
function findLargestValidPrefix(startInt: number, remainingCapacity: number): number {
  // Try progressively smaller block sizes (larger prefix numbers)
  for (let hostBits = 24; hostBits >= 0; hostBits--) {
    const blockSize = Math.pow(2, hostBits);
    const prefix = 32 - hostBits;

    // Check if block fits in remaining capacity
    if (blockSize > remainingCapacity) continue;

    // Check CIDR boundary alignment: startInt must be divisible by blockSize
    if (startInt % blockSize === 0) {
      return prefix;
    }
  }

  // Fallback to /32 (single IP)
  return 32;
}

/**
 * Convert a free IP range to optimal CIDR blocks
 * Uses largest-block-first strategy for efficient representation
 */
export function rangeToOptimalCIDRBlocks(
  parentBlockId: string,
  startInt: number,
  endInt: number,
): AvailableFragment[] {
  const fragments: AvailableFragment[] = [];
  let currentStart = startInt;

  while (currentStart <= endInt) {
    const remainingCapacity = endInt - currentStart + 1;
    const prefix = findLargestValidPrefix(currentStart, remainingCapacity);
    const blockSize = Math.pow(2, 32 - prefix);

    fragments.push({
      parentBlockId,
      networkAddress: `${intToIp(currentStart)}/${prefix}`,
      capacity: blockSize,
      startInt: currentStart,
      endInt: currentStart + blockSize - 1,
    });

    currentStart += blockSize;
  }

  return fragments;
}

/**
 * Get subnet range from a Subnet object
 */
function getSubnetRange(subnet: Subnet): IpRange | null {
  const networkAddress = subnet.subnetInfo?.networkAddress ?? subnet.manualNetworkAddress;
  if (!networkAddress) return null;

  try {
    return cidrToRange(networkAddress);
  } catch {
    return null;
  }
}

/**
 * Filter subnets allocated from a specific block
 */
function filterSubnetsForBlock(
  block: AssignedBlock,
  subnets: Subnet[],
): Array<{ subnet: Subnet; range: IpRange }> {
  const result: Array<{ subnet: Subnet; range: IpRange }> = [];

  for (const subnet of subnets) {
    // If subnet has sourceBlockId, use that for matching
    if (subnet.sourceBlockId === block.id) {
      const range = getSubnetRange(subnet);
      if (range) {
        result.push({ subnet, range });
      }
      continue;
    }

    // Otherwise, check if subnet falls within block range
    const range = getSubnetRange(subnet);
    if (!range) continue;

    // Check if subnet is within block boundaries
    if (range.startInt >= block.startInt && range.endInt <= block.endInt) {
      result.push({ subnet, range });
    }
  }

  return result;
}

/**
 * Merge overlapping or adjacent ranges
 */
function mergeRanges(ranges: IpRange[]): IpRange[] {
  if (ranges.length === 0) return [];

  // Sort by start address
  const sorted = [...ranges].sort((a, b) => a.startInt - b.startInt);

  const merged: IpRange[] = [{ ...sorted[0]! }];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i]!;
    const last = merged[merged.length - 1]!;

    // Check for overlap or adjacency
    if (current.startInt <= last.endInt + 1) {
      // Merge by extending the end
      last.endInt = Math.max(last.endInt, current.endInt);
    } else {
      // No overlap - add as new range
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Find free ranges (gaps) within a block given allocated ranges
 */
export function findFreeRanges(block: AssignedBlock, allocatedRanges: IpRange[]): IpRange[] {
  const freeRanges: IpRange[] = [];

  // Merge overlapping allocations first
  const merged = mergeRanges(allocatedRanges);

  let currentPosition = block.startInt;

  for (const allocation of merged) {
    // Gap before this allocation?
    if (allocation.startInt > currentPosition) {
      freeRanges.push({
        startInt: currentPosition,
        endInt: allocation.startInt - 1,
      });
    }

    // Move past this allocation
    currentPosition = Math.max(currentPosition, allocation.endInt + 1);
  }

  // Gap after last allocation?
  if (currentPosition <= block.endInt) {
    freeRanges.push({
      startInt: currentPosition,
      endInt: block.endInt,
    });
  }

  return freeRanges;
}

/**
 * Calculate allocation summary for a single block
 */
function calculateBlockSummary(block: AssignedBlock, subnets: Subnet[]): BlockAllocationSummary {
  const blockSubnets = filterSubnetsForBlock(block, subnets);
  const allocatedRanges = blockSubnets.map((s) => s.range);

  // Find free ranges
  const freeRanges = findFreeRanges(block, allocatedRanges);

  // Convert free ranges to optimal CIDR fragments
  const fragments = freeRanges.flatMap((range) =>
    rangeToOptimalCIDRBlocks(block.id, range.startInt, range.endInt),
  );

  // Calculate capacities
  const usedCapacity = allocatedRanges.reduce(
    (sum, range) => sum + (range.endInt - range.startInt + 1),
    0,
  );
  const availableCapacity = fragments.reduce((sum, f) => sum + f.capacity, 0);

  return {
    blockId: block.id,
    block,
    allocatedSubnetIds: blockSubnets.map((s) => s.subnet.id),
    usedCapacity,
    availableCapacity,
    utilizationPercent: block.totalCapacity > 0 ? (usedCapacity / block.totalCapacity) * 100 : 0,
    fragments,
  };
}

/**
 * Calculate available IP space across all assigned blocks
 *
 * @param assignedBlocks - Array of assigned CIDR blocks
 * @param subnets - Array of allocated subnets
 * @returns Complete space allocation report
 *
 * @example
 * ```typescript
 * const report = calculateAvailableSpace(plan.assignedBlocks, plan.subnets);
 * console.log(`Available: ${report.totalAvailableCapacity} IPs`);
 * for (const summary of report.blockSummaries) {
 *   console.log(`${summary.block.networkAddress}: ${summary.fragments.length} free ranges`);
 * }
 * ```
 */
export function calculateAvailableSpace(
  assignedBlocks: AssignedBlock[] | undefined,
  subnets: Subnet[],
): SpaceAllocationReport {
  const blocks = assignedBlocks ?? [];

  // Calculate summary for each block
  const blockSummaries = blocks.map((block) => calculateBlockSummary(block, subnets));

  // Aggregate totals
  const totalAssignedCapacity = blocks.reduce((sum, b) => sum + b.totalCapacity, 0);
  const totalUsedCapacity = blockSummaries.reduce((sum, s) => sum + s.usedCapacity, 0);
  const totalAvailableCapacity = blockSummaries.reduce((sum, s) => sum + s.availableCapacity, 0);

  return {
    generatedAt: new Date(),
    totalAssignedCapacity,
    totalUsedCapacity,
    totalAvailableCapacity,
    overallUtilizationPercent:
      totalAssignedCapacity > 0 ? (totalUsedCapacity / totalAssignedCapacity) * 100 : 0,
    blockSummaries,
  };
}

/**
 * Check if an IP address falls within an assigned block
 * Used for auto-detecting source block for manual addresses
 *
 * @param networkAddress - CIDR notation address to check
 * @param assignedBlocks - Array of assigned blocks
 * @returns The matching block ID, or undefined if no match
 */
export function findSourceBlock(
  networkAddress: string,
  assignedBlocks: AssignedBlock[] | undefined,
): string | undefined {
  if (!assignedBlocks || assignedBlocks.length === 0) return undefined;

  try {
    const range = cidrToRange(networkAddress);

    for (const block of assignedBlocks) {
      // Check if the subnet fits entirely within this block
      if (range.startInt >= block.startInt && range.endInt <= block.endInt) {
        return block.id;
      }
    }
  } catch {
    // Invalid address format
    return undefined;
  }

  return undefined;
}

/**
 * Result of attempting to allocate a subnet to available space
 */
export interface AllocationAttempt {
  success: boolean;
  networkAddress?: string;
  sourceBlockId?: string;
  error?: string;
}

/**
 * Find the first aligned address within a fragment that can fit a subnet
 *
 * @param fragment - Available fragment to search
 * @param subnetSize - Size of subnet to allocate
 * @param cidrPrefix - CIDR prefix of subnet (for alignment)
 * @returns Aligned start address or null if not found
 */
function findAlignedAddressInFragment(
  fragment: AvailableFragment,
  subnetSize: number,
  _cidrPrefix: number,
): number | null {
  // Find first aligned address >= fragment.startInt
  const alignment = subnetSize;
  const alignedStart =
    fragment.startInt % alignment === 0
      ? fragment.startInt
      : fragment.startInt + (alignment - (fragment.startInt % alignment));

  // Check if aligned subnet fits within fragment
  const subnetEnd = alignedStart + subnetSize - 1;
  if (alignedStart >= fragment.startInt && subnetEnd <= fragment.endInt) {
    return alignedStart;
  }

  return null;
}

/**
 * Try to allocate a subnet into available IP space
 *
 * Searches available fragments for a suitable location using best-fit strategy
 * (smallest fragment that can accommodate the subnet).
 *
 * @param subnet - Subnet to allocate (must have subnetInfo with size and prefix)
 * @param spaceReport - Current space allocation report with available fragments
 * @returns Allocation result with network address and source block, or error
 *
 * @example
 * ```typescript
 * const result = tryAllocateSubnetToAvailableSpace(newSubnet, spaceReport);
 * if (result.success) {
 *   subnet.subnetInfo.networkAddress = result.networkAddress;
 *   subnet.sourceBlockId = result.sourceBlockId;
 * } else {
 *   console.warn(result.error);
 * }
 * ```
 */
export function tryAllocateSubnetToAvailableSpace(
  subnet: Subnet,
  spaceReport: SpaceAllocationReport,
): AllocationAttempt {
  const subnetInfo = subnet.subnetInfo;

  if (!subnetInfo) {
    return {
      success: false,
      error: `Subnet "${subnet.name}" has no calculated size`,
    };
  }

  const subnetSize = subnetInfo.subnetSize;
  const cidrPrefix = subnetInfo.cidrPrefix;

  // Collect all fragments across all blocks
  const allFragments: Array<{ fragment: AvailableFragment; blockId: string }> = [];
  for (const summary of spaceReport.blockSummaries) {
    for (const fragment of summary.fragments) {
      allFragments.push({ fragment, blockId: summary.blockId });
    }
  }

  // Sort by capacity (best-fit: smallest that can fit)
  // Secondary sort by start address ensures deterministic selection when capacities are equal
  const candidateFragments = allFragments
    .filter(({ fragment }) => fragment.capacity >= subnetSize)
    .sort((a, b) => {
      const capacityDiff = a.fragment.capacity - b.fragment.capacity;
      if (capacityDiff !== 0) return capacityDiff;
      return a.fragment.startInt - b.fragment.startInt;
    });

  // Try each candidate fragment
  for (const { fragment, blockId } of candidateFragments) {
    const alignedAddress = findAlignedAddressInFragment(fragment, subnetSize, cidrPrefix);

    if (alignedAddress !== null) {
      const networkAddress = `${intToIp(alignedAddress)}/${cidrPrefix}`;
      return {
        success: true,
        networkAddress,
        sourceBlockId: blockId,
      };
    }
  }

  // No suitable fragment found
  return {
    success: false,
    error: `No available space for ${subnetSize} addresses (/${cidrPrefix})`,
  };
}
