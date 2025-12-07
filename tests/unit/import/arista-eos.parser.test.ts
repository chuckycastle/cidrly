/**
 * Arista EOS Parser Tests
 */

import { aristaEosParser } from '../../../src/services/import/parsers/router/arista-eos.parser.js';

describe('AristaEosParser', () => {
  describe('formatId and formatName', () => {
    it('should have correct formatId', () => {
      expect(aristaEosParser.formatId).toBe('arista-eos');
    });

    it('should have correct formatName', () => {
      expect(aristaEosParser.formatName).toBe('Arista EOS');
    });

    it('should have correct extensions', () => {
      expect(aristaEosParser.extensions).toContain('.eos.cfg');
    });
  });

  describe('canParse', () => {
    it('should return true for Arista EOS config', () => {
      const content = `!
vlan 10
   name Server-VLAN
!
interface Vlan10
   ip address 192.168.10.1/24
!`;
      expect(aristaEosParser.canParse(content)).toBe(true);
    });

    it('should return false for NX-OS config (has feature interface-vlan)', () => {
      const content = `feature interface-vlan

interface Vlan10
 ip address 192.168.10.1/24`;
      expect(aristaEosParser.canParse(content)).toBe(false);
    });

    it('should return false for IOS config (uses dotted decimal)', () => {
      const content = `interface Vlan10
 ip address 192.168.10.1 255.255.255.0`;
      expect(aristaEosParser.canParse(content)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse Arista EOS configuration', () => {
      const content = `!
vlan 10
   name Server-VLAN
!
vlan 20
   name Client-VLAN
!
interface Vlan10
   description Production servers
   ip address 192.168.10.1/24
!
interface Vlan20
   description Desktop clients
   ip address 192.168.20.1/25
!`;

      const result = aristaEosParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(2);
      expect(result.subnets[0]).toMatchObject({
        name: 'Server-VLAN',
        vlanId: 10,
        networkAddress: '192.168.10.0/24',
        cidrPrefix: 24,
        gatewayIp: '192.168.10.1',
        description: 'Production servers',
      });
    });

    it('should use VLAN ID as name when vlan definition is missing', () => {
      const content = `interface Vlan10
   ip address 192.168.10.1/24
!`;

      const result = aristaEosParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].name).toBe('VLAN 10');
    });

    it('should generate warnings for VLANs without SVI', () => {
      const content = `vlan 10
   name Server-VLAN
!
vlan 20
   name Orphan-VLAN
!
interface Vlan10
   ip address 192.168.10.1/24
!`;

      const result = aristaEosParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('VLAN 20');
    });

    it('should handle case-insensitive Vlan keyword', () => {
      const content = `interface vlan10
   ip address 192.168.10.1/24
!`;

      const result = aristaEosParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].vlanId).toBe(10);
    });
  });
});
