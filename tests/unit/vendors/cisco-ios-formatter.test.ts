/**
 * Cisco IOS Formatter Tests
 */

import type { NetworkPlan, Subnet } from '../../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../../src/core/models/network-plan.js';
import { exportToCiscoIos } from '../../../src/formatters/vendors/cisco-ios-formatter.js';

describe('CiscoIosFormatter', () => {
  describe('exportToCiscoIos', () => {
    let plan: NetworkPlan;
    let subnet: Subnet;

    beforeEach(() => {
      plan = createNetworkPlan('Test Plan', '10.0.0.0');
      subnet = createSubnet('Engineering', 10, 50);
      subnet.subnetInfo = {
        networkAddress: '10.0.0.0/24',
        cidrPrefix: 24,
        subnetSize: 256,
        usableHosts: 254,
        requiredHosts: 100,
        plannedDevices: 50,
      };
      plan.subnets = [subnet];
    });

    it('should generate valid IOS configuration header', () => {
      const config = exportToCiscoIos(plan);

      expect(config).toContain('! cidrly Network Configuration');
      expect(config).toContain('! Plan: Test Plan');
      expect(config).toContain('! Base IP: 10.0.0.0');
    });

    it('should include VLAN definitions', () => {
      const config = exportToCiscoIos(plan);

      expect(config).toContain('vlan 10');
      expect(config).toContain(' name Engineering');
    });

    it('should include SVI configurations', () => {
      const config = exportToCiscoIos(plan);

      expect(config).toContain('interface Vlan10');
      expect(config).toContain('ip address 10.0.0.1 255.255.255.0');
      expect(config).toContain('no shutdown');
    });

    it('should use first usable address as gateway (.1)', () => {
      const config = exportToCiscoIos(plan);

      expect(config).toContain('ip address 10.0.0.1');
    });

    it('should convert CIDR to dotted decimal mask', () => {
      const config = exportToCiscoIos(plan);

      expect(config).toContain('255.255.255.0');
    });

    it('should include subnet description', () => {
      subnet.description = 'Engineering Department';
      const config = exportToCiscoIos(plan);

      expect(config).toContain('description Engineering Department');
    });

    it('should generate description from name and device count when no description', () => {
      const config = exportToCiscoIos(plan);

      expect(config).toContain('description Engineering - 50 devices');
    });

    it('should handle multiple VLANs', () => {
      const subnet2 = createSubnet('Sales', 20, 30);
      subnet2.subnetInfo = {
        networkAddress: '10.0.1.0/25',
        cidrPrefix: 25,
        subnetSize: 128,
        usableHosts: 126,
        requiredHosts: 60,
        plannedDevices: 30,
      };
      plan.subnets.push(subnet2);

      const config = exportToCiscoIos(plan);

      expect(config).toContain('vlan 10');
      expect(config).toContain('vlan 20');
      expect(config).toContain('interface Vlan10');
      expect(config).toContain('interface Vlan20');
      expect(config).toContain('10.0.0.1 255.255.255.0');
      expect(config).toContain('10.0.1.1 255.255.255.128');
    });

    it('should sanitize VLAN names with spaces', () => {
      subnet.name = 'Engineering Team';
      const config = exportToCiscoIos(plan);

      expect(config).toContain('name Engineering_Team');
    });

    it('should handle empty subnet list', () => {
      plan.subnets = [];
      const config = exportToCiscoIos(plan);

      expect(config).toContain('! cidrly Network Configuration');
      expect(config).toContain('end');
      expect(config).not.toContain('vlan');
      expect(config).not.toContain('interface Vlan');
    });

    it('should skip SVI for subnets without network address', () => {
      subnet.subnetInfo = undefined;
      const config = exportToCiscoIos(plan);

      expect(config).toContain('vlan 10'); // VLAN definition still included
      expect(config).not.toContain('interface Vlan10'); // No SVI created
      expect(config).not.toContain('! SVI Configurations'); // No SVI section
    });

    it('should end with "end" command', () => {
      const config = exportToCiscoIos(plan);

      expect(config).toMatch(/end\n$/);
    });

    it('should include supernet info in header when available', () => {
      plan.supernet = {
        networkAddress: '10.0.0.0/22',
        cidrPrefix: 22,
        totalSize: 1024,
        usedSize: 384,
        utilization: 37.5,
        rangeEfficiency: 100,
      };

      const config = exportToCiscoIos(plan);

      expect(config).toContain('! Supernet: 10.0.0.0/22');
    });

    it('should handle various CIDR sizes correctly', () => {
      const testCases = [
        { cidr: 30, expectedMask: '255.255.255.252' },
        { cidr: 28, expectedMask: '255.255.255.240' },
        { cidr: 24, expectedMask: '255.255.255.0' },
        { cidr: 23, expectedMask: '255.255.254.0' },
        { cidr: 16, expectedMask: '255.255.0.0' },
      ];

      testCases.forEach(({ cidr, expectedMask }) => {
        subnet.subnetInfo = {
          networkAddress: `10.0.0.0/${cidr}`,
          cidrPrefix: cidr,
          subnetSize: Math.pow(2, 32 - cidr),
          usableHosts: Math.pow(2, 32 - cidr) - 2,
          requiredHosts: 10,
          plannedDevices: 10,
        };

        const config = exportToCiscoIos(plan);
        expect(config).toContain(expectedMask);
      });
    });
  });
});
