/**
 * YAML Parser Tests
 */

import { yamlParser } from '../../../src/services/import/parsers/yaml.parser.js';

describe('YamlParser', () => {
  describe('formatId and formatName', () => {
    it('should have correct formatId', () => {
      expect(yamlParser.formatId).toBe('yaml');
    });

    it('should have correct formatName', () => {
      expect(yamlParser.formatName).toBe('YAML Configuration');
    });

    it('should have correct extensions', () => {
      expect(yamlParser.extensions).toContain('.yaml');
      expect(yamlParser.extensions).toContain('.yml');
    });
  });

  describe('canParse', () => {
    it('should return true for YAML with subnets key', () => {
      const content = `name: Test Plan
subnets:
  - name: Server
    vlanId: 10`;
      expect(yamlParser.canParse(content)).toBe(true);
    });

    it('should return true for YAML with baseIp', () => {
      const content = `name: Test Plan
baseIp: 10.0.0.0
subnets:
  - name: Server
    vlanId: 10`;
      expect(yamlParser.canParse(content)).toBe(true);
    });

    it('should return true for YAML with array at root', () => {
      const content = `- name: Server
  vlanId: 10`;
      expect(yamlParser.canParse(content)).toBe(true);
    });

    it('should return false for non-YAML content', () => {
      const content = 'interfaces {\n  ethernet eth0 {\n  }\n}';
      expect(yamlParser.canParse(content)).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(yamlParser.canParse('')).toBe(false);
    });
  });

  describe('parse - cidrly format', () => {
    it('should parse cidrly YAML format', () => {
      const content = `name: Production Network
baseIp: 10.0.0.0
subnets:
  - name: Server VLAN
    vlanId: 10
    expectedDevices: 50
    description: Production servers
  - name: Client VLAN
    vlanId: 20
    expectedDevices: 100`;

      const result = yamlParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(2);
      expect(result.detectedPlanName).toBe('Production Network');
      expect(result.detectedBaseIp).toBe('10.0.0.0');
      expect(result.subnets[0]).toMatchObject({
        name: 'Server VLAN',
        vlanId: 10,
        expectedDevices: 50,
        description: 'Production servers',
      });
    });

    it('should parse subnet with network info', () => {
      const content = `name: Test
baseIp: 10.0.0.0
subnets:
  - name: Server
    vlanId: 10
    expectedDevices: 50
    networkAddress: 192.168.10.0
    cidrPrefix: 24
    gatewayIp: 192.168.10.1`;

      const result = yamlParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0]).toMatchObject({
        networkAddress: '192.168.10.0',
        gatewayIp: '192.168.10.1',
      });
    });
  });

  describe('parse - generic subnets format', () => {
    it('should parse generic subnets format', () => {
      const content = `subnets:
  - name: Server VLAN
    vlan_id: 10
    devices: 50
  - name: Client VLAN
    vlan_id: 20
    devices: 100`;

      const result = yamlParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(2);
      expect(result.subnets[0]).toMatchObject({
        name: 'Server VLAN',
        vlanId: 10,
        expectedDevices: 50,
      });
    });

    it('should parse subnets with vlan field', () => {
      const content = `subnets:
  - name: Server
    vlan: 10
    devices: 50`;

      const result = yamlParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].vlanId).toBe(10);
    });
  });

  describe('parse - error handling', () => {
    it('should return error for YAML without recognizable structure', () => {
      const content = `random:
  key: value`;

      const result = yamlParser.parse(content);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Invalid YAML structure');
    });

    it('should generate warnings for subnets missing required fields', () => {
      const content = `name: Test
baseIp: 10.0.0.0
subnets:
  - name: Valid
    vlanId: 10
    expectedDevices: 50
  - name: Missing VLAN
    expectedDevices: 50
  - vlanId: 20
    expectedDevices: 50`;

      const result = yamlParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should require expectedDevices field', () => {
      const content = `name: Test
baseIp: 10.0.0.0
subnets:
  - name: Minimal
    vlanId: 10`;

      const result = yamlParser.parse(content);

      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle empty content', () => {
      const result = yamlParser.parse('');

      expect(result.success).toBe(false);
    });
  });
});
