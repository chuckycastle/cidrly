/**
 * Unit tests for block-parser
 */

import {
  calculateTotalCapacity,
  formatCapacity,
  parseAvailableBlocks,
} from '../../src/utils/block-parser.js';

describe('Block Parser', () => {
  describe('parseAvailableBlocks', () => {
    it('should parse valid single block', () => {
      const result = parseAvailableBlocks('10.1.241.0/24');
      expect(result.valid).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0]?.networkAddress).toBe('10.1.241.0/24');
      expect(result.blocks[0]?.cidrPrefix).toBe(24);
      expect(result.blocks[0]?.totalCapacity).toBe(256);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse multiple valid blocks', () => {
      const input = `10.1.241.0/24
10.1.242.0/24
10.1.244.0/22`;
      const result = parseAvailableBlocks(input);
      expect(result.valid).toBe(true);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks[0]?.totalCapacity).toBe(1024); // /22 (largest first)
      expect(result.blocks[1]?.totalCapacity).toBe(256); // /24
      expect(result.blocks[2]?.totalCapacity).toBe(256); // /24
    });

    it('should skip empty lines', () => {
      const input = `10.1.241.0/24

10.1.242.0/24`;
      const result = parseAvailableBlocks(input);
      expect(result.valid).toBe(true);
      expect(result.blocks).toHaveLength(2);
    });

    it('should reject empty input', () => {
      const result = parseAvailableBlocks('');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/No blocks provided/i);
    });

    it('should reject invalid CIDR format', () => {
      const result = parseAvailableBlocks('10.1.241.0');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Invalid CIDR format/i);
    });

    it('should reject invalid IP address', () => {
      const result = parseAvailableBlocks('10.1.256.0/24');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/Octet 3 must be between 0 and 255/i);
    });

    it('should reject CIDR prefix out of range', () => {
      const result = parseAvailableBlocks('10.1.241.0/7');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/CIDR prefix must be between 8 and 30/i);
    });

    it('should reject address not on network boundary', () => {
      const result = parseAvailableBlocks('10.1.241.5/24');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/not on.*boundary/i);
      expect(result.errors[0]).toMatch(/10\.1\.241\.0/);
    });

    it('should detect overlapping blocks', () => {
      const input = `10.1.240.0/24
10.1.240.0/24`;
      const result = parseAvailableBlocks(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.match(/overlap/i))).toBe(true);
    });

    it('should detect partial overlaps', () => {
      const input = `10.1.240.0/23
10.1.241.0/24`;
      const result = parseAvailableBlocks(input);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.match(/overlap/i))).toBe(true);
    });

    it('should sort blocks by capacity descending', () => {
      const input = `10.1.241.0/24
10.1.244.0/22
10.1.242.0/25`;
      const result = parseAvailableBlocks(input);
      expect(result.valid).toBe(true);
      expect(result.blocks[0]?.totalCapacity).toBe(1024); // /22 largest
      expect(result.blocks[1]?.totalCapacity).toBe(256); // /24
      expect(result.blocks[2]?.totalCapacity).toBe(128); // /25 smallest
    });
  });

  describe('calculateTotalCapacity', () => {
    it('should calculate total capacity across blocks', () => {
      const result = parseAvailableBlocks(`10.1.241.0/24
10.1.242.0/24
10.1.244.0/22`);
      const total = calculateTotalCapacity(result.blocks);
      expect(total).toBe(1536); // 256 + 256 + 1024
    });

    it('should return 0 for empty blocks', () => {
      expect(calculateTotalCapacity([])).toBe(0);
    });
  });

  describe('formatCapacity', () => {
    it('should format numbers with locale separators', () => {
      expect(formatCapacity(1000)).toBe('1,000');
      expect(formatCapacity(1536)).toBe('1,536');
    });

    it('should format small numbers without separators', () => {
      expect(formatCapacity(256)).toBe('256');
    });
  });
});
