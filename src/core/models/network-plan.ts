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
import type { SubnetInfo } from '../calculators/subnet-calculator.js';
import {
  allocateSubnetAddresses,
  calculateSubnet,
  calculateSupernet,
  generateNetworkAddress,
} from '../calculators/subnet-calculator.js';

// Re-export SubnetInfo for convenience
export type { SubnetInfo };

export interface Supernet {
  cidrPrefix: number;
  totalSize: number;
  usedSize: number;
  efficiency: number;
  rangeEfficiency: number;
  networkAddress: string;
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
}

export interface NetworkPlan {
  name: string;
  baseIp: string;
  subnets: Subnet[];
  growthPercentage: number;
  supernet?: Supernet;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a unique ID for a subnet
 */
export function generateSubnetId(): string {
  return `subnet-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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

  // Step 4: Allocate network addresses to unlocked subnets only
  const unlockedSubnetInfos = sortedUnlocked
    .map((s) => s.subnetInfo)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime type guard
    .filter((info): info is NonNullable<typeof info> => info !== undefined);

  const allocatedInfos = allocateSubnetAddresses(plan.baseIp, unlockedSubnetInfos);

  // Step 5: Combine unlocked subnets with new addresses and locked subnets with preserved addresses
  const unlockedWithAddresses = sortedUnlocked.map((subnet, index) => ({
    ...subnet,
    subnetInfo: allocatedInfos[index],
  }));

  const finalSubnets = [...unlockedWithAddresses, ...lockedSubnets];

  // Step 6: Calculate supernet from all allocated subnets
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
