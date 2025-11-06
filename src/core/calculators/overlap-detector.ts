/**
 * Subnet Overlap Detection
 * Detects and reports IP address range conflicts between subnets
 */

export interface OverlapResult {
  hasOverlap: boolean;
  conflicts: OverlapConflict[];
}

export interface OverlapConflict {
  subnet1: string; // Network address (e.g., "10.0.0.0/24")
  subnet2: string; // Network address (e.g., "10.0.1.0/25")
  subnet1Name?: string;
  subnet2Name?: string;
  overlapType: 'complete' | 'partial';
}

/**
 * Convert IP address string to 32-bit integer
 */
function ipToInt(ip: string): number {
  const octets = ip.split('.').map(Number);
  return (
    ((octets[0] ?? 0) << 24) | ((octets[1] ?? 0) << 16) | ((octets[2] ?? 0) << 8) | (octets[3] ?? 0)
  );
}

/**
 * Parse network address into IP integer and CIDR prefix
 */
function parseNetwork(networkAddress: string): { ipInt: number; cidr: number } {
  const [ip, cidrStr] = networkAddress.split('/');
  if (!ip || !cidrStr) {
    throw new Error(`Invalid network address: ${networkAddress}`);
  }
  return {
    ipInt: ipToInt(ip),
    cidr: parseInt(cidrStr, 10),
  };
}

/**
 * Calculate the first and last IP addresses in a subnet
 */
function getSubnetRange(networkAddress: string): { start: number; end: number } {
  const { ipInt, cidr } = parseNetwork(networkAddress);
  const hostBits = 32 - cidr;
  const subnetSize = Math.pow(2, hostBits);

  return {
    start: ipInt,
    end: ipInt + subnetSize - 1,
  };
}

/**
 * Check if two IP ranges overlap
 */
function rangesOverlap(
  range1: { start: number; end: number },
  range2: { start: number; end: number },
): boolean {
  // Ranges overlap if one starts before the other ends
  return range1.start <= range2.end && range2.start <= range1.end;
}

/**
 * Determine overlap type
 */
function getOverlapType(
  range1: { start: number; end: number },
  range2: { start: number; end: number },
): 'complete' | 'partial' {
  // Complete overlap: one subnet entirely contains the other
  const range1ContainsRange2 = range1.start <= range2.start && range1.end >= range2.end;
  const range2ContainsRange1 = range2.start <= range1.start && range2.end >= range1.end;

  if (range1ContainsRange2 || range2ContainsRange1) {
    return 'complete';
  }

  return 'partial';
}

/**
 * Detect overlaps between multiple subnets
 *
 * @param subnets - Array of subnet network addresses with optional names
 * @returns Result containing overlap status and conflict details
 *
 * @example
 * ```typescript
 * const result = detectOverlaps([
 *   { networkAddress: '10.0.0.0/24', name: 'Engineering' },
 *   { networkAddress: '10.0.0.128/25', name: 'Sales' }, // Overlaps!
 * ]);
 *
 * if (result.hasOverlap) {
 *   console.log(result.conflicts[0].overlapType); // 'complete'
 * }
 * ```
 */
export function detectOverlaps(
  subnets: Array<{ networkAddress: string; name?: string }>,
): OverlapResult {
  const conflicts: OverlapConflict[] = [];

  // Compare each subnet with every other subnet
  for (let i = 0; i < subnets.length; i++) {
    const subnet1 = subnets[i];
    if (!subnet1?.networkAddress) continue;

    for (let j = i + 1; j < subnets.length; j++) {
      const subnet2 = subnets[j];
      if (!subnet2?.networkAddress) continue;

      const range1 = getSubnetRange(subnet1.networkAddress);
      const range2 = getSubnetRange(subnet2.networkAddress);

      if (rangesOverlap(range1, range2)) {
        conflicts.push({
          subnet1: subnet1.networkAddress,
          subnet2: subnet2.networkAddress,
          subnet1Name: subnet1.name,
          subnet2Name: subnet2.name,
          overlapType: getOverlapType(range1, range2),
        });
      }
    }
  }

  return {
    hasOverlap: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Check if a new subnet would overlap with existing subnets
 *
 * @param newSubnet - New subnet to check
 * @param existingSubnets - Array of existing subnets
 * @returns Overlap result for the new subnet
 *
 * @example
 * ```typescript
 * const result = checkNewSubnetOverlap(
 *   { networkAddress: '10.0.0.128/25', name: 'New Subnet' },
 *   [{ networkAddress: '10.0.0.0/24', name: 'Engineering' }]
 * );
 *
 * if (result.hasOverlap) {
 *   console.log(`Conflict with ${result.conflicts[0].subnet2Name}`);
 * }
 * ```
 */
export function checkNewSubnetOverlap(
  newSubnet: { networkAddress: string; name?: string },
  existingSubnets: Array<{ networkAddress: string; name?: string }>,
): OverlapResult {
  const conflicts: OverlapConflict[] = [];

  if (!newSubnet.networkAddress) {
    return { hasOverlap: false, conflicts: [] };
  }

  const newRange = getSubnetRange(newSubnet.networkAddress);

  for (const existing of existingSubnets) {
    if (!existing.networkAddress) continue;

    const existingRange = getSubnetRange(existing.networkAddress);

    if (rangesOverlap(newRange, existingRange)) {
      conflicts.push({
        subnet1: newSubnet.networkAddress,
        subnet2: existing.networkAddress,
        subnet1Name: newSubnet.name,
        subnet2Name: existing.name,
        overlapType: getOverlapType(newRange, existingRange),
      });
    }
  }

  return {
    hasOverlap: conflicts.length > 0,
    conflicts,
  };
}
