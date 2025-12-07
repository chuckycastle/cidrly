/**
 * Ubiquiti EdgeOS Formatter Tests
 */

import type { NetworkPlan, Subnet } from '../../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../../src/core/models/network-plan.js';
import { exportToUbiquiti } from '../../../src/formatters/vendors/ubiquiti-formatter.js';

describe('UbiquitiFormatter', () => {
  describe('exportToUbiquiti', () => {
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

    it('should generate valid EdgeOS configuration header', () => {
      const config = exportToUbiquiti(plan);

      expect(config).toContain('# cidrly Network Configuration');
      expect(config).toContain('# Plan: Test Plan');
    });

    it('should use hierarchical interfaces block', () => {
      const config = exportToUbiquiti(plan);

      expect(config).toContain('interfaces {');
      expect(config).toContain('    ethernet eth0 {');
      expect(config).toContain('}');
    });

    it('should use vif for VLANs', () => {
      const config = exportToUbiquiti(plan);

      expect(config).toContain('        vif 10 {');
      expect(config).toContain('            address 10.0.0.1/24');
    });

    it('should use CIDR notation for addresses', () => {
      const config = exportToUbiquiti(plan);

      expect(config).toContain('address 10.0.0.1/24');
    });

    it('should include quoted descriptions', () => {
      const config = exportToUbiquiti(plan);

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

      const config = exportToUbiquiti(plan);

      expect(config).toContain('vif 10 {');
      expect(config).toContain('vif 20 {');
      expect(config).toContain('address 10.0.0.1/24');
      expect(config).toContain('address 10.0.1.1/25');
    });

    it('should handle empty subnet list', () => {
      plan.subnets = [];
      const config = exportToUbiquiti(plan);

      expect(config).toContain('# cidrly Network Configuration');
      expect(config).toContain('interfaces {');
      expect(config).toContain('# No VIF interfaces configured');
    });
  });
});
