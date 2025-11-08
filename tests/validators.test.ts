/**
 * Unit tests for validators
 */

import {
  validateDeviceCount,
  validateIpAddress,
  validateManualNetworkAddress,
  validatePlanName,
  validateSubnetDescription,
  validateSubnetName,
  validateVlanId,
  ValidationError,
} from '../src/core/validators/validators.js';

describe('Validators', () => {
  describe('ValidationError', () => {
    it('should create error with correct name and message', () => {
      const error = new ValidationError('Test error message');
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test error message');
      expect(error).toBeInstanceOf(Error);
    });
  });
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

    it('should reject extremely long input (DoS protection)', () => {
      expect(validateVlanId('1'.repeat(11))).toMatch(/too long/i);
      expect(validateVlanId('12345678901')).toMatch(/too long/i);
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

    it('should reject extremely long input (DoS protection)', () => {
      expect(validateDeviceCount('1'.repeat(16))).toMatch(/too long/i);
      expect(validateDeviceCount('1234567890123456')).toMatch(/too long/i);
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

    it('should reject extremely long input (DoS protection)', () => {
      expect(validateIpAddress('1'.repeat(16))).toMatch(/too long/i);
      expect(validateIpAddress('192.168.1.1.1.1.1')).toMatch(/too long/i);
    });

    describe('reserved IP addresses', () => {
      it('should reject loopback addresses (127.0.0.0/8)', () => {
        expect(validateIpAddress('127.0.0.0')).toMatch(/Reserved IP address.*Loopback/i);
        expect(validateIpAddress('127.0.0.1')).toMatch(/Reserved IP address.*Loopback/i);
        expect(validateIpAddress('127.255.255.255')).toMatch(/Reserved IP address.*Loopback/i);
      });

      it('should reject link-local addresses (169.254.0.0/16)', () => {
        expect(validateIpAddress('169.254.0.0')).toMatch(/Reserved IP address.*Link-local/i);
        expect(validateIpAddress('169.254.1.1')).toMatch(/Reserved IP address.*Link-local/i);
        expect(validateIpAddress('169.254.255.255')).toMatch(/Reserved IP address.*Link-local/i);
      });

      it('should reject this network (0.0.0.0/8)', () => {
        expect(validateIpAddress('0.0.0.0')).toMatch(/Reserved IP address.*This network/i);
        expect(validateIpAddress('0.0.0.1')).toMatch(/Reserved IP address.*This network/i);
        expect(validateIpAddress('0.255.255.255')).toMatch(/Reserved IP address.*This network/i);
      });

      it('should reject IETF protocol assignments (192.0.0.0/24)', () => {
        expect(validateIpAddress('192.0.0.0')).toMatch(
          /Reserved IP address.*IETF Protocol Assignments/i,
        );
        expect(validateIpAddress('192.0.0.255')).toMatch(
          /Reserved IP address.*IETF Protocol Assignments/i,
        );
      });

      it('should reject TEST-NET addresses', () => {
        expect(validateIpAddress('192.0.2.0')).toMatch(/Reserved IP address.*TEST-NET-1/i);
        expect(validateIpAddress('198.51.100.0')).toMatch(/Reserved IP address.*TEST-NET-2/i);
        expect(validateIpAddress('203.0.113.0')).toMatch(/Reserved IP address.*TEST-NET-3/i);
      });

      it('should reject future reserved addresses (240.0.0.0/4)', () => {
        expect(validateIpAddress('240.0.0.0')).toMatch(
          /Reserved IP address.*Reserved for future use/i,
        );
        expect(validateIpAddress('255.255.255.254')).toMatch(
          /Reserved IP address.*Reserved for future use/i,
        );
      });
    });

    describe('multicast addresses', () => {
      it('should reject multicast range (224.0.0.0 - 239.255.255.255)', () => {
        expect(validateIpAddress('224.0.0.0')).toMatch(/Multicast IP address/i);
        expect(validateIpAddress('224.0.0.1')).toMatch(/Multicast IP address/i);
        expect(validateIpAddress('239.255.255.255')).toMatch(/Multicast IP address/i);
      });

      it('should accept addresses just outside multicast range', () => {
        expect(validateIpAddress('223.255.255.255')).toBe(true);
        expect(validateIpAddress('240.0.0.1')).toMatch(/Reserved/i); // Reserved, not multicast
      });
    });

    describe('broadcast address', () => {
      it('should reject broadcast address (255.255.255.255)', () => {
        expect(validateIpAddress('255.255.255.255')).toMatch(/Broadcast IP address/i);
      });

      it('should accept 255.255.255.254 (reserved but not broadcast)', () => {
        expect(validateIpAddress('255.255.255.254')).toMatch(/Reserved/i);
      });
    });

    describe('private IP addresses - should accept', () => {
      it('should accept Class A private range (10.0.0.0/8)', () => {
        expect(validateIpAddress('10.0.0.0')).toBe(true);
        expect(validateIpAddress('10.128.0.0')).toBe(true);
        expect(validateIpAddress('10.255.255.255')).toBe(true);
      });

      it('should accept Class B private range (172.16.0.0/12)', () => {
        expect(validateIpAddress('172.16.0.0')).toBe(true);
        expect(validateIpAddress('172.24.0.0')).toBe(true);
        expect(validateIpAddress('172.31.255.255')).toBe(true);
      });

      it('should accept Class C private range (192.168.0.0/16)', () => {
        expect(validateIpAddress('192.168.0.0')).toBe(true);
        expect(validateIpAddress('192.168.1.0')).toBe(true);
        expect(validateIpAddress('192.168.255.255')).toBe(true);
      });
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

  describe('validateSubnetDescription', () => {
    it('should accept valid descriptions', () => {
      expect(validateSubnetDescription('Main office network')).toBe(true);
      expect(validateSubnetDescription('Guest WiFi for visitors')).toBe(true);
    });

    it('should accept empty descriptions (optional field)', () => {
      expect(validateSubnetDescription('')).toBe(true);
      expect(validateSubnetDescription('   ')).toBe(true);
    });

    it('should reject descriptions over 200 characters', () => {
      expect(validateSubnetDescription('a'.repeat(201))).toMatch(/200 characters or less/i);
    });

    it('should accept descriptions at exactly 200 characters', () => {
      expect(validateSubnetDescription('a'.repeat(200))).toBe(true);
    });
  });

  describe('validateManualNetworkAddress', () => {
    const existingSubnets = [
      {
        id: 'subnet-1',
        subnetInfo: {
          networkAddress: '10.0.0.0/24',
          cidrPrefix: 24,
        },
      },
      {
        id: 'subnet-2',
        subnetInfo: {
          networkAddress: '10.0.1.0/24',
          cidrPrefix: 24,
        },
      },
    ];

    it('should accept valid network address', () => {
      const result = validateManualNetworkAddress(
        '10.0.2.0/24',
        24,
        '10.0.0.0',
        existingSubnets,
        'subnet-3',
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject network address without CIDR prefix', () => {
      const result = validateManualNetworkAddress(
        '10.0.2.0',
        24,
        '10.0.0.0',
        existingSubnets,
        'subnet-3',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/must include CIDR prefix/i);
    });

    it('should reject network address with invalid IP', () => {
      const result = validateManualNetworkAddress(
        '10.0.256.0/24',
        24,
        '10.0.0.0',
        existingSubnets,
        'subnet-3',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Octet 3 must be between 0 and 255/i);
    });

    it('should reject CIDR prefix outside valid range', () => {
      const result = validateManualNetworkAddress(
        '10.0.2.0/7',
        24,
        '10.0.0.0',
        existingSubnets,
        'subnet-3',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/CIDR prefix must be between 8 and 30/i);
    });

    it('should reject CIDR prefix too large', () => {
      const result = validateManualNetworkAddress(
        '10.0.2.0/31',
        24,
        '10.0.0.0',
        existingSubnets,
        'subnet-3',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/CIDR prefix must be between 8 and 30/i);
    });

    it('should warn if CIDR prefix differs from calculated size', () => {
      const result = validateManualNetworkAddress(
        '10.0.2.0/25',
        24,
        '10.0.0.0',
        existingSubnets,
        'subnet-3',
      );
      expect(result.valid).toBe(true);
      expect(result.warnings[0]).toMatch(/Network size.*differs from calculated size/i);
    });

    it('should reject address not on network boundary', () => {
      const result = validateManualNetworkAddress(
        '10.0.2.5/24',
        24,
        '10.0.0.0',
        existingSubnets,
        'subnet-3',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/not on.*boundary/i);
      expect(result.errors[0]).toMatch(/10\.0\.2\.0/);
    });

    it('should warn if address outside base network range', () => {
      const result = validateManualNetworkAddress(
        '172.16.0.0/24',
        24,
        '10.0.0.0',
        existingSubnets,
        'subnet-3',
      );
      expect(result.valid).toBe(true);
      expect(result.warnings[0]).toMatch(/outside base network range/i);
    });

    it('should reject overlapping network addresses', () => {
      const result = validateManualNetworkAddress(
        '10.0.0.0/24',
        24,
        '10.0.0.0',
        existingSubnets,
        'subnet-3',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/overlaps with existing subnet/i);
    });

    it('should reject partially overlapping network addresses', () => {
      const result = validateManualNetworkAddress(
        '10.0.0.128/25',
        25,
        '10.0.0.0',
        existingSubnets,
        'subnet-3',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/overlaps with existing subnet/i);
    });

    it('should allow editing current subnet without overlap error', () => {
      const result = validateManualNetworkAddress(
        '10.0.0.0/24',
        24,
        '10.0.0.0',
        existingSubnets,
        'subnet-1', // Editing subnet-1, so overlap with itself is allowed
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle subnets without subnetInfo', () => {
      const subnetsWithMissing = [
        ...existingSubnets,
        {
          id: 'subnet-4',
          subnetInfo: undefined,
        },
      ];
      const result = validateManualNetworkAddress(
        '10.0.2.0/24',
        24,
        '10.0.0.0',
        subnetsWithMissing,
        'subnet-3',
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle malformed existing subnet addresses', () => {
      const subnetsWithMalformed = [
        ...existingSubnets,
        {
          id: 'subnet-4',
          subnetInfo: {
            networkAddress: 'invalid-address',
            cidrPrefix: 24,
          },
        },
      ];
      const result = validateManualNetworkAddress(
        '10.0.2.0/24',
        24,
        '10.0.0.0',
        subnetsWithMalformed,
        'subnet-3',
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect overlap with larger existing subnet', () => {
      const subnetsWithLarger = [
        {
          id: 'subnet-large',
          subnetInfo: {
            networkAddress: '10.0.0.0/16',
            cidrPrefix: 16,
          },
        },
      ];
      const result = validateManualNetworkAddress(
        '10.0.1.0/24',
        24,
        '10.0.0.0',
        subnetsWithLarger,
        'subnet-new',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/overlaps with existing subnet/i);
    });

    it('should detect overlap with smaller existing subnet', () => {
      const subnetsWithSmaller = [
        {
          id: 'subnet-small',
          subnetInfo: {
            networkAddress: '10.0.0.128/25',
            cidrPrefix: 25,
          },
        },
      ];
      const result = validateManualNetworkAddress(
        '10.0.0.0/24',
        24,
        '10.0.0.0',
        subnetsWithSmaller,
        'subnet-new',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/overlaps with existing subnet/i);
    });
  });
});
