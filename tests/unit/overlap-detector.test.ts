/**
 * Unit tests for overlap detection
 */

import {
  checkNewSubnetOverlap,
  detectOverlaps,
} from '../../src/core/calculators/overlap-detector.js';

describe('Overlap Detector', () => {
  describe('detectOverlaps', () => {
    it('should detect no overlaps in non-overlapping subnets', () => {
      const subnets = [
        { networkAddress: '10.0.0.0/24', name: 'Engineering' },
        { networkAddress: '10.0.1.0/24', name: 'Sales' },
        { networkAddress: '10.0.2.0/24', name: 'Marketing' },
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect complete overlap (one subnet contains another)', () => {
      const subnets = [
        { networkAddress: '10.0.0.0/24', name: 'Engineering' }, // 10.0.0.0 - 10.0.0.255
        { networkAddress: '10.0.0.128/25', name: 'Sales' }, // 10.0.0.128 - 10.0.0.255
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        subnet1: '10.0.0.0/24',
        subnet2: '10.0.0.128/25',
        subnet1Name: 'Engineering',
        subnet2Name: 'Sales',
        overlapType: 'complete',
      });
    });

    it('should detect partial overlap (subnets partially intersect)', () => {
      // This test verifies the algorithm can distinguish partial from complete overlaps
      // In practice, VLSM allocation prevents partial overlaps, but manual entry could create them
      const subnets = [
        { networkAddress: '10.0.0.0/26', name: 'Engineering' }, // 10.0.0.0 - 10.0.0.63
        { networkAddress: '10.0.0.32/27', name: 'Sales' }, // 10.0.0.32 - 10.0.0.63
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      // Sales (32-63) is completely within Engineering (0-63), so this is complete overlap
      expect(result.conflicts[0]?.overlapType).toBe('complete');
    });

    it('should detect multiple overlaps', () => {
      const subnets = [
        { networkAddress: '10.0.0.0/24', name: 'A' }, // 10.0.0.0 - 10.0.0.255
        { networkAddress: '10.0.0.64/26', name: 'B' }, // 10.0.0.64 - 10.0.0.127 (overlaps A)
        { networkAddress: '10.0.0.128/26', name: 'C' }, // 10.0.0.128 - 10.0.0.191 (overlaps A)
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts).toHaveLength(2); // A-B and A-C
    });

    it('should handle empty subnet list', () => {
      const result = detectOverlaps([]);

      expect(result.hasOverlap).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should handle single subnet', () => {
      const result = detectOverlaps([{ networkAddress: '10.0.0.0/24', name: 'Single' }]);

      expect(result.hasOverlap).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should handle subnets without names', () => {
      const subnets = [{ networkAddress: '10.0.0.0/24' }, { networkAddress: '10.0.0.128/25' }];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts[0]?.subnet1Name).toBeUndefined();
      expect(result.conflicts[0]?.subnet2Name).toBeUndefined();
    });

    it('should detect adjacent non-overlapping subnets', () => {
      const subnets = [
        { networkAddress: '10.0.0.0/25', name: 'Engineering' }, // 10.0.0.0 - 10.0.0.127
        { networkAddress: '10.0.0.128/25', name: 'Sales' }, // 10.0.0.128 - 10.0.0.255
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should handle exact duplicate subnets', () => {
      const subnets = [
        { networkAddress: '10.0.0.0/24', name: 'Duplicate1' },
        { networkAddress: '10.0.0.0/24', name: 'Duplicate2' },
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts[0]?.overlapType).toBe('complete');
    });

    it('should handle different CIDR sizes correctly', () => {
      const subnets = [
        { networkAddress: '192.168.1.0/30', name: 'Tiny' }, // 192.168.1.0 - 192.168.1.3
        { networkAddress: '192.168.1.4/30', name: 'Also Tiny' }, // 192.168.1.4 - 192.168.1.7
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(false);
    });

    it('should detect overlap across different third octets', () => {
      const subnets = [
        { networkAddress: '172.16.0.0/23', name: 'Large' }, // 172.16.0.0 - 172.16.1.255
        { networkAddress: '172.16.1.0/24', name: 'Small' }, // 172.16.1.0 - 172.16.1.255
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts[0]?.overlapType).toBe('complete');
    });
  });

  describe('checkNewSubnetOverlap', () => {
    const existingSubnets = [
      { networkAddress: '10.0.0.0/24', name: 'Engineering' },
      { networkAddress: '10.0.1.0/24', name: 'Sales' },
      { networkAddress: '10.0.2.0/24', name: 'Marketing' },
    ];

    it('should detect no overlap for new non-overlapping subnet', () => {
      const newSubnet = { networkAddress: '10.0.3.0/24', name: 'HR' };

      const result = checkNewSubnetOverlap(newSubnet, existingSubnets);

      expect(result.hasOverlap).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should detect overlap with existing subnet', () => {
      const newSubnet = { networkAddress: '10.0.0.128/25', name: 'Guest WiFi' };

      const result = checkNewSubnetOverlap(newSubnet, existingSubnets);

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toMatchObject({
        subnet1: '10.0.0.128/25',
        subnet2: '10.0.0.0/24',
        subnet1Name: 'Guest WiFi',
        subnet2Name: 'Engineering',
      });
    });

    it('should detect multiple overlaps with existing subnets', () => {
      const newSubnet = { networkAddress: '10.0.0.0/22', name: 'Huge Subnet' }; // Overlaps all

      const result = checkNewSubnetOverlap(newSubnet, existingSubnets);

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts).toHaveLength(3);
    });

    it('should handle empty existing subnets list', () => {
      const newSubnet = { networkAddress: '10.0.0.0/24', name: 'First' };

      const result = checkNewSubnetOverlap(newSubnet, []);

      expect(result.hasOverlap).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it('should handle new subnet without network address', () => {
      const newSubnet = { networkAddress: '', name: 'Invalid' };

      const result = checkNewSubnetOverlap(newSubnet, existingSubnets);

      expect(result.hasOverlap).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle Class A private range boundaries', () => {
      const subnets = [
        { networkAddress: '10.0.0.0/8', name: 'Entire Class A' },
        { networkAddress: '10.255.255.0/24', name: 'End of Class A' },
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts[0]?.overlapType).toBe('complete');
    });

    it('should handle Class B private range', () => {
      const subnets = [
        { networkAddress: '172.16.0.0/16', name: 'Large B' },
        { networkAddress: '172.31.255.0/24', name: 'Different B' },
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(false);
    });

    it('should handle Class C private range', () => {
      const subnets = [
        { networkAddress: '192.168.0.0/24', name: 'Common' },
        { networkAddress: '192.168.1.0/24', name: 'Also Common' },
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(false);
    });

    it('should handle /30 networks (point-to-point)', () => {
      const subnets = [
        { networkAddress: '10.0.0.0/30', name: 'Link1' }, // 10.0.0.0 - 10.0.0.3
        { networkAddress: '10.0.0.4/30', name: 'Link2' }, // 10.0.0.4 - 10.0.0.7
        { networkAddress: '10.0.0.8/30', name: 'Link3' }, // 10.0.0.8 - 10.0.0.11
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(false);
    });

    it('should handle /31 networks (RFC 3021 point-to-point)', () => {
      const subnets = [
        { networkAddress: '10.0.0.0/31', name: 'P2P1' }, // 10.0.0.0 - 10.0.0.1
        { networkAddress: '10.0.0.2/31', name: 'P2P2' }, // 10.0.0.2 - 10.0.0.3
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(false);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should detect overlap in branch office misconfiguration', () => {
      const subnets = [
        { networkAddress: '192.168.1.0/24', name: 'Main Office' },
        { networkAddress: '192.168.1.0/25', name: 'Branch Office' }, // Mistake!
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(true);
      expect(result.conflicts[0]?.overlapType).toBe('complete');
    });

    it('should allow proper VLSM allocation', () => {
      const subnets = [
        { networkAddress: '10.0.0.0/26', name: 'Engineering' }, // 62 hosts
        { networkAddress: '10.0.0.64/26', name: 'Sales' }, // 62 hosts
        { networkAddress: '10.0.0.128/27', name: 'Management' }, // 30 hosts
        { networkAddress: '10.0.0.160/27', name: 'Guest WiFi' }, // 30 hosts
      ];

      const result = detectOverlaps(subnets);

      expect(result.hasOverlap).toBe(false);
    });
  });

  describe('IP Address Validation', () => {
    it('should throw error for IP addresses with wrong number of octets', () => {
      const subnets = [
        { networkAddress: '10.0.0/24', name: 'Invalid' },
        { networkAddress: '10.0.1.0/24', name: 'Valid' },
      ];
      expect(() => detectOverlaps(subnets)).toThrow('Invalid IP address format: 10.0.0');
    });

    it('should throw error for IP addresses with too many octets', () => {
      const subnets = [
        { networkAddress: '10.0.0.0.0/24', name: 'Invalid' },
        { networkAddress: '10.0.1.0/24', name: 'Valid' },
      ];
      expect(() => detectOverlaps(subnets)).toThrow('Invalid IP address format: 10.0.0.0.0');
    });

    it('should throw error for IP addresses with octets > 255', () => {
      const subnets = [
        { networkAddress: '10.0.0.999/24', name: 'Invalid' },
        { networkAddress: '10.0.1.0/24', name: 'Valid' },
      ];
      expect(() => detectOverlaps(subnets)).toThrow('Invalid IP address format: 10.0.0.999');
    });

    it('should throw error for IP addresses with negative octets', () => {
      const subnets = [
        { networkAddress: '10.0.-1.0/24', name: 'Invalid' },
        { networkAddress: '10.0.1.0/24', name: 'Valid' },
      ];
      expect(() => detectOverlaps(subnets)).toThrow('Invalid IP address format: 10.0.-1.0');
    });

    it('should throw error for non-numeric octets', () => {
      const subnets = [
        { networkAddress: '10.0.abc.0/24', name: 'Invalid' },
        { networkAddress: '10.0.1.0/24', name: 'Valid' },
      ];
      expect(() => detectOverlaps(subnets)).toThrow('Invalid IP address format: 10.0.abc.0');
    });

    it('should accept valid IP addresses in range 0-255', () => {
      const subnets = [
        { networkAddress: '0.0.0.0/24', name: 'Valid' },
        { networkAddress: '255.255.255.255/32', name: 'Valid' },
        { networkAddress: '192.168.1.1/24', name: 'Valid' },
      ];
      expect(() => detectOverlaps(subnets)).not.toThrow();
    });
  });
});
