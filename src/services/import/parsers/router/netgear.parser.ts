/**
 * Netgear Parser
 * Parses Netgear managed switch configuration files
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

interface InterfaceVlan {
  vlanId: number;
  ipAddress: string;
  mask: string;
  description?: string;
}

/**
 * Netgear Parser implementation
 */
export class NetgearParser extends BaseRouterParser implements ImportParser {
  readonly formatId: ImportFormat = 'netgear';
  readonly formatName = 'Netgear';
  readonly extensions = ['.netgear.cfg', '.cfg'];

  parse(content: string): ParseResult {
    const warnings: ParseWarning[] = [];
    const subnets: ImportedSubnet[] = [];

    const vlans = this.parseVlans(content);
    const interfaces = this.parseInterfaceVlans(content);

    for (const iface of interfaces) {
      const vlanInfo = vlans.get(iface.vlanId);
      const cidr = this.maskToCidr(iface.mask);

      const subnet: ImportedSubnet = {
        name: this.sanitizeName(vlanInfo?.name ?? `VLAN ${iface.vlanId}`),
        vlanId: iface.vlanId,
        expectedDevices: this.estimateDevices(cidr),
        networkAddress: this.gatewayToNetwork(iface.ipAddress, cidr),
        cidrPrefix: cidr,
        description: iface.description,
        gatewayIp: iface.ipAddress,
      };
      subnets.push(subnet);
    }

    for (const [vlanId, vlanInfo] of vlans) {
      if (!interfaces.some((i) => i.vlanId === vlanId)) {
        warnings.push({
          message: `VLAN ${vlanId} (${vlanInfo.name}) has no interface configuration`,
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
    return content.includes('vlan database') && content.includes('interface vlan');
  }

  private parseVlans(content: string): Map<number, VlanInfo> {
    const vlans = new Map<number, VlanInfo>();
    const lines = content.split(/\r?\n/);

    let inVlanDb = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === 'vlan database') {
        inVlanDb = true;
        continue;
      }

      if (inVlanDb && trimmed === 'exit') {
        inVlanDb = false;
        continue;
      }

      if (inVlanDb) {
        const vlanMatch = trimmed.match(/^vlan\s+(\d+)\s+name\s+"([^"]+)"/);
        if (vlanMatch?.[1] && vlanMatch[2]) {
          const vlanId = parseInt(vlanMatch[1], 10);
          vlans.set(vlanId, { id: vlanId, name: vlanMatch[2] });
        }
      }
    }

    return vlans;
  }

  private parseInterfaceVlans(content: string): InterfaceVlan[] {
    const interfaces: InterfaceVlan[] = [];
    const lines = content.split(/\r?\n/);

    let currentVlan: Partial<InterfaceVlan> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      const interfaceMatch = trimmed.match(/^interface\s+vlan\s+(\d+)\s*$/);
      if (interfaceMatch?.[1]) {
        if (currentVlan?.vlanId && currentVlan.ipAddress && currentVlan.mask) {
          interfaces.push(currentVlan as InterfaceVlan);
        }
        currentVlan = { vlanId: parseInt(interfaceMatch[1], 10) };
        continue;
      }

      if (currentVlan) {
        const ipMatch = trimmed.match(
          /^ip\s+address\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)/,
        );
        if (ipMatch?.[1] && ipMatch[2]) {
          currentVlan.ipAddress = ipMatch[1];
          currentVlan.mask = ipMatch[2];
          continue;
        }

        const descMatch = trimmed.match(/^description\s+"([^"]+)"/);
        if (descMatch?.[1]) {
          currentVlan.description = descMatch[1];
          continue;
        }

        if (trimmed === 'exit' || trimmed.startsWith('interface ')) {
          if (currentVlan.vlanId && currentVlan.ipAddress && currentVlan.mask) {
            interfaces.push(currentVlan as InterfaceVlan);
          }
          currentVlan = null;
        }
      }
    }

    if (currentVlan?.vlanId && currentVlan.ipAddress && currentVlan.mask) {
      interfaces.push(currentVlan as InterfaceVlan);
    }

    return interfaces;
  }

  private estimateDevices(cidr: number): number {
    const hosts = Math.pow(2, 32 - cidr) - 2;
    return Math.max(1, Math.floor(hosts * 0.5));
  }
}

export const netgearParser = new NetgearParser();
