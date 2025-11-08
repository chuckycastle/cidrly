/**
 * Input parsing helper functions
 */

/**
 * Parse VLAN ID from string input
 * @throws {Error} If value is not a valid number
 */
export function parseVlanId(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid VLAN ID: not a number`);
  }
  return parsed;
}

/**
 * Parse device count from string input
 * @throws {Error} If value is not a valid number
 */
export function parseDeviceCount(value: string): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid device count: not a number`);
  }
  return parsed;
}
