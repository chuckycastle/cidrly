/**
 * Validation Rules Configuration
 * Centralized constants for all validation logic
 */

import os from 'os';
import path from 'path';

/**
 * VLAN ID validation rules
 * Based on IEEE 802.1Q standard
 */
export const VLAN_RULES = {
  MIN: 1,
  MAX: 4094,
  RESERVED_START: 4095, // VLANs 4095 and higher are reserved
} as const;

/**
 * Device count validation rules
 */
export const DEVICE_COUNT_RULES = {
  MIN: 1,
  MAX: 16777214, // Maximum hosts in a /8 network (2^24 - 2)
} as const;

/**
 * IP address validation rules
 */
export const IP_ADDRESS_RULES = {
  OCTET_MIN: 0,
  OCTET_MAX: 255,
  OCTET_COUNT: 4,

  /**
   * Reserved IP address ranges (RFC 5735, RFC 6890)
   */
  RESERVED_RANGES: [
    { start: '0.0.0.0', end: '0.255.255.255', description: 'This network' },
    { start: '127.0.0.0', end: '127.255.255.255', description: 'Loopback' },
    { start: '169.254.0.0', end: '169.254.255.255', description: 'Link-local' },
    { start: '192.0.0.0', end: '192.0.0.255', description: 'IETF Protocol Assignments' },
    { start: '192.0.2.0', end: '192.0.2.255', description: 'TEST-NET-1' },
    { start: '198.51.100.0', end: '198.51.100.255', description: 'TEST-NET-2' },
    { start: '203.0.113.0', end: '203.0.113.255', description: 'TEST-NET-3' },
    { start: '240.0.0.0', end: '255.255.255.255', description: 'Reserved for future use' },
  ],

  /**
   * Private IP address ranges (RFC 1918)
   */
  PRIVATE_RANGES: [
    { start: '10.0.0.0', end: '10.255.255.255', description: 'Class A private' },
    { start: '172.16.0.0', end: '172.31.255.255', description: 'Class B private' },
    { start: '192.168.0.0', end: '192.168.255.255', description: 'Class C private' },
  ],

  /**
   * Multicast range (RFC 5771)
   */
  MULTICAST_START: '224.0.0.0',
  MULTICAST_END: '239.255.255.255',

  /**
   * Broadcast address
   */
  BROADCAST: '255.255.255.255',
} as const;

/**
 * CIDR prefix validation rules
 */
export const CIDR_RULES = {
  MIN: 8, // Minimum practical subnet size
  MAX: 30, // Maximum practical subnet size (allows 2 hosts)
  ABSOLUTE_MIN: 0,
  ABSOLUTE_MAX: 32,
} as const;

/**
 * Subnet name validation rules
 */
export const SUBNET_NAME_RULES = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 100,
} as const;

/**
 * Plan name validation rules
 */
export const PLAN_NAME_RULES = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 100,
} as const;

/**
 * Subnet description validation rules
 */
export const SUBNET_DESCRIPTION_RULES = {
  MIN_LENGTH: 0,
  MAX_LENGTH: 200,
} as const;

/**
 * Filename validation rules
 */
export const FILENAME_RULES = {
  MAX_LENGTH: 255, // Common filesystem limit
  FORBIDDEN_CHARS: /[<>:"|?*\x00-\x1f]/,
  FORBIDDEN_PATTERNS: ['..', '\0', '/', '\\'],
} as const;

/**
 * Network calculation rules
 */
export const CALCULATION_RULES = {
  /**
   * Planning rule multiplier (50% rule = 2x expected devices)
   */
  PLANNING_MULTIPLIER: 2,

  /**
   * Subnet size limits
   */
  MIN_SUBNET_SIZE: 4, // /30 network (2 usable hosts)
  MAX_SUBNET_SIZE: 16777216, // /8 network (16,777,214 usable hosts)
} as const;

/**
 * User preferences validation rules
 */
export const PREFERENCES_RULES = {
  /**
   * Growth percentage range
   * - 0%: No growth (exact capacity)
   * - 100%: Double capacity (default)
   * - 200%: Triple capacity
   * - 300%: Quadruple capacity
   */
  GROWTH_PERCENTAGE_MIN: 0,
  GROWTH_PERCENTAGE_MAX: 300,
  GROWTH_PERCENTAGE_DEFAULT: 100,
} as const;

/**
 * File operation rules
 */

// Compute default saved plans directory in user's home directory
const homeDir = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '';
const SAVED_PLANS_DIR = path.join(homeDir, 'cidrly', 'saved-plans');
const EXPORTS_DIR = path.join(homeDir, 'cidrly', 'exports');

export const FILE_RULES = {
  /**
   * Default saved plans directory (~/cidrly/saved-plans)
   */
  SAVED_PLANS_DIR,

  /**
   * Default exports directory (~/cidrly/exports)
   */
  EXPORTS_DIR,

  /**
   * Supported file extensions
   */
  ALLOWED_EXTENSIONS: ['.json', '.yaml', '.yml', '.csv', '.pdf'] as const,

  /**
   * Export format extensions
   */
  EXPORT_EXTENSIONS: {
    JSON: '.json',
    YAML: '.yaml',
    CSV: '.csv',
    PDF: '.pdf',
  } as const,

  /**
   * Default file extension
   */
  DEFAULT_EXTENSION: '.json',
} as const;

/**
 * Get directory path from preferences or use default
 * Expands ~ to home directory
 *
 * @param type - Directory type
 * @param customPath - Optional custom path from preferences
 * @returns Absolute directory path
 */
export function getDirectory(type: 'saved' | 'exports', customPath?: string): string {
  if (customPath) {
    // Expand ~ to home directory
    return customPath.replace(/^~/, os.homedir());
  }

  // Use defaults
  switch (type) {
    case 'saved':
      return FILE_RULES.SAVED_PLANS_DIR;
    case 'exports':
      return FILE_RULES.EXPORTS_DIR;
  }
}

/**
 * Helper function to check if a VLAN ID is valid
 */
export function isValidVlanRange(vlanId: number): boolean {
  return vlanId >= VLAN_RULES.MIN && vlanId <= VLAN_RULES.MAX;
}

/**
 * Helper function to check if a device count is valid
 */
export function isValidDeviceCountRange(count: number): boolean {
  return count >= DEVICE_COUNT_RULES.MIN && count <= DEVICE_COUNT_RULES.MAX;
}

/**
 * Helper function to check if an IP octet is valid
 */
export function isValidIpOctet(octet: number): boolean {
  return octet >= IP_ADDRESS_RULES.OCTET_MIN && octet <= IP_ADDRESS_RULES.OCTET_MAX;
}

/**
 * Helper function to check if a CIDR prefix is valid (practical range)
 */
export function isValidCidrPractical(cidr: number): boolean {
  return cidr >= CIDR_RULES.MIN && cidr <= CIDR_RULES.MAX;
}

/**
 * Helper function to check if a CIDR prefix is in absolute valid range
 */
export function isValidCidrAbsolute(cidr: number): boolean {
  return cidr >= CIDR_RULES.ABSOLUTE_MIN && cidr <= CIDR_RULES.ABSOLUTE_MAX;
}

/**
 * Helper function to check if a name length is valid
 */
export function isValidNameLength(
  name: string,
  rules: typeof SUBNET_NAME_RULES | typeof PLAN_NAME_RULES,
): boolean {
  return name.length >= rules.MIN_LENGTH && name.length <= rules.MAX_LENGTH;
}

/**
 * Helper function to check if growth percentage is valid
 */
export function isValidGrowthPercentage(percentage: number): boolean {
  return (
    percentage >= PREFERENCES_RULES.GROWTH_PERCENTAGE_MIN &&
    percentage <= PREFERENCES_RULES.GROWTH_PERCENTAGE_MAX &&
    Number.isInteger(percentage)
  );
}

/**
 * Convert IP address string to 32-bit integer for range comparison
 * @param ip - IP address in dotted decimal notation
 * @returns 32-bit integer representation
 */
function ipToInt(ip: string): number {
  const octets = ip.split('.').map(Number);
  return (
    ((octets[0] ?? 0) << 24) | ((octets[1] ?? 0) << 16) | ((octets[2] ?? 0) << 8) | (octets[3] ?? 0)
  );
}

/**
 * Check if an IP address is within a given range
 * @param ip - IP address to check
 * @param start - Range start IP
 * @param end - Range end IP
 * @returns True if IP is within range
 */
function isIpInRange(ip: string, start: string, end: string): boolean {
  const ipInt = ipToInt(ip);
  const startInt = ipToInt(start);
  const endInt = ipToInt(end);
  return ipInt >= startInt && ipInt <= endInt;
}

/**
 * Check if an IP address is reserved (RFC 5735, RFC 6890)
 * @param ip - IP address to check
 * @returns Object with isReserved flag and description if reserved
 */
export function isReservedIp(ip: string): { isReserved: boolean; description?: string } {
  for (const range of IP_ADDRESS_RULES.RESERVED_RANGES) {
    if (isIpInRange(ip, range.start, range.end)) {
      return { isReserved: true, description: range.description };
    }
  }
  return { isReserved: false };
}

/**
 * Check if an IP address is private (RFC 1918)
 * @param ip - IP address to check
 * @returns Object with isPrivate flag and description if private
 */
export function isPrivateIp(ip: string): { isPrivate: boolean; description?: string } {
  for (const range of IP_ADDRESS_RULES.PRIVATE_RANGES) {
    if (isIpInRange(ip, range.start, range.end)) {
      return { isPrivate: true, description: range.description };
    }
  }
  return { isPrivate: false };
}

/**
 * Check if an IP address is in the multicast range
 * @param ip - IP address to check
 * @returns True if IP is multicast (224.0.0.0 - 239.255.255.255)
 */
export function isMulticastIp(ip: string): boolean {
  return isIpInRange(ip, IP_ADDRESS_RULES.MULTICAST_START, IP_ADDRESS_RULES.MULTICAST_END);
}

/**
 * Check if an IP address is the broadcast address
 * @param ip - IP address to check
 * @returns True if IP is 255.255.255.255
 */
export function isBroadcastIp(ip: string): boolean {
  return ip === IP_ADDRESS_RULES.BROADCAST;
}
