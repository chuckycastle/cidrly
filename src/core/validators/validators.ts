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

export function validateSubnetName(name: string): string | true {
  if (!name || name.trim().length === 0) {
    return 'Subnet name cannot be empty';
  }
  if (!isValidNameLength(name, SUBNET_NAME_RULES)) {
    return `Subnet name must be ${SUBNET_NAME_RULES.MAX_LENGTH} characters or less`;
  }
  return true;
}

export function validateVlanId(input: string): string | true {
  // Prevent DoS via extremely long input strings
  if (input.length > 10) {
    return 'VLAN ID input is too long';
  }

  const vlanId = parseInt(input, 10);

  if (isNaN(vlanId)) {
    return 'VLAN ID must be a number';
  }

  if (!isValidVlanRange(vlanId)) {
    return `VLAN ID must be between ${VLAN_RULES.MIN} and ${VLAN_RULES.MAX}`;
  }

  return true;
}

export function validateDeviceCount(input: string): string | true {
  // Prevent DoS via extremely long input strings
  if (input.length > 15) {
    return 'Device count input is too long';
  }

  const count = parseInt(input, 10);

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

export function validateIpAddress(ip: string): string | true {
  // Prevent DoS via extremely long input strings
  if (ip.length > 15) {
    return 'IP address input is too long';
  }

  const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipRegex);

  if (!match) {
    return 'Invalid IP address format (expected: x.x.x.x)';
  }

  for (let i = 1; i <= IP_ADDRESS_RULES.OCTET_COUNT; i++) {
    const octetStr = match[i];
    if (!octetStr) {
      return `Missing octet ${i}`;
    }
    const octet = parseInt(octetStr, 10);
    if (!isValidIpOctet(octet)) {
      return `Octet ${i} must be between ${IP_ADDRESS_RULES.OCTET_MIN} and ${IP_ADDRESS_RULES.OCTET_MAX}`;
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

export function validatePlanName(name: string): string | true {
  if (!name || name.trim().length === 0) {
    return 'Plan name cannot be empty';
  }
  if (!isValidNameLength(name, PLAN_NAME_RULES)) {
    return `Plan name must be ${PLAN_NAME_RULES.MAX_LENGTH} characters or less`;
  }
  return true;
}
