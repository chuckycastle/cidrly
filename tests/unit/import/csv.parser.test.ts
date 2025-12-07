/**
 * CSV Parser Tests
 */

import { csvParser } from '../../../src/services/import/parsers/csv.parser.js';

describe('CsvParser', () => {
  describe('formatId and formatName', () => {
    it('should have correct formatId', () => {
      expect(csvParser.formatId).toBe('csv');
    });

    it('should have correct formatName', () => {
      expect(csvParser.formatName).toBe('CSV (Comma Separated Values)');
    });

    it('should have correct extensions', () => {
      expect(csvParser.extensions).toContain('.csv');
    });
  });

  describe('canParse', () => {
    it('should return true for content with comma-separated values', () => {
      const content = 'name,vlan,devices\nServer,10,50';
      expect(csvParser.canParse(content)).toBe(true);
    });

    it('should return false for content with semicolon-separated values', () => {
      const content = 'name;vlan;devices\nServer;10;50';
      expect(csvParser.canParse(content)).toBe(false);
    });

    it('should return false for content with tab-separated values', () => {
      const content = 'name\tvlan\tdevices\nServer\t10\t50';
      expect(csvParser.canParse(content)).toBe(false);
    });

    it('should return false for non-CSV content', () => {
      const content = 'interfaces {\n  ethernet eth0 {\n  }\n}';
      expect(csvParser.canParse(content)).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(csvParser.canParse('')).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse standard CSV with header row', () => {
      const content = `name,vlan,devices,description
Server VLAN,10,50,Production servers
Client VLAN,20,100,Desktop clients`;

      const result = csvParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(2);
      expect(result.subnets[0]).toMatchObject({
        name: 'Server VLAN',
        vlanId: 10,
        expectedDevices: 50,
        description: 'Production servers',
      });
      expect(result.subnets[1]).toMatchObject({
        name: 'Client VLAN',
        vlanId: 20,
        expectedDevices: 100,
        description: 'Desktop clients',
      });
    });

    it('should parse CSV with different column order', () => {
      const content = `vlan,name,devices
10,Server VLAN,50`;

      const result = csvParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.subnets[0]).toMatchObject({
        name: 'Server VLAN',
        vlanId: 10,
        expectedDevices: 50,
      });
    });

    it('should parse CSV with vlanId column name', () => {
      const content = `name,vlanId,devices
Server,10,50`;

      const result = csvParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.subnets[0].vlanId).toBe(10);
    });

    it('should parse CSV with expected_devices column name', () => {
      const content = `name,vlan,expected_devices
Server,10,50`;

      const result = csvParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.subnets[0].expectedDevices).toBe(50);
    });

    it('should parse CSV with network address and CIDR', () => {
      const content = `name,vlan,devices,network
Server,10,50,192.168.10.0/24`;

      const result = csvParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].networkAddress).toBe('192.168.10.0/24');
      expect(result.subnets[0].cidrPrefix).toBe(24);
    });

    it('should parse CSV with gateway IP', () => {
      const content = `name,vlan,devices,gateway
Server,10,50,192.168.10.1`;

      const result = csvParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].gatewayIp).toBe('192.168.10.1');
    });

    it('should skip rows with missing required fields', () => {
      const content = `name,vlan,devices
Server,10,50
,20,100
NoVlan,,30`;

      const result = csvParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.warnings).toHaveLength(2);
    });

    it('should return error for CSV without required columns', () => {
      const content = `foo,bar,baz
a,b,c`;

      const result = csvParser.parse(content);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Missing required column');
    });

    it('should return error for empty CSV', () => {
      const result = csvParser.parse('');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should handle Windows line endings', () => {
      const content = `name,vlan,devices\r\nServer,10,50\r\nClient,20,100`;

      const result = csvParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(2);
    });
  });
});
