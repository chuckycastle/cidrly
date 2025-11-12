/**
 * Block Parser Utility
 * Parses and validates available IP blocks for auto-fit allocation
 */

import { validateIpAddress } from '../core/validators/validators.js';

export interface AvailableBlock {
  networkAddress: string;
  cidrPrefix: number;
  totalCapacity: number;
  startInt: number;
  endInt: number;
}

export interface BlockParseResult {
  valid: boolean;
  blocks: AvailableBlock[];
  errors: string[];
}

/**
 * Converts IP address string to 32-bit integer
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  if (parts.some(isNaN)) {
    throw new Error(`Invalid IP address format: ${ip}`);
  }
  return (parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!;
}

/**
 * Calculate total IP addresses in a CIDR block
 */
function calculateBlockCapacity(cidrPrefix: number): number {
  return Math.pow(2, 32 - cidrPrefix);
}

/**
 * Parse a single CIDR block string
 */
function parseBlock(blockStr: string, lineNumber: number): AvailableBlock | string {
  const trimmed = blockStr.trim();

  // Skip empty lines
  if (!trimmed) {
    return `Line ${lineNumber}: Empty line`;
  }

  // Parse CIDR notation
  const parts = trimmed.split('/');
  if (parts.length !== 2) {
    return `Line ${lineNumber}: Invalid CIDR format. Expected: x.x.x.x/prefix (e.g., "10.0.0.0/24")`;
  }

  const ipAddress = parts[0];
  const prefixStr = parts[1];

  if (!ipAddress || !prefixStr) {
    return `Line ${lineNumber}: Missing IP address or prefix`;
  }

  // Validate IP address
  const ipValidation = validateIpAddress(ipAddress);
  if (ipValidation !== true) {
    return `Line ${lineNumber}: ${ipValidation}`;
  }

  // Validate CIDR prefix
  const cidrPrefix = parseInt(prefixStr, 10);
  if (isNaN(cidrPrefix) || cidrPrefix < 8 || cidrPrefix > 30) {
    return `Line ${lineNumber}: CIDR prefix must be between 8 and 30. Got: ${prefixStr}`;
  }

  // Check network boundary alignment
  const ipInt = ipToInt(ipAddress);
  const subnetMask = ~((1 << (32 - cidrPrefix)) - 1);
  const networkInt = ipInt & subnetMask;

  if (ipInt !== networkInt) {
    const correctNetwork = [
      (networkInt >>> 24) & 255,
      (networkInt >>> 16) & 255,
      (networkInt >>> 8) & 255,
      networkInt & 255,
    ].join('.');
    return `Line ${lineNumber}: Address not on /${cidrPrefix} boundary. Should be ${correctNetwork}/${cidrPrefix}`;
  }

  // Calculate block range
  const totalCapacity = calculateBlockCapacity(cidrPrefix);
  const startInt = networkInt;
  const endInt = networkInt + totalCapacity - 1;

  return {
    networkAddress: `${ipAddress}/${cidrPrefix}`,
    cidrPrefix,
    totalCapacity,
    startInt,
    endInt,
  };
}

/**
 * Check for overlaps between blocks
 */
function detectBlockOverlaps(blocks: AvailableBlock[]): string[] {
  const errors: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const blockA = blocks[i]!;
      const blockB = blocks[j]!;

      const overlaps =
        (blockA.startInt >= blockB.startInt && blockA.startInt <= blockB.endInt) ||
        (blockA.endInt >= blockB.startInt && blockA.endInt <= blockB.endInt) ||
        (blockB.startInt >= blockA.startInt && blockB.startInt <= blockA.endInt);

      if (overlaps) {
        errors.push(`Blocks overlap: ${blockA.networkAddress} and ${blockB.networkAddress}`);
      }
    }
  }

  return errors;
}

/**
 * Parse multiple CIDR blocks from multi-line input
 *
 * @param input - Multi-line string with one CIDR block per line
 * @returns Parse result with blocks and errors
 *
 * @example
 * ```ts
 * const result = parseAvailableBlocks(`
 *   10.1.241.0/24
 *   10.1.242.0/24
 *   10.1.244.0/22
 * `);
 * ```
 */
export function parseAvailableBlocks(input: string): BlockParseResult {
  const result: BlockParseResult = {
    valid: true,
    blocks: [],
    errors: [],
  };

  if (!input || input.trim().length === 0) {
    result.valid = false;
    result.errors.push('No blocks provided. Enter at least one CIDR block.');
    return result;
  }

  const lines = input.split('\n');
  const blocks: AvailableBlock[] = [];

  // Parse each line
  for (const [i, lineContent] of lines.entries()) {
    const line = lineContent.trim();

    // Skip empty lines
    if (!line) {
      continue;
    }

    const parseResult = parseBlock(line, i + 1);

    if (typeof parseResult === 'string') {
      result.errors.push(parseResult);
      result.valid = false;
    } else {
      blocks.push(parseResult);
    }
  }

  // Check for overlaps
  if (blocks.length > 0) {
    const overlapErrors = detectBlockOverlaps(blocks);
    result.errors.push(...overlapErrors);
    if (overlapErrors.length > 0) {
      result.valid = false;
    }
  }

  // Sort blocks by size (largest first) for better allocation
  blocks.sort((a, b) => b.totalCapacity - a.totalCapacity);

  result.blocks = blocks;

  return result;
}

/**
 * Calculate total capacity across all blocks
 */
export function calculateTotalCapacity(blocks: AvailableBlock[]): number {
  return blocks.reduce((sum, block) => sum + block.totalCapacity, 0);
}

/**
 * Format capacity as human-readable string
 */
export function formatCapacity(capacity: number): string {
  return capacity.toLocaleString();
}
