/**
 * Unit tests for subnet calculator
 */

import {
  allocateSubnetAddresses,
  applyPlanningRule,
  calculateCIDR,
  calculateHostBits,
  calculateSubnet,
  calculateSubnetSize,
  calculateSupernet,
  calculateUsableHosts,
  generateNetworkAddress,
} from '../src/core/calculators/subnet-calculator.js';

describe('Subnet Calculator', () => {
  describe('applyPlanningRule', () => {
    it('should use 100% growth by default (double capacity)', () => {
      // Formula: expectedDevices × (1 + growthPercentage/100)
      // Default 100%: expectedDevices × 2
      expect(applyPlanningRule(25)).toBe(50); // 25 × 2
      expect(applyPlanningRule(100)).toBe(200); // 100 × 2
      expect(applyPlanningRule(1)).toBe(2); // 1 × 2
    });

    it('should support 0% growth (exact device count)', () => {
      // Formula: expectedDevices × 1
      expect(applyPlanningRule(25, 0)).toBe(25); // No growth
      expect(applyPlanningRule(100, 0)).toBe(100);
      expect(applyPlanningRule(1, 0)).toBe(1);
    });

    it('should support 50% growth (1.5x capacity)', () => {
      // Formula: expectedDevices × 1.5
      expect(applyPlanningRule(25, 50)).toBe(38); // 25 × 1.5 = 37.5 → 38 (ceil)
      expect(applyPlanningRule(100, 50)).toBe(150); // 100 × 1.5
      expect(applyPlanningRule(1, 50)).toBe(2); // 1 × 1.5 = 1.5 → 2
    });

    it('should support 200% growth (triple capacity)', () => {
      // Formula: expectedDevices × 3
      expect(applyPlanningRule(25, 200)).toBe(75); // 25 × 3
      expect(applyPlanningRule(100, 200)).toBe(300); // 100 × 3
      expect(applyPlanningRule(1, 200)).toBe(3); // 1 × 3
    });

    it('should support 300% growth (quadruple capacity)', () => {
      // Formula: expectedDevices × 4
      expect(applyPlanningRule(25, 300)).toBe(100); // 25 × 4
      expect(applyPlanningRule(100, 300)).toBe(400); // 100 × 4
      expect(applyPlanningRule(1, 300)).toBe(4); // 1 × 4
    });

    it('should round up fractional results', () => {
      // Growth percentages that produce fractions should ceil
      expect(applyPlanningRule(10, 50)).toBe(15); // 10 × 1.5 = 15
      expect(applyPlanningRule(11, 50)).toBe(17); // 11 × 1.5 = 16.5 → 17 (ceil)
    });
  });

  describe('calculateHostBits', () => {
    it('should calculate correct host bits for small networks', () => {
      expect(calculateHostBits(2)).toBe(2); // 4 addresses (2 + network + broadcast)
      expect(calculateHostBits(6)).toBe(3); // 8 addresses
      expect(calculateHostBits(14)).toBe(4); // 16 addresses
    });

    it('should calculate correct host bits for medium networks', () => {
      expect(calculateHostBits(30)).toBe(5); // 32 addresses
      expect(calculateHostBits(62)).toBe(6); // 64 addresses
      expect(calculateHostBits(254)).toBe(8); // 256 addresses
    });

    it('should calculate correct host bits for large networks', () => {
      expect(calculateHostBits(510)).toBe(9); // 512 addresses
      expect(calculateHostBits(1022)).toBe(10); // 1024 addresses
    });
  });

  describe('calculateCIDR', () => {
    it('should calculate correct CIDR from host bits', () => {
      expect(calculateCIDR(8)).toBe(24); // /24
      expect(calculateCIDR(7)).toBe(25); // /25
      expect(calculateCIDR(6)).toBe(26); // /26
      expect(calculateCIDR(5)).toBe(27); // /27
      expect(calculateCIDR(4)).toBe(28); // /28
    });
  });

  describe('calculateSubnetSize', () => {
    it('should calculate correct subnet size from CIDR', () => {
      expect(calculateSubnetSize(24)).toBe(256);
      expect(calculateSubnetSize(26)).toBe(64);
      expect(calculateSubnetSize(27)).toBe(32);
      expect(calculateSubnetSize(28)).toBe(16);
    });
  });

  describe('calculateUsableHosts', () => {
    it('should subtract 2 from subnet size', () => {
      expect(calculateUsableHosts(256)).toBe(254);
      expect(calculateUsableHosts(64)).toBe(62);
      expect(calculateUsableHosts(32)).toBe(30);
      expect(calculateUsableHosts(16)).toBe(14);
    });
  });

  describe('calculateSubnet', () => {
    it('should calculate correct subnet for 25 expected devices (default 100%)', () => {
      const result = calculateSubnet(25);
      expect(result.expectedDevices).toBe(25);
      expect(result.plannedDevices).toBe(50); // 25 × 2
      expect(result.cidrPrefix).toBe(26); // /26 gives 64 addresses (50+2=52, need 64)
      expect(result.usableHosts).toBe(62);
      expect(result.subnetSize).toBe(64);
    });

    it('should calculate correct subnet for 100 expected devices (default 100%)', () => {
      const result = calculateSubnet(100);
      expect(result.expectedDevices).toBe(100);
      expect(result.plannedDevices).toBe(200); // 100 × 2
      expect(result.cidrPrefix).toBe(24); // /24 gives 256 addresses (200+2=202, need 256)
      expect(result.usableHosts).toBe(254);
      expect(result.subnetSize).toBe(256);
    });

    it('should calculate correct subnet with 0% growth (no overhead)', () => {
      const result = calculateSubnet(25, 0);
      expect(result.expectedDevices).toBe(25);
      expect(result.plannedDevices).toBe(25); // 25 × 1
      expect(result.cidrPrefix).toBe(27); // /27 gives 32 addresses (25+2=27, need 32)
      expect(result.usableHosts).toBe(30);
      expect(result.subnetSize).toBe(32);
    });

    it('should calculate correct subnet with 50% growth (1.5x capacity)', () => {
      const result = calculateSubnet(25, 50);
      expect(result.expectedDevices).toBe(25);
      expect(result.plannedDevices).toBe(38); // 25 × 1.5 = 37.5 → 38
      expect(result.cidrPrefix).toBe(26); // /26 gives 64 addresses (38+2=40, need 64)
      expect(result.usableHosts).toBe(62);
      expect(result.subnetSize).toBe(64);
    });

    it('should calculate correct subnet with 200% growth (triple capacity)', () => {
      const result = calculateSubnet(25, 200);
      expect(result.expectedDevices).toBe(25);
      expect(result.plannedDevices).toBe(75); // 25 × 3
      expect(result.cidrPrefix).toBe(25); // /25 gives 128 addresses (75+2=77, need 128)
      expect(result.usableHosts).toBe(126);
      expect(result.subnetSize).toBe(128);
    });

    it('should calculate correct subnet with 300% growth (quadruple capacity)', () => {
      const result = calculateSubnet(25, 300);
      expect(result.expectedDevices).toBe(25);
      expect(result.plannedDevices).toBe(100); // 25 × 4
      expect(result.cidrPrefix).toBe(25); // /25 gives 128 addresses (100+2=102, need 128)
      expect(result.usableHosts).toBe(126);
      expect(result.subnetSize).toBe(128);
    });

    it('should handle edge case of 1 expected device', () => {
      const result = calculateSubnet(1, 100);
      expect(result.expectedDevices).toBe(1);
      expect(result.plannedDevices).toBe(2); // 1 × 2
      expect(result.cidrPrefix).toBe(30); // /30 gives 4 addresses (2+2=4)
      expect(result.usableHosts).toBe(2);
      expect(result.subnetSize).toBe(4);
    });

    it('should support custom growth percentages', () => {
      // Test 75% growth
      const result75 = calculateSubnet(100, 75);
      expect(result75.plannedDevices).toBe(175); // 100 × 1.75

      // Test 25% growth
      const result25 = calculateSubnet(100, 25);
      expect(result25.plannedDevices).toBe(125); // 100 × 1.25
    });
  });

  describe('calculateSupernet', () => {
    it('should calculate supernet for single subnet', () => {
      const subnets = [calculateSubnet(25)]; // 25×2=50 → /26 (64 addresses)
      const result = calculateSupernet(subnets);

      expect(result.cidrPrefix).toBe(26);
      expect(result.totalSize).toBe(64);
      expect(result.usedSize).toBe(64);
      expect(result.efficiency).toBe(100);
    });

    it('should calculate supernet for multiple subnets (default 100%)', () => {
      const subnets = [
        calculateSubnet(25), // 25×2=50 → /26 - 64 addresses
        calculateSubnet(15), // 15×2=30 → /27 - 32 addresses
        calculateSubnet(100), // 100×2=200 → /24 - 256 addresses
      ];
      const result = calculateSupernet(subnets);

      const totalUsed = 64 + 32 + 256; // 352
      expect(result.usedSize).toBe(totalUsed);
      expect(result.cidrPrefix).toBe(23); // /23 gives 512 addresses
      expect(result.totalSize).toBe(512);
      expect(result.efficiency).toBeCloseTo(68.75, 2); // 352/512 = 68.75%
    });

    it('should calculate supernet with different growth percentages', () => {
      const subnets = [
        calculateSubnet(25, 0), // 25×1=25 → /27 - 32 addresses
        calculateSubnet(25, 50), // 25×1.5=38 → /26 - 64 addresses
        calculateSubnet(25, 200), // 25×3=75 → /25 - 128 addresses
      ];
      const result = calculateSupernet(subnets);

      const totalUsed = 32 + 64 + 128; // 224
      expect(result.usedSize).toBe(totalUsed);
      expect(result.cidrPrefix).toBe(24); // /24 gives 256 addresses
      expect(result.totalSize).toBe(256);
      expect(result.efficiency).toBeCloseTo(87.5, 2); // 224/256 = 87.5%
    });

    it('should throw error for empty subnet list', () => {
      expect(() => calculateSupernet([])).toThrow(
        'Cannot calculate supernet for empty subnet list',
      );
    });
  });

  describe('generateNetworkAddress', () => {
    it('should generate correct network address for /24', () => {
      expect(generateNetworkAddress('10.0.0.0', 24)).toBe('10.0.0.0/24');
      expect(generateNetworkAddress('192.168.1.0', 24)).toBe('192.168.1.0/24');
    });

    it('should generate correct network address for /26', () => {
      expect(generateNetworkAddress('10.0.0.0', 26)).toBe('10.0.0.0/26');
      expect(generateNetworkAddress('10.0.0.64', 26)).toBe('10.0.0.64/26');
    });

    it('should mask IP address to network boundary', () => {
      expect(generateNetworkAddress('10.0.0.15', 24)).toBe('10.0.0.0/24');
      expect(generateNetworkAddress('192.168.1.100', 24)).toBe('192.168.1.0/24');
    });
  });

  describe('allocateSubnetAddresses', () => {
    it('should allocate sequential network addresses (default 100%)', () => {
      const subnets = [
        calculateSubnet(25), // 25×2=50 → /26 - 64 addresses
        calculateSubnet(15), // 15×2=30 → /27 - 32 addresses
      ];

      const allocated = allocateSubnetAddresses('10.0.0.0', subnets);

      expect(allocated[0].networkAddress).toBe('10.0.0.0/26');
      expect(allocated[1].networkAddress).toBe('10.0.0.64/27');
    });

    it('should handle different sized subnets (default 100%)', () => {
      const subnets = [
        calculateSubnet(100), // 100×2=200 → /24 - 256 addresses
        calculateSubnet(50), // 50×2=100 → /25 - 128 addresses
        calculateSubnet(10), // 10×2=20 → /27 - 32 addresses
      ];

      const allocated = allocateSubnetAddresses('192.168.0.0', subnets);

      expect(allocated[0].networkAddress).toBe('192.168.0.0/24');
      expect(allocated[1].networkAddress).toBe('192.168.1.0/25');
      expect(allocated[2].networkAddress).toBe('192.168.1.128/27');
    });

    it('should handle subnets with different growth percentages', () => {
      const subnets = [
        calculateSubnet(25, 0), // 25×1=25 → /27 - 32 addresses
        calculateSubnet(25, 50), // 25×1.5=38 → /26 - 64 addresses
        calculateSubnet(25, 200), // 25×3=75 → /25 - 128 addresses
      ];

      const allocated = allocateSubnetAddresses('10.0.0.0', subnets);

      expect(allocated[0].networkAddress).toBe('10.0.0.0/27');
      expect(allocated[1].networkAddress).toBe('10.0.0.64/26');
      expect(allocated[2].networkAddress).toBe('10.0.0.128/25');
    });
  });
});
