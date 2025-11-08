/**
 * Unit tests for auto-fit algorithm
 */

import { autoFitSubnets } from '../../src/core/calculators/auto-fit.js';
import type { Subnet } from '../../src/core/models/network-plan.js';
import { parseAvailableBlocks } from '../../src/utils/block-parser.js';

// Helper to create test subnet
function createTestSubnet(
  id: string,
  vlanId: number,
  expectedDevices: number,
  subnetSize: number,
  cidrPrefix: number,
): Subnet {
  return {
    id,
    name: `Subnet ${id}`,
    vlanId,
    expectedDevices,
    subnetInfo: {
      expectedDevices,
      plannedDevices: expectedDevices * 2,
      requiredHosts: expectedDevices * 2,
      cidrPrefix,
      subnetSize,
      usableHosts: subnetSize - 2,
    },
  };
}

describe('Auto-Fit Algorithm', () => {
  describe('autoFitSubnets', () => {
    it('should allocate single subnet into single block', () => {
      const subnets: Subnet[] = [createTestSubnet('1', 10, 50, 128, 25)];

      const blocks = parseAvailableBlocks('10.1.241.0/24').blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.success).toBe(true);
      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0]?.networkAddress).toBe('10.1.241.0/25');
      expect(result.unallocatedSubnets).toHaveLength(0);
    });

    it('should allocate multiple subnets into single block', () => {
      const subnets: Subnet[] = [
        createTestSubnet('1', 10, 50, 128, 25),
        createTestSubnet('2', 20, 30, 64, 26),
      ];

      const blocks = parseAvailableBlocks('10.1.241.0/24').blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.success).toBe(true);
      expect(result.allocations).toHaveLength(2);
      expect(result.allocations[0]?.networkAddress).toBe('10.1.241.0/25');
      expect(result.allocations[1]?.networkAddress).toBe('10.1.241.128/26');
      expect(result.unallocatedSubnets).toHaveLength(0);
    });

    it('should allocate across multiple blocks', () => {
      const subnets: Subnet[] = [
        createTestSubnet('1', 10, 100, 256, 24),
        createTestSubnet('2', 20, 50, 128, 25),
      ];

      const blocks = parseAvailableBlocks(`10.1.241.0/24
10.1.242.0/24`).blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.success).toBe(true);
      expect(result.allocations).toHaveLength(2);
      expect(result.allocations[0]?.blockIndex).toBe(0);
      expect(result.allocations[1]?.blockIndex).toBe(1);
    });

    it('should respect CIDR boundary alignment', () => {
      const subnets: Subnet[] = [
        createTestSubnet('1', 10, 50, 128, 25),
        createTestSubnet('2', 20, 50, 128, 25),
      ];

      const blocks = parseAvailableBlocks('10.1.241.0/24').blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.success).toBe(true);
      expect(result.allocations).toHaveLength(2);
      // Both /25 subnets should align on /25 boundaries
      expect(result.allocations[0]?.networkAddress).toBe('10.1.241.0/25');
      expect(result.allocations[1]?.networkAddress).toBe('10.1.241.128/25');
    });

    it('should use best-fit strategy (smallest suitable block)', () => {
      const subnets: Subnet[] = [createTestSubnet('1', 10, 30, 64, 26)];

      const blocks = parseAvailableBlocks(`10.1.244.0/22
10.1.241.0/24`).blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.success).toBe(true);
      expect(result.allocations).toHaveLength(1);
      // Should use smaller /24 block, not /22
      expect(result.allocations[0]?.blockIndex).toBe(1);
      expect(result.allocations[0]?.networkAddress).toMatch(/^10\.1\.241/);
    });

    it('should report insufficient capacity', () => {
      const subnets: Subnet[] = [createTestSubnet('1', 10, 500, 1024, 22)];

      const blocks = parseAvailableBlocks('10.1.241.0/24').blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.success).toBe(false);
      expect(result.allocations).toHaveLength(0);
      expect(result.unallocatedSubnets).toHaveLength(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle fragmentation', () => {
      const subnets: Subnet[] = [
        // Large subnet that fragments the block
        createTestSubnet('1', 10, 100, 256, 24),
        // Small subnet that can't fit in remaining space
        createTestSubnet('2', 20, 100, 256, 24),
      ];

      const blocks = parseAvailableBlocks('10.1.241.0/24').blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.success).toBe(false);
      expect(result.allocations).toHaveLength(1); // Only first fits
      expect(result.unallocatedSubnets).toHaveLength(1);
    });

    it('should calculate block utilization correctly', () => {
      const subnets: Subnet[] = [createTestSubnet('1', 10, 50, 128, 25)];

      const blocks = parseAvailableBlocks('10.1.241.0/24').blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.blockUtilizations).toHaveLength(1);
      expect(result.blockUtilizations[0]?.usedCapacity).toBe(128);
      expect(result.blockUtilizations[0]?.remainingCapacity).toBe(128);
      expect(result.blockUtilizations[0]?.utilizationPercent).toBe(50);
    });

    it('should warn about low utilization', () => {
      const subnets: Subnet[] = [createTestSubnet('1', 10, 10, 32, 27)];

      const blocks = parseAvailableBlocks('10.1.244.0/22').blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.success).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.match(/low utilization/i))).toBe(true);
    });

    it('should warn about unused blocks', () => {
      const subnets: Subnet[] = [createTestSubnet('1', 10, 50, 128, 25)];

      const blocks = parseAvailableBlocks(`10.1.241.0/24
10.1.242.0/24
10.1.243.0/24`).blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => w.match(/unused/i))).toBe(true);
    });

    it('should allocate subnets by VLAN ID, then by size (VLSM optimization)', () => {
      const subnets: Subnet[] = [
        createTestSubnet('1', 1007, 10, 32, 27), // Small subnet, higher VLAN
        createTestSubnet('2', 1006, 100, 256, 24), // Large subnet, lower VLAN
        createTestSubnet('3', 1006, 50, 128, 25), // Medium subnet, lower VLAN
      ];

      const blocks = parseAvailableBlocks('10.1.240.0/22').blocks;

      const result = autoFitSubnets(subnets, blocks);

      expect(result.success).toBe(true);
      // VLAN 1006 allocated first (index 1 and 2), sorted by size descending
      expect(result.allocations[0]?.subnetIndex).toBe(1); // VLAN 1006, /24 (largest)
      expect(result.allocations[1]?.subnetIndex).toBe(2); // VLAN 1006, /25
      expect(result.allocations[2]?.subnetIndex).toBe(0); // VLAN 1007, /27
    });
  });
});
