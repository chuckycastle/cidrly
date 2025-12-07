/**
 * Netgear Formatter
 * Generates Netgear managed switch configuration from NetworkPlan
 */

import type { NetworkPlan, Subnet } from '../../core/models/network-plan.js';
import {
  calculateGatewayIp,
  cidrToSubnetMask,
  escapeDescription,
  getInterfaceDescription,
  getSubnetsWithAddresses,
  sanitizeVlanName,
} from './utils.js';

/**
 * Generate configuration header with plan metadata
 */
function generateHeader(plan: NetworkPlan): string {
  const lines: string[] = [];
  lines.push('!');
  lines.push('! cidrly Network Configuration');
  lines.push(`! Plan: ${plan.name}`);
  lines.push(`! Generated: ${new Date().toISOString()}`);
  lines.push(`! Base IP: ${plan.baseIp}`);
  if (plan.supernet?.networkAddress) {
    lines.push(`! Supernet: ${plan.supernet.networkAddress}`);
  }
  lines.push('!');
  lines.push('');
  return lines.join('\n');
}

/**
 * Format VLAN database entry
 */
function formatVlanDatabaseEntry(subnet: Subnet): string {
  const name = sanitizeVlanName(subnet.name, 32);
  return `vlan ${subnet.vlanId} name "${name}"`;
}

/**
 * Format VLAN interface configuration
 */
function formatVlanInterface(subnet: Subnet): string {
  if (!subnet.subnetInfo?.networkAddress) {
    return `! Skipped: ${subnet.name} (VLAN ${subnet.vlanId}) - no network address calculated`;
  }

  const gateway = calculateGatewayIp(subnet.subnetInfo.networkAddress);
  const mask = cidrToSubnetMask(subnet.subnetInfo.cidrPrefix);
  const description = escapeDescription(getInterfaceDescription(subnet), 64);

  const lines: string[] = [];
  lines.push(`interface vlan ${subnet.vlanId}`);
  lines.push(`ip address ${gateway} ${mask}`);
  lines.push(`description "${description}"`);
  lines.push('exit');
  lines.push('!');
  return lines.join('\n');
}

/**
 * Export NetworkPlan to Netgear configuration format
 *
 * @param plan - The network plan to export
 * @returns Netgear configuration string
 *
 * @example
 * ```typescript
 * const config = exportToNetgear(plan);
 * // Output:
 * // !
 * // ! cidrly Network Configuration
 * // ! Plan: Corporate Network
 * // !
 * //
 * // vlan database
 * // vlan 10 name "Engineering"
 * // vlan 20 name "Sales"
 * // exit
 * // !
 * // interface vlan 10
 * // ip address 10.0.0.1 255.255.255.0
 * // description "Engineering - 50 devices"
 * // exit
 * // !
 * ```
 */
export function exportToNetgear(plan: NetworkPlan): string {
  const sections: string[] = [];
  const subnets = getSubnetsWithAddresses(plan.subnets);

  // Header
  sections.push(generateHeader(plan));

  // VLAN database
  if (plan.subnets.length > 0) {
    sections.push('vlan database');
    plan.subnets.forEach((subnet) => {
      sections.push(formatVlanDatabaseEntry(subnet));
    });
    sections.push('exit');
    sections.push('!');
  }

  // VLAN interfaces
  if (subnets.length > 0) {
    subnets.forEach((subnet) => {
      sections.push(formatVlanInterface(subnet));
    });
  }

  sections.push('');

  return sections.join('\n');
}
