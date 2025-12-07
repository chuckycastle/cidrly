/**
 * Cisco NX-OS Parser Tests
 */

import { ciscoNxosParser } from '../../../src/services/import/parsers/router/cisco-nxos.parser.js';

describe('CiscoNxosParser', () => {
  describe('formatId and formatName', () => {
    it('should have correct formatId', () => {
      expect(ciscoNxosParser.formatId).toBe('cisco-nxos');
    });

    it('should have correct formatName', () => {
      expect(ciscoNxosParser.formatName).toBe('Cisco NX-OS');
    });

    it('should have correct extensions', () => {
      expect(ciscoNxosParser.extensions).toContain('.nxos.cfg');
    });
  });

  describe('canParse', () => {
    it('should return true for NX-OS config with feature interface-vlan', () => {
      const content = `feature interface-vlan

interface Vlan10
 ip address 192.168.10.1/24`;
      expect(ciscoNxosParser.canParse(content)).toBe(true);
    });

    it('should return false for IOS config (no feature line)', () => {
      const content = `interface Vlan10
 ip address 192.168.10.1 255.255.255.0`;
      expect(ciscoNxosParser.canParse(content)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse NX-OS configuration with CIDR notation', () => {
      const content = `feature interface-vlan

vlan 10
  name Server-VLAN
vlan 20
  name Client-VLAN

interface Vlan10
  description Production servers
  ip address 192.168.10.1/24
  no shutdown

interface Vlan20
  description Desktop clients
  ip address 192.168.20.1/25
  no shutdown`;

      const result = ciscoNxosParser.parse(content);

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
      });
    });

    it('should use VLAN ID as name when vlan definition is missing', () => {
      const content = `feature interface-vlan

interface Vlan10
  ip address 192.168.10.1/24`;

      const result = ciscoNxosParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].name).toBe('VLAN 10');
    });

    it('should generate warnings for VLANs without SVI', () => {
      const content = `feature interface-vlan

vlan 10
  name Server-VLAN
vlan 20
  name Orphan-VLAN

interface Vlan10
  ip address 192.168.10.1/24`;

      const result = ciscoNxosParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('VLAN 20');
    });

    it('should handle various CIDR prefixes', () => {
      const content = `feature interface-vlan

interface Vlan10
  ip address 10.0.0.1/8

interface Vlan20
  ip address 172.16.0.1/16

interface Vlan30
  ip address 192.168.1.1/30`;

      const result = ciscoNxosParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].cidrPrefix).toBe(8);
      expect(result.subnets[1].cidrPrefix).toBe(16);
      expect(result.subnets[2].cidrPrefix).toBe(30);
    });
  });
});
