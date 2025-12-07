/**
 * Network Plan Data Models
 * Defines the structure for network plans and subnets
 */

import {
  SUBNET_NAME_RULES,
  isValidDeviceCountRange,
  isValidNameLength,
  isValidVlanRange,
} from '../../infrastructure/config/validation-rules.js';
import {
  calculateAvailableSpace,
  tryAllocateSubnetToAvailableSpace,
} from '../calculators/availability-calculator.js';
import type { OccupiedRange, SubnetInfo } from '../calculators/subnet-calculator.js';
import {
  allocateSubnetAddresses,
  calculateSubnet,
  calculateSupernet,
  generateNetworkAddress,
  ipToInt,
} from '../calculators/subnet-calculator.js';

// Re-export SubnetInfo for convenience
export type { SubnetInfo };

export interface Supernet {
  cidrPrefix: number;
  totalSize: number;
  usedSize: number;
  utilization: number;
  rangeEfficiency: number;
  networkAddress: string;
}

/**
 * Represents an IP block assigned to this network plan
 * These are the blocks from which subnets can be allocated
 */
export interface AssignedBlock {
  /** Unique identifier for this block */
  id: string;
  /** Network address in CIDR notation (e.g., "10.1.241.0/24") */
  networkAddress: string;
  /** CIDR prefix (8-30) */
  cidrPrefix: number;
  /** Total IP addresses in this block */
  totalCapacity: number;
  /** Starting IP as 32-bit integer (for range calculations) */
  startInt: number;
  /** Ending IP as 32-bit integer (inclusive) */
  endInt: number;
  /** Optional descriptive label (e.g., "Data Center A") */
  label?: string;
  /** When this block was assigned to the plan */
  assignedAt: Date;
}

/**
 * Represents a contiguous unallocated CIDR block within an AssignedBlock
 */
export interface AvailableFragment {
  /** Reference to the parent AssignedBlock id */
  parentBlockId: string;
  /** Network address in optimal CIDR notation (e.g., "10.1.241.32/27") */
  networkAddress: string;
  /** Number of IP addresses in this fragment */
  capacity: number;
  /** Starting IP as 32-bit integer */
  startInt: number;
  /** Ending IP as 32-bit integer */
  endInt: number;
}

/**
 * Summary of allocation status for an AssignedBlock
 */
export interface BlockAllocationSummary {
  /** Reference to AssignedBlock id */
  blockId: string;
  /** The assigned block */
  block: AssignedBlock;
  /** IDs of subnets allocated from this block */
  allocatedSubnetIds: string[];
  /** Total IP addresses used by allocations */
  usedCapacity: number;
  /** Total IP addresses available */
  availableCapacity: number;
  /** Utilization as percentage (usedCapacity / totalCapacity * 100) */
  utilizationPercent: number;
  /** Available fragments (unallocated contiguous regions) */
  fragments: AvailableFragment[];
}

/**
 * Complete report of space allocation across all assigned blocks
 */
export interface SpaceAllocationReport {
  /** Report generation timestamp */
  generatedAt: Date;
  /** Total capacity across all assigned blocks */
  totalAssignedCapacity: number;
  /** Total used capacity across all blocks */
  totalUsedCapacity: number;
  /** Total available capacity across all blocks */
  totalAvailableCapacity: number;
  /** Overall utilization percentage */
  overallUtilizationPercent: number;
  /** Per-block allocation summaries */
  blockSummaries: BlockAllocationSummary[];
}

export interface Subnet {
  id: string;
  name: string;
  vlanId: number;
  expectedDevices: number;
  description?: string;
  subnetInfo?: SubnetInfo;
  networkLocked: boolean;
  manualNetworkAddress?: string;
  /** Reference to the AssignedBlock this subnet was allocated from (IPAM-lite) */
  sourceBlockId?: string;
}

export interface NetworkPlan {
  name: string;
  baseIp: string;
  subnets: Subnet[];
  growthPercentage: number;
  supernet?: Supernet;
  createdAt: Date;
  updatedAt: Date;
  /** IP blocks assigned to this plan by the network team (IPAM-lite) */
  assignedBlocks?: AssignedBlock[];
  /** Available space report (regenerated on plan changes, IPAM-lite) */
  spaceReport?: SpaceAllocationReport;
}

/**
 * Generate a unique ID for a subnet
 */
export function generateSubnetId(): string {
  return `subnet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a unique ID for an assigned block
 */
export function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new subnet
 */
export function createSubnet(
  name: string,
  vlanId: number,
  expectedDevices: number,
  description?: string,
): Subnet {
  return {
    id: generateSubnetId(),
    name,
    vlanId,
    expectedDevices,
    ...(description && { description }),
    networkLocked: false,
  };
}

/**
 * Create a new network plan
 */
export function createNetworkPlan(name: string, baseIp = '10.0.0.0'): NetworkPlan {
  return {
    name,
    baseIp,
    subnets: [],
    growthPercentage: 100, // Default to 100% growth for new plans
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Validate VLAN ID (1-4094)
 */
export function isValidVlanId(vlanId: number): boolean {
  return isValidVlanRange(vlanId);
}

/**
 * Validate device count
 */
export function isValidDeviceCount(count: number): boolean {
  return isValidDeviceCountRange(count);
}

/**
 * Validate subnet name
 */
export function isValidSubnetName(name: string): boolean {
  return isValidNameLength(name, SUBNET_NAME_RULES);
}

/**
 * Add a subnet to a network plan
 * Returns a new plan with the subnet added
 */
export function addSubnet(
  plan: NetworkPlan,
  subnetData: { name: string; vlan: number; expectedDevices: number; description?: string },
): NetworkPlan {
  const newSubnet = createSubnet(
    subnetData.name,
    subnetData.vlan,
    subnetData.expectedDevices,
    subnetData.description,
  );
  return {
    ...plan,
    subnets: [...plan.subnets, newSubnet],
    updatedAt: new Date(),
  };
}

/**
 * Remove a subnet from a network plan by ID
 * Returns a new plan with the subnet removed
 */
export function removeSubnet(plan: NetworkPlan, subnetId: string): NetworkPlan {
  return {
    ...plan,
    subnets: plan.subnets.filter((s) => s.id !== subnetId),
    updatedAt: new Date(),
  };
}

/**
 * Calculate subnet ranges for a network plan with VLSM optimization
 * Uses "Largest First" allocation strategy to maximize network efficiency
 * Subnets are returned sorted by size (largest first) for optimal display
 * Returns a new plan with calculated subnet information
 *
 * Respects locked subnets: Subnets with networkLocked=true keep their manual addresses
 *
 * @param plan - Network plan to calculate subnet ranges for
 */
export function calculateSubnetRanges(plan: NetworkPlan): NetworkPlan {
  if (plan.subnets.length === 0) {
    return plan;
  }

  // Step 1: Separate locked and unlocked subnets
  const lockedSubnets = plan.subnets.filter((subnet) => subnet.networkLocked);
  const unlockedSubnets = plan.subnets.filter((subnet) => !subnet.networkLocked);

  // Step 2: Calculate subnet information for unlocked subnets using plan's growth percentage
  const unlockedWithInfo = unlockedSubnets.map((subnet) => ({
    ...subnet,
    subnetInfo: calculateSubnet(subnet.expectedDevices, plan.growthPercentage),
  }));

  // Step 3: Sort unlocked subnets by size DESCENDING for optimal allocation
  // Larger subnets first minimizes wasted space due to boundary alignment
  const sortedUnlocked = [...unlockedWithInfo].sort((a, b) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive check for optional chaining
    const sizeA = a.subnetInfo?.subnetSize || 0;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive check for optional chaining
    const sizeB = b.subnetInfo?.subnetSize || 0;
    return sizeB - sizeA; // Descending order
  });

  // Step 4: Build occupied ranges from locked subnets (sorted by start IP for deterministic allocation)
  // This ensures unlocked subnets are allocated around (not over) locked ones
  const occupiedRanges: OccupiedRange[] = lockedSubnets
    .filter((s) => s.subnetInfo?.networkAddress)
    .map((s) => {
      const ip = s.subnetInfo!.networkAddress!.split('/')[0]!;
      const start = ipToInt(ip);
      const end = start + s.subnetInfo!.subnetSize - 1;
      return { start, end };
    })
    .sort((a, b) => a.start - b.start);

  // Step 5: Allocate network addresses to unlocked subnets
  let allocatedInfos: SubnetInfo[];

  if (plan.assignedBlocks && plan.assignedBlocks.length > 0) {
    // Step 5a: Fragment-based allocation for plans with assigned blocks
    // This ensures subnets are allocated WITHIN assigned blocks only
    // Track allocations incrementally to avoid overlapping addresses
    const allocatedInThisBatch: Subnet[] = [];

    allocatedInfos = sortedUnlocked.map((subnet) => {
      // Recalculate available space including previously allocated subnets in this batch
      const effectivelyLocked = [...lockedSubnets, ...allocatedInThisBatch];
      const spaceReport = calculateAvailableSpace(plan.assignedBlocks, effectivelyLocked);

      const result = tryAllocateSubnetToAvailableSpace(subnet, spaceReport);
      if (result.success && result.networkAddress) {
        // Track this allocation for subsequent iterations
        const allocatedSubnet: Subnet = {
          ...subnet,
          subnetInfo: { ...subnet.subnetInfo, networkAddress: result.networkAddress },
        };
        allocatedInThisBatch.push(allocatedSubnet);
        return { ...subnet.subnetInfo, networkAddress: result.networkAddress };
      }
      // Fallback: return subnet without address if no space available in blocks
      return subnet.subnetInfo;
    });
  } else {
    // Step 5b: Sequential allocation for plans without assigned blocks
    const unlockedSubnetInfos = sortedUnlocked
      .map((s) => s.subnetInfo)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime type guard
      .filter((info): info is NonNullable<typeof info> => info !== undefined);

    allocatedInfos = allocateSubnetAddresses(plan.baseIp, unlockedSubnetInfos, occupiedRanges);
  }

  // Step 6: Combine unlocked subnets with new addresses and locked subnets with preserved addresses
  const unlockedWithAddresses = sortedUnlocked.map((subnet, index) => ({
    ...subnet,
    subnetInfo: allocatedInfos[index],
  }));

  const finalSubnets = [...unlockedWithAddresses, ...lockedSubnets];

  // Step 7: Calculate supernet from all allocated subnets
  const allSubnetInfos = finalSubnets
    .map((s) => s.subnetInfo)
    .filter((info): info is NonNullable<typeof info> => info !== undefined);

  const supernet = calculateSupernet(allSubnetInfos);

  // Generate supernet network address
  const supernetAddress = generateNetworkAddress(plan.baseIp, supernet.cidrPrefix);

  return {
    ...plan,
    subnets: finalSubnets,
    supernet: {
      ...supernet,
      networkAddress: supernetAddress,
    },
    updatedAt: new Date(),
  };
}
