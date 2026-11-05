/**
 * Vendor Formatter Utilities
 * Shared functions for network device configuration export
 */

import type { Subnet } from '../../core/models/network-plan.js';

/**
 * Calculate gateway IP (first usable address, .1)
 * For /31 networks, uses network address directly (point-to-point)
 * For /32 networks, returns the address itself
 */
export function calculateGatewayIp(networkAddress: string): string {
  const [ip, prefixStr] = networkAddress.split('/');
  if (!ip) return '';

  // Validate the address before any branch returns it, so a malformed value
  // never reaches a configuration line verbatim.
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
    return '';
  }

  const prefix = parseInt(prefixStr ?? '24', 10);

  // Point-to-point or host route
  if (prefix >= 31) {
    return octets.join('.');
  }

  // First usable address is network address + 1, computed on the full 32-bit value
  // so subnets that do not start on a .0 boundary (e.g. 10.0.0.128/25) get the
  // correct gateway (10.0.0.129), not a gateway inside a different subnet.
  const [o1, o2, o3, o4] = octets as [number, number, number, number];
  const networkInt = ((o1 << 24) | (o2 << 16) | (o3 << 8) | o4) >>> 0;
  const gatewayInt = (networkInt + 1) >>> 0;
  return [
    (gatewayInt >>> 24) & 255,
    (gatewayInt >>> 16) & 255,
    (gatewayInt >>> 8) & 255,
    gatewayInt & 255,
  ].join('.');
}

/**
 * Convert CIDR prefix to dotted decimal subnet mask
 */
export function cidrToSubnetMask(cidr: number): string {
  // Handle edge case: /0 means no mask (all hosts)
  if (cidr === 0) {
    return '0.0.0.0';
  }
  const mask = (0xffffffff << (32 - cidr)) >>> 0;
  return [(mask >>> 24) & 0xff, (mask >>> 16) & 0xff, (mask >>> 8) & 0xff, mask & 0xff].join('.');
}

/**
 * Sanitize VLAN name for device compatibility
 * Replaces spaces and special characters with underscores. A name made only of
 * such characters would sanitize to an empty string, which is not a valid VLAN
 * name on any vendor, so the fallback is used instead.
 */
export function sanitizeVlanName(name: string, maxLength = 32, fallback = 'VLAN'): string {
  const sanitized = name
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, maxLength);
  return sanitized || fallback;
}

/**
 * Generate description string for interface
 * Uses custom description if available, otherwise generates from subnet data
 */
export function getInterfaceDescription(subnet: Subnet): string {
  if (subnet.description) {
    return subnet.description;
  }
  return `${subnet.name} - ${subnet.expectedDevices} devices`;
}

/**
 * Filter subnets that have valid network addresses
 */
export function getSubnetsWithAddresses(subnets: Subnet[]): Subnet[] {
  return subnets.filter((s) => s.subnetInfo?.networkAddress && s.subnetInfo.cidrPrefix);
}

/**
 * Fold line breaks so a value stays on one configuration line (headers, comments)
 */
export function singleLine(value: string): string {
  return value.replace(/\r?\n|\r/g, ' ');
}

/**
 * Escape description for config file (remove special chars that might break parsing)
 */
export function escapeDescription(description: string, maxLength = 240): string {
  return description
    .replace(/["\n\r]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
