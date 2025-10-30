/**
 * Subnet Sorters Test Suite
 * Tests for subnet sorting utilities
 */

import { describe, expect, it } from '@jest/globals';
import type { Subnet } from '../../src/core/models/network-plan.js';
import { getSortDescription, sortSubnets } from '../../src/utils/subnet-sorters.js';

describe('subnet-sorters', () => {
  // Helper function to create test subnets
  const createSubnet = (
    id: string,
    name: string,
    vlanId: number,
    expectedDevices: number,
    subnetInfo?: {
      plannedDevices: number;
      networkAddress: string;
      cidrPrefix: number;
      usableHosts: number;
    },
  ): Subnet => ({
    id,
    name,
    vlanId,
    expectedDevices,
    subnetInfo: subnetInfo
      ? {
          expectedDevices,
          plannedDevices: subnetInfo.plannedDevices,
          requiredHosts: subnetInfo.plannedDevices,
          subnetSize: 256,
          cidrPrefix: subnetInfo.cidrPrefix,
          usableHosts: subnetInfo.usableHosts,
          networkAddress: subnetInfo.networkAddress,
        }
      : undefined,
  });

  describe('sortByName', () => {
    it('should sort subnets by name in ascending order', () => {
      const subnets: Subnet[] = [
        createSubnet('3', 'Zulu', 30, 50),
        createSubnet('1', 'Alpha', 10, 25),
        createSubnet('2', 'Bravo', 20, 100),
      ];

      const sorted = sortSubnets(subnets, 'name', 'asc');

      expect(sorted[0].name).toBe('Alpha');
      expect(sorted[1].name).toBe('Bravo');
      expect(sorted[2].name).toBe('Zulu');
    });

    it('should sort subnets by name in descending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Alpha', 10, 25),
        createSubnet('2', 'Bravo', 20, 100),
        createSubnet('3', 'Zulu', 30, 50),
      ];

      const sorted = sortSubnets(subnets, 'name', 'desc');

      expect(sorted[0].name).toBe('Zulu');
      expect(sorted[1].name).toBe('Bravo');
      expect(sorted[2].name).toBe('Alpha');
    });
  });

  describe('sortByVlan', () => {
    it('should sort subnets by VLAN ID in ascending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 30, 25),
        createSubnet('2', 'Network B', 10, 100),
        createSubnet('3', 'Network C', 20, 50),
      ];

      const sorted = sortSubnets(subnets, 'vlan', 'asc');

      expect(sorted[0].vlanId).toBe(10);
      expect(sorted[1].vlanId).toBe(20);
      expect(sorted[2].vlanId).toBe(30);
    });

    it('should sort subnets by VLAN ID in descending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 25),
        createSubnet('2', 'Network B', 20, 100),
        createSubnet('3', 'Network C', 30, 50),
      ];

      const sorted = sortSubnets(subnets, 'vlan', 'desc');

      expect(sorted[0].vlanId).toBe(30);
      expect(sorted[1].vlanId).toBe(20);
      expect(sorted[2].vlanId).toBe(10);
    });
  });

  describe('sortByExpected', () => {
    it('should sort subnets by expected devices in ascending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 100),
        createSubnet('2', 'Network B', 20, 25),
        createSubnet('3', 'Network C', 30, 50),
      ];

      const sorted = sortSubnets(subnets, 'expected', 'asc');

      expect(sorted[0].expectedDevices).toBe(25);
      expect(sorted[1].expectedDevices).toBe(50);
      expect(sorted[2].expectedDevices).toBe(100);
    });

    it('should sort subnets by expected devices in descending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 25),
        createSubnet('2', 'Network B', 20, 100),
        createSubnet('3', 'Network C', 30, 50),
      ];

      const sorted = sortSubnets(subnets, 'expected', 'desc');

      expect(sorted[0].expectedDevices).toBe(100);
      expect(sorted[1].expectedDevices).toBe(50);
      expect(sorted[2].expectedDevices).toBe(25);
    });
  });

  describe('sortByPlanned', () => {
    it('should sort subnets by planned devices in ascending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 50, {
          plannedDevices: 100,
          networkAddress: '10.0.0.0',
          cidrPrefix: 24,
          usableHosts: 254,
        }),
        createSubnet('2', 'Network B', 20, 25, {
          plannedDevices: 50,
          networkAddress: '10.0.1.0',
          cidrPrefix: 26,
          usableHosts: 62,
        }),
        createSubnet('3', 'Network C', 30, 10, {
          plannedDevices: 20,
          networkAddress: '10.0.2.0',
          cidrPrefix: 27,
          usableHosts: 30,
        }),
      ];

      const sorted = sortSubnets(subnets, 'planned', 'asc');

      expect(sorted[0].subnetInfo?.plannedDevices).toBe(20);
      expect(sorted[1].subnetInfo?.plannedDevices).toBe(50);
      expect(sorted[2].subnetInfo?.plannedDevices).toBe(100);
    });

    it('should sort subnets without subnetInfo to the end', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 50, {
          plannedDevices: 100,
          networkAddress: '10.0.0.0',
          cidrPrefix: 24,
          usableHosts: 254,
        }),
        createSubnet('2', 'Network B', 20, 25), // No subnetInfo
        createSubnet('3', 'Network C', 30, 10, {
          plannedDevices: 20,
          networkAddress: '10.0.2.0',
          cidrPrefix: 27,
          usableHosts: 30,
        }),
      ];

      const sorted = sortSubnets(subnets, 'planned', 'asc');

      expect(sorted[0].subnetInfo?.plannedDevices).toBe(20);
      expect(sorted[1].subnetInfo?.plannedDevices).toBe(100);
      expect(sorted[2].subnetInfo).toBeUndefined();
    });
  });

  describe('sortByNetwork', () => {
    it('should sort subnets by network address in ascending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 50, {
          plannedDevices: 100,
          networkAddress: '10.0.2.0',
          cidrPrefix: 24,
          usableHosts: 254,
        }),
        createSubnet('2', 'Network B', 20, 25, {
          plannedDevices: 50,
          networkAddress: '10.0.0.0',
          cidrPrefix: 26,
          usableHosts: 62,
        }),
        createSubnet('3', 'Network C', 30, 10, {
          plannedDevices: 20,
          networkAddress: '10.0.1.0',
          cidrPrefix: 27,
          usableHosts: 30,
        }),
      ];

      const sorted = sortSubnets(subnets, 'network', 'asc');

      expect(sorted[0].subnetInfo?.networkAddress).toBe('10.0.0.0');
      expect(sorted[1].subnetInfo?.networkAddress).toBe('10.0.1.0');
      expect(sorted[2].subnetInfo?.networkAddress).toBe('10.0.2.0');
    });

    it('should sort IP addresses correctly across octets', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 50, {
          plannedDevices: 100,
          networkAddress: '192.168.1.0',
          cidrPrefix: 24,
          usableHosts: 254,
        }),
        createSubnet('2', 'Network B', 20, 25, {
          plannedDevices: 50,
          networkAddress: '10.0.0.0',
          cidrPrefix: 26,
          usableHosts: 62,
        }),
        createSubnet('3', 'Network C', 30, 10, {
          plannedDevices: 20,
          networkAddress: '172.16.0.0',
          cidrPrefix: 27,
          usableHosts: 30,
        }),
      ];

      const sorted = sortSubnets(subnets, 'network', 'asc');

      expect(sorted[0].subnetInfo?.networkAddress).toBe('10.0.0.0');
      expect(sorted[1].subnetInfo?.networkAddress).toBe('172.16.0.0');
      expect(sorted[2].subnetInfo?.networkAddress).toBe('192.168.1.0');
    });

    it('should sort subnets without network address to the end', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 50, {
          plannedDevices: 100,
          networkAddress: '10.0.2.0',
          cidrPrefix: 24,
          usableHosts: 254,
        }),
        createSubnet('2', 'Network B', 20, 25), // No subnetInfo
        createSubnet('3', 'Network C', 30, 10, {
          plannedDevices: 20,
          networkAddress: '10.0.1.0',
          cidrPrefix: 27,
          usableHosts: 30,
        }),
      ];

      const sorted = sortSubnets(subnets, 'network', 'asc');

      expect(sorted[0].subnetInfo?.networkAddress).toBe('10.0.1.0');
      expect(sorted[1].subnetInfo?.networkAddress).toBe('10.0.2.0');
      expect(sorted[2].subnetInfo).toBeUndefined();
    });
  });

  describe('sortByCidr', () => {
    it('should sort subnets by CIDR prefix in ascending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 50, {
          plannedDevices: 100,
          networkAddress: '10.0.0.0',
          cidrPrefix: 24,
          usableHosts: 254,
        }),
        createSubnet('2', 'Network B', 20, 25, {
          plannedDevices: 50,
          networkAddress: '10.0.1.0',
          cidrPrefix: 27,
          usableHosts: 30,
        }),
        createSubnet('3', 'Network C', 30, 10, {
          plannedDevices: 20,
          networkAddress: '10.0.2.0',
          cidrPrefix: 26,
          usableHosts: 62,
        }),
      ];

      const sorted = sortSubnets(subnets, 'cidr', 'asc');

      expect(sorted[0].subnetInfo?.cidrPrefix).toBe(24);
      expect(sorted[1].subnetInfo?.cidrPrefix).toBe(26);
      expect(sorted[2].subnetInfo?.cidrPrefix).toBe(27);
    });

    it('should sort subnets by CIDR prefix in descending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 50, {
          plannedDevices: 100,
          networkAddress: '10.0.0.0',
          cidrPrefix: 24,
          usableHosts: 254,
        }),
        createSubnet('2', 'Network B', 20, 25, {
          plannedDevices: 50,
          networkAddress: '10.0.1.0',
          cidrPrefix: 26,
          usableHosts: 62,
        }),
      ];

      const sorted = sortSubnets(subnets, 'cidr', 'desc');

      expect(sorted[0].subnetInfo?.cidrPrefix).toBe(26);
      expect(sorted[1].subnetInfo?.cidrPrefix).toBe(24);
    });
  });

  describe('sortByUsable', () => {
    it('should sort subnets by usable hosts in ascending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 50, {
          plannedDevices: 100,
          networkAddress: '10.0.0.0',
          cidrPrefix: 24,
          usableHosts: 254,
        }),
        createSubnet('2', 'Network B', 20, 25, {
          plannedDevices: 50,
          networkAddress: '10.0.1.0',
          cidrPrefix: 27,
          usableHosts: 30,
        }),
        createSubnet('3', 'Network C', 30, 10, {
          plannedDevices: 20,
          networkAddress: '10.0.2.0',
          cidrPrefix: 26,
          usableHosts: 62,
        }),
      ];

      const sorted = sortSubnets(subnets, 'usable', 'asc');

      expect(sorted[0].subnetInfo?.usableHosts).toBe(30);
      expect(sorted[1].subnetInfo?.usableHosts).toBe(62);
      expect(sorted[2].subnetInfo?.usableHosts).toBe(254);
    });

    it('should sort subnets by usable hosts in descending order', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 10, 50, {
          plannedDevices: 100,
          networkAddress: '10.0.0.0',
          cidrPrefix: 27,
          usableHosts: 30,
        }),
        createSubnet('2', 'Network B', 20, 25, {
          plannedDevices: 50,
          networkAddress: '10.0.1.0',
          cidrPrefix: 24,
          usableHosts: 254,
        }),
      ];

      const sorted = sortSubnets(subnets, 'usable', 'desc');

      expect(sorted[0].subnetInfo?.usableHosts).toBe(254);
      expect(sorted[1].subnetInfo?.usableHosts).toBe(30);
    });
  });

  describe('sortSubnets - edge cases', () => {
    it('should return original array when column is null', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Network A', 30, 50),
        createSubnet('2', 'Network B', 10, 100),
        createSubnet('3', 'Network C', 20, 25),
      ];

      const sorted = sortSubnets(subnets, null, 'asc');

      expect(sorted).toEqual(subnets);
    });

    it('should not mutate the original array', () => {
      const subnets: Subnet[] = [
        createSubnet('1', 'Zulu', 30, 50),
        createSubnet('2', 'Alpha', 10, 100),
        createSubnet('3', 'Bravo', 20, 25),
      ];

      const original = [...subnets];
      sortSubnets(subnets, 'name', 'asc');

      expect(subnets).toEqual(original);
    });

    it('should handle empty array', () => {
      const subnets: Subnet[] = [];
      const sorted = sortSubnets(subnets, 'name', 'asc');

      expect(sorted).toEqual([]);
    });

    it('should handle single subnet', () => {
      const subnets: Subnet[] = [createSubnet('1', 'Network A', 10, 50)];
      const sorted = sortSubnets(subnets, 'name', 'asc');

      expect(sorted).toEqual(subnets);
    });
  });

  describe('getSortDescription', () => {
    it('should return "None" when column is null', () => {
      const description = getSortDescription(null, 'asc');
      expect(description).toBe('None');
    });

    it('should return correct description for ascending sort', () => {
      expect(getSortDescription('name', 'asc')).toBe('Name ↑');
      expect(getSortDescription('vlan', 'asc')).toBe('VLAN ↑');
      expect(getSortDescription('expected', 'asc')).toBe('Expected ↑');
      expect(getSortDescription('planned', 'asc')).toBe('Planned ↑');
      expect(getSortDescription('network', 'asc')).toBe('Network ↑');
      expect(getSortDescription('cidr', 'asc')).toBe('CIDR ↑');
      expect(getSortDescription('usable', 'asc')).toBe('Usable ↑');
    });

    it('should return correct description for descending sort', () => {
      expect(getSortDescription('name', 'desc')).toBe('Name ↓');
      expect(getSortDescription('vlan', 'desc')).toBe('VLAN ↓');
      expect(getSortDescription('expected', 'desc')).toBe('Expected ↓');
      expect(getSortDescription('planned', 'desc')).toBe('Planned ↓');
      expect(getSortDescription('network', 'desc')).toBe('Network ↓');
      expect(getSortDescription('cidr', 'desc')).toBe('CIDR ↓');
      expect(getSortDescription('usable', 'desc')).toBe('Usable ↓');
    });
  });
});
