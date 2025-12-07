/**
 * Vendor Formatter Utils Tests
 */

import { createSubnet } from '../../../src/core/models/network-plan.js';
import {
  calculateGatewayIp,
  cidrToSubnetMask,
  escapeDescription,
  getSubnetsWithAddresses,
  sanitizeVlanName,
} from '../../../src/formatters/vendors/utils.js';

describe('VendorFormatterUtils', () => {
  describe('calculateGatewayIp', () => {
    it('should return first usable address (.1) for standard subnets', () => {
      expect(calculateGatewayIp('10.0.0.0/24')).toBe('10.0.0.1');
      expect(calculateGatewayIp('192.168.1.0/24')).toBe('192.168.1.1');
      expect(calculateGatewayIp('172.16.0.0/16')).toBe('172.16.0.1');
    });

    it('should handle /31 point-to-point networks', () => {
      expect(calculateGatewayIp('10.0.0.0/31')).toBe('10.0.0.0');
    });

    it('should handle /32 host routes', () => {
      expect(calculateGatewayIp('10.0.0.5/32')).toBe('10.0.0.5');
    });

    it('should handle missing prefix', () => {
      expect(calculateGatewayIp('10.0.0.0')).toBe('10.0.0.1');
    });
  });

  describe('cidrToSubnetMask', () => {
    it('should convert common CIDR prefixes correctly', () => {
      expect(cidrToSubnetMask(32)).toBe('255.255.255.255');
      expect(cidrToSubnetMask(30)).toBe('255.255.255.252');
      expect(cidrToSubnetMask(28)).toBe('255.255.255.240');
      expect(cidrToSubnetMask(24)).toBe('255.255.255.0');
      expect(cidrToSubnetMask(23)).toBe('255.255.254.0');
      expect(cidrToSubnetMask(16)).toBe('255.255.0.0');
      expect(cidrToSubnetMask(8)).toBe('255.0.0.0');
      expect(cidrToSubnetMask(0)).toBe('0.0.0.0');
    });

    it('should handle odd CIDR values', () => {
      expect(cidrToSubnetMask(25)).toBe('255.255.255.128');
      expect(cidrToSubnetMask(27)).toBe('255.255.255.224');
      expect(cidrToSubnetMask(22)).toBe('255.255.252.0');
    });
  });

  describe('sanitizeVlanName', () => {
    it('should replace spaces with underscores', () => {
      expect(sanitizeVlanName('Engineering Team')).toBe('Engineering_Team');
    });

    it('should remove special characters', () => {
      expect(sanitizeVlanName('Sales & Marketing!')).toBe('Sales_Marketing');
    });

    it('should handle leading/trailing underscores', () => {
      expect(sanitizeVlanName('_Test_')).toBe('Test');
    });

    it('should collapse multiple underscores', () => {
      expect(sanitizeVlanName('Test   Name')).toBe('Test_Name');
    });

    it('should truncate to max length', () => {
      const longName = 'A'.repeat(50);
      expect(sanitizeVlanName(longName, 32).length).toBe(32);
    });

    it('should allow hyphens and underscores', () => {
      expect(sanitizeVlanName('Test-Name_2')).toBe('Test-Name_2');
    });
  });

  describe('escapeDescription', () => {
    it('should remove newlines', () => {
      expect(escapeDescription('Line 1\nLine 2')).toBe('Line 1 Line 2');
    });

    it('should remove quotes', () => {
      expect(escapeDescription('Say "Hello"')).toBe('Say Hello');
    });

    it('should collapse whitespace', () => {
      expect(escapeDescription('Too   much   space')).toBe('Too much space');
    });

    it('should truncate to max length', () => {
      const longDesc = 'A'.repeat(300);
      expect(escapeDescription(longDesc, 240).length).toBe(240);
    });

    it('should trim whitespace', () => {
      expect(escapeDescription('  padded  ')).toBe('padded');
    });
  });

  describe('getSubnetsWithAddresses', () => {
    it('should filter out subnets without network addresses', () => {
      const subnet1 = createSubnet('Has Address', 10, 50);
      subnet1.subnetInfo = {
        networkAddress: '10.0.0.0/24',
        cidrPrefix: 24,
        subnetSize: 256,
        usableHosts: 254,
        requiredHosts: 100,
        plannedDevices: 50,
      };

      const subnet2 = createSubnet('No Address', 20, 30);

      const result = getSubnetsWithAddresses([subnet1, subnet2]);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('Has Address');
    });

    it('should return all subnets with addresses', () => {
      const subnet1 = createSubnet('First', 10, 50);
      subnet1.subnetInfo = {
        networkAddress: '10.0.0.0/24',
        cidrPrefix: 24,
        subnetSize: 256,
        usableHosts: 254,
        requiredHosts: 100,
        plannedDevices: 50,
      };

      const subnet2 = createSubnet('Second', 20, 30);
      subnet2.subnetInfo = {
        networkAddress: '10.0.1.0/24',
        cidrPrefix: 24,
        subnetSize: 256,
        usableHosts: 254,
        requiredHosts: 60,
        plannedDevices: 30,
      };

      const result = getSubnetsWithAddresses([subnet1, subnet2]);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for empty input', () => {
      expect(getSubnetsWithAddresses([])).toHaveLength(0);
    });
  });
});
