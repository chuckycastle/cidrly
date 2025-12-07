/**
 * Juniper JUNOS Parser Tests
 */

import { juniperJunosParser } from '../../../src/services/import/parsers/router/juniper-junos.parser.js';

describe('JuniperJunosParser', () => {
  describe('formatId and formatName', () => {
    it('should have correct formatId', () => {
      expect(juniperJunosParser.formatId).toBe('juniper-junos');
    });

    it('should have correct formatName', () => {
      expect(juniperJunosParser.formatName).toBe('Juniper JUNOS');
    });

    it('should have correct extensions', () => {
      expect(juniperJunosParser.extensions).toContain('.junos.conf');
      expect(juniperJunosParser.extensions).toContain('.conf');
    });
  });

  describe('canParse', () => {
    it('should return true for JUNOS config with vlans block', () => {
      const content = `vlans {
    server-vlan {
        vlan-id 10;
        l3-interface irb.10;
    }
}`;
      expect(juniperJunosParser.canParse(content)).toBe(true);
    });

    it('should return false for non-JUNOS content', () => {
      const content = `interface Vlan10
 ip address 192.168.10.1 255.255.255.0`;
      expect(juniperJunosParser.canParse(content)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should return empty result for config without vlans', () => {
      const content = `interfaces {
    ge-0/0/0 {
        unit 0 {
            family inet {
                address 192.168.1.1/24;
            }
        }
    }
}`;

      const result = juniperJunosParser.parse(content);

      expect(result.success).toBe(false);
      expect(result.subnets).toHaveLength(0);
    });
  });
});
