/**
 * Availability Calculator Tests
 */

import { describe, expect, it } from '@jest/globals';
import {
  calculateAvailableSpace,
  findFreeRanges,
  findSourceBlock,
  rangeToOptimalCIDRBlocks,
  tryAllocateSubnetToAvailableSpace,
} from '../../src/core/calculators/availability-calculator.js';
import type { AssignedBlock, Subnet } from '../../src/core/models/network-plan.js';

/**
 * Helper to create an AssignedBlock
 */
function createBlock(networkAddress: string, id?: string): AssignedBlock {
  const [ip, prefixStr] = networkAddress.split('/');
  const prefix = parseInt(prefixStr!, 10);
  const octets = ip!.split('.').map(Number);
  const startInt = ((octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!) >>> 0;
  const size = Math.pow(2, 32 - prefix);

  return {
    id: id ?? `block-${networkAddress}`,
    networkAddress,
    cidrPrefix: prefix,
    totalCapacity: size,
    startInt,
    endInt: startInt + size - 1,
    assignedAt: new Date(),
  };
}

/**
 * Helper to create a Subnet with network address
 */
function createSubnet(name: string, networkAddress: string, sourceBlockId?: string): Subnet {
  return {
    id: `subnet-${name}`,
    name,
    vlanId: 10,
    expectedDevices: 10,
    networkLocked: true,
    subnetInfo: {
      expectedDevices: 10,
      plannedDevices: 10,
      requiredHosts: 12,
      subnetSize: 16,
      cidrPrefix: parseInt(networkAddress.split('/')[1]!, 10),
      usableHosts: 14,
      networkAddress,
    },
    sourceBlockId,
  };
}

describe('availability-calculator', () => {
  describe('rangeToOptimalCIDRBlocks', () => {
    it('should convert aligned /24 range to single block', () => {
      // 10.0.0.0 to 10.0.0.255 (256 IPs)
      const startInt = (10 << 24) | (0 << 16) | (0 << 8) | 0;
      const endInt = startInt + 255;

      const fragments = rangeToOptimalCIDRBlocks('block-1', startInt, endInt);

      expect(fragments).toHaveLength(1);
      expect(fragments[0]!.networkAddress).toBe('10.0.0.0/24');
      expect(fragments[0]!.capacity).toBe(256);
    });

    it('should split misaligned range into multiple blocks', () => {
      // 10.1.241.32 to 10.1.241.127 (96 IPs)
      // Should produce: 10.1.241.32/27 (32) + 10.1.241.64/26 (64) = 96
      const startInt = (10 << 24) | (1 << 16) | (241 << 8) | 32;
      const endInt = (10 << 24) | (1 << 16) | (241 << 8) | 127;

      const fragments = rangeToOptimalCIDRBlocks('block-1', startInt, endInt);

      expect(fragments).toHaveLength(2);
      expect(fragments[0]!.networkAddress).toBe('10.1.241.32/27');
      expect(fragments[0]!.capacity).toBe(32);
      expect(fragments[1]!.networkAddress).toBe('10.1.241.64/26');
      expect(fragments[1]!.capacity).toBe(64);
    });

    it('should handle single IP range (/32)', () => {
      const startInt = (10 << 24) | (0 << 16) | (0 << 8) | 1;
      const endInt = startInt;

      const fragments = rangeToOptimalCIDRBlocks('block-1', startInt, endInt);

      expect(fragments).toHaveLength(1);
      expect(fragments[0]!.networkAddress).toBe('10.0.0.1/32');
      expect(fragments[0]!.capacity).toBe(1);
    });
  });

  describe('findFreeRanges', () => {
    it('should return entire block when no allocations', () => {
      const block = createBlock('10.0.0.0/24');
      const freeRanges = findFreeRanges(block, []);

      expect(freeRanges).toHaveLength(1);
      expect(freeRanges[0]!.startInt).toBe(block.startInt);
      expect(freeRanges[0]!.endInt).toBe(block.endInt);
    });

    it('should return empty array when block fully allocated', () => {
      const block = createBlock('10.0.0.0/24');
      const allocations = [{ startInt: block.startInt, endInt: block.endInt }];

      const freeRanges = findFreeRanges(block, allocations);

      expect(freeRanges).toHaveLength(0);
    });

    it('should find gap between two allocations', () => {
      const block = createBlock('10.0.0.0/24');
      // Allocate first 64 IPs and last 64 IPs, leaving 128 in middle
      const allocations = [
        { startInt: block.startInt, endInt: block.startInt + 63 },
        { startInt: block.endInt - 63, endInt: block.endInt },
      ];

      const freeRanges = findFreeRanges(block, allocations);

      expect(freeRanges).toHaveLength(1);
      expect(freeRanges[0]!.startInt).toBe(block.startInt + 64);
      expect(freeRanges[0]!.endInt).toBe(block.endInt - 64);
    });

    it('should find leading gap', () => {
      const block = createBlock('10.0.0.0/24');
      // Allocate last half of block
      const allocations = [{ startInt: block.startInt + 128, endInt: block.endInt }];

      const freeRanges = findFreeRanges(block, allocations);

      expect(freeRanges).toHaveLength(1);
      expect(freeRanges[0]!.startInt).toBe(block.startInt);
      expect(freeRanges[0]!.endInt).toBe(block.startInt + 127);
    });

    it('should find trailing gap', () => {
      const block = createBlock('10.0.0.0/24');
      // Allocate first half of block
      const allocations = [{ startInt: block.startInt, endInt: block.startInt + 127 }];

      const freeRanges = findFreeRanges(block, allocations);

      expect(freeRanges).toHaveLength(1);
      expect(freeRanges[0]!.startInt).toBe(block.startInt + 128);
      expect(freeRanges[0]!.endInt).toBe(block.endInt);
    });

    it('should handle overlapping allocations by merging', () => {
      const block = createBlock('10.0.0.0/24');
      // Two overlapping allocations
      const allocations = [
        { startInt: block.startInt, endInt: block.startInt + 100 },
        { startInt: block.startInt + 50, endInt: block.startInt + 150 },
      ];

      const freeRanges = findFreeRanges(block, allocations);

      expect(freeRanges).toHaveLength(1);
      expect(freeRanges[0]!.startInt).toBe(block.startInt + 151);
      expect(freeRanges[0]!.endInt).toBe(block.endInt);
    });
  });

  describe('calculateAvailableSpace', () => {
    it('should calculate correct available space for user scenario', () => {
      // User's real-world scenario
      const blocks = [
        createBlock('10.1.241.0/24', 'block-241'),
        createBlock('10.1.242.0/24', 'block-242'),
        createBlock('10.1.243.0/24', 'block-243'),
        createBlock('10.1.244.0/22', 'block-244'),
        createBlock('10.1.249.0/24', 'block-249'),
      ];

      const subnets = [
        // From 10.1.241.0/24
        createSubnet('subnet-1', '10.1.241.0/27', 'block-241'),
        createSubnet('subnet-2', '10.1.241.128/25', 'block-241'),
        // From 10.1.242.0/24 (fully allocated)
        createSubnet('subnet-3', '10.1.242.0/26', 'block-242'),
        createSubnet('subnet-4', '10.1.242.64/26', 'block-242'),
        createSubnet('subnet-5', '10.1.242.128/26', 'block-242'),
        createSubnet('subnet-6', '10.1.242.192/26', 'block-242'),
        // From 10.1.243.0/24
        createSubnet('subnet-7', '10.1.243.0/27', 'block-243'),
        createSubnet('subnet-8', '10.1.243.32/27', 'block-243'),
        createSubnet('subnet-9', '10.1.243.128/25', 'block-243'),
        // From 10.1.244.0/22 (fully allocated)
        createSubnet('subnet-10', '10.1.244.0/23', 'block-244'),
        createSubnet('subnet-11', '10.1.246.0/23', 'block-244'),
        // From 10.1.249.0/24 (fully allocated)
        createSubnet('subnet-12', '10.1.249.0/24', 'block-249'),
      ];

      const report = calculateAvailableSpace(blocks, subnets);

      // Total assigned: 256 + 256 + 256 + 1024 + 256 = 2048
      expect(report.totalAssignedCapacity).toBe(2048);

      // Total available should be 160 (32 + 64 + 64)
      expect(report.totalAvailableCapacity).toBe(160);

      // Check block-241 has 2 fragments: 10.1.241.32/27 (32) + 10.1.241.64/26 (64)
      const block241 = report.blockSummaries.find((s) => s.blockId === 'block-241');
      expect(block241).toBeDefined();
      expect(block241!.availableCapacity).toBe(96);
      expect(block241!.fragments).toHaveLength(2);
      expect(block241!.fragments[0]!.networkAddress).toBe('10.1.241.32/27');
      expect(block241!.fragments[1]!.networkAddress).toBe('10.1.241.64/26');

      // Check block-242 is fully allocated
      const block242 = report.blockSummaries.find((s) => s.blockId === 'block-242');
      expect(block242).toBeDefined();
      expect(block242!.availableCapacity).toBe(0);
      expect(block242!.fragments).toHaveLength(0);

      // Check block-243 has 1 fragment: 10.1.243.64/26 (64)
      const block243 = report.blockSummaries.find((s) => s.blockId === 'block-243');
      expect(block243).toBeDefined();
      expect(block243!.availableCapacity).toBe(64);
      expect(block243!.fragments).toHaveLength(1);
      expect(block243!.fragments[0]!.networkAddress).toBe('10.1.243.64/26');

      // Check block-244 is fully allocated
      const block244 = report.blockSummaries.find((s) => s.blockId === 'block-244');
      expect(block244).toBeDefined();
      expect(block244!.availableCapacity).toBe(0);

      // Check block-249 is fully allocated
      const block249 = report.blockSummaries.find((s) => s.blockId === 'block-249');
      expect(block249).toBeDefined();
      expect(block249!.availableCapacity).toBe(0);
    });

    it('should handle empty assigned blocks', () => {
      const report = calculateAvailableSpace(undefined, []);

      expect(report.totalAssignedCapacity).toBe(0);
      expect(report.totalUsedCapacity).toBe(0);
      expect(report.totalAvailableCapacity).toBe(0);
      expect(report.blockSummaries).toHaveLength(0);
    });

    it('should auto-detect subnets within blocks when no sourceBlockId', () => {
      const blocks = [createBlock('10.0.0.0/24', 'block-1')];

      // Subnet without sourceBlockId but within block range
      const subnets: Subnet[] = [
        {
          id: 'subnet-1',
          name: 'Test',
          vlanId: 10,
          expectedDevices: 10,
          networkLocked: true,
          subnetInfo: {
            expectedDevices: 10,
            plannedDevices: 10,
            requiredHosts: 12,
            subnetSize: 128,
            cidrPrefix: 25,
            usableHosts: 126,
            networkAddress: '10.0.0.0/25',
          },
        },
      ];

      const report = calculateAvailableSpace(blocks, subnets);

      expect(report.blockSummaries[0]!.allocatedSubnetIds).toContain('subnet-1');
      expect(report.blockSummaries[0]!.usedCapacity).toBe(128);
      expect(report.blockSummaries[0]!.availableCapacity).toBe(128);
    });

    it('should calculate correct utilization percentages', () => {
      const blocks = [createBlock('10.0.0.0/24', 'block-1')];
      const subnets = [createSubnet('subnet-1', '10.0.0.0/25', 'block-1')]; // 128 of 256

      const report = calculateAvailableSpace(blocks, subnets);

      expect(report.blockSummaries[0]!.utilizationPercent).toBe(50);
      expect(report.overallUtilizationPercent).toBe(50);
    });
  });

  describe('findSourceBlock', () => {
    it('should find matching block for address within range', () => {
      const blocks = [createBlock('10.0.0.0/24', 'block-1'), createBlock('10.1.0.0/24', 'block-2')];

      expect(findSourceBlock('10.0.0.64/26', blocks)).toBe('block-1');
      expect(findSourceBlock('10.1.0.0/25', blocks)).toBe('block-2');
    });

    it('should return undefined for address outside all blocks', () => {
      const blocks = [createBlock('10.0.0.0/24', 'block-1')];

      expect(findSourceBlock('192.168.0.0/24', blocks)).toBeUndefined();
    });

    it('should return undefined for empty blocks array', () => {
      expect(findSourceBlock('10.0.0.0/24', [])).toBeUndefined();
      expect(findSourceBlock('10.0.0.0/24', undefined)).toBeUndefined();
    });

    it('should return undefined for invalid address', () => {
      const blocks = [createBlock('10.0.0.0/24', 'block-1')];

      expect(findSourceBlock('invalid', blocks)).toBeUndefined();
    });
  });

  describe('tryAllocateSubnetToAvailableSpace', () => {
    /**
     * Helper to create a subnet requiring allocation
     */
    function createUnallocatedSubnet(
      name: string,
      expectedDevices: number,
      subnetSize: number,
      cidrPrefix: number,
    ): Subnet {
      return {
        id: `subnet-${name}`,
        name,
        vlanId: 10,
        expectedDevices,
        subnetInfo: {
          expectedDevices,
          plannedDevices: expectedDevices,
          requiredHosts: expectedDevices + 2,
          subnetSize,
          cidrPrefix,
          usableHosts: subnetSize - 2,
          networkAddress: '', // Not yet assigned
        },
      };
    }

    it('should allocate subnet to available fragment', () => {
      const blocks = [createBlock('10.0.0.0/24', 'block-1')];
      // Empty block = 256 IPs available
      const report = calculateAvailableSpace(blocks, []);

      // Subnet needing /25 (128 IPs)
      const subnet = createUnallocatedSubnet('test', 100, 128, 25);

      const result = tryAllocateSubnetToAvailableSpace(subnet, report);

      expect(result.success).toBe(true);
      expect(result.networkAddress).toBe('10.0.0.0/25');
      expect(result.sourceBlockId).toBe('block-1');
    });

    it('should use best-fit strategy (smallest fragment that fits)', () => {
      // Two blocks: one /24 (256), one /26 (64)
      const blocks = [
        createBlock('10.0.0.0/24', 'block-large'),
        createBlock('10.1.0.0/26', 'block-small'),
      ];
      const report = calculateAvailableSpace(blocks, []);

      // Subnet needing /27 (32 IPs) - should go to the /26 block (64), not the /24 (256)
      const subnet = createUnallocatedSubnet('test', 20, 32, 27);

      const result = tryAllocateSubnetToAvailableSpace(subnet, report);

      expect(result.success).toBe(true);
      expect(result.sourceBlockId).toBe('block-small');
      expect(result.networkAddress).toBe('10.1.0.0/27');
    });

    it('should respect CIDR alignment', () => {
      const blocks = [createBlock('10.0.0.0/24', 'block-1')];
      // Allocate first /27 (32 IPs), leaving 10.0.0.32 onwards
      const existingSubnet = createSubnet('existing', '10.0.0.0/27', 'block-1');
      const report = calculateAvailableSpace(blocks, [existingSubnet]);

      // Try to allocate a /26 (64 IPs) - needs to align to 64-byte boundary
      // Next aligned address for /26 after 10.0.0.32 is 10.0.0.64
      const subnet = createUnallocatedSubnet('test', 50, 64, 26);

      const result = tryAllocateSubnetToAvailableSpace(subnet, report);

      expect(result.success).toBe(true);
      expect(result.networkAddress).toBe('10.0.0.64/26');
    });

    it('should return error when no space available', () => {
      const blocks = [createBlock('10.0.0.0/26', 'block-1')]; // Only 64 IPs
      const report = calculateAvailableSpace(blocks, []);

      // Subnet needing /25 (128 IPs) - won't fit
      const subnet = createUnallocatedSubnet('test', 100, 128, 25);

      const result = tryAllocateSubnetToAvailableSpace(subnet, report);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No available space');
    });

    it('should return error when subnet has no subnetInfo', () => {
      const blocks = [createBlock('10.0.0.0/24', 'block-1')];
      const report = calculateAvailableSpace(blocks, []);

      const subnet: Subnet = {
        id: 'subnet-test',
        name: 'test',
        vlanId: 10,
        expectedDevices: 100,
        // No subnetInfo
      };

      const result = tryAllocateSubnetToAvailableSpace(subnet, report);

      expect(result.success).toBe(false);
      expect(result.error).toContain('has no calculated size');
    });

    it('should handle fragmented space', () => {
      // Block with allocations creating gaps
      const blocks = [createBlock('10.0.0.0/24', 'block-1')];
      const existingSubnets = [
        createSubnet('subnet-1', '10.0.0.0/27', 'block-1'), // 0-31
        createSubnet('subnet-2', '10.0.0.64/27', 'block-1'), // 64-95
        createSubnet('subnet-3', '10.0.0.128/27', 'block-1'), // 128-159
        createSubnet('subnet-4', '10.0.0.192/27', 'block-1'), // 192-223
      ];
      // Available: 10.0.0.32/27 (32-63), 10.0.0.96/27 (96-127), 10.0.0.160/27 (160-191), 10.0.0.224/27 (224-255)
      const report = calculateAvailableSpace(blocks, existingSubnets);

      // Try to allocate /27 (32 IPs) - should find first available fragment
      const subnet = createUnallocatedSubnet('test', 20, 32, 27);

      const result = tryAllocateSubnetToAvailableSpace(subnet, report);

      expect(result.success).toBe(true);
      expect(result.networkAddress).toBe('10.0.0.32/27');
      expect(result.sourceBlockId).toBe('block-1');
    });

    it('should fail when subnet needs more than any single fragment', () => {
      // Create a scenario with fragmented space totaling 128 IPs but no single fragment >= 128
      const blocks = [createBlock('10.0.0.0/24', 'block-1')];
      const existingSubnets = [
        createSubnet('subnet-1', '10.0.0.0/26', 'block-1'), // 0-63
        createSubnet('subnet-2', '10.0.0.128/26', 'block-1'), // 128-191
      ];
      // Available: 10.0.0.64/26 (64) + 10.0.0.192/26 (64) = 128 total, but fragmented
      const report = calculateAvailableSpace(blocks, existingSubnets);

      // Try to allocate /25 (128 IPs) - total available is 128, but fragmented
      const subnet = createUnallocatedSubnet('test', 100, 128, 25);

      const result = tryAllocateSubnetToAvailableSpace(subnet, report);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No available space');
    });

    it('should select lower address when equal-capacity fragments exist', () => {
      // Block with a gap creating two equal-capacity fragments
      const blocks = [createBlock('10.0.0.0/24', 'block-1')];
      const existingSubnets = [
        createSubnet('subnet-1', '10.0.0.64/26', 'block-1'), // 64-127, creating gaps at 0-63 and 128-255
      ];
      // Available: 10.0.0.0/26 (64 IPs) and 10.0.0.128/25 (128 IPs)
      // Actually: 10.0.0.0/26 (64) and 10.0.0.128/26 (64) + 10.0.0.192/26 (64)
      const report = calculateAvailableSpace(blocks, existingSubnets);

      // Allocate /26 (64 IPs) - both 10.0.0.0/26 and 10.0.0.128/26 have capacity 64
      // Should select the lower address (10.0.0.0/26) deterministically
      const subnet = createUnallocatedSubnet('test', 50, 64, 26);

      // Run allocation multiple times to verify determinism
      const result1 = tryAllocateSubnetToAvailableSpace(subnet, report);
      const result2 = tryAllocateSubnetToAvailableSpace(subnet, report);
      const result3 = tryAllocateSubnetToAvailableSpace(subnet, report);

      expect(result1.success).toBe(true);
      expect(result1.networkAddress).toBe('10.0.0.0/26');

      // Verify determinism - all calls should return the same address
      expect(result2.networkAddress).toBe(result1.networkAddress);
      expect(result3.networkAddress).toBe(result1.networkAddress);
    });
  });
});
