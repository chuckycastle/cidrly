/**
 * Ubiquiti EdgeOS Parser
 * Parses Ubiquiti EdgeRouter configuration files
 */

import type { ImportFormat, ImportedSubnet, ParseResult } from '../../import.types.js';
import type { ImportParser } from '../parser.interface.js';
import { BaseRouterParser } from './base-router.parser.js';

interface VifInfo {
  vlanId: number;
  ipAddress: string;
  cidr: number;
  description?: string;
}

/**
 * Ubiquiti EdgeOS Parser implementation
 */
export class UbiquitiParser extends BaseRouterParser implements ImportParser {
  readonly formatId: ImportFormat = 'ubiquiti';
  readonly formatName = 'Ubiquiti EdgeOS';
  readonly extensions = ['.ubnt.cfg', '.cfg'];

  parse(content: string): ParseResult {
    const subnets: ImportedSubnet[] = [];

    const vifs = this.parseVifs(content);

    for (const vif of vifs) {
      const subnet: ImportedSubnet = {
        name: this.sanitizeName(vif.description ?? `VLAN ${vif.vlanId}`),
        vlanId: vif.vlanId,
        expectedDevices: this.estimateDevices(vif.cidr),
        networkAddress: this.gatewayToNetwork(vif.ipAddress, vif.cidr),
        cidrPrefix: vif.cidr,
        description: vif.description,
        gatewayIp: vif.ipAddress,
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
    return (
      content.includes('interfaces {') && content.includes('vif ') && content.includes('address')
    );
  }

  private parseVifs(content: string): VifInfo[] {
    const vifs: VifInfo[] = [];

    const interfacesMatch = content.match(/interfaces\s*\{([\s\S]*?)\n\}/);
    if (!interfacesMatch?.[1]) return vifs;

    const interfacesBlock = interfacesMatch[1];

    const vifRegex = /vif\s+(\d+)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
    let match;

    while ((match = vifRegex.exec(interfacesBlock)) !== null) {
      const vlanId = parseInt(match[1] ?? '0', 10);
      const body = match[2] ?? '';

      const addressMatch = body.match(/address\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
      if (!addressMatch?.[1] || !addressMatch[2]) continue;

      const descMatch = body.match(/description\s+"([^"]+)"/);

      vifs.push({
        vlanId,
        ipAddress: addressMatch[1],
        cidr: parseInt(addressMatch[2], 10),
        description: descMatch?.[1],
      });
    }

    return vifs;
  }

  private estimateDevices(cidr: number): number {
    const hosts = Math.pow(2, 32 - cidr) - 2;
    return Math.max(1, Math.floor(hosts * 0.5));
  }
}

export const ubiquitiParser = new UbiquitiParser();
