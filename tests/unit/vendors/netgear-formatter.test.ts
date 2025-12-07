/**
 * Netgear Formatter Tests
 */

import type { NetworkPlan, Subnet } from '../../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../../src/core/models/network-plan.js';
import { exportToNetgear } from '../../../src/formatters/vendors/netgear-formatter.js';

describe('NetgearFormatter', () => {
  describe('exportToNetgear', () => {
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

    it('should generate valid Netgear configuration header', () => {
      const config = exportToNetgear(plan);

      expect(config).toContain('! cidrly Network Configuration');
      expect(config).toContain('! Plan: Test Plan');
    });

    it('should use vlan database block', () => {
      const config = exportToNetgear(plan);

      expect(config).toContain('vlan database');
      expect(config).toContain('exit');
    });

    it('should use quoted VLAN names', () => {
      const config = exportToNetgear(plan);

      expect(config).toContain('vlan 10 name "Engineering"');
    });

    it('should use interface vlan syntax', () => {
      const config = exportToNetgear(plan);

      expect(config).toContain('interface vlan 10');
      expect(config).toContain('ip address 10.0.0.1 255.255.255.0');
    });

    it('should use dotted decimal IP format', () => {
      const config = exportToNetgear(plan);

      expect(config).toContain('ip address 10.0.0.1 255.255.255.0');
    });

    it('should include quoted descriptions', () => {
      const config = exportToNetgear(plan);

      expect(config).toContain('description "Engineering - 50 devices"');
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

      const config = exportToNetgear(plan);

      expect(config).toContain('vlan 10 name "Engineering"');
      expect(config).toContain('vlan 20 name "Sales"');
      expect(config).toContain('interface vlan 10');
      expect(config).toContain('interface vlan 20');
    });
  });
});
