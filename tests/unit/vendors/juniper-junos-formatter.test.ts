/**
 * Juniper JUNOS Formatter Tests
 */

import type { NetworkPlan, Subnet } from '../../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../../src/core/models/network-plan.js';
import { exportToJuniperJunos } from '../../../src/formatters/vendors/juniper-junos-formatter.js';

describe('JuniperJunosFormatter', () => {
  describe('exportToJuniperJunos', () => {
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

    it('should generate valid JUNOS configuration header', () => {
      const config = exportToJuniperJunos(plan);

      expect(config).toContain('# cidrly Network Configuration');
      expect(config).toContain('# Plan: Test Plan');
    });

    it('should use hierarchical vlans block', () => {
      const config = exportToJuniperJunos(plan);

      expect(config).toContain('vlans {');
      expect(config).toContain('    Engineering {');
      expect(config).toContain('        vlan-id 10;');
      expect(config).toContain('        l3-interface irb.10;');
    });

    it('should use IRB interfaces', () => {
      const config = exportToJuniperJunos(plan);

      expect(config).toContain('interfaces {');
      expect(config).toContain('    irb {');
      expect(config).toContain('        unit 10 {');
      expect(config).toContain('            family inet {');
      expect(config).toContain('                address 10.0.0.1/24;');
    });

    it('should quote descriptions', () => {
      subnet.description = 'Engineering Department';
      const config = exportToJuniperJunos(plan);

      expect(config).toContain('description "Engineering Department";');
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

      const config = exportToJuniperJunos(plan);

      expect(config).toContain('vlan-id 10;');
      expect(config).toContain('vlan-id 20;');
      expect(config).toContain('l3-interface irb.10;');
      expect(config).toContain('l3-interface irb.20;');
    });

    it('should handle empty subnet list', () => {
      plan.subnets = [];
      const config = exportToJuniperJunos(plan);

      expect(config).toContain('# cidrly Network Configuration');
      expect(config).toContain('# No interfaces configured');
    });
  });
});
