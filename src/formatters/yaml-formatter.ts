/**
 * YAML Formatter
 * Converts NetworkPlan to YAML format for IaC workflows
 */

import YAML from 'yaml';
import type { NetworkPlan } from '../core/models/network-plan.js';

/**
 * Formats a NetworkPlan into YAML string
 *
 * @param plan - The network plan to format
 * @returns YAML string representation of the plan
 */
export function formatPlanToYaml(plan: NetworkPlan): string {
  // Create a clean object for YAML serialization
  const yamlData = {
    name: plan.name,
    baseIp: plan.baseIp,
    growthPercentage: plan.growthPercentage,
    metadata: {
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    },
    subnets: plan.subnets.map((subnet) => ({
      id: subnet.id,
      name: subnet.name,
      vlanId: subnet.vlanId,
      expectedDevices: subnet.expectedDevices,
      ...(subnet.subnetInfo && {
        subnetInfo: {
          networkAddress: subnet.subnetInfo.networkAddress,
          cidrPrefix: subnet.subnetInfo.cidrPrefix,
          expectedDevices: subnet.subnetInfo.expectedDevices,
          plannedDevices: subnet.subnetInfo.plannedDevices,
          requiredHosts: subnet.subnetInfo.requiredHosts,
          subnetSize: subnet.subnetInfo.subnetSize,
          usableHosts: subnet.subnetInfo.usableHosts,
        },
      }),
    })),
    ...(plan.supernet && {
      supernet: {
        networkAddress: plan.supernet.networkAddress,
        cidrPrefix: plan.supernet.cidrPrefix,
        totalSize: plan.supernet.totalSize,
        usedSize: plan.supernet.usedSize,
        efficiency: plan.supernet.efficiency,
        rangeEfficiency: plan.supernet.rangeEfficiency,
      },
    }),
  };

  // Convert to YAML with custom options
  return YAML.stringify(yamlData, {
    indent: 2,
    lineWidth: 100,
    minContentWidth: 20,
    defaultStringType: 'QUOTE_DOUBLE',
    defaultKeyType: 'PLAIN',
  });
}

/**
 * Adds comments to YAML output for better readability
 *
 * @param yamlString - Raw YAML string
 * @returns YAML string with comments
 */
export function addYamlComments(yamlString: string): string {
  const lines = yamlString.split('\n');
  const commented: string[] = [];

  // Add header comment
  commented.push('# cidrly Network Plan');
  commented.push('# Generated: ' + new Date().toISOString());
  commented.push('# https://github.com/chuckycastle/cidrly');
  commented.push('');

  let inSubnets = false;
  let inSupernet = false;

  for (const line of lines) {
    // Add section comments
    if (line.startsWith('subnets:') && !inSubnets) {
      commented.push('');
      commented.push('# Subnet Allocation');
      inSubnets = true;
    } else if (line.startsWith('supernet:') && !inSupernet) {
      commented.push('');
      commented.push('# Supernet Summary');
      inSupernet = true;
    }

    commented.push(line);
  }

  return commented.join('\n');
}

/**
 * Export a NetworkPlan to YAML format with comments
 *
 * @param plan - The network plan to export
 * @returns Formatted YAML string with comments
 */
export function exportToYaml(plan: NetworkPlan): string {
  const yamlString = formatPlanToYaml(plan);
  return addYamlComments(yamlString);
}
