/**
 * Unit tests for YAML Formatter
 */

import YAML from 'yaml';
import { createNetworkPlan, createSubnet } from '../../src/core/models/network-plan.js';
import {
  addYamlComments,
  exportToYaml,
  formatPlanToYaml,
} from '../../src/formatters/yaml-formatter.js';

describe('YamlFormatter', () => {
  describe('formatPlanToYaml', () => {
    it('should convert a basic network plan to valid YAML', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const subnet = createSubnet('Engineering', 10, 50);
      plan.subnets.push(subnet);

      const yamlString = await formatPlanToYaml(plan);

      // Should be valid YAML
      expect(() => YAML.parse(yamlString)).not.toThrow();

      // Parse and verify structure
      const parsed = YAML.parse(yamlString);
      expect(parsed.name).toBe('Test Plan');
      expect(parsed.baseIp).toBe('10.0.0.0');
      expect(parsed.subnets).toHaveLength(1);
      expect(parsed.subnets[0].name).toBe('Engineering');
      expect(parsed.subnets[0].vlanId).toBe(10);
      expect(parsed.subnets[0].devices).toBe(50);
    });

    it('should include subnet info when present', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const subnet = createSubnet('Engineering', 10, 50);
      subnet.subnetInfo = {
        networkAddress: '10.0.0.0',
        cidrPrefix: 24,
        expectedDevices: 50,
        plannedDevices: 100,
        requiredHosts: 102,
        subnetSize: 256,
        usableHosts: 254,
      };
      plan.subnets.push(subnet);

      const yamlString = await formatPlanToYaml(plan);
      const parsed = YAML.parse(yamlString);

      // New flattened structure - subnet info fields are at top level
      expect(parsed.subnets[0].networkAddress).toBe('10.0.0.0');
      expect(parsed.subnets[0].cidrPrefix).toBe(24);
      expect(parsed.subnets[0].maxHosts).toBe(254);
      expect(parsed.subnets[0].requiredHosts).toBe(102);
      expect(parsed.subnets[0].subnetSize).toBe(256);
    });

    it('should include supernet when present', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.supernet = {
        networkAddress: '10.0.0.0',
        cidrPrefix: 16,
        totalSize: 65536,
        usedSize: 1024,
        utilization: 1.56,
        rangeEfficiency: 100,
      };

      const yamlString = await formatPlanToYaml(plan);
      const parsed = YAML.parse(yamlString);

      expect(parsed.supernet).toBeDefined();
      expect(parsed.supernet.networkAddress).toBe('10.0.0.0');
      expect(parsed.supernet.cidrPrefix).toBe(16);
      expect(parsed.supernet.utilization).toBe(1.56);
    });

    it('should include metadata with timestamps', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      const yamlString = await formatPlanToYaml(plan);
      const parsed = YAML.parse(yamlString);

      expect(parsed.metadata).toBeDefined();
      expect(parsed.metadata.createdAt).toBeDefined();
      expect(parsed.metadata.updatedAt).toBeDefined();

      // Verify timestamps are valid ISO strings
      expect(() => new Date(parsed.metadata.createdAt)).not.toThrow();
      expect(() => new Date(parsed.metadata.updatedAt)).not.toThrow();
    });

    it('should handle multiple subnets', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      plan.subnets.push(createSubnet('Sales', 20, 30));
      plan.subnets.push(createSubnet('Guest WiFi', 30, 100));

      const yamlString = await formatPlanToYaml(plan);
      const parsed = YAML.parse(yamlString);

      expect(parsed.subnets).toHaveLength(3);
      expect(parsed.subnets[0].name).toBe('Engineering');
      expect(parsed.subnets[1].name).toBe('Sales');
      expect(parsed.subnets[2].name).toBe('Guest WiFi');
    });
  });

  describe('addYamlComments', () => {
    it('should add header comments', () => {
      const yamlString = 'name: "Test Plan"\nbaseIp: "10.0.0.0"';
      const commented = addYamlComments(yamlString);

      expect(commented).toContain('# cidrly Network Plan');
      expect(commented).toContain('# Generated:');
      expect(commented).toContain('# https://github.com/chuckycastle/cidrly');
    });

    it('should add section comments for subnets', () => {
      const yamlString = 'name: "Test"\nsubnets:\n  - name: "Engineering"';
      const commented = addYamlComments(yamlString);

      expect(commented).toContain('# Subnet Allocation');
    });

    it('should add section comments for supernet', () => {
      const yamlString = 'name: "Test"\nsupernet:\n  cidrPrefix: 16';
      const commented = addYamlComments(yamlString);

      expect(commented).toContain('# Supernet Summary');
    });
  });

  describe('exportToYaml', () => {
    it('should produce YAML with comments', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      plan.supernet = {
        networkAddress: '10.0.0.0',
        cidrPrefix: 16,
        totalSize: 65536,
        usedSize: 1024,
        utilization: 1.56,
        rangeEfficiency: 100,
      };

      const yamlString = await exportToYaml(plan);

      // Should include header comments
      expect(yamlString).toContain('# cidrly Network Plan');
      expect(yamlString).toContain('# Generated:');

      // Should include section comments
      expect(yamlString).toContain('# Subnet Allocation');
      expect(yamlString).toContain('# Supernet Summary');

      // Should be valid YAML after comments are removed
      const withoutComments = yamlString
        .split('\n')
        .filter((line) => !line.trim().startsWith('#'))
        .join('\n');
      expect(() => YAML.parse(withoutComments)).not.toThrow();
    });

    it('should produce parseable YAML', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      const yamlString = await exportToYaml(plan);

      // YAML parsers should handle comments, so this should work
      expect(() => YAML.parse(yamlString)).not.toThrow();

      const parsed = YAML.parse(yamlString);
      expect(parsed.name).toBe('Test Plan');
    });
  });

  describe('Round-trip consistency', () => {
    it('should preserve data through export and parse cycle', async () => {
      const plan = createNetworkPlan('Complex Plan', '192.168.0.0');
      plan.growthPercentage = 150;
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      plan.subnets.push(createSubnet('Sales', 20, 30));
      plan.supernet = {
        networkAddress: '192.168.0.0',
        cidrPrefix: 22,
        totalSize: 1024,
        usedSize: 512,
        efficiency: 50,
        rangeEfficiency: 100,
      };

      const yamlString = await exportToYaml(plan);
      const parsed = YAML.parse(yamlString);

      expect(parsed.name).toBe(plan.name);
      expect(parsed.baseIp).toBe(plan.baseIp);
      expect(parsed.growthPercentage).toBe(plan.growthPercentage);
      expect(parsed.subnets).toHaveLength(plan.subnets.length);
      expect(parsed.supernet.cidrPrefix).toBe(plan.supernet.cidrPrefix);
    });
  });
});
