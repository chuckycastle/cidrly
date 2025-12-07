/**
 * Fortinet FortiOS Parser
 * Parses Fortinet FortiGate configuration files
 */

import type { ImportFormat, ImportedSubnet, ParseResult } from '../../import.types.js';
import type { ImportParser } from '../parser.interface.js';
import { BaseRouterParser } from './base-router.parser.js';

interface InterfaceInfo {
  name: string;
  vlanId: number;
  ipAddress: string;
  mask: string;
  description?: string;
}

/**
 * Fortinet FortiOS Parser implementation
 */
export class FortinetParser extends BaseRouterParser implements ImportParser {
  readonly formatId: ImportFormat = 'fortinet';
  readonly formatName = 'Fortinet FortiOS';
  readonly extensions = ['.forti.cfg', '.cfg', '.conf'];

  parse(content: string): ParseResult {
    const subnets: ImportedSubnet[] = [];

    const interfaces = this.parseInterfaces(content);

    for (const iface of interfaces) {
      const cidr = this.maskToCidr(iface.mask);
      const subnet: ImportedSubnet = {
        name: this.sanitizeName(iface.name.replace(/^vlan/, 'VLAN ')),
        vlanId: iface.vlanId,
        expectedDevices: this.estimateDevices(cidr),
        networkAddress: this.gatewayToNetwork(iface.ipAddress, cidr),
        cidrPrefix: cidr,
        description: iface.description,
        gatewayIp: iface.ipAddress,
      };
      subnets.push(subnet);
    }

    return {
      success: subnets.length > 0,
      subnets,
      warnings: [],
      errors: [],
    };
  }

  canParse(content: string): boolean {
    return content.includes('config system interface') && content.includes('set vlanid');
  }

  private parseInterfaces(content: string): InterfaceInfo[] {
    const interfaces: InterfaceInfo[] = [];

    const configMatch = content.match(/config system interface([\s\S]*?)^end$/m);
    if (!configMatch?.[1]) return interfaces;

    const configBlock = configMatch[1];

    const editRegex = /edit\s+"([^"]+)"([\s\S]*?)(?=edit\s+"|$)/g;
    let match;

    while ((match = editRegex.exec(configBlock)) !== null) {
      const name = match[1];
      const body = match[2];
      if (!name || !body) continue;

      const vlanIdMatch = body.match(/set\s+vlanid\s+(\d+)/);
      if (!vlanIdMatch?.[1]) continue;

      const ipMatch = body.match(/set\s+ip\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/);
      if (!ipMatch?.[1] || !ipMatch[2]) continue;

      const descMatch = body.match(/set\s+description\s+"([^"]+)"/);

      interfaces.push({
        name,
        vlanId: parseInt(vlanIdMatch[1], 10),
        ipAddress: ipMatch[1],
        mask: ipMatch[2],
        description: descMatch?.[1],
      });
    }

    return interfaces;
  }

  private estimateDevices(cidr: number): number {
    const hosts = Math.pow(2, 32 - cidr) - 2;
    return Math.max(1, Math.floor(hosts * 0.5));
  }
}

export const fortinetParser = new FortinetParser();
