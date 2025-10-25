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
    it('should double the expected device count and account for overhead', () => {
      // Formula: expectedDevices * 2 + 2
      // Accounts for network and broadcast addresses in capacity planning
      expect(applyPlanningRule(25)).toBe(52); // 25 * 2 + 2
      expect(applyPlanningRule(100)).toBe(202); // 100 * 2 + 2
      expect(applyPlanningRule(1)).toBe(4); // 1 * 2 + 2
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
    it('should calculate correct subnet for 25 expected devices', () => {
      const result = calculateSubnet(25);
      expect(result.expectedDevices).toBe(25);
      expect(result.plannedDevices).toBe(52); // 25 * 2 + 2
      expect(result.cidrPrefix).toBe(26); // /26 gives 64 addresses
      expect(result.usableHosts).toBe(62);
      expect(result.subnetSize).toBe(64);
    });

    it('should calculate correct subnet for 15 expected devices', () => {
      const result = calculateSubnet(15);
      expect(result.expectedDevices).toBe(15);
      expect(result.plannedDevices).toBe(32); // 15 * 2 + 2
      expect(result.cidrPrefix).toBe(26); // /26 gives 64 addresses (32+2 needs 64)
      expect(result.usableHosts).toBe(62);
      expect(result.subnetSize).toBe(64);
    });

    it('should calculate correct subnet for 100 expected devices', () => {
      const result = calculateSubnet(100);
      expect(result.expectedDevices).toBe(100);
      expect(result.plannedDevices).toBe(202); // 100 * 2 + 2
      expect(result.cidrPrefix).toBe(24); // /24 gives 256 addresses
      expect(result.usableHosts).toBe(254);
      expect(result.subnetSize).toBe(256);
    });

    it('should calculate correct subnet for 1 expected device', () => {
      const result = calculateSubnet(1);
      expect(result.expectedDevices).toBe(1);
      expect(result.plannedDevices).toBe(4); // 1 * 2 + 2
      expect(result.cidrPrefix).toBe(29); // /29 gives 8 addresses (4+2 needs 8)
      expect(result.usableHosts).toBe(6);
      expect(result.subnetSize).toBe(8);
    });
  });

  describe('calculateSupernet', () => {
    it('should calculate supernet for single subnet', () => {
      const subnets = [calculateSubnet(25)]; // 25*2+2=52 → /26 (64 addresses)
      const result = calculateSupernet(subnets);

      expect(result.cidrPrefix).toBe(26);
      expect(result.totalSize).toBe(64);
      expect(result.usedSize).toBe(64);
      expect(result.efficiency).toBe(100);
    });

    it('should calculate supernet for multiple subnets', () => {
      const subnets = [
        calculateSubnet(25), // 25*2+2=52 → /26 - 64 addresses
        calculateSubnet(15), // 15*2+2=32 → /26 - 64 addresses
        calculateSubnet(100), // 100*2+2=202 → /24 - 256 addresses
      ];
      const result = calculateSupernet(subnets);

      const totalUsed = 64 + 64 + 256; // 384
      expect(result.usedSize).toBe(totalUsed);
      expect(result.cidrPrefix).toBe(23); // /23 gives 512 addresses
      expect(result.totalSize).toBe(512);
      expect(result.efficiency).toBeCloseTo(75.0, 2); // 384/512 = 75%
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
    it('should allocate sequential network addresses', () => {
      const subnets = [
        calculateSubnet(25), // 25*2+2=52 → /26 - 64 addresses
        calculateSubnet(15), // 15*2+2=32 → /26 - 64 addresses
      ];

      const allocated = allocateSubnetAddresses('10.0.0.0', subnets);

      expect(allocated[0].networkAddress).toBe('10.0.0.0/26');
      expect(allocated[1].networkAddress).toBe('10.0.0.64/26'); // Both /26 now
    });

    it('should handle different sized subnets', () => {
      const subnets = [
        calculateSubnet(100), // /24 - 256 addresses
        calculateSubnet(50), // /25 - 128 addresses (50*2=100 hosts)
        calculateSubnet(10), // /27 - 32 addresses (10*2=20 hosts)
      ];

      const allocated = allocateSubnetAddresses('192.168.0.0', subnets);

      expect(allocated[0].networkAddress).toBe('192.168.0.0/24');
      expect(allocated[1].networkAddress).toBe('192.168.1.0/25');
      expect(allocated[2].networkAddress).toBe('192.168.1.128/27');
    });
  });
});
