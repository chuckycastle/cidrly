/**
 * Input Validators
 * Provides validation functions for user inputs
 */

import {
  DEVICE_COUNT_RULES,
  IP_ADDRESS_RULES,
  isValidDeviceCountRange,
  isValidIpOctet,
  isValidNameLength,
  isValidVlanRange,
  PLAN_NAME_RULES,
  SUBNET_NAME_RULES,
  VLAN_RULES,
} from '../../infrastructure/config/validation-rules.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates and sanitizes a subnet name
 * @param name - The subnet name to validate
 * @returns Validation error message or true if valid
 * @remarks The caller should trim the input before using it
 */
export function validateSubnetName(name: string): string | true {
  // Trim whitespace for validation
  const trimmed = name.trim();

  if (!trimmed || trimmed.length === 0) {
    return 'Subnet name cannot be empty';
  }

  if (!isValidNameLength(trimmed, SUBNET_NAME_RULES)) {
    return `Subnet name must be ${SUBNET_NAME_RULES.MAX_LENGTH} characters or less`;
  }

  // Check for leading/trailing whitespace in original input
  if (name !== trimmed) {
    return 'Subnet name cannot have leading or trailing whitespace';
  }

  return true;
}

/**
 * Validates a VLAN ID input
 * @param input - The VLAN ID string to validate
 * @returns Validation error message or true if valid
 */
export function validateVlanId(input: string): string | true {
  // Trim whitespace
  const trimmed = input.trim();

  // Prevent DoS via extremely long input strings
  if (trimmed.length > 10) {
    return 'VLAN ID input is too long';
  }

  const vlanId = parseInt(trimmed, 10);

  if (isNaN(vlanId)) {
    return 'VLAN ID must be a number';
  }

  if (!isValidVlanRange(vlanId)) {
    return `VLAN ID must be between ${VLAN_RULES.MIN} and ${VLAN_RULES.MAX}`;
  }

  return true;
}

/**
 * Validates a device count input
 * @param input - The device count string to validate
 * @returns Validation error message or true if valid
 */
export function validateDeviceCount(input: string): string | true {
  // Trim whitespace
  const trimmed = input.trim();

  // Prevent DoS via extremely long input strings
  if (trimmed.length > 15) {
    return 'Device count input is too long';
  }

  const count = parseInt(trimmed, 10);

  if (isNaN(count)) {
    return 'Device count must be a number';
  }

  if (!isValidDeviceCountRange(count)) {
    if (count < DEVICE_COUNT_RULES.MIN) {
      return `Device count must be at least ${DEVICE_COUNT_RULES.MIN}`;
    }
    return `Device count is too large (max: ${DEVICE_COUNT_RULES.MAX.toLocaleString()})`;
  }

  return true;
}

/**
 * Validates an IP address input with enhanced octet range checking
 * @param ip - The IP address string to validate
 * @returns Validation error message or true if valid
 */
export function validateIpAddress(ip: string): string | true {
  // Trim whitespace
  const trimmed = ip.trim();

  // Prevent DoS via extremely long input strings
  if (trimmed.length > 15) {
    return 'IP address input is too long';
  }

  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = trimmed.match(ipRegex);

  if (!match) {
    return 'Invalid IP address format (expected: x.x.x.x)';
  }

  // Validate each octet is in range 0-255
  for (let i = 1; i <= IP_ADDRESS_RULES.OCTET_COUNT; i++) {
    const octetStr = match[i];
    if (!octetStr) {
      return `Missing octet ${i}`;
    }

    // Check for leading zeros (e.g., "01" or "001")
    if (octetStr.length > 1 && octetStr.startsWith('0')) {
      return `Octet ${i} has invalid leading zero`;
    }

    const octet = parseInt(octetStr, 10);

    if (!isValidIpOctet(octet)) {
      return `Octet ${i} must be between ${IP_ADDRESS_RULES.OCTET_MIN} and ${IP_ADDRESS_RULES.OCTET_MAX} (got ${octet})`;
    }
  }

  return true;
}

/**
 * Boolean wrapper for IP address validation
 * Returns true if valid, false otherwise
 */
export function isValidIpAddress(ip: string): boolean {
  return validateIpAddress(ip) === true;
}

/**
 * Validates and sanitizes a plan name
 * @param name - The plan name to validate
 * @returns Validation error message or true if valid
 * @remarks The caller should trim the input before using it
 */
export function validatePlanName(name: string): string | true {
  // Trim whitespace for validation
  const trimmed = name.trim();

  if (!trimmed || trimmed.length === 0) {
    return 'Plan name cannot be empty';
  }

  if (!isValidNameLength(trimmed, PLAN_NAME_RULES)) {
    return `Plan name must be ${PLAN_NAME_RULES.MAX_LENGTH} characters or less`;
  }

  // Check for leading/trailing whitespace in original input
  if (name !== trimmed) {
    return 'Plan name cannot have leading or trailing whitespace';
  }

  return true;
}
