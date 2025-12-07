/**
 * Ubiquiti EdgeOS Parser Tests
 */

import { ubiquitiParser } from '../../../src/services/import/parsers/router/ubiquiti.parser.js';

describe('UbiquitiParser', () => {
  describe('formatId and formatName', () => {
    it('should have correct formatId', () => {
      expect(ubiquitiParser.formatId).toBe('ubiquiti');
    });

    it('should have correct formatName', () => {
      expect(ubiquitiParser.formatName).toBe('Ubiquiti EdgeOS');
    });

    it('should have correct extensions', () => {
      expect(ubiquitiParser.extensions).toContain('.ubnt.cfg');
      expect(ubiquitiParser.extensions).toContain('.cfg');
    });
  });

  describe('canParse', () => {
    it('should return true for EdgeOS config with vif', () => {
      const content = `interfaces {
    ethernet eth0 {
        vif 10 {
            address 192.168.10.1/24
        }
    }
}`;
      expect(ubiquitiParser.canParse(content)).toBe(true);
    });

    it('should return false for non-EdgeOS content', () => {
      const content = `interface Vlan10
 ip address 192.168.10.1 255.255.255.0`;
      expect(ubiquitiParser.canParse(content)).toBe(false);
    });
  });

  describe('parse', () => {
    it('should parse EdgeOS configuration', () => {
      const content = `interfaces {
    ethernet eth0 {
        vif 10 {
            address 192.168.10.1/24
            description "Production servers"
        }
        vif 20 {
            address 192.168.20.1/25
            description "Desktop clients"
        }
    }
}`;

      const result = ubiquitiParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(2);
      expect(result.subnets[0]).toMatchObject({
        name: 'Production servers',
        vlanId: 10,
        networkAddress: '192.168.10.0/24',
        cidrPrefix: 24,
        gatewayIp: '192.168.10.1',
        description: 'Production servers',
      });
      expect(result.subnets[1]).toMatchObject({
        name: 'Desktop clients',
        vlanId: 20,
        networkAddress: '192.168.20.0/25',
        cidrPrefix: 25,
      });
    });

    it('should use VLAN ID as name when description is missing', () => {
      const content = `interfaces {
    ethernet eth0 {
        vif 10 {
            address 192.168.10.1/24
        }
    }
}`;

      const result = ubiquitiParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].name).toBe('VLAN 10');
    });

    it('should handle different CIDR prefixes', () => {
      const content = `interfaces {
    ethernet eth0 {
        vif 10 {
            address 10.0.0.1/8
        }
        vif 20 {
            address 172.16.0.1/16
        }
        vif 30 {
            address 192.168.1.1/30
        }
    }
}`;

      const result = ubiquitiParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets[0].cidrPrefix).toBe(8);
      expect(result.subnets[1].cidrPrefix).toBe(16);
      expect(result.subnets[2].cidrPrefix).toBe(30);
    });

    it('should skip vifs without address', () => {
      const content = `interfaces {
    ethernet eth0 {
        vif 10 {
            description "No address"
        }
        vif 20 {
            address 192.168.20.1/24
        }
    }
}`;

      const result = ubiquitiParser.parse(content);

      expect(result.success).toBe(true);
      expect(result.subnets).toHaveLength(1);
      expect(result.subnets[0].vlanId).toBe(20);
    });

    it('should return empty result for config without vifs', () => {
      const content = `interfaces {
    ethernet eth0 {
        address 192.168.1.1/24
    }
}`;

      const result = ubiquitiParser.parse(content);

      expect(result.success).toBe(false);
      expect(result.subnets).toHaveLength(0);
    });
  });
});
