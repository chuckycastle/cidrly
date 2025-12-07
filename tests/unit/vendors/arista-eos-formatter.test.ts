/**
 * Arista EOS Formatter Tests
 */

import type { NetworkPlan, Subnet } from '../../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../../src/core/models/network-plan.js';
import { exportToAristaEos } from '../../../src/formatters/vendors/arista-eos-formatter.js';

describe('AristaEosFormatter', () => {
  describe('exportToAristaEos', () => {
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

    it('should generate valid EOS configuration header', () => {
      const config = exportToAristaEos(plan);

      expect(config).toContain('! cidrly Network Configuration');
      expect(config).toContain('! Plan: Test Plan');
    });

    it('should use 3-space indentation for EOS style', () => {
      const config = exportToAristaEos(plan);

      expect(config).toContain('   name Engineering');
      expect(config).toContain('   description Engineering - 50 devices');
    });

    it('should use CIDR notation for IP addresses', () => {
      const config = exportToAristaEos(plan);

      expect(config).toContain('ip address 10.0.0.1/24');
    });

    it('should include no shutdown command', () => {
      const config = exportToAristaEos(plan);

      expect(config).toContain('no shutdown');
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

      const config = exportToAristaEos(plan);

      expect(config).toContain('vlan 10');
      expect(config).toContain('vlan 20');
    });
  });
});
