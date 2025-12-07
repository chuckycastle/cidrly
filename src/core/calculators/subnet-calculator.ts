/**
 * Subnet Calculator Module
 * Provides core functionality for calculating subnet sizes and supernets
 */

/**
 * Calculate 2^n using bit shifting for performance
 * Uses `>>> 0` to convert to unsigned 32-bit integer
 * Falls back to Math.pow for n >= 32 (edge case for /0 supernets)
 */
function pow2(n: number): number {
  // Bit shifting: faster than Math.pow for common IPv4 calculations
  // 1 << n wraps at 32 bits, so use Math.pow for n >= 32
  return n < 32 ? (1 << n) >>> 0 : Math.pow(2, n);
}

export interface SubnetInfo {
  expectedDevices: number;
  plannedDevices: number;
  requiredHosts: number;
  subnetSize: number;
  cidrPrefix: number;
  usableHosts: number;
  networkAddress?: string;
}

/**
 * Apply growth rule with configurable percentage
 * Network and broadcast addresses are added later by calculateHostBits()
 *
 * @param expectedDevices - Number of devices expected to use the subnet
 * @param growthPercentage - Growth capacity percentage (0-300%, default: 100%)
 *   - 0%: No growth (exact device count)
 *   - 100%: Double the capacity (default)
 *   - 200%: Triple the capacity
 *   - 300%: Quadruple the capacity
 *
 * Formula: expectedDevices × (1 + growthPercentage / 100)
 * Example: 25 devices with 100% growth = 25 × 2 = 50 planned devices
 */
export function applyPlanningRule(expectedDevices: number, growthPercentage: number = 100): number {
  // Calculate growth multiplier from percentage
  const multiplier = 1 + growthPercentage / 100;

  // Apply growth rule - network/broadcast overhead added by calculateHostBits()
  return Math.ceil(expectedDevices * multiplier);
}

/**
 * Calculate the number of host bits needed for a given host count
 * Accounts for network and broadcast addresses using binary subnet sizing
 *
 * @param hostCount - Number of usable host addresses needed
 * @returns Number of host bits required (1-30)
 *
 * @remarks
 * Algorithm: Find the smallest power of 2 that accommodates hosts + 2 reserved addresses
 * - Network address: First address in subnet (e.g., 10.0.0.0)
 * - Broadcast address: Last address in subnet (e.g., 10.0.0.255)
 *
 * @example
 * ```typescript
 * calculateHostBits(50)  // Returns 6 (2^6 = 64 addresses, 62 usable)
 * calculateHostBits(100) // Returns 7 (2^7 = 128 addresses, 126 usable)
 * calculateHostBits(254) // Returns 8 (2^8 = 256 addresses, 254 usable)
 * ```
 */
export function calculateHostBits(hostCount: number): number {
  // Need to accommodate hostCount + network address + broadcast address
  const totalAddresses = hostCount + 2;

  // Find the smallest power of 2 that can fit totalAddresses
  // Example: 50 hosts + 2 = 52, need 2^6 = 64 addresses (6 host bits)
  let hostBits = 0;
  while (pow2(hostBits) < totalAddresses) {
    hostBits++;
  }

  return hostBits;
}

/**
 * Calculate CIDR prefix from host bits
 */
export function calculateCIDR(hostBits: number): number {
  return 32 - hostBits;
}

/**
 * Calculate subnet size (total addresses) from CIDR
 *
 * @param cidr - CIDR prefix (0-32)
 * @returns Total number of addresses in subnet
 * @throws Error if CIDR is out of valid range
 */
export function calculateSubnetSize(cidr: number): number {
  if (cidr < 0 || cidr > 32) {
    throw new Error(`Invalid CIDR prefix: ${cidr}. Must be between 0 and 32.`);
  }

  const hostBits = 32 - cidr;
  return pow2(hostBits);
}

/**
 * Calculate usable hosts from subnet size
 */
export function calculateUsableHosts(subnetSize: number): number {
  // Subtract network and broadcast addresses
  return subnetSize - 2;
}

/**
 * Calculate netmask in dotted decimal format from CIDR
 *
 * @param cidr - CIDR prefix (0-32)
 * @returns Netmask in dotted decimal format (e.g., "255.255.255.0")
 * @throws Error if CIDR is out of valid range
 */
export function calculateNetmask(cidr: number): string {
  if (cidr < 0 || cidr > 32) {
    throw new Error(`Invalid CIDR prefix: ${cidr}. Must be between 0 and 32.`);
  }

  const mask = ~((1 << (32 - cidr)) - 1);
  return [(mask >>> 24) & 255, (mask >>> 16) & 255, (mask >>> 8) & 255, mask & 255].join('.');
}

/**
 * Calculate wildcard mask from CIDR
 *
 * @param cidr - CIDR prefix (0-32)
 * @returns Wildcard mask in dotted decimal format (e.g., "0.0.0.255")
 * @throws Error if CIDR is out of valid range
 */
export function calculateWildcard(cidr: number): string {
  if (cidr < 0 || cidr > 32) {
    throw new Error(`Invalid CIDR prefix: ${cidr}. Must be between 0 and 32.`);
  }

  const mask = (1 << (32 - cidr)) - 1;
  return [(mask >>> 24) & 255, (mask >>> 16) & 255, (mask >>> 8) & 255, mask & 255].join('.');
}

/**
 * Parse network address string to IP integer and CIDR
 */
function parseNetworkAddress(networkAddress: string): { ipInt: number; cidr: number } {
  const [ipStr, cidrStr] = networkAddress.split('/');
  if (!ipStr || !cidrStr) {
    throw new Error(`Invalid network address format: ${networkAddress}`);
  }
  const octets = ipStr.split('.').map(Number);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime validation of parsed numbers
  if (octets.length !== 4 || octets.some((o) => o === undefined || isNaN(o))) {
    throw new Error(`Invalid IP address format: ${ipStr}`);
  }
  const [oct1, oct2, oct3, oct4] = octets;
  if (oct1 === undefined || oct2 === undefined || oct3 === undefined || oct4 === undefined) {
    throw new Error(`Invalid IP address format: ${ipStr}`);
  }
  // Use unsigned right shift (>>>) to convert to unsigned 32-bit integer
  const ipInt = ((oct1 << 24) | (oct2 << 16) | (oct3 << 8) | oct4) >>> 0;
  const cidr = parseInt(cidrStr, 10);
  return { ipInt, cidr };
}

/**
 * Convert IP integer to dotted decimal string
 */
function ipIntToString(ipInt: number): string {
  return [(ipInt >>> 24) & 255, (ipInt >>> 16) & 255, (ipInt >>> 8) & 255, ipInt & 255].join('.');
}

/**
 * Calculate first usable host IP (network address + 1)
 */
export function calculateHostMin(networkAddress: string): string {
  const { ipInt } = parseNetworkAddress(networkAddress);
  return ipIntToString(ipInt + 1);
}

/**
 * Calculate last usable host IP (broadcast - 1)
 */
export function calculateHostMax(networkAddress: string): string {
  const { ipInt, cidr } = parseNetworkAddress(networkAddress);
  const hostBits = 32 - cidr;
  const subnetSize = pow2(hostBits);
  const broadcastInt = ipInt + subnetSize - 1;
  return ipIntToString(broadcastInt - 1);
}

/**
 * Calculate broadcast address
 */
export function calculateBroadcast(networkAddress: string): string {
  const { ipInt, cidr } = parseNetworkAddress(networkAddress);
  const hostBits = 32 - cidr;
  const subnetSize = pow2(hostBits);
  return ipIntToString(ipInt + subnetSize - 1);
}

/**
 * Get complete subnet details for ipcalc-style display
 */
export function getSubnetDetails(subnetInfo: SubnetInfo): {
  address: string;
  netmask: string;
  wildcard: string;
  network: string;
  hostMin: string;
  hostMax: string;
  broadcast: string;
  hostsNet: number;
} {
  if (!subnetInfo.networkAddress) {
    throw new Error('Subnet must have networkAddress calculated');
  }

  const [networkIp] = subnetInfo.networkAddress.split('/');
  if (!networkIp) {
    throw new Error(`Invalid network address: ${subnetInfo.networkAddress}`);
  }

  return {
    address: networkIp,
    netmask: calculateNetmask(subnetInfo.cidrPrefix),
    wildcard: calculateWildcard(subnetInfo.cidrPrefix),
    network: subnetInfo.networkAddress,
    hostMin: calculateHostMin(subnetInfo.networkAddress),
    hostMax: calculateHostMax(subnetInfo.networkAddress),
    broadcast: calculateBroadcast(subnetInfo.networkAddress),
    hostsNet: subnetInfo.usableHosts,
  };
}

/**
 * Calculate optimal subnet information for a given device count
 * Applies the growth rule with configurable percentage
 *
 * @param expectedDevices - Number of devices expected to use the subnet
 * @param growthPercentage - Growth capacity percentage (0-300%, default: 100%)
 */
export function calculateSubnet(
  expectedDevices: number,
  growthPercentage: number = 100,
): SubnetInfo {
  const plannedDevices = applyPlanningRule(expectedDevices, growthPercentage);
  const hostBits = calculateHostBits(plannedDevices);
  const cidrPrefix = calculateCIDR(hostBits);
  const subnetSize = calculateSubnetSize(cidrPrefix);
  const usableHosts = calculateUsableHosts(subnetSize);

  return {
    expectedDevices,
    plannedDevices,
    requiredHosts: expectedDevices,
    subnetSize,
    cidrPrefix,
    usableHosts,
  };
}

/**
 * Calculate the smallest supernet that can contain all subnets
 * Uses binary aggregation to find optimal CIDR prefix
 *
 * @param subnetInfos - Array of subnet specifications with calculated sizes
 * @returns Supernet summary with size and utilization metrics
 *
 * @remarks
 * **Supernet Calculation Algorithm:**
 * Determines the minimum CIDR block needed to accommodate all subnets.
 *
 * **Utilization Metrics:**
 * - `utilization`: Percentage of supernet actually used by subnets (can exceed 100%)
 * - `rangeEfficiency`: Percentage of allocated IP range used (accounts for gaps)
 *
 * **Edge Cases:**
 * - Gaps between subnets reduce range efficiency but not total utilization
 * - Subnets without network addresses default to 100% range efficiency
 *
 * @example
 * ```typescript
 * const subnets = [
 *   { subnetSize: 256, ... },  // /24
 *   { subnetSize: 128, ... },  // /25
 * ];
 *
 * calculateSupernet(subnets);
 * // Returns:
 * // {
 * //   cidrPrefix: 23,           // /23 supernet (512 addresses)
 * //   totalSize: 512,           // Total supernet capacity
 * //   usedSize: 384,            // Actually used (256 + 128)
 * //   utilization: 75.0,        // 384/512 = 75%
 * //   rangeEfficiency: 100.0    // If no gaps
 * // }
 * ```
 *
 * @throws {Error} If subnet list is empty
 */
export function calculateSupernet(subnetInfos: SubnetInfo[]): {
  cidrPrefix: number;
  totalSize: number;
  usedSize: number;
  utilization: number;
  rangeEfficiency: number;
} {
  if (subnetInfos.length === 0) {
    throw new Error('Cannot calculate supernet for empty subnet list');
  }

  // Calculate total addresses needed
  const totalAddresses = subnetInfos.reduce((sum, subnet) => sum + subnet.subnetSize, 0);

  // Find the smallest power of 2 that can fit all addresses
  let hostBits = 0;
  while (pow2(hostBits) < totalAddresses) {
    hostBits++;
  }

  const cidrPrefix = calculateCIDR(hostBits);
  const totalSize = calculateSubnetSize(cidrPrefix);
  const utilization = (totalAddresses / totalSize) * 100;

  // Calculate range efficiency (how efficiently addresses are packed in allocated range)
  let rangeEfficiency = 100; // Default to 100% if no addresses allocated yet

  // Only calculate range efficiency if subnets have network addresses
  const firstSubnet = subnetInfos[0];
  if (subnetInfos.length > 0 && firstSubnet?.networkAddress) {
    // Parse all network addresses to find actual min/max (don't assume array order)
    const addressData = subnetInfos
      .filter((subnet): subnet is SubnetInfo & { networkAddress: string } =>
        Boolean(subnet.networkAddress),
      ) // Type guard ensures networkAddress is string
      .map((subnet) => ({
        subnet,
        ipInt: parseNetworkAddress(subnet.networkAddress).ipInt, // No assertion needed
      }));

    // Find minimum IP address (first allocated subnet)
    const firstIp = Math.min(...addressData.map((d) => d.ipInt));

    // Find maximum IP address + its subnet size (last allocated subnet)
    const maxData = addressData.reduce((max, current) =>
      current.ipInt > max.ipInt ? current : max,
    );
    const lastAddress = maxData.ipInt + maxData.subnet.subnetSize - 1;

    // Calculate actual range used (inclusive)
    const rangeUsed = lastAddress - firstIp + 1;

    // Range efficiency: how much of the allocated range is actually used
    rangeEfficiency = (totalAddresses / rangeUsed) * 100;
  }

  return {
    cidrPrefix,
    totalSize,
    usedSize: totalAddresses,
    utilization,
    rangeEfficiency,
  };
}

/**
 * Generate network address from base IP and CIDR
 */
export function generateNetworkAddress(baseIp: string, cidr: number): string {
  const octets = baseIp.split('.').map((octet) => parseInt(octet, 10));
  if (octets.length !== 4) {
    throw new Error(`Invalid IP address: ${baseIp}`);
  }
  const [oct1, oct2, oct3, oct4] = octets;
  if (oct1 === undefined || oct2 === undefined || oct3 === undefined || oct4 === undefined) {
    throw new Error(`Invalid IP address: ${baseIp}`);
  }

  // Calculate subnet mask
  const mask = ~((1 << (32 - cidr)) - 1);

  // Convert octets to 32-bit unsigned integer
  let ipInt = ((oct1 << 24) | (oct2 << 16) | (oct3 << 8) | oct4) >>> 0;

  // Apply mask
  ipInt = (ipInt & mask) >>> 0;

  // Convert back to octets
  const resultOctets = [
    (ipInt >>> 24) & 255,
    (ipInt >>> 16) & 255,
    (ipInt >>> 8) & 255,
    ipInt & 255,
  ];

  return `${resultOctets.join('.')}/${cidr}`;
}

/**
 * Represents an occupied IP range (used by locked subnets)
 */
export interface OccupiedRange {
  /** Starting IP address as 32-bit unsigned integer */
  start: number;
  /** Ending IP address as 32-bit unsigned integer (inclusive) */
  end: number;
}

/**
 * Convert IP string to 32-bit unsigned integer
 */
export function ipToInt(ip: string): number {
  const octets = ip.split('.').map((octet) => parseInt(octet, 10));
  if (octets.length !== 4) {
    throw new Error(`Invalid IP address: ${ip}`);
  }
  const [oct1, oct2, oct3, oct4] = octets;
  if (oct1 === undefined || oct2 === undefined || oct3 === undefined || oct4 === undefined) {
    throw new Error(`Invalid IP address: ${ip}`);
  }
  return ((oct1 << 24) | (oct2 << 16) | (oct3 << 8) | oct4) >>> 0;
}

/**
 * Convert 32-bit unsigned integer to IP string
 */
export function intToIp(ipInt: number): string {
  return [(ipInt >>> 24) & 255, (ipInt >>> 16) & 255, (ipInt >>> 8) & 255, ipInt & 255].join('.');
}

/**
 * Allocate network addresses to subnets sequentially using VLSM (Variable Length Subnet Masking)
 * Ensures proper CIDR boundary alignment for each subnet to prevent overlaps
 * Supports gap-aware allocation to avoid overlapping with occupied (locked) subnet ranges
 *
 * @param baseIp - Starting IP address (e.g., "10.0.0.0")
 * @param subnetInfos - Array of subnet specifications (should be pre-sorted largest to smallest)
 * @param occupiedRanges - Optional array of IP ranges occupied by locked subnets
 * @returns Array of subnets with allocated network addresses
 *
 * @remarks
 * **VLSM Boundary Alignment Algorithm:**
 * Each subnet must start at an address that is a multiple of its size to maintain CIDR compliance.
 *
 * **Why Alignment Matters:**
 * - /24 subnet (256 addresses) must align on 256-byte boundaries
 * - /23 subnet (512 addresses) must align on 512-byte boundaries
 * - Misalignment causes invalid CIDR blocks and routing issues
 *
 * **Gap-Aware Allocation:**
 * When occupied ranges are provided, the algorithm skips over them to avoid overlaps.
 * This enables incremental allocation where new subnets are placed in available gaps.
 *
 * **Algorithm Steps:**
 * 1. Convert base IP to 32-bit integer
 * 2. For each subnet:
 *    a. Calculate alignment: `remainder = currentIp % subnetSize`
 *    b. If not aligned, skip forward: `currentIp += (subnetSize - remainder)`
 *    c. Check for overlap with occupied ranges; if overlap, skip past and retry
 *    d. Assign network address at aligned boundary
 *    e. Advance pointer by subnet size
 *
 * @example
 * ```typescript
 * // Allocate three subnets from 10.0.0.0
 * const subnets = [
 *   { cidrPrefix: 24, subnetSize: 256, ... }, // /24 - 256 addresses
 *   { cidrPrefix: 25, subnetSize: 128, ... }, // /25 - 128 addresses
 *   { cidrPrefix: 26, subnetSize: 64, ... },  // /26 - 64 addresses
 * ];
 *
 * allocateSubnetAddresses("10.0.0.0", subnets);
 * // Returns:
 * // [
 * //   { networkAddress: "10.0.0.0/24", ... },    // 10.0.0.0 - 10.0.0.255
 * //   { networkAddress: "10.0.1.0/25", ... },    // 10.0.1.0 - 10.0.1.127
 * //   { networkAddress: "10.0.1.128/26", ... },  // 10.0.1.128 - 10.0.1.191
 * // ]
 * ```
 *
 * @throws {Error} If base IP address is invalid
 *
 * @see https://en.wikipedia.org/wiki/Variable-length_subnet_masking
 */
export function allocateSubnetAddresses(
  baseIp: string,
  subnetInfos: SubnetInfo[],
  occupiedRanges: OccupiedRange[] = [],
): SubnetInfo[] {
  let currentIp = ipToInt(baseIp);

  // Track all occupied ranges including newly allocated ones
  const allOccupied = [...occupiedRanges];

  return subnetInfos.map((subnet) => {
    // Find next available position that doesn't overlap with occupied ranges
    let allocated = false;
    let networkAddress = '';

    while (!allocated) {
      // CRITICAL: Align to subnet boundary before allocation
      // Each subnet must start at an address that is a multiple of its size
      // Example: A /23 (512 addresses) must start at a 512-aligned boundary
      // Without alignment: Invalid CIDR blocks and routing failures
      const remainder = currentIp % subnet.subnetSize;
      if (remainder !== 0) {
        currentIp += subnet.subnetSize - remainder;
      }

      const proposedStart = currentIp;
      const proposedEnd = currentIp + subnet.subnetSize - 1;

      // Check for overlap with any occupied range
      const overlap = allOccupied.find(
        (range) => proposedStart <= range.end && proposedEnd >= range.start,
      );

      if (overlap) {
        // Skip past the overlapping range and try again
        currentIp = overlap.end + 1;
      } else {
        // No overlap - allocate here
        networkAddress = `${intToIp(currentIp)}/${subnet.cidrPrefix}`;

        // Mark this range as occupied for subsequent allocations
        allOccupied.push({ start: proposedStart, end: proposedEnd });

        // Move to next available address block
        currentIp += subnet.subnetSize;
        allocated = true;
      }
    }

    return {
      ...subnet,
      networkAddress,
    };
  });
}
