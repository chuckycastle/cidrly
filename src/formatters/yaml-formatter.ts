/**
 * YAML Formatter
 * Converts NetworkPlan to YAML format for IaC workflows
 */

import YAML from 'yaml';
import type { NetworkPlan, Subnet } from '../core/models/network-plan.js';
import type { Preferences } from '../schemas/preferences.schema.js';

/**
 * Column key to subnet field mapping for configurable exports
 */
const COLUMN_FIELD_MAPPING = {
  name: (subnet: Subnet) => ({ name: subnet.name }),
  vlan: (subnet: Subnet) => ({ vlanId: subnet.vlanId }),
  expected: (subnet: Subnet) => ({ expectedDevices: subnet.expectedDevices }),
  description: (subnet: Subnet) => (subnet.description ? { description: subnet.description } : {}),
  network: (subnet: Subnet) =>
    subnet.subnetInfo ? { networkAddress: subnet.subnetInfo.networkAddress } : {},
  cidr: (subnet: Subnet) => (subnet.subnetInfo ? { cidrPrefix: subnet.subnetInfo.cidrPrefix } : {}),
  usable: (subnet: Subnet) =>
    subnet.subnetInfo ? { usableHosts: subnet.subnetInfo.usableHosts } : {},
  planned: (subnet: Subnet) =>
    subnet.subnetInfo ? { plannedDevices: subnet.subnetInfo.plannedDevices } : {},
} as const;

type ColumnKey = keyof typeof COLUMN_FIELD_MAPPING;

/**
 * Build subnet object with configurable fields
 */
function buildSubnetObject(
  subnet: Subnet,
  columnOrder?: string[],
  visibleColumns?: string[],
): Record<string, unknown> {
  const subnetObj: Record<string, unknown> = { id: subnet.id };

  // Determine which columns to include
  let orderedColumns: ColumnKey[];
  if (columnOrder && visibleColumns) {
    const visibleSet = new Set(visibleColumns);
    orderedColumns = columnOrder.filter(
      (col): col is ColumnKey =>
        col in COLUMN_FIELD_MAPPING && (col === 'name' || visibleSet.has(col)),
    );
  } else {
    // Default to all columns
    orderedColumns = [
      'name',
      'vlan',
      'expected',
      'description',
      'network',
      'cidr',
      'usable',
      'planned',
    ];
  }

  // Apply columns in order
  orderedColumns.forEach((col) => {
    Object.assign(subnetObj, COLUMN_FIELD_MAPPING[col](subnet));
  });

  // Add additional fields always included
  if (subnet.subnetInfo) {
    subnetObj.requiredHosts = subnet.subnetInfo.requiredHosts;
    subnetObj.subnetSize = subnet.subnetInfo.subnetSize;
  }

  return subnetObj;
}

/**
 * Formats a NetworkPlan into YAML string
 *
 * @param plan - The network plan to format
 * @param preferences - Optional preferences for column visibility and order
 * @returns YAML string representation of the plan
 */
export function formatPlanToYaml(plan: NetworkPlan, preferences?: Preferences): string {
  const columnOrder = preferences?.columnPreferences.columnOrder;
  const visibleColumns = preferences?.columnPreferences.visibleColumns;

  // Create a clean object for YAML serialization
  const yamlData = {
    name: plan.name,
    baseIp: plan.baseIp,
    growthPercentage: plan.growthPercentage,
    metadata: {
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    },
    subnets: plan.subnets.map((subnet) => buildSubnetObject(subnet, columnOrder, visibleColumns)),
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
 * @param preferences - Optional preferences for column visibility and order
 * @returns Formatted YAML string with comments
 */
export function exportToYaml(plan: NetworkPlan, preferences?: Preferences): string {
  const yamlString = formatPlanToYaml(plan, preferences);
  return addYamlComments(yamlString);
}
