/**
 * Cisco IOS Parser Tests
 */

import { ciscoIosParser } from '../../../src/services/import/parsers/router/cisco-ios.parser.js';

describe('CiscoIosParser', () => {
  describe('formatId and formatName', () => {
    it('should have correct formatId', () => {
      expect(ciscoIosParser.formatId).toBe('cisco-ios');
    });

    it('should have correct formatName', () => {
      expect(ciscoIosParser.formatName).toBe('Cisco IOS/IOS-XE');
    });

    it('should have correct extensions', () => {
      expect(ciscoIosParser.extensions).toContain('.ios.cfg');
      expect(ciscoIosParser.extensions).toContain('.cfg');
    });
  });

  describe('canParse', () => {
    it('should return true for Cisco IOS config with interface Vlan', () => {
      const content = `!
interface Vlan10
 ip address 192.168.10.1 255.255.255.0
!`;
      expect(ciscoIosParser.canParse(content)).toBe(true);
    });

    it('should return false for NX-OS config (has feature interface-vlan)', () => {
      const content = `feature interface-vlan

interface Vlan10
 ip address 192.168.10.1/24`;
      expect(ciscoIosParser.canParse(content)).toBe(false);
    });

    it('should return true even for CIDR notation (matches interface Vlan)', () => {
      const content = `interface Vlan10
   ip address 192.168.10.1/24`;
      // Note: canParse matches "interface Vlan" and "ip address", it doesn't distinguish between CIDR and dotted decimal
      expect(ciscoIosParser.canParse(content)).toBe(true);
    });

    it('should return false for non-Cisco content', () => {
      const content = 'interfaces {\n  ethernet eth0 {\n  }\n}';
      expect(ciscoIosParser.canParse(content)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse basic IOS configuration', () => {
      const content = `!
vlan 10
 name Server-VLAN
!
vlan 20
 name Client-VLAN
!
interface Vlan10
 description Production servers
 ip address 192.168.10.1 255.255.255.0
!
interface Vlan20
 description Desktop clients
 ip address 192.168.20.1 255.255.255.128
!`;

      const result = ciscoIosParser.parse(content);

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
      expect(result.subnets[1]).toMatchObject({
        name: 'Client-VLAN',
        vlanId: 20,
        networkAddress: '192.168.20.0/25',
        cidrPrefix: 25,
        gatewayIp: '192.168.20.1',
      });
    });

    it('should use VLAN ID as name when vlan definition is missing', () => {
      const content = `interface Vlan10
 ip address 192.168.10.1 255.255.255.0
!`;

      const result = ciscoIosParser.parse(content);

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
 ip address 192.168.10.1 255.255.255.0
!`;

      const result = ciscoIosParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('VLAN 20');
      expect(result.warnings[0].message).toContain('no SVI');
    });

    it('should handle various subnet masks', () => {
      const content = `interface Vlan10
 ip address 10.0.0.1 255.0.0.0
!
interface Vlan20
 ip address 172.16.0.1 255.255.0.0
!
interface Vlan30
 ip address 192.168.1.1 255.255.255.252
!`;

      const result = ciscoIosParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].cidrPrefix).toBe(8);
      expect(result.subnets[1].cidrPrefix).toBe(16);
      expect(result.subnets[2].cidrPrefix).toBe(30);
    });

    it('should return empty result for config without SVIs', () => {
      const content = `!
vlan 10
 name Server-VLAN
!
interface GigabitEthernet0/1
 switchport access vlan 10
!`;

      const result = ciscoIosParser.parse(content);

      expect(result.success).toBe(false);
      expect(result.subnets).toHaveLength(0);
    });
  });
});
