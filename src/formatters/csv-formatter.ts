/**
 * CSV Formatter
 * Converts NetworkPlan to CSV format with metadata headers for lossless round-trip
 */

import type { NetworkPlan, Subnet } from '../core/models/network-plan.js';

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
 * Format subnet data rows with all fields
 *
 * @param subnets - Array of subnets to format
 * @returns Array of CSV data rows
 */
function formatSubnetRows(subnets: Subnet[]): string[] {
  const rows: string[] = [];

  // Header row with all SubnetInfo fields
  rows.push(
    [
      'name',
      'vlan',
      'expected_devices',
      'network_address',
      'cidr_prefix',
      'usable_hosts',
      'subnet_size',
      'required_hosts',
      'planned_devices',
    ].join(','),
  );

  // Data rows
  subnets.forEach((subnet) => {
    const info = subnet.subnetInfo;
    const networkAddr = info?.networkAddress?.split('/')[0] ?? '';
    const cidr = info?.cidrPrefix?.toString() ?? '';
    const usableHosts = info?.usableHosts?.toString() ?? '';
    const subnetSize = info?.subnetSize?.toString() ?? '';
    const requiredHosts = info?.requiredHosts?.toString() ?? '';
    const plannedDevices = info?.plannedDevices?.toString() ?? '';

    rows.push(
      [
        escapeCsvValue(subnet.name),
        subnet.vlanId.toString(),
        subnet.expectedDevices.toString(),
        networkAddr,
        cidr,
        usableHosts,
        subnetSize,
        requiredHosts,
        plannedDevices,
      ].join(','),
    );
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
 * @returns CSV string representation with metadata headers
 */
export function formatPlanToCsv(plan: NetworkPlan): string {
  const lines: string[] = [];

  // Plan metadata section
  lines.push(...formatMetadataHeaders(plan));

  // Subnet allocation section
  lines.push('# Subnet Allocation');
  lines.push(...formatSubnetRows(plan.subnets));

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
 * @returns Simple CSV string with subnet data only
 */
export function formatSubnetsToCsv(subnets: Subnet[]): string {
  return formatSubnetRows(subnets).join('\n');
}

/**
 * Export a NetworkPlan to CSV format
 *
 * @param plan - The network plan to export
 * @returns Formatted CSV string with full metadata
 */
export function exportToCsv(plan: NetworkPlan): string {
  return formatPlanToCsv(plan);
}
