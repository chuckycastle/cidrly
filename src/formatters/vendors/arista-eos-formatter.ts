/**
 * Arista EOS Formatter
 * Generates Arista EOS configuration from NetworkPlan
 */

import type { NetworkPlan, Subnet } from '../../core/models/network-plan.js';
import {
  calculateGatewayIp,
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
 * Format VLAN definition block (Arista EOS style with 3-space indent)
 */
function formatVlanDefinition(subnet: Subnet): string {
  const lines: string[] = [];
  lines.push(`vlan ${subnet.vlanId}`);
  lines.push(`   name ${sanitizeVlanName(subnet.name)}`);
  lines.push('!');
  return lines.join('\n');
}

/**
 * Format SVI configuration (Arista uses CIDR notation like NX-OS)
 */
function formatSviConfig(subnet: Subnet): string {
  if (!subnet.subnetInfo?.networkAddress) {
    return `! Skipped: ${subnet.name} (VLAN ${subnet.vlanId}) - no network address calculated`;
  }

  const gateway = calculateGatewayIp(subnet.subnetInfo.networkAddress);
  const cidr = subnet.subnetInfo.cidrPrefix;
  const description = escapeDescription(getInterfaceDescription(subnet));

  const lines: string[] = [];
  lines.push(`interface Vlan${subnet.vlanId}`);
  lines.push(`   description ${description}`);
  lines.push(`   ip address ${gateway}/${cidr}`);
  lines.push('   no shutdown');
  lines.push('!');
  return lines.join('\n');
}

/**
 * Export NetworkPlan to Arista EOS configuration format
 *
 * @param plan - The network plan to export
 * @returns Arista EOS configuration string
 *
 * @example
 * ```typescript
 * const config = exportToAristaEos(plan);
 * // Output:
 * // !
 * // ! cidrly Network Configuration
 * // !
 * // vlan 10
 * //    name Engineering
 * // !
 * // interface Vlan10
 * //    description Engineering - 50 devices
 * //    ip address 10.0.0.1/24
 * //    no shutdown
 * // !
 * ```
 */
export function exportToAristaEos(plan: NetworkPlan): string {
  const sections: string[] = [];
  const subnets = getSubnetsWithAddresses(plan.subnets);

  // Header
  sections.push(generateHeader(plan));

  // VLAN definitions section
  if (plan.subnets.length > 0) {
    plan.subnets.forEach((subnet) => {
      sections.push(formatVlanDefinition(subnet));
    });
  }

  // SVI configurations section
  if (subnets.length > 0) {
    subnets.forEach((subnet) => {
      sections.push(formatSviConfig(subnet));
    });
  }

  sections.push('');

  return sections.join('\n');
}
