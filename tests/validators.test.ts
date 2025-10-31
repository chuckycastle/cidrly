/**
 * Unit tests for validators
 */

import {
  validateDeviceCount,
  validateIpAddress,
  validatePlanName,
  validateSubnetName,
  validateVlanId,
} from '../src/core/validators/validators.js';

describe('Validators', () => {
  describe('validateSubnetName', () => {
    it('should accept valid subnet names', () => {
      expect(validateSubnetName('Engineering')).toBe(true);
      expect(validateSubnetName('Marketing Team')).toBe(true);
      expect(validateSubnetName('VLAN100')).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validateSubnetName('')).toMatch(/cannot be empty/i);
      expect(validateSubnetName('   ')).toMatch(/cannot be empty/i);
    });

    it('should reject names over 100 characters', () => {
      expect(validateSubnetName('a'.repeat(101))).toMatch(/100 characters or less/i);
    });

    it('should reject names with leading or trailing whitespace', () => {
      expect(validateSubnetName(' Engineering')).toMatch(/leading or trailing whitespace/i);
      expect(validateSubnetName('Engineering ')).toMatch(/leading or trailing whitespace/i);
      expect(validateSubnetName('  Engineering  ')).toMatch(/leading or trailing whitespace/i);
    });
  });

  describe('validateVlanId', () => {
    it('should accept valid VLAN IDs', () => {
      expect(validateVlanId('1')).toBe(true);
      expect(validateVlanId('100')).toBe(true);
      expect(validateVlanId('4094')).toBe(true);
    });

    it('should accept VLAN IDs with whitespace (trimmed)', () => {
      expect(validateVlanId(' 100 ')).toBe(true);
      expect(validateVlanId('  50  ')).toBe(true);
    });

    it('should reject non-numeric input', () => {
      expect(validateVlanId('abc')).toMatch(/must be a number/i);
      expect(validateVlanId('')).toMatch(/must be a number/i);
    });

    it('should reject out of range values', () => {
      expect(validateVlanId('0')).toMatch(/between 1 and 4094/i);
      expect(validateVlanId('4095')).toMatch(/between 1 and 4094/i);
      expect(validateVlanId('-1')).toMatch(/between 1 and 4094/i);
    });
  });

  describe('validateDeviceCount', () => {
    it('should accept valid device counts', () => {
      expect(validateDeviceCount('1')).toBe(true);
      expect(validateDeviceCount('100')).toBe(true);
      expect(validateDeviceCount('1000')).toBe(true);
    });

    it('should accept device counts with whitespace (trimmed)', () => {
      expect(validateDeviceCount(' 100 ')).toBe(true);
      expect(validateDeviceCount('  50  ')).toBe(true);
    });

    it('should reject non-numeric input', () => {
      expect(validateDeviceCount('abc')).toMatch(/must be a number/i);
      expect(validateDeviceCount('')).toMatch(/must be a number/i);
    });

    it('should reject values less than 1', () => {
      expect(validateDeviceCount('0')).toMatch(/at least 1/i);
      expect(validateDeviceCount('-1')).toMatch(/at least 1/i);
    });

    it('should reject extremely large values', () => {
      expect(validateDeviceCount('16777215')).toMatch(/too large/i);
    });
  });

  describe('validateIpAddress', () => {
    it('should accept valid IP addresses', () => {
      expect(validateIpAddress('10.0.0.0')).toBe(true);
      expect(validateIpAddress('192.168.1.1')).toBe(true);
      expect(validateIpAddress('172.16.0.0')).toBe(true);
    });

    it('should accept IP addresses with whitespace (trimmed)', () => {
      expect(validateIpAddress(' 10.0.0.0 ')).toBe(true);
      expect(validateIpAddress('  192.168.1.1  ')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateIpAddress('10.0.0')).toMatch(/Invalid IP address format/i);
      expect(validateIpAddress('abc.def.ghi.jkl')).toMatch(/Invalid IP address format/i);
      expect(validateIpAddress('')).toMatch(/Invalid IP address format/i);
    });

    it('should reject octets out of range', () => {
      expect(validateIpAddress('256.0.0.0')).toMatch(/between 0 and 255/i);
      expect(validateIpAddress('10.256.0.0')).toMatch(/between 0 and 255/i);
    });

    it('should reject octets with leading zeros', () => {
      expect(validateIpAddress('10.01.0.0')).toMatch(/invalid leading zero/i);
      expect(validateIpAddress('192.168.001.1')).toMatch(/invalid leading zero/i);
      expect(validateIpAddress('010.0.0.0')).toMatch(/invalid leading zero/i);
    });
  });

  describe('validatePlanName', () => {
    it('should accept valid plan names', () => {
      expect(validatePlanName('Corporate Network')).toBe(true);
      expect(validatePlanName('Campus Plan 2024')).toBe(true);
    });

    it('should reject empty names', () => {
      expect(validatePlanName('')).toMatch(/cannot be empty/i);
      expect(validatePlanName('   ')).toMatch(/cannot be empty/i);
    });

    it('should reject names over 100 characters', () => {
      expect(validatePlanName('a'.repeat(101))).toMatch(/100 characters or less/i);
    });

    it('should reject names with leading or trailing whitespace', () => {
      expect(validatePlanName(' Corporate Network')).toMatch(/leading or trailing whitespace/i);
      expect(validatePlanName('Corporate Network ')).toMatch(/leading or trailing whitespace/i);
      expect(validatePlanName('  Campus Plan  ')).toMatch(/leading or trailing whitespace/i);
    });
  });
});
