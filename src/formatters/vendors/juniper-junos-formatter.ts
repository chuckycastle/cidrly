/**
 * Juniper JUNOS Formatter
 * Generates Juniper JUNOS configuration from NetworkPlan
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
 * Format VLAN definitions in hierarchical format
 */
function formatVlanDefinitions(subnets: Subnet[]): string {
  const lines: string[] = [];
  lines.push('vlans {');

  subnets.forEach((subnet) => {
    const name = sanitizeVlanName(subnet.name);
    lines.push(`    ${name} {`);
    lines.push(`        vlan-id ${subnet.vlanId};`);
    lines.push(`        l3-interface irb.${subnet.vlanId};`);
    lines.push('    }');
  });

  lines.push('}');
  return lines.join('\n');
}

/**
 * Format IRB (Integrated Routing and Bridging) interfaces
 */
function formatIrbInterfaces(subnets: Subnet[]): string {
  const validSubnets = getSubnetsWithAddresses(subnets);
  if (validSubnets.length === 0) {
    return '# No interfaces configured - subnets not calculated';
  }

  const lines: string[] = [];
  lines.push('interfaces {');
  lines.push('    irb {');

  validSubnets.forEach((subnet) => {
    const gateway = calculateGatewayIp(subnet.subnetInfo!.networkAddress!);
    const cidr = subnet.subnetInfo!.cidrPrefix;
    const description = escapeDescription(getInterfaceDescription(subnet));

    lines.push(`        unit ${subnet.vlanId} {`);
    lines.push(`            description "${description}";`);
    lines.push('            family inet {');
    lines.push(`                address ${gateway}/${cidr};`);
    lines.push('            }');
    lines.push('        }');
  });

  lines.push('    }');
  lines.push('}');
  return lines.join('\n');
}

/**
 * Export NetworkPlan to Juniper JUNOS configuration format
 *
 * @param plan - The network plan to export
 * @returns Juniper JUNOS configuration string
 *
 * @example
 * ```typescript
 * const config = exportToJuniperJunos(plan);
 * // Output:
 * // #
 * // # cidrly Network Configuration
 * // # Plan: Corporate Network
 * // #
 * //
 * // vlans {
 * //     Engineering {
 * //         vlan-id 10;
 * //         l3-interface irb.10;
 * //     }
 * // }
 * //
 * // interfaces {
 * //     irb {
 * //         unit 10 {
 * //             description "Engineering - 50 devices";
 * //             family inet {
 * //                 address 10.0.0.1/24;
 * //             }
 * //         }
 * //     }
 * // }
 * ```
 */
export function exportToJuniperJunos(plan: NetworkPlan): string {
  const sections: string[] = [];

  // Header
  sections.push(generateHeader(plan));

  // VLAN definitions
  if (plan.subnets.length > 0) {
    sections.push(formatVlanDefinitions(plan.subnets));
    sections.push('');
  }

  // IRB interfaces
  sections.push(formatIrbInterfaces(plan.subnets));
  sections.push('');

  return sections.join('\n');
}
