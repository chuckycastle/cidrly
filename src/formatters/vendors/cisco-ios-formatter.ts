/**
 * Cisco IOS/IOS-XE Formatter
 * Generates Cisco IOS configuration from NetworkPlan
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
  return lines.join('\n');
}

/**
 * Format VLAN definition block
 */
function formatVlanDefinition(subnet: Subnet): string {
  const lines: string[] = [];
  lines.push(`vlan ${subnet.vlanId}`);
  lines.push(` name ${sanitizeVlanName(subnet.name)}`);
  lines.push('!');
  return lines.join('\n');
}

/**
 * Format SVI (Switched Virtual Interface) configuration
 */
function formatSviConfig(subnet: Subnet): string {
  if (!subnet.subnetInfo?.networkAddress) {
    return `! Skipped: ${subnet.name} (VLAN ${subnet.vlanId}) - no network address calculated`;
  }

  const gateway = calculateGatewayIp(subnet.subnetInfo.networkAddress);
  const mask = cidrToSubnetMask(subnet.subnetInfo.cidrPrefix);
  const description = escapeDescription(getInterfaceDescription(subnet));

  const lines: string[] = [];
  lines.push(`interface Vlan${subnet.vlanId}`);
  lines.push(` description ${description}`);
  lines.push(` ip address ${gateway} ${mask}`);
  lines.push(' no shutdown');
  lines.push('!');
  return lines.join('\n');
}

/**
 * Export NetworkPlan to Cisco IOS/IOS-XE configuration format
 *
 * @param plan - The network plan to export
 * @returns Cisco IOS configuration string
 *
 * @example
 * ```typescript
 * const config = exportToCiscoIos(plan);
 * // Output:
 * // !
 * // ! cidrly Network Configuration
 * // ! Plan: Corporate Network
 * // !
 * // vlan 10
 * //  name Engineering
 * // !
 * // interface Vlan10
 * //  description Engineering - 50 devices
 * //  ip address 10.0.0.1 255.255.255.0
 * //  no shutdown
 * // !
 * // end
 * ```
 */
export function exportToCiscoIos(plan: NetworkPlan): string {
  const sections: string[] = [];
  const subnets = getSubnetsWithAddresses(plan.subnets);

  // Header
  sections.push(generateHeader(plan));

  // VLAN definitions section
  if (plan.subnets.length > 0) {
    sections.push('! VLAN Definitions');
    plan.subnets.forEach((subnet) => {
      sections.push(formatVlanDefinition(subnet));
    });
  }

  // SVI configurations section
  if (subnets.length > 0) {
    sections.push('! SVI Configurations');
    subnets.forEach((subnet) => {
      sections.push(formatSviConfig(subnet));
    });
  }

  sections.push('end');
  sections.push('');

  return sections.join('\n');
}
