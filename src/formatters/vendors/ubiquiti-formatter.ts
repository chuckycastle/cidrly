/**
 * Ubiquiti EdgeOS/UniFi Formatter
 * Generates Ubiquiti EdgeOS configuration from NetworkPlan
 */

import type { NetworkPlan, Subnet } from '../../core/models/network-plan.js';
import {
  calculateGatewayIp,
  escapeDescription,
  getInterfaceDescription,
  getSubnetsWithAddresses,
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
 * Format VIF (Virtual Interface) configuration
 */
function formatVifConfig(subnet: Subnet): string {
  if (!subnet.subnetInfo?.networkAddress) {
    return `        # Skipped: ${subnet.name} (VLAN ${subnet.vlanId}) - no network address calculated`;
  }

  const gateway = calculateGatewayIp(subnet.subnetInfo.networkAddress);
  const cidr = subnet.subnetInfo.cidrPrefix;
  const description = escapeDescription(getInterfaceDescription(subnet), 80);

  const lines: string[] = [];
  lines.push(`        vif ${subnet.vlanId} {`);
  lines.push(`            address ${gateway}/${cidr}`);
  lines.push(`            description "${description}"`);
  lines.push('        }');
  return lines.join('\n');
}

/**
 * Export NetworkPlan to Ubiquiti EdgeOS configuration format
 *
 * @param plan - The network plan to export
 * @returns Ubiquiti EdgeOS configuration string
 *
 * @example
 * ```typescript
 * const config = exportToUbiquiti(plan);
 * // Output:
 * // #
 * // # cidrly Network Configuration
 * // # Plan: Corporate Network
 * // #
 * //
 * // interfaces {
 * //     ethernet eth0 {
 * //         vif 10 {
 * //             address 10.0.0.1/24
 * //             description "Engineering - 50 devices"
 * //         }
 * //         vif 20 {
 * //             address 10.0.1.1/25
 * //             description "Sales - 30 devices"
 * //         }
 * //     }
 * // }
 * ```
 */
export function exportToUbiquiti(plan: NetworkPlan): string {
  const sections: string[] = [];
  const subnets = getSubnetsWithAddresses(plan.subnets);

  // Header
  sections.push(generateHeader(plan));

  // Interfaces block (hierarchical EdgeOS format)
  sections.push('interfaces {');
  sections.push('    ethernet eth0 {');

  if (subnets.length > 0) {
    subnets.forEach((subnet) => {
      sections.push(formatVifConfig(subnet));
    });
  } else {
    sections.push('        # No VIF interfaces configured - subnets not calculated');
  }

  sections.push('    }');
  sections.push('}');
  sections.push('');

  return sections.join('\n');
}
