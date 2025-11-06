/**
 * Input Validators
 * Provides validation functions for user inputs
 */

import {
  DEVICE_COUNT_RULES,
  IP_ADDRESS_RULES,
  isBroadcastIp,
  isMulticastIp,
  isReservedIp,
  isValidDeviceCountRange,
  isValidIpOctet,
  isValidNameLength,
  isValidVlanRange,
  PLAN_NAME_RULES,
  SUBNET_DESCRIPTION_RULES,
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
    return 'Subnet name cannot be empty. Please enter a descriptive name (e.g., "Engineering", "Guest WiFi")';
  }

  if (!isValidNameLength(trimmed, SUBNET_NAME_RULES)) {
    return `Subnet name must be ${SUBNET_NAME_RULES.MAX_LENGTH} characters or less. Current length: ${trimmed.length}`;
  }

  // Check for leading/trailing whitespace in original input
  if (name !== trimmed) {
    return `Subnet name cannot have leading or trailing whitespace. Try: "${trimmed}"`;
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
    return `VLAN ID input is too long (max 10 characters). Got: ${trimmed.length}`;
  }

  const vlanId = parseInt(trimmed, 10);

  if (isNaN(vlanId)) {
    return `VLAN ID must be a number. Got: "${trimmed}"`;
  }

  if (!isValidVlanRange(vlanId)) {
    return `VLAN ID must be between ${VLAN_RULES.MIN} and ${VLAN_RULES.MAX}. Got: ${vlanId}`;
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
    return `Device count input is too long (max 15 characters). Got: ${trimmed.length}`;
  }

  const count = parseInt(trimmed, 10);

  if (isNaN(count)) {
    return `Device count must be a number. Got: "${trimmed}"`;
  }

  if (!isValidDeviceCountRange(count)) {
    if (count < DEVICE_COUNT_RULES.MIN) {
      return `Device count must be at least ${DEVICE_COUNT_RULES.MIN}. Got: ${count}`;
    }
    return `Device count is too large (max: ${DEVICE_COUNT_RULES.MAX.toLocaleString()}). Got: ${count.toLocaleString()}`;
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
    return `IP address input is too long (max 15 characters). Got: ${trimmed.length}`;
  }

  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = trimmed.match(ipRegex);

  if (!match) {
    return `Invalid IP address format. Expected: x.x.x.x (e.g., "10.0.0.0"). Got: "${trimmed}"`;
  }

  // Validate each octet is in range 0-255
  for (let i = 1; i <= IP_ADDRESS_RULES.OCTET_COUNT; i++) {
    const octetStr = match[i];
    if (!octetStr) {
      return `Missing octet ${i} in IP address`;
    }

    // Check for leading zeros (e.g., "01" or "001")
    if (octetStr.length > 1 && octetStr.startsWith('0')) {
      return `Octet ${i} has invalid leading zero: "${octetStr}". Use "${parseInt(octetStr, 10)}" instead`;
    }

    const octet = parseInt(octetStr, 10);

    if (!isValidIpOctet(octet)) {
      return `Octet ${i} must be between ${IP_ADDRESS_RULES.OCTET_MIN} and ${IP_ADDRESS_RULES.OCTET_MAX}. Got: ${octet}`;
    }
  }

  // Check for broadcast address (check before reserved to avoid 240.0.0.0/4 range matching)
  if (isBroadcastIp(trimmed)) {
    return `Broadcast IP address (255.255.255.255) not suitable for network planning. Try a private range (e.g., 10.0.0.0, 172.16.0.0, 192.168.0.0)`;
  }

  // Check for multicast address
  if (isMulticastIp(trimmed)) {
    return `Multicast IP address (224.0.0.0-239.255.255.255) not suitable for network planning. Try a private range (e.g., 10.0.0.0, 172.16.0.0, 192.168.0.0)`;
  }

  // Check for reserved IP addresses
  const reserved = isReservedIp(trimmed);
  if (reserved.isReserved) {
    return `Reserved IP address (${reserved.description}) not suitable for network planning. Try a private range (e.g., 10.0.0.0, 172.16.0.0, 192.168.0.0)`;
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
    return 'Plan name cannot be empty. Please enter a descriptive name (e.g., "Office Network", "Branch Campus")';
  }

  if (!isValidNameLength(trimmed, PLAN_NAME_RULES)) {
    return `Plan name must be ${PLAN_NAME_RULES.MAX_LENGTH} characters or less. Current length: ${trimmed.length}`;
  }

  // Check for leading/trailing whitespace in original input
  if (name !== trimmed) {
    return `Plan name cannot have leading or trailing whitespace. Try: "${trimmed}"`;
  }

  return true;
}

/**
 * Validates a subnet description
 * @param description - The subnet description to validate
 * @returns Validation error message or true if valid
 * @remarks Description is optional, so empty strings are valid
 */
export function validateSubnetDescription(description: string): string | true {
  // Trim whitespace for validation
  const trimmed = description.trim();

  // Empty description is valid (optional field)
  if (trimmed.length === 0) {
    return true;
  }

  if (trimmed.length > SUBNET_DESCRIPTION_RULES.MAX_LENGTH) {
    return `Description must be ${SUBNET_DESCRIPTION_RULES.MAX_LENGTH} characters or less. Current length: ${trimmed.length}`;
  }

  return true;
}
