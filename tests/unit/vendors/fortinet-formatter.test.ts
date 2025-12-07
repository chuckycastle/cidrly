/**
 * Fortinet FortiOS Formatter Tests
 */

import type { NetworkPlan, Subnet } from '../../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../../src/core/models/network-plan.js';
import { exportToFortinet } from '../../../src/formatters/vendors/fortinet-formatter.js';

describe('FortinetFormatter', () => {
  describe('exportToFortinet', () => {
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

    it('should generate valid FortiOS configuration header', () => {
      const config = exportToFortinet(plan);

      expect(config).toContain('# cidrly Network Configuration');
      expect(config).toContain('# Plan: Test Plan');
    });

    it('should use config system interface block', () => {
      const config = exportToFortinet(plan);

      expect(config).toContain('config system interface');
      expect(config).toContain('end');
    });

    it('should use edit/next pattern', () => {
      const config = exportToFortinet(plan);

      expect(config).toContain('    edit "vlan10"');
      expect(config).toContain('    next');
    });

    it('should set vdom to root', () => {
      const config = exportToFortinet(plan);

      expect(config).toContain('        set vdom "root"');
    });

    it('should use dotted decimal IP format', () => {
      const config = exportToFortinet(plan);

      expect(config).toContain('set ip 10.0.0.1 255.255.255.0');
    });

    it('should set interface type as vlan', () => {
      const config = exportToFortinet(plan);

      expect(config).toContain('set type vlan');
      expect(config).toContain('set vlanid 10');
    });

    it('should set parent interface to internal', () => {
      const config = exportToFortinet(plan);

      expect(config).toContain('set interface "internal"');
    });

    it('should include access settings', () => {
      const config = exportToFortinet(plan);

      expect(config).toContain('set allowaccess ping https ssh');
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

      const config = exportToFortinet(plan);

      expect(config).toContain('edit "vlan10"');
      expect(config).toContain('edit "vlan20"');
    });
  });
});
