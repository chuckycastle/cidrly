/**
 * Unit tests for validation-rules helper functions
 */

import {
  getDirectory,
  isBroadcastIp,
  isMulticastIp,
  isPrivateIp,
  isReservedIp,
  isValidCidrAbsolute,
  isValidCidrPractical,
  isValidGrowthPercentage,
} from '../src/infrastructure/config/validation-rules.js';

describe('Validation Rules Helpers', () => {
  describe('isReservedIp', () => {
    it('should detect loopback addresses', () => {
      expect(isReservedIp('127.0.0.0')).toEqual({
        isReserved: true,
        description: 'Loopback',
      });
      expect(isReservedIp('127.0.0.1')).toEqual({
        isReserved: true,
        description: 'Loopback',
      });
      expect(isReservedIp('127.255.255.255')).toEqual({
        isReserved: true,
        description: 'Loopback',
      });
    });

    it('should detect link-local addresses', () => {
      expect(isReservedIp('169.254.0.0')).toEqual({
        isReserved: true,
        description: 'Link-local',
      });
      expect(isReservedIp('169.254.100.50')).toEqual({
        isReserved: true,
        description: 'Link-local',
      });
    });

    it('should detect this network addresses', () => {
      expect(isReservedIp('0.0.0.0')).toEqual({
        isReserved: true,
        description: 'This network',
      });
      expect(isReservedIp('0.255.255.255')).toEqual({
        isReserved: true,
        description: 'This network',
      });
    });

    it('should detect TEST-NET ranges', () => {
      expect(isReservedIp('192.0.2.0')).toEqual({
        isReserved: true,
        description: 'TEST-NET-1',
      });
      expect(isReservedIp('198.51.100.0')).toEqual({
        isReserved: true,
        description: 'TEST-NET-2',
      });
      expect(isReservedIp('203.0.113.0')).toEqual({
        isReserved: true,
        description: 'TEST-NET-3',
      });
    });

    it('should detect future reserved addresses', () => {
      expect(isReservedIp('240.0.0.0')).toEqual({
        isReserved: true,
        description: 'Reserved for future use',
      });
      expect(isReservedIp('255.255.255.254')).toEqual({
        isReserved: true,
        description: 'Reserved for future use',
      });
    });

    it('should not detect private addresses as reserved', () => {
      expect(isReservedIp('10.0.0.0')).toEqual({ isReserved: false });
      expect(isReservedIp('172.16.0.0')).toEqual({ isReserved: false });
      expect(isReservedIp('192.168.1.0')).toEqual({ isReserved: false });
    });

    it('should not detect public addresses as reserved', () => {
      expect(isReservedIp('8.8.8.8')).toEqual({ isReserved: false });
      expect(isReservedIp('1.1.1.1')).toEqual({ isReserved: false });
    });
  });

  describe('isPrivateIp', () => {
    it('should detect Class A private range (10.0.0.0/8)', () => {
      expect(isPrivateIp('10.0.0.0')).toEqual({
        isPrivate: true,
        description: 'Class A private',
      });
      expect(isPrivateIp('10.128.50.25')).toEqual({
        isPrivate: true,
        description: 'Class A private',
      });
      expect(isPrivateIp('10.255.255.255')).toEqual({
        isPrivate: true,
        description: 'Class A private',
      });
    });

    it('should detect Class B private range (172.16.0.0/12)', () => {
      expect(isPrivateIp('172.16.0.0')).toEqual({
        isPrivate: true,
        description: 'Class B private',
      });
      expect(isPrivateIp('172.24.100.50')).toEqual({
        isPrivate: true,
        description: 'Class B private',
      });
      expect(isPrivateIp('172.31.255.255')).toEqual({
        isPrivate: true,
        description: 'Class B private',
      });
    });

    it('should detect Class C private range (192.168.0.0/16)', () => {
      expect(isPrivateIp('192.168.0.0')).toEqual({
        isPrivate: true,
        description: 'Class C private',
      });
      expect(isPrivateIp('192.168.1.1')).toEqual({
        isPrivate: true,
        description: 'Class C private',
      });
      expect(isPrivateIp('192.168.255.255')).toEqual({
        isPrivate: true,
        description: 'Class C private',
      });
    });

    it('should not detect addresses just outside private ranges', () => {
      expect(isPrivateIp('9.255.255.255')).toEqual({ isPrivate: false });
      expect(isPrivateIp('11.0.0.0')).toEqual({ isPrivate: false });
      expect(isPrivateIp('172.15.255.255')).toEqual({ isPrivate: false });
      expect(isPrivateIp('172.32.0.0')).toEqual({ isPrivate: false });
      expect(isPrivateIp('192.167.255.255')).toEqual({ isPrivate: false });
      expect(isPrivateIp('192.169.0.0')).toEqual({ isPrivate: false });
    });

    it('should not detect public addresses as private', () => {
      expect(isPrivateIp('8.8.8.8')).toEqual({ isPrivate: false });
      expect(isPrivateIp('1.1.1.1')).toEqual({ isPrivate: false });
      expect(isPrivateIp('8.0.0.0')).toEqual({ isPrivate: false });
    });
  });

  describe('isMulticastIp', () => {
    it('should detect multicast range (224.0.0.0 - 239.255.255.255)', () => {
      expect(isMulticastIp('224.0.0.0')).toBe(true);
      expect(isMulticastIp('224.0.0.1')).toBe(true);
      expect(isMulticastIp('230.100.50.25')).toBe(true);
      expect(isMulticastIp('239.255.255.255')).toBe(true);
    });

    it('should not detect addresses just outside multicast range', () => {
      expect(isMulticastIp('223.255.255.255')).toBe(false);
      expect(isMulticastIp('240.0.0.0')).toBe(false);
    });

    it('should not detect private addresses as multicast', () => {
      expect(isMulticastIp('10.0.0.0')).toBe(false);
      expect(isMulticastIp('172.16.0.0')).toBe(false);
      expect(isMulticastIp('192.168.0.0')).toBe(false);
    });
  });

  describe('isBroadcastIp', () => {
    it('should detect broadcast address', () => {
      expect(isBroadcastIp('255.255.255.255')).toBe(true);
    });

    it('should not detect other addresses as broadcast', () => {
      expect(isBroadcastIp('255.255.255.254')).toBe(false);
      expect(isBroadcastIp('255.255.255.0')).toBe(false);
      expect(isBroadcastIp('0.0.0.0')).toBe(false);
      expect(isBroadcastIp('192.168.1.255')).toBe(false);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle IP address range boundaries correctly', () => {
      // Test exact boundaries of ranges
      expect(isReservedIp('127.0.0.0').isReserved).toBe(true);
      expect(isReservedIp('127.255.255.255').isReserved).toBe(true);
      expect(isReservedIp('128.0.0.0').isReserved).toBe(false);

      expect(isPrivateIp('172.15.255.255').isPrivate).toBe(false);
      expect(isPrivateIp('172.16.0.0').isPrivate).toBe(true);
      expect(isPrivateIp('172.31.255.255').isPrivate).toBe(true);
      expect(isPrivateIp('172.32.0.0').isPrivate).toBe(false);
    });

    it('should handle overlapping categories correctly', () => {
      // 255.255.255.255 is both broadcast AND in reserved range
      // But broadcast check should happen first in validator
      expect(isBroadcastIp('255.255.255.255')).toBe(true);
      expect(isReservedIp('255.255.255.255').isReserved).toBe(true);
    });
  });

  describe('getDirectory', () => {
    it('should use defaults for saved plans directory', () => {
      const result = getDirectory('saved');
      expect(result).toContain('cidrly');
      expect(result).toContain('saved-plans');
    });

    it('should use defaults for exports directory', () => {
      const result = getDirectory('exports');
      expect(result).toContain('cidrly');
      expect(result).toContain('exports');
    });

    it('should use custom path when provided', () => {
      const customPath = '/custom/path/to/plans';
      const result = getDirectory('saved', customPath);
      expect(result).toBe(customPath);
    });

    it('should expand tilde in custom path', () => {
      const customPath = '~/my-plans';
      const result = getDirectory('saved', customPath);
      expect(result).not.toContain('~');
      expect(result).toContain('my-plans');
    });
  });

  describe('isValidCidrPractical', () => {
    it('should accept practical CIDR ranges (8-30)', () => {
      expect(isValidCidrPractical(8)).toBe(true);
      expect(isValidCidrPractical(16)).toBe(true);
      expect(isValidCidrPractical(24)).toBe(true);
      expect(isValidCidrPractical(30)).toBe(true);
    });

    it('should reject CIDR values outside practical range', () => {
      expect(isValidCidrPractical(7)).toBe(false);
      expect(isValidCidrPractical(31)).toBe(false);
      expect(isValidCidrPractical(0)).toBe(false);
      expect(isValidCidrPractical(32)).toBe(false);
    });
  });

  describe('isValidCidrAbsolute', () => {
    it('should accept absolute valid CIDR range (0-32)', () => {
      expect(isValidCidrAbsolute(0)).toBe(true);
      expect(isValidCidrAbsolute(1)).toBe(true);
      expect(isValidCidrAbsolute(16)).toBe(true);
      expect(isValidCidrAbsolute(31)).toBe(true);
      expect(isValidCidrAbsolute(32)).toBe(true);
    });

    it('should reject CIDR values outside absolute range', () => {
      expect(isValidCidrAbsolute(-1)).toBe(false);
      expect(isValidCidrAbsolute(33)).toBe(false);
      expect(isValidCidrAbsolute(100)).toBe(false);
    });
  });

  describe('isValidGrowthPercentage', () => {
    it('should accept valid growth percentages (0-300, integers)', () => {
      expect(isValidGrowthPercentage(0)).toBe(true);
      expect(isValidGrowthPercentage(50)).toBe(true);
      expect(isValidGrowthPercentage(100)).toBe(true);
      expect(isValidGrowthPercentage(200)).toBe(true);
      expect(isValidGrowthPercentage(300)).toBe(true);
    });

    it('should reject percentages outside range', () => {
      expect(isValidGrowthPercentage(-1)).toBe(false);
      expect(isValidGrowthPercentage(301)).toBe(false);
      expect(isValidGrowthPercentage(500)).toBe(false);
    });

    it('should reject non-integer percentages', () => {
      expect(isValidGrowthPercentage(50.5)).toBe(false);
      expect(isValidGrowthPercentage(100.1)).toBe(false);
      expect(isValidGrowthPercentage(0.5)).toBe(false);
    });
  });
});
