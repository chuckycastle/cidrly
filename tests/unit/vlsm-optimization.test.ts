/**
 * VLSM Optimization Test Suite
 * Tests for "Largest First" subnet allocation optimization
 */

import { describe, expect, test } from '@jest/globals';
import {
  calculateSubnetRanges,
  createNetworkPlan,
  createSubnet,
} from '../../src/core/models/network-plan.js';

describe('VLSM Optimization Algorithm', () => {
  describe('Efficiency Improvements', () => {
    test('should achieve good efficiency with optimal ordering', () => {
      // Create plan with subnets in SUB-OPTIMAL order
      const plan = createNetworkPlan('Optimization Test', '10.0.0.0');

      // Add subnets in mixed size order (would create gaps with linear allocation)
      plan.subnets = [
        createSubnet('Small', 10, 10), // 10*2+2=22, needs 32 addresses → /27
        createSubnet('Large', 20, 100), // 100*2+2=202, needs 256 addresses → /24
        createSubnet('Tiny', 30, 5), // 5*2+2=12, needs 16 addresses → /28
      ];

      // Calculate with optimization
      const calculated = calculateSubnetRanges(plan);

      // Verify supernet efficiency
      expect(calculated.supernet).toBeDefined();
      const efficiency = calculated.supernet!.utilization;

      // With optimization and 50% rule:
      // Used: 256 + 32 + 16 = 304 addresses
      // Total supernet: 512 (next power of 2)
      // Efficiency: 304/512 = 59.375%
      expect(efficiency).toBeGreaterThanOrEqual(59);
    });

    test('should display subnets in optimized order (largest first)', () => {
      const plan = createNetworkPlan('Order Test', '10.0.0.0');

      // Add subnets in mixed size order
      plan.subnets = [
        createSubnet('First', 10, 5), // Smallest: 5*2+2=12 → 16 addresses → /28
        createSubnet('Second', 20, 50), // Largest: 50*2+2=102 → 128 addresses → /25
        createSubnet('Third', 30, 10), // Medium: 10*2+2=22 → 32 addresses → /27
      ];

      const calculated = calculateSubnetRanges(plan);

      // Verify subnets are sorted by size (largest first)
      expect(calculated.subnets[0].name).toBe('Second'); // Largest
      expect(calculated.subnets[1].name).toBe('Third'); // Medium
      expect(calculated.subnets[2].name).toBe('First'); // Smallest

      // Verify network addresses are sequential (no gaps)
      expect(calculated.subnets[0].subnetInfo?.networkAddress).toBe('10.0.0.0/25'); // Largest first
      expect(calculated.subnets[1].subnetInfo?.networkAddress).toBe('10.0.0.128/27'); // Medium second
      expect(calculated.subnets[2].subnetInfo?.networkAddress).toBe('10.0.0.160/28'); // Smallest third
    });

    test('should allocate largest subnet first for optimal packing', () => {
      const plan = createNetworkPlan('Allocation Test', '10.0.0.0');

      plan.subnets = [
        createSubnet('Small', 10, 10), // 10*2+2=22 → 32 addresses → /27
        createSubnet('Large', 20, 100), // 100*2+2=202 → 256 addresses → /24
        createSubnet('Medium', 30, 25), // 25*2+2=52 → 64 addresses → /26
      ];

      const calculated = calculateSubnetRanges(plan);

      // Verify subnets are now in sorted order (largest first)
      expect(calculated.subnets[0].name).toBe('Large');
      expect(calculated.subnets[1].name).toBe('Medium');
      expect(calculated.subnets[2].name).toBe('Small');

      // Verify network addresses are now sequential and match sorted order
      expect(calculated.subnets[0].subnetInfo?.networkAddress).toBe('10.0.0.0/24'); // Large first
      expect(calculated.subnets[1].subnetInfo?.networkAddress).toBe('10.0.1.0/26'); // Medium second
      expect(calculated.subnets[2].subnetInfo?.networkAddress).toBe('10.0.1.64/27'); // Small third

      // With optimization: Allocate /24, then /26, then /27
      // /24: 10.0.0.0 - 10.0.0.255 (256 addresses)
      // /26: 10.0.1.0 - 10.0.1.63 (64 addresses) - perfectly aligned!
      // /27: 10.0.1.64 - 10.0.1.95 (32 addresses) - perfectly aligned!
      // Total: 352 addresses with optimal packing
      // Network addresses are now sequential in display order!
    });
  });

  describe('Edge Cases', () => {
    test('should handle single subnet', () => {
      const plan = createNetworkPlan('Single Test', '10.0.0.0');
      plan.subnets = [createSubnet('Only', 10, 50)]; // 50*2+2=102 → 128 addresses → /25

      const calculated = calculateSubnetRanges(plan);

      expect(calculated.subnets[0].subnetInfo?.networkAddress).toBe('10.0.0.0/25');
      expect(calculated.supernet).toBeDefined();
      expect(calculated.supernet!.utilization).toBe(100); // Perfect efficiency for single subnet
    });

    test('should handle all subnets with same size', () => {
      const plan = createNetworkPlan('Same Size Test', '10.0.0.0');

      plan.subnets = [
        createSubnet('A', 10, 10), // All /27 (32 addresses each)
        createSubnet('B', 20, 10),
        createSubnet('C', 30, 10),
      ];

      const calculated = calculateSubnetRanges(plan);

      // Verify sequential allocation (order doesn't matter when sizes are same)
      expect(calculated.subnets[0].subnetInfo?.networkAddress).toBe('10.0.0.0/27');
      expect(calculated.subnets[1].subnetInfo?.networkAddress).toBe('10.0.0.32/27');
      expect(calculated.subnets[2].subnetInfo?.networkAddress).toBe('10.0.0.64/27');

      // Verify good efficiency - 3 * 32 = 96, next power of 2 is 128
      // Efficiency: 96/128 = 75%
      expect(calculated.supernet!.utilization).toBe(75);
    });

    test('should sort any input order to optimized order', () => {
      const plan = createNetworkPlan('Any Order', '10.0.0.0');

      // Add in descending size order (happens to match optimal)
      plan.subnets = [
        createSubnet('Large', 10, 100), // /24 (256 addresses)
        createSubnet('Medium', 20, 25), // /26 (64 addresses)
        createSubnet('Small', 30, 10), // /27 (32 addresses)
      ];

      const calculated = calculateSubnetRanges(plan);

      // Should maintain largest-first order
      expect(calculated.subnets[0].name).toBe('Large');
      expect(calculated.subnets[1].name).toBe('Medium');
      expect(calculated.subnets[2].name).toBe('Small');

      // Verify largest allocated first with sequential addresses
      expect(calculated.subnets[0].subnetInfo?.networkAddress).toBe('10.0.0.0/24');
      expect(calculated.subnets[1].subnetInfo?.networkAddress).toBe('10.0.1.0/26');
      expect(calculated.subnets[2].subnetInfo?.networkAddress).toBe('10.0.1.64/27');
    });

    test('should handle worst-case order (ascending)', () => {
      const plan = createNetworkPlan('Worst Case', '10.0.0.0');

      // Add in ASCENDING order (worst case for linear allocation)
      plan.subnets = [
        createSubnet('Tiny', 10, 2), // 2*2+2=6 → 8 addresses → /29
        createSubnet('Small', 20, 10), // 10*2+2=22 → 32 addresses → /27
        createSubnet('Medium', 30, 25), // 25*2+2=52 → 64 addresses → /26
        createSubnet('Large', 40, 100), // 100*2+2=202 → 256 addresses → /24
      ];

      const calculated = calculateSubnetRanges(plan);

      // Optimization should reorder to descending (largest first)
      expect(calculated.subnets[0].name).toBe('Large');
      expect(calculated.subnets[1].name).toBe('Medium');
      expect(calculated.subnets[2].name).toBe('Small');
      expect(calculated.subnets[3].name).toBe('Tiny');

      // Optimization should still achieve good efficiency
      expect(calculated.supernet).toBeDefined();
      const efficiency = calculated.supernet!.utilization;

      // Should achieve reasonable efficiency
      // Used: 256 + 64 + 32 + 8 = 360
      // Total: 512 (next power of 2)
      // Efficiency: 360/512 = 70.3%
      expect(efficiency).toBeGreaterThanOrEqual(70);

      // Verify largest is allocated first and addresses are sequential
      expect(calculated.subnets[0].subnetInfo?.networkAddress).toBe('10.0.0.0/24');
    });
  });

  describe('Real-World Scenarios', () => {
    test('should optimize typical corporate network', () => {
      const plan = createNetworkPlan('Corporate Network', '10.10.0.0');

      plan.subnets = [
        createSubnet('Management', 10, 5), // Small
        createSubnet('Employees', 20, 200), // Very large
        createSubnet('Guests', 30, 20), // Medium
        createSubnet('Printers', 40, 10), // Small
        createSubnet('Servers', 50, 30), // Medium
        createSubnet('IoT Devices', 60, 100), // Large
      ];

      const calculated = calculateSubnetRanges(plan);

      // Verify all subnets are allocated
      expect(calculated.subnets).toHaveLength(6);
      calculated.subnets.forEach((subnet) => {
        expect(subnet.subnetInfo?.networkAddress).toBeDefined();
        expect(subnet.subnetInfo?.networkAddress).toMatch(/^10\.10\.\d+\.\d+\/\d+$/);
      });

      // Verify efficiency is improved
      expect(calculated.supernet).toBeDefined();
      const efficiency = calculated.supernet!.utilization;
      expect(efficiency).toBeGreaterThanOrEqual(65);
    });

    test('should handle small business network', () => {
      const plan = createNetworkPlan('Small Business', '192.168.1.0');

      plan.subnets = [
        createSubnet('Office', 10, 30),
        createSubnet('WiFi', 20, 50),
        createSubnet('Servers', 30, 5),
      ];

      const calculated = calculateSubnetRanges(plan);

      // Verify all allocations start with base IP
      calculated.subnets.forEach((subnet) => {
        expect(subnet.subnetInfo?.networkAddress).toMatch(/^192\.168\.1\./);
      });

      expect(calculated.supernet!.utilization).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Comparison with Linear Allocation', () => {
    test('should demonstrate efficiency improvement over linear allocation', () => {
      // This test documents the improvement
      const plan = createNetworkPlan('Comparison Test', '10.0.0.0');

      plan.subnets = [
        createSubnet('A', 10, 10), // 10*2+2=22 → 32 addresses → /27
        createSubnet('B', 20, 100), // 100*2+2=202 → 256 addresses → /24
        createSubnet('C', 30, 5), // 5*2+2=12 → 16 addresses → /28
      ];

      const calculated = calculateSubnetRanges(plan);

      // With optimization and 50% rule:
      // Largest first: /24 (256) + /27 (32) + /28 (16) = 304 used
      // Supernet: 512 (next power of 2)
      // Efficiency: 304/512 = 59.375%

      // Without optimization (linear order A, B, C):
      //   10.0.0.0/27 (32 addresses)
      //   Next: 10.0.0.32
      //   /24 needs 256-aligned → jump to 10.0.1.0 (WASTE 224 addresses!)
      //   10.0.1.0/24 (256 addresses)
      //   Next: 10.0.2.0
      //   10.0.2.0/28 (16 addresses)
      //   Used: 304, Range: 528, Efficiency: ~57.6%

      const optimizedEfficiency = calculated.supernet!.utilization;

      // Optimized should achieve ~59.375% efficiency
      expect(optimizedEfficiency).toBeGreaterThanOrEqual(59);

      // Verify the subnets are reordered (largest first) and addresses are sequential
      expect(calculated.subnets[0].name).toBe('B'); // Largest
      expect(calculated.subnets[1].name).toBe('A'); // Medium
      expect(calculated.subnets[2].name).toBe('C'); // Smallest

      expect(calculated.subnets[0].subnetInfo?.networkAddress).toBe('10.0.0.0/24'); // B first
      expect(calculated.subnets[1].subnetInfo?.networkAddress).toBe('10.0.1.0/27'); // A second
      expect(calculated.subnets[2].subnetInfo?.networkAddress).toBe('10.0.1.32/28'); // C third
    });
  });
});
