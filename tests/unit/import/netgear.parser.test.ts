/**
 * Netgear Parser Tests
 */

import { netgearParser } from '../../../src/services/import/parsers/router/netgear.parser.js';

describe('NetgearParser', () => {
  describe('formatId and formatName', () => {
    it('should have correct formatId', () => {
      expect(netgearParser.formatId).toBe('netgear');
    });

    it('should have correct formatName', () => {
      expect(netgearParser.formatName).toBe('Netgear');
    });

    it('should have correct extensions', () => {
      expect(netgearParser.extensions).toContain('.netgear.cfg');
      expect(netgearParser.extensions).toContain('.cfg');
    });
  });

  describe('canParse', () => {
    it('should return true for Netgear config', () => {
      const content = `vlan database
vlan 10 name "Server-VLAN"
exit

interface vlan 10
ip address 192.168.10.1 255.255.255.0
exit`;
      expect(netgearParser.canParse(content)).toBe(true);
    });

    it('should return false for non-Netgear content', () => {
      const content = `interface Vlan10
 ip address 192.168.10.1 255.255.255.0`;
      expect(netgearParser.canParse(content)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse Netgear configuration', () => {
      const content = `vlan database
vlan 10 name "Server-VLAN"
vlan 20 name "Client-VLAN"
exit

interface vlan 10
description "Production servers"
ip address 192.168.10.1 255.255.255.0
exit

interface vlan 20
description "Desktop clients"
ip address 192.168.20.1 255.255.255.128
exit`;

      const result = netgearParser.parse(content);

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
      const content = `vlan database
exit

interface vlan 10
ip address 192.168.10.1 255.255.255.0
exit`;

      const result = netgearParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].name).toBe('VLAN 10');
    });

    it('should generate warnings for VLANs without interface', () => {
      const content = `vlan database
vlan 10 name "Server-VLAN"
vlan 20 name "Orphan-VLAN"
exit

interface vlan 10
ip address 192.168.10.1 255.255.255.0
exit`;

      const result = netgearParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('VLAN 20');
      expect(result.warnings[0].message).toContain('no interface');
    });

    it('should handle different subnet masks', () => {
      const content = `vlan database
exit

interface vlan 10
ip address 10.0.0.1 255.0.0.0
exit

interface vlan 20
ip address 172.16.0.1 255.255.0.0
exit

interface vlan 30
ip address 192.168.1.1 255.255.255.252
exit`;

      const result = netgearParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].cidrPrefix).toBe(8);
      expect(result.subnets[1].cidrPrefix).toBe(16);
      expect(result.subnets[2].cidrPrefix).toBe(30);
    });

    it('should return empty result for config without interface vlans', () => {
      const content = `vlan database
vlan 10 name "Server-VLAN"
exit`;

      const result = netgearParser.parse(content);

      expect(result.success).toBe(false);
      expect(result.subnets).toHaveLength(0);
    });
  });
});
