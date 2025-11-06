/**
 * CSV Formatter
 * Converts NetworkPlan to CSV format with metadata headers for lossless round-trip
 */

import type { NetworkPlan, Subnet } from '../core/models/network-plan.js';
import type { Preferences } from '../schemas/preferences.schema.js';

/**
 * Format plan metadata as CSV comment headers
 *
 * @param plan - The network plan
 * @returns Array of metadata header lines
 */
function formatMetadataHeaders(plan: NetworkPlan): string[] {
  const headers: string[] = [];

  headers.push('# Plan Metadata');
  headers.push(`# name: ${escapeCsvValue(plan.name)}`);
  headers.push(`# baseIp: ${plan.baseIp}`);
  headers.push(`# growthPercentage: ${plan.growthPercentage}`);
  headers.push(`# createdAt: ${plan.createdAt.toISOString()}`);
  headers.push(`# updatedAt: ${plan.updatedAt.toISOString()}`);
  headers.push('');

  return headers;
}

/**
 * Format supernet metadata as CSV comment headers
 *
 * @param plan - The network plan
 * @returns Array of supernet header lines
 */
function formatSupernetHeaders(plan: NetworkPlan): string[] {
  if (!plan.supernet) {
    return [];
  }

  const headers: string[] = [];
  const supernet = plan.supernet;

  headers.push('');
  headers.push('# Supernet Summary');
  headers.push(`# supernet.networkAddress: ${supernet.networkAddress}`);
  headers.push(`# supernet.cidrPrefix: ${supernet.cidrPrefix}`);
  headers.push(`# supernet.totalSize: ${supernet.totalSize}`);
  headers.push(`# supernet.usedSize: ${supernet.usedSize}`);
  headers.push(`# supernet.efficiency: ${supernet.efficiency.toFixed(2)}`);
  headers.push(`# supernet.rangeEfficiency: ${supernet.rangeEfficiency.toFixed(2)}`);

  return headers;
}

/**
 * Escape CSV values that contain commas, quotes, or newlines
 *
 * @param value - Value to escape
 * @returns Escaped value
 */
function escapeCsvValue(value: string): string {
  // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Map column keys to CSV field names and extraction logic
 */
const COLUMN_FIELD_MAPPING = {
  name: {
    header: 'name',
    getValue: (subnet: Subnet) => escapeCsvValue(subnet.name),
  },
  vlan: {
    header: 'vlan',
    getValue: (subnet: Subnet) => subnet.vlanId.toString(),
  },
  expected: {
    header: 'expected_devices',
    getValue: (subnet: Subnet) => subnet.expectedDevices.toString(),
  },
  description: {
    header: 'description',
    getValue: (subnet: Subnet) => (subnet.description ? escapeCsvValue(subnet.description) : ''),
  },
  network: {
    header: 'network_address',
    getValue: (subnet: Subnet) => {
      if (!subnet.subnetInfo?.networkAddress) return '';
      return subnet.subnetInfo.networkAddress.split('/')[0];
    },
  },
  cidr: {
    header: 'cidr_prefix',
    getValue: (subnet: Subnet) => subnet.subnetInfo?.cidrPrefix.toString() ?? '',
  },
  usable: {
    header: 'usable_hosts',
    getValue: (subnet: Subnet) => subnet.subnetInfo?.usableHosts.toString() ?? '',
  },
  planned: {
    header: 'planned_devices',
    getValue: (subnet: Subnet) => subnet.subnetInfo?.plannedDevices.toString() ?? '',
  },
} as const;

// Additional fields not shown in UI but included in export
const EXTRA_CSV_FIELDS = {
  subnet_size: (subnet: Subnet) => subnet.subnetInfo?.subnetSize.toString() ?? '',
  required_hosts: (subnet: Subnet) => subnet.subnetInfo?.requiredHosts.toString() ?? '',
} as const;

type ColumnKey = keyof typeof COLUMN_FIELD_MAPPING;

/**
 * Format subnet data rows with configurable columns
 *
 * @param subnets - Array of subnets to format
 * @param columnOrder - Column order from preferences (optional)
 * @param visibleColumns - Visible columns from preferences (optional)
 * @returns Array of CSV data rows
 */
function formatSubnetRows(
  subnets: Subnet[],
  columnOrder?: string[],
  visibleColumns?: string[],
): string[] {
  const rows: string[] = [];

  // Determine which columns to include and in what order
  let orderedColumns: ColumnKey[];
  if (columnOrder && visibleColumns) {
    // Filter based on visibility and convert to ColumnKey
    const visibleSet = new Set(visibleColumns);
    orderedColumns = columnOrder.filter(
      (col): col is ColumnKey =>
        col in COLUMN_FIELD_MAPPING && (col === 'name' || visibleSet.has(col)),
    );
  } else {
    // Default to all columns in standard order
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

  // Build header row
  const headers: string[] = orderedColumns.map((col) => COLUMN_FIELD_MAPPING[col].header);
  // Add extra fields that are always exported
  headers.push('subnet_size', 'required_hosts');
  rows.push(headers.join(','));

  // Build data rows
  subnets.forEach((subnet) => {
    const values = orderedColumns.map((col) => COLUMN_FIELD_MAPPING[col].getValue(subnet));
    // Add extra field values
    values.push(EXTRA_CSV_FIELDS.subnet_size(subnet));
    values.push(EXTRA_CSV_FIELDS.required_hosts(subnet));
    rows.push(values.join(','));
  });

  return rows;
}

/**
 * Format a NetworkPlan into enhanced CSV string with metadata
 *
 * Full format includes plan metadata, subnet data, and supernet summary.
 * This format enables lossless round-trip import/export.
 *
 * @param plan - The network plan to format
 * @param preferences - Optional preferences for column visibility and order
 * @returns CSV string representation with metadata headers
 */
export function formatPlanToCsv(plan: NetworkPlan, preferences?: Preferences): string {
  const lines: string[] = [];

  // Plan metadata section
  lines.push(...formatMetadataHeaders(plan));

  // Subnet allocation section
  lines.push('# Subnet Allocation');
  const columnOrder = preferences?.columnPreferences.columnOrder;
  const visibleColumns = preferences?.columnPreferences.visibleColumns;
  lines.push(...formatSubnetRows(plan.subnets, columnOrder, visibleColumns));

  // Supernet summary section (if available)
  lines.push(...formatSupernetHeaders(plan));

  return lines.join('\n');
}

/**
 * Format subnets only (legacy format, no metadata)
 *
 * Simple CSV export with just subnet data, no plan metadata.
 * Requires manual --plan-name and --base-ip on import.
 *
 * @param subnets - Array of subnets to format
 * @param preferences - Optional preferences for column visibility and order
 * @returns Simple CSV string with subnet data only
 */
export function formatSubnetsToCsv(subnets: Subnet[], preferences?: Preferences): string {
  const columnOrder = preferences?.columnPreferences.columnOrder;
  const visibleColumns = preferences?.columnPreferences.visibleColumns;
  return formatSubnetRows(subnets, columnOrder, visibleColumns).join('\n');
}

/**
 * Export a NetworkPlan to CSV format
 *
 * @param plan - The network plan to export
 * @param preferences - Optional preferences for column visibility and order
 * @returns Formatted CSV string with full metadata
 */
export function exportToCsv(plan: NetworkPlan, preferences?: Preferences): string {
  return formatPlanToCsv(plan, preferences);
}
