/**
 * Arista EOS Parser
 * Parses Arista EOS configuration files
 */

import type {
  ImportFormat,
  ImportedSubnet,
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
  cidr: number;
  description?: string;
}

/**
 * Arista EOS Parser implementation
 */
export class AristaEosParser extends BaseRouterParser implements ImportParser {
  readonly formatId: ImportFormat = 'arista-eos';
  readonly formatName = 'Arista EOS';
  readonly extensions = ['.eos.cfg', '.cfg'];

  parse(content: string): ParseResult {
    const warnings: ParseWarning[] = [];
    const subnets: ImportedSubnet[] = [];

    const vlans = this.parseVlans(content);
    const svis = this.parseSvis(content);

    for (const svi of svis) {
      const vlanInfo = vlans.get(svi.vlanId);

      const subnet: ImportedSubnet = {
        name: this.sanitizeName(vlanInfo?.name ?? `VLAN ${svi.vlanId}`),
        vlanId: svi.vlanId,
        expectedDevices: this.estimateDevices(svi.cidr),
        networkAddress: this.gatewayToNetwork(svi.ipAddress, svi.cidr),
        cidrPrefix: svi.cidr,
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

    return {
      success: subnets.length > 0,
      subnets,
      warnings,
      errors: [],
    };
  }

  canParse(content: string): boolean {
    // Match if uses CIDR notation in ip address lines (not just any '/' in file)
    // and doesn't have NX-OS-specific "feature interface-vlan"
    return (
      content.includes('interface Vlan') &&
      /ip\s+address\s+\d+\.\d+\.\d+\.\d+\/\d+/.test(content) &&
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

      if (trimmed === '!' || (trimmed !== '' && !trimmed.startsWith('name '))) {
        currentVlan = null;
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
        if (currentSvi?.vlanId && currentSvi.ipAddress && currentSvi.cidr) {
          svis.push(currentSvi as SviInfo);
        }
        currentSvi = { vlanId: parseInt(interfaceMatch[1], 10) };
        continue;
      }

      if (currentSvi) {
        const ipMatch = trimmed.match(/^ip\s+address\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
        if (ipMatch?.[1] && ipMatch[2]) {
          currentSvi.ipAddress = ipMatch[1];
          currentSvi.cidr = parseInt(ipMatch[2], 10);
          continue;
        }

        if (trimmed.startsWith('description ')) {
          currentSvi.description = trimmed.slice(12).trim();
          continue;
        }

        if (trimmed === '!' || trimmed.startsWith('interface ')) {
          if (currentSvi.vlanId && currentSvi.ipAddress && currentSvi.cidr) {
            svis.push(currentSvi as SviInfo);
          }
          currentSvi = null;
        }
      }
    }

    if (currentSvi?.vlanId && currentSvi.ipAddress && currentSvi.cidr) {
      svis.push(currentSvi as SviInfo);
    }

    return svis;
  }

  private estimateDevices(cidr: number): number {
    const hosts = Math.pow(2, 32 - cidr) - 2;
    return Math.max(1, Math.floor(hosts * 0.5));
  }
}

export const aristaEosParser = new AristaEosParser();
