/**
 * Validation Rules Configuration
 * Centralized constants for all validation logic
 */

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

export const FILE_RULES = {
  /**
   * Default saved plans directory (~/cidrly/saved-plans)
   */
  SAVED_PLANS_DIR,

  /**
   * Supported file extensions
   */
  ALLOWED_EXTENSIONS: ['.json'] as const,

  /**
   * Default file extension
   */
  DEFAULT_EXTENSION: '.json',
} as const;

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
