/**
 * Cisco IOS/IOS-XE Parser
 * Parses Cisco IOS configuration files
 */

import type {
  ImportFormat,
  ImportedSubnet,
  ParseError,
  ParseResult,
  ParseWarning,
} from '../../import.types.js';
import type { ImportParser } from '../parser.interface.js';
import { BaseRouterParser } from './base-router.parser.js';

interface VlanInfo {
  id: number;
  name: string;
}

interface SviInfo {
  vlanId: number;
  ipAddress: string;
  mask: string;
  description?: string;
}

/**
 * Cisco IOS Parser implementation
 */
export class CiscoIosParser extends BaseRouterParser implements ImportParser {
  readonly formatId: ImportFormat = 'cisco-ios';
  readonly formatName = 'Cisco IOS/IOS-XE';
  readonly extensions = ['.cfg', '.ios.cfg', '.conf'];

  parse(content: string): ParseResult {
    const warnings: ParseWarning[] = [];
    const errors: ParseError[] = [];
    const subnets: ImportedSubnet[] = [];

    try {
      const vlans = this.parseVlans(content);
      const svis = this.parseSvis(content);

      for (const svi of svis) {
        const vlanInfo = vlans.get(svi.vlanId);
        const cidr = this.maskToCidr(svi.mask);
        const networkAddress = this.gatewayToNetwork(svi.ipAddress, cidr);

        const subnet: ImportedSubnet = {
          name: this.sanitizeName(vlanInfo?.name ?? `VLAN ${svi.vlanId}`),
          vlanId: svi.vlanId,
          expectedDevices: this.estimateDevices(cidr),
          networkAddress,
          cidrPrefix: cidr,
          description: svi.description,
          gatewayIp: svi.ipAddress,
        };

        subnets.push(subnet);
      }

      for (const [vlanId, vlanInfo] of vlans) {
        if (!svis.some((s) => s.vlanId === vlanId)) {
          warnings.push({
            message: `VLAN ${vlanId} (${vlanInfo.name}) has no SVI configuration`,
          });
        }
      }
    } catch (error) {
      errors.push({
        message: `Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return {
      success: errors.length === 0 && subnets.length > 0,
      subnets,
      warnings,
      errors,
    };
  }

  canParse(content: string): boolean {
    return (
      (content.includes('interface Vlan') || content.includes('interface vlan')) &&
      content.includes('ip address') &&
      !content.includes('feature interface-vlan')
    );
  }

  private parseVlans(content: string): Map<number, VlanInfo> {
    const vlans = new Map<number, VlanInfo>();
    const lines = content.split(/\r?\n/);

    let currentVlan: number | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      const vlanMatch = trimmed.match(/^vlan\s+(\d+)\s*$/);
      if (vlanMatch?.[1]) {
        currentVlan = parseInt(vlanMatch[1], 10);
        vlans.set(currentVlan, { id: currentVlan, name: `VLAN ${currentVlan}` });
        continue;
      }

      if (currentVlan !== null && trimmed.startsWith('name ')) {
        const name = trimmed.slice(5).trim();
        const existing = vlans.get(currentVlan);
        if (existing) {
          existing.name = name;
        }
        continue;
      }

      if (currentVlan !== null && !trimmed.startsWith('!') && trimmed !== '') {
        if (!trimmed.startsWith('name ') && !trimmed.startsWith('state ')) {
          currentVlan = null;
        }
      }
    }

    return vlans;
  }

  private parseSvis(content: string): SviInfo[] {
    const svis: SviInfo[] = [];
    const lines = content.split(/\r?\n/);

    let currentSvi: Partial<SviInfo> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      const interfaceMatch = trimmed.match(/^interface\s+[Vv]lan\s*(\d+)\s*$/);
      if (interfaceMatch?.[1]) {
        if (currentSvi?.vlanId && currentSvi.ipAddress && currentSvi.mask) {
          svis.push(currentSvi as SviInfo);
        }
        currentSvi = { vlanId: parseInt(interfaceMatch[1], 10) };
        continue;
      }

      if (currentSvi) {
        const ipMatch = trimmed.match(
          /^ip\s+address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/,
        );
        if (ipMatch?.[1] && ipMatch[2]) {
          currentSvi.ipAddress = ipMatch[1];
          currentSvi.mask = ipMatch[2];
          continue;
        }

        if (trimmed.startsWith('description ')) {
          currentSvi.description = trimmed.slice(12).trim();
          continue;
        }

        if (trimmed === '!' || trimmed.startsWith('interface ')) {
          if (currentSvi.vlanId && currentSvi.ipAddress && currentSvi.mask) {
            svis.push(currentSvi as SviInfo);
          }
          currentSvi = trimmed.startsWith('interface ') && !trimmed.includes('Vlan') ? null : null;
        }
      }
    }

    if (currentSvi?.vlanId && currentSvi.ipAddress && currentSvi.mask) {
      svis.push(currentSvi as SviInfo);
    }

    return svis;
  }

  private estimateDevices(cidr: number): number {
    const hosts = Math.pow(2, 32 - cidr) - 2;
    return Math.max(1, Math.floor(hosts * 0.5));
  }
}

export const ciscoIosParser = new CiscoIosParser();
