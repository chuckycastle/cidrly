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
  isReservedVlan,
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

  // Check for reserved VLANs (universally blocked)
  if (isReservedVlan(vlanId)) {
    if (vlanId >= 1002 && vlanId <= 1005) {
      return `VLAN ${vlanId} is reserved for Token Ring/FDDI`;
    }
    if (vlanId === 0 || vlanId === 4095) {
      return `VLAN ${vlanId} is reserved by IEEE 802.1Q`;
    }
    return `VLAN ${vlanId} is reserved`;
  }

  return true;
}

/**
 * Validates that a VLAN ID is unique within a plan
 * @param vlanId - The VLAN ID to check
 * @param existingVlans - Array of existing VLAN IDs in the plan
 * @param excludeIndex - Optional index to exclude from check (for edit operations)
 * @returns Validation error message or true if valid
 */
export function validateVlanIdUnique(
  vlanId: number,
  existingVlans: number[],
  excludeIndex?: number,
): string | true {
  const isDuplicate = existingVlans.some((v, i) => v === vlanId && i !== excludeIndex);

  if (isDuplicate) {
    return `VLAN ${vlanId} is already in use`;
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

/**
 * Validation result for manual network address editing
 */
export interface ManualNetworkValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a manually entered network address for a subnet
 * @param networkAddress - Network address in CIDR format (e.g., "10.0.0.0/24")
 * @param cidrPrefix - Expected CIDR prefix for the subnet
 * @param baseNetwork - Base network IP for the plan
 * @param existingSubnets - Array of existing subnets to check for overlaps
 * @param currentSubnetId - ID of subnet being edited (to exclude from overlap check)
 * @returns Validation result with errors and warnings
 */
export function validateManualNetworkAddress(
  networkAddress: string,
  cidrPrefix: number,
  baseNetwork: string,
  existingSubnets: Array<{
    id: string;
    subnetInfo?: { networkAddress?: string; cidrPrefix: number };
  }>,
  currentSubnetId: string,
): ManualNetworkValidationResult {
  const result: ManualNetworkValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Extract IP and prefix from input
  const parts = networkAddress.split('/');
  if (parts.length !== 2) {
    result.valid = false;
    result.errors.push('Network address must include CIDR prefix (e.g., "10.0.0.0/24")');
    return result;
  }

  const ipAddress = parts[0];
  const prefixStr = parts[1];

  if (!ipAddress || !prefixStr) {
    result.valid = false;
    result.errors.push('Network address must include both IP and CIDR prefix');
    return result;
  }

  const inputPrefix = parseInt(prefixStr, 10);

  // Validate IP format
  const ipValidation = validateIpAddress(ipAddress);
  if (ipValidation !== true) {
    result.valid = false;
    result.errors.push(ipValidation);
    return result;
  }

  // Validate CIDR prefix format
  if (isNaN(inputPrefix) || inputPrefix < 8 || inputPrefix > 30) {
    result.valid = false;
    result.errors.push(`CIDR prefix must be between 8 and 30. Got: ${prefixStr}`);
    return result;
  }

  // Warn if CIDR prefix doesn't match expected size
  if (inputPrefix !== cidrPrefix) {
    result.warnings.push(
      `Network size (/${inputPrefix}) differs from calculated size (/${cidrPrefix}). This may result in insufficient capacity.`,
    );
  }

  // Check network boundary alignment
  const ipParts = ipAddress.split('.').map(Number);
  if (ipParts.some(isNaN)) {
    result.valid = false;
    result.errors.push('Invalid IP address format');
    return result;
  }
  const ipInt = (ipParts[0]! << 24) | (ipParts[1]! << 16) | (ipParts[2]! << 8) | ipParts[3]!;
  const subnetMask = ~((1 << (32 - inputPrefix)) - 1);
  const networkInt = ipInt & subnetMask;

  if (ipInt !== networkInt) {
    const correctNetwork = [
      (networkInt >>> 24) & 255,
      (networkInt >>> 16) & 255,
      (networkInt >>> 8) & 255,
      networkInt & 255,
    ].join('.');

    result.valid = false;
    result.errors.push(
      `Address not on /${inputPrefix} boundary. Network address should be ${correctNetwork}/${inputPrefix}`,
    );
    return result;
  }

  // Warn if outside base network range
  const baseIpValidation = validateIpAddress(baseNetwork);
  if (baseIpValidation === true) {
    const baseParts = baseNetwork.split('.').map(Number);
    if (baseParts.some(isNaN)) {
      // Skip validation if base network is invalid
      return result;
    }
    const baseFirstOctet = baseParts[0];
    const inputFirstOctet = ipParts[0];

    if (inputFirstOctet !== baseFirstOctet) {
      result.warnings.push(
        `Network address (${ipAddress}) outside base network range (${baseNetwork}). Ensure this is intentional.`,
      );
    }
  }

  // Check for overlaps with existing subnets
  for (const subnet of existingSubnets) {
    // Skip the current subnet being edited
    if (subnet.id === currentSubnetId) {
      continue;
    }

    const existingAddr = subnet.subnetInfo?.networkAddress;
    if (!existingAddr) {
      continue;
    }

    // Parse existing network address
    const existingParts = existingAddr.split('/');
    if (existingParts.length !== 2) {
      continue;
    }

    const existingIp = existingParts[0];
    const existingPrefixStr = existingParts[1];

    if (!existingIp || !existingPrefixStr) {
      continue;
    }

    const existingPrefix = parseInt(existingPrefixStr, 10);
    if (isNaN(existingPrefix)) {
      continue; // Skip invalid prefix
    }

    // Calculate ranges for both networks
    const existingIpParts = existingIp.split('.').map(Number);
    if (existingIpParts.some(isNaN)) {
      continue; // Skip invalid IP
    }
    const existingIpInt =
      (existingIpParts[0]! << 24) |
      (existingIpParts[1]! << 16) |
      (existingIpParts[2]! << 8) |
      existingIpParts[3]!;
    const existingMask = ~((1 << (32 - existingPrefix)) - 1);
    const existingNetworkInt = existingIpInt & existingMask;
    const existingBroadcastInt = existingNetworkInt | ~existingMask;

    const newMask = ~((1 << (32 - inputPrefix)) - 1);
    const newNetworkInt = ipInt & newMask;
    const newBroadcastInt = newNetworkInt | ~newMask;

    // Check for overlap
    const overlaps =
      (newNetworkInt >= existingNetworkInt && newNetworkInt <= existingBroadcastInt) ||
      (newBroadcastInt >= existingNetworkInt && newBroadcastInt <= existingBroadcastInt) ||
      (existingNetworkInt >= newNetworkInt && existingNetworkInt <= newBroadcastInt);

    if (overlaps) {
      result.valid = false;
      result.errors.push(`Network overlaps with existing subnet at ${existingAddr}`);
    }
  }

  return result;
}
