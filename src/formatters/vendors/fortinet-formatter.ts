/**
 * Fortinet FortiOS Formatter
 * Generates Fortinet FortiOS configuration from NetworkPlan
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
  lines.push('#');
  lines.push('# cidrly Network Configuration');
  lines.push(`# Plan: ${plan.name}`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Base IP: ${plan.baseIp}`);
  if (plan.supernet?.networkAddress) {
    lines.push(`# Supernet: ${plan.supernet.networkAddress}`);
  }
  lines.push('#');
  lines.push('');
  return lines.join('\n');
}

/**
 * Format VLAN interface configuration (FortiOS style)
 */
function formatVlanInterface(subnet: Subnet): string {
  if (!subnet.subnetInfo?.networkAddress) {
    return `# Skipped: ${subnet.name} (VLAN ${subnet.vlanId}) - no network address calculated`;
  }

  const gateway = calculateGatewayIp(subnet.subnetInfo.networkAddress);
  const mask = cidrToSubnetMask(subnet.subnetInfo.cidrPrefix);
  const description = escapeDescription(getInterfaceDescription(subnet), 63);
  const interfaceName = `vlan${subnet.vlanId}`;

  const lines: string[] = [];
  lines.push(`    edit "${interfaceName}"`);
  lines.push('        set vdom "root"');
  lines.push(`        set ip ${gateway} ${mask}`);
  lines.push('        set allowaccess ping https ssh');
  lines.push('        set type vlan');
  lines.push(`        set vlanid ${subnet.vlanId}`);
  lines.push('        set interface "internal"');
  lines.push(`        set alias "${sanitizeVlanName(subnet.name)}"`);
  lines.push(`        set description "${description}"`);
  lines.push('    next');
  return lines.join('\n');
}

/**
 * Export NetworkPlan to Fortinet FortiOS configuration format
 *
 * @param plan - The network plan to export
 * @returns Fortinet FortiOS configuration string
 *
 * @example
 * ```typescript
 * const config = exportToFortinet(plan);
 * // Output:
 * // #
 * // # cidrly Network Configuration
 * // # Plan: Corporate Network
 * // #
 * //
 * // config system interface
 * //     edit "vlan10"
 * //         set vdom "root"
 * //         set ip 10.0.0.1 255.255.255.0
 * //         set allowaccess ping https ssh
 * //         set type vlan
 * //         set vlanid 10
 * //         set interface "internal"
 * //         set alias "Engineering"
 * //         set description "Engineering - 50 devices"
 * //     next
 * // end
 * ```
 */
export function exportToFortinet(plan: NetworkPlan): string {
  const sections: string[] = [];
  const subnets = getSubnetsWithAddresses(plan.subnets);

  // Header
  sections.push(generateHeader(plan));

  // Interface configuration block
  sections.push('config system interface');

  if (subnets.length > 0) {
    subnets.forEach((subnet) => {
      sections.push(formatVlanInterface(subnet));
    });
  } else {
    sections.push('    # No VLAN interfaces configured - subnets not calculated');
  }

  sections.push('end');
  sections.push('');

  return sections.join('\n');
}
