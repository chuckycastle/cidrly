/**
 * Fortinet FortiOS Parser Tests
 */

import { fortinetParser } from '../../../src/services/import/parsers/router/fortinet.parser.js';

describe('FortinetParser', () => {
  describe('formatId and formatName', () => {
    it('should have correct formatId', () => {
      expect(fortinetParser.formatId).toBe('fortinet');
    });

    it('should have correct formatName', () => {
      expect(fortinetParser.formatName).toBe('Fortinet FortiOS');
    });

    it('should have correct extensions', () => {
      expect(fortinetParser.extensions).toContain('.forti.cfg');
      expect(fortinetParser.extensions).toContain('.cfg');
      expect(fortinetParser.extensions).toContain('.conf');
    });
  });

  describe('canParse', () => {
    it('should return true for FortiOS config', () => {
      const content = `config system interface
    edit "vlan10"
        set vlanid 10
        set ip 192.168.10.1 255.255.255.0
    next
end`;
      expect(fortinetParser.canParse(content)).toBe(true);
    });

    it('should return false for non-FortiOS content', () => {
      const content = `interface Vlan10
 ip address 192.168.10.1 255.255.255.0`;
      expect(fortinetParser.canParse(content)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse FortiOS configuration', () => {
      const content = `config system interface
    edit "server-vlan"
        set vdom "root"
        set vlanid 10
        set ip 192.168.10.1 255.255.255.0
        set description "Production servers"
        set interface "port1"
    next
    edit "client-vlan"
        set vdom "root"
        set vlanid 20
        set ip 192.168.20.1 255.255.255.128
        set description "Desktop clients"
        set interface "port1"
    next
end`;

      const result = fortinetParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(2);
      expect(result.subnets[0]).toMatchObject({
        name: 'server-vlan',
        vlanId: 10,
        networkAddress: '192.168.10.0/24',
        cidrPrefix: 24,
        gatewayIp: '192.168.10.1',
        description: 'Production servers',
      });
      expect(result.subnets[1]).toMatchObject({
        name: 'client-vlan',
        vlanId: 20,
        networkAddress: '192.168.20.0/25',
        cidrPrefix: 25,
      });
    });

    it('should handle different subnet masks', () => {
      const content = `config system interface
    edit "vlan10"
        set vlanid 10
        set ip 10.0.0.1 255.0.0.0
    next
    edit "vlan20"
        set vlanid 20
        set ip 172.16.0.1 255.255.0.0
    next
    edit "vlan30"
        set vlanid 30
        set ip 192.168.1.1 255.255.255.252
    next
end`;

      const result = fortinetParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].cidrPrefix).toBe(8);
      expect(result.subnets[1].cidrPrefix).toBe(16);
      expect(result.subnets[2].cidrPrefix).toBe(30);
    });

    it('should skip interfaces without vlanid', () => {
      const content = `config system interface
    edit "port1"
        set ip 192.168.1.1 255.255.255.0
    next
    edit "vlan10"
        set vlanid 10
        set ip 192.168.10.1 255.255.255.0
    next
end`;

      const result = fortinetParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.subnets[0].vlanId).toBe(10);
    });

    it('should return empty result for config without VLAN interfaces', () => {
      const content = `config system interface
    edit "port1"
        set ip 192.168.1.1 255.255.255.0
    next
end`;

      const result = fortinetParser.parse(content);

      expect(result.success).toBe(false);
      expect(result.subnets).toHaveLength(0);
    });
  });
});
