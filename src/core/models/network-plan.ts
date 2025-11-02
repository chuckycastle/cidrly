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
  subnetInfo?: SubnetInfo;
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
export function createSubnet(name: string, vlanId: number, expectedDevices: number): Subnet {
  return {
    id: generateSubnetId(),
    name,
    vlanId,
    expectedDevices,
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
  subnetData: { name: string; vlan: number; expectedDevices: number },
): NetworkPlan {
  const newSubnet = createSubnet(subnetData.name, subnetData.vlan, subnetData.expectedDevices);
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
 * @param plan - Network plan to calculate subnet ranges for
 */
export function calculateSubnetRanges(plan: NetworkPlan): NetworkPlan {
  if (plan.subnets.length === 0) {
    return plan;
  }

  // Step 1: Calculate subnet information for each subnet using plan's growth percentage
  const subnetsWithInfo = plan.subnets.map((subnet) => ({
    ...subnet,
    subnetInfo: calculateSubnet(subnet.expectedDevices, plan.growthPercentage),
  }));

  // Step 2: Sort by subnet size DESCENDING for optimal allocation
  // Larger subnets first minimizes wasted space due to boundary alignment
  const sortedSubnets = [...subnetsWithInfo].sort((a, b) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive check for optional chaining
    const sizeA = a.subnetInfo?.subnetSize || 0;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive check for optional chaining
    const sizeB = b.subnetInfo?.subnetSize || 0;
    return sizeB - sizeA; // Descending order
  });

  // Step 3: Allocate network addresses to sorted subnets
  const sortedSubnetInfos = sortedSubnets
    .map((s) => s.subnetInfo)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime type guard
    .filter((info): info is NonNullable<typeof info> => info !== undefined);

  const allocatedInfos = allocateSubnetAddresses(plan.baseIp, sortedSubnetInfos);

  // Step 4: Return subnets in optimized order (sorted by size) with allocated addresses
  const finalSubnets = sortedSubnets.map((subnet, index) => ({
    ...subnet,
    subnetInfo: allocatedInfos[index],
  }));

  // Step 5: Calculate supernet from allocated subnets
  const allocatedSubnetInfos = finalSubnets
    .map((s) => s.subnetInfo)
    .filter((info): info is NonNullable<typeof info> => info !== undefined);

  const supernet = calculateSupernet(allocatedSubnetInfos);

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
