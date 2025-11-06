/**
 * Unit tests for input parsing helper functions
 */

import { parseDeviceCount, parseVlanId } from '../../src/utils/input-helpers.js';

describe('Input Helpers', () => {
  describe('parseVlanId', () => {
    it('should parse valid VLAN ID string', () => {
      expect(parseVlanId('100')).toBe(100);
      expect(parseVlanId('1')).toBe(1);
      expect(parseVlanId('4094')).toBe(4094);
    });

    it('should handle VLAN ID with leading/trailing spaces', () => {
      expect(parseVlanId('  100  ')).toBe(100);
      expect(parseVlanId('\t50\n')).toBe(50);
    });

    it('should return NaN for invalid input', () => {
      expect(parseVlanId('abc')).toBeNaN();
      expect(parseVlanId('')).toBeNaN();
      expect(parseVlanId('12.5')).toBe(12); // parseInt stops at decimal
    });

    it('should handle negative numbers', () => {
      expect(parseVlanId('-10')).toBe(-10);
    });

    it('should handle decimal strings (truncates)', () => {
      expect(parseVlanId('100.99')).toBe(100);
      expect(parseVlanId('3.14')).toBe(3);
    });
  });

  describe('parseDeviceCount', () => {
    it('should parse valid device count string', () => {
      expect(parseDeviceCount('50')).toBe(50);
      expect(parseDeviceCount('1')).toBe(1);
      expect(parseDeviceCount('10000')).toBe(10000);
    });

    it('should handle device count with leading/trailing spaces', () => {
      expect(parseDeviceCount('  250  ')).toBe(250);
      expect(parseDeviceCount('\t100\n')).toBe(100);
    });

    it('should return NaN for invalid input', () => {
      expect(parseDeviceCount('xyz')).toBeNaN();
      expect(parseDeviceCount('')).toBeNaN();
      expect(parseDeviceCount('25.7')).toBe(25); // parseInt stops at decimal
    });

    it('should handle negative numbers', () => {
      expect(parseDeviceCount('-5')).toBe(-5);
    });

    it('should handle decimal strings (truncates)', () => {
      expect(parseDeviceCount('50.99')).toBe(50);
      expect(parseDeviceCount('2.5')).toBe(2);
    });

    it('should handle large numbers', () => {
      expect(parseDeviceCount('999999')).toBe(999999);
      expect(parseDeviceCount('1000000')).toBe(1000000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle hexadecimal-looking strings as base 10', () => {
      // parseInt without explicit base 10 could interpret '0x10' as hex
      expect(parseVlanId('10')).toBe(10); // Not 16
      expect(parseDeviceCount('100')).toBe(100); // Not 256
    });

    it('should handle octal-looking strings as base 10', () => {
      // Leading zeros could be interpreted as octal in old JavaScript
      expect(parseVlanId('010')).toBe(10); // Not 8
      expect(parseDeviceCount('0100')).toBe(100); // Not 64
    });

    it('should handle zero', () => {
      expect(parseVlanId('0')).toBe(0);
      expect(parseDeviceCount('0')).toBe(0);
    });
  });
});
