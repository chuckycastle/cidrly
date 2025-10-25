/**
 * Input parsing helper functions
 */

/**
 * Parse VLAN ID from string input
 */
export function parseVlanId(value: string): number {
  return parseInt(value, 10);
}

/**
 * Parse device count from string input
 */
export function parseDeviceCount(value: string): number {
  return parseInt(value, 10);
}
