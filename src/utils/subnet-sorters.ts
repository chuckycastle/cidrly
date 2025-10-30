/**
 * Subnet Sorting Utilities
 * Provides sorting functions for subnet table columns
 */

import type { Subnet } from '../core/models/network-plan.js';
import type { SortColumn, SortDirection } from '../store/uiStore.js';

/**
 * Convert an IP address string to a number for comparison
 * @param ip - IP address string (e.g., "10.0.1.0")
 * @returns Numeric representation of the IP address
 */
function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  // Use multiplication instead of bitwise operators to avoid signed integer issues
  return (
    (parts[0] ?? 0) * 16777216 + (parts[1] ?? 0) * 65536 + (parts[2] ?? 0) * 256 + (parts[3] ?? 0)
  );
}

/**
 * Sort subnets by name (string comparison)
 */
function sortByName(a: Subnet, b: Subnet, direction: SortDirection): number {
  const comparison = a.name.localeCompare(b.name);
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Sort subnets by VLAN ID (numeric comparison)
 */
function sortByVlan(a: Subnet, b: Subnet, direction: SortDirection): number {
  const comparison = a.vlanId - b.vlanId;
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Sort subnets by expected devices (numeric comparison)
 */
function sortByExpected(a: Subnet, b: Subnet, direction: SortDirection): number {
  const comparison = a.expectedDevices - b.expectedDevices;
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Sort subnets by planned devices (numeric comparison)
 * Subnets without subnetInfo are sorted to the end
 */
function sortByPlanned(a: Subnet, b: Subnet, direction: SortDirection): number {
  const aPlanned = a.subnetInfo?.plannedDevices ?? -1;
  const bPlanned = b.subnetInfo?.plannedDevices ?? -1;

  // If both don't have subnetInfo, maintain original order
  if (aPlanned === -1 && bPlanned === -1) return 0;
  // If only a doesn't have subnetInfo, sort it to the end
  if (aPlanned === -1) return 1;
  // If only b doesn't have subnetInfo, sort it to the end
  if (bPlanned === -1) return -1;

  const comparison = aPlanned - bPlanned;
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Sort subnets by network address (IP address comparison)
 * Subnets without subnetInfo are sorted to the end
 */
function sortByNetwork(a: Subnet, b: Subnet, direction: SortDirection): number {
  const aNetwork = a.subnetInfo?.networkAddress;
  const bNetwork = b.subnetInfo?.networkAddress;

  // If both don't have network address, maintain original order
  if (!aNetwork && !bNetwork) return 0;
  // If only a doesn't have network address, sort it to the end
  if (!aNetwork) return 1;
  // If only b doesn't have network address, sort it to the end
  if (!bNetwork) return -1;

  const comparison = ipToNumber(aNetwork) - ipToNumber(bNetwork);
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Sort subnets by CIDR prefix (numeric comparison)
 * Subnets without subnetInfo are sorted to the end
 */
function sortByCidr(a: Subnet, b: Subnet, direction: SortDirection): number {
  const aCidr = a.subnetInfo?.cidrPrefix ?? -1;
  const bCidr = b.subnetInfo?.cidrPrefix ?? -1;

  // If both don't have subnetInfo, maintain original order
  if (aCidr === -1 && bCidr === -1) return 0;
  // If only a doesn't have subnetInfo, sort it to the end
  if (aCidr === -1) return 1;
  // If only b doesn't have subnetInfo, sort it to the end
  if (bCidr === -1) return -1;

  const comparison = aCidr - bCidr;
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Sort subnets by usable hosts (numeric comparison)
 * Subnets without subnetInfo are sorted to the end
 */
function sortByUsable(a: Subnet, b: Subnet, direction: SortDirection): number {
  const aUsable = a.subnetInfo?.usableHosts ?? -1;
  const bUsable = b.subnetInfo?.usableHosts ?? -1;

  // If both don't have subnetInfo, maintain original order
  if (aUsable === -1 && bUsable === -1) return 0;
  // If only a doesn't have subnetInfo, sort it to the end
  if (aUsable === -1) return 1;
  // If only b doesn't have subnetInfo, sort it to the end
  if (bUsable === -1) return -1;

  const comparison = aUsable - bUsable;
  return direction === 'asc' ? comparison : -comparison;
}

/**
 * Sort subnets by the specified column and direction
 * @param subnets - Array of subnets to sort
 * @param column - Column to sort by
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted array of subnets
 */
export function sortSubnets(
  subnets: Subnet[],
  column: SortColumn | null,
  direction: SortDirection,
): Subnet[] {
  // If no column specified, return original order
  if (!column) {
    return subnets;
  }

  // Create a copy to avoid mutating the original array
  const sorted = [...subnets];

  // Sort based on the column
  sorted.sort((a, b) => {
    switch (column) {
      case 'name':
        return sortByName(a, b, direction);
      case 'vlan':
        return sortByVlan(a, b, direction);
      case 'expected':
        return sortByExpected(a, b, direction);
      case 'planned':
        return sortByPlanned(a, b, direction);
      case 'network':
        return sortByNetwork(a, b, direction);
      case 'cidr':
        return sortByCidr(a, b, direction);
      case 'usable':
        return sortByUsable(a, b, direction);
      default:
        return 0;
    }
  });

  return sorted;
}

/**
 * Get a display string for the current sort state
 * @param column - Current sort column
 * @param direction - Current sort direction
 * @returns Human-readable sort description
 */
export function getSortDescription(column: SortColumn | null, direction: SortDirection): string {
  if (!column) {
    return 'None';
  }

  const columnNames: Record<SortColumn, string> = {
    name: 'Name',
    vlan: 'VLAN',
    expected: 'Expected',
    planned: 'Planned',
    network: 'Network',
    cidr: 'CIDR',
    usable: 'Usable',
  };

  const directionSymbol = direction === 'asc' ? '↑' : '↓';
  return `${columnNames[column]} ${directionSymbol}`;
}
