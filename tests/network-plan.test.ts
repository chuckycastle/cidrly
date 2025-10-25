/**
 * Unit tests for network plan data models
 */

import {
  createNetworkPlan,
  createSubnet,
  generateSubnetId,
  isValidDeviceCount,
  isValidSubnetName,
  isValidVlanId,
} from '../src/core/models/network-plan.js';
import { isValidIpAddress } from '../src/core/validators/validators.js';

describe('Network Plan Models', () => {
  describe('generateSubnetId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateSubnetId();
      const id2 = generateSubnetId();
      expect(id1).not.toBe(id2);
    });

    it('should start with subnet- prefix', () => {
      const id = generateSubnetId();
      expect(id).toMatch(/^subnet-/);
    });
  });

  describe('createSubnet', () => {
    it('should create subnet with correct properties', () => {
      const subnet = createSubnet('Engineering', 10, 25);

      expect(subnet.name).toBe('Engineering');
      expect(subnet.vlanId).toBe(10);
      expect(subnet.expectedDevices).toBe(25);
      expect(subnet.id).toBeDefined();
      expect(subnet.subnetInfo).toBeUndefined();
    });
  });

  describe('createNetworkPlan', () => {
    it('should create plan with default base IP', () => {
      const plan = createNetworkPlan('Test Plan');

      expect(plan.name).toBe('Test Plan');
      expect(plan.baseIp).toBe('10.0.0.0');
      expect(plan.subnets).toEqual([]);
      expect(plan.createdAt).toBeInstanceOf(Date);
      expect(plan.updatedAt).toBeInstanceOf(Date);
    });

    it('should create plan with custom base IP', () => {
      const plan = createNetworkPlan('Test Plan', '192.168.0.0');

      expect(plan.baseIp).toBe('192.168.0.0');
    });
  });

  describe('isValidIpAddress', () => {
    it('should validate correct IP addresses', () => {
      expect(isValidIpAddress('10.0.0.0')).toBe(true);
      expect(isValidIpAddress('192.168.1.1')).toBe(true);
      expect(isValidIpAddress('172.16.0.0')).toBe(true);
      expect(isValidIpAddress('255.255.255.255')).toBe(true);
    });

    it('should reject invalid IP addresses', () => {
      expect(isValidIpAddress('256.0.0.0')).toBe(false);
      expect(isValidIpAddress('10.0.0')).toBe(false);
      expect(isValidIpAddress('10.0.0.0.0')).toBe(false);
      expect(isValidIpAddress('abc.def.ghi.jkl')).toBe(false);
      expect(isValidIpAddress('10.-1.0.0')).toBe(false);
    });
  });

  describe('isValidVlanId', () => {
    it('should validate VLAN IDs in range 1-4094', () => {
      expect(isValidVlanId(1)).toBe(true);
      expect(isValidVlanId(100)).toBe(true);
      expect(isValidVlanId(4094)).toBe(true);
    });

    it('should reject VLAN IDs outside valid range', () => {
      expect(isValidVlanId(0)).toBe(false);
      expect(isValidVlanId(4095)).toBe(false);
      expect(isValidVlanId(-1)).toBe(false);
      expect(isValidVlanId(10000)).toBe(false);
    });
  });

  describe('isValidDeviceCount', () => {
    it('should validate positive device counts', () => {
      expect(isValidDeviceCount(1)).toBe(true);
      expect(isValidDeviceCount(100)).toBe(true);
      expect(isValidDeviceCount(1000)).toBe(true);
    });

    it('should reject invalid device counts', () => {
      expect(isValidDeviceCount(0)).toBe(false);
      expect(isValidDeviceCount(-1)).toBe(false);
      expect(isValidDeviceCount(16777215)).toBe(false); // Too large
    });
  });

  describe('isValidSubnetName', () => {
    it('should validate non-empty names', () => {
      expect(isValidSubnetName('Engineering')).toBe(true);
      expect(isValidSubnetName('Marketing Team')).toBe(true);
      expect(isValidSubnetName('A')).toBe(true);
    });

    it('should reject empty or too long names', () => {
      expect(isValidSubnetName('')).toBe(false);
      expect(isValidSubnetName('a'.repeat(101))).toBe(false);
    });

    it('should accept names up to 100 characters', () => {
      expect(isValidSubnetName('a'.repeat(100))).toBe(true);
    });
  });
});
