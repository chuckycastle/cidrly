/**
 * Juniper JUNOS Parser
 * Parses Juniper JUNOS configuration files
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
  name: string;
  vlanId: number;
  l3Interface?: string;
}

interface IrbUnit {
  unit: number;
  ipAddress: string;
  cidr: number;
  description?: string;
}

/**
 * Juniper JUNOS Parser implementation
 */
export class JuniperJunosParser extends BaseRouterParser implements ImportParser {
  readonly formatId: ImportFormat = 'juniper-junos';
  readonly formatName = 'Juniper JUNOS';
  readonly extensions = ['.junos.conf', '.conf'];

  parse(content: string): ParseResult {
    const warnings: ParseWarning[] = [];
    const subnets: ImportedSubnet[] = [];

    const vlans = this.parseVlans(content);
    const irbUnits = this.parseIrbUnits(content);

    for (const vlan of vlans) {
      const irbMatch = vlan.l3Interface?.match(/irb\.(\d+)/);
      const unitId = irbMatch?.[1] ? parseInt(irbMatch[1], 10) : vlan.vlanId;
      const irb = irbUnits.find((u) => u.unit === unitId);

      if (irb) {
        const subnet: ImportedSubnet = {
          name: this.sanitizeName(vlan.name),
          vlanId: vlan.vlanId,
          expectedDevices: this.estimateDevices(irb.cidr),
          networkAddress: this.gatewayToNetwork(irb.ipAddress, irb.cidr),
          cidrPrefix: irb.cidr,
          description: irb.description,
          gatewayIp: irb.ipAddress,
        };
        subnets.push(subnet);
      } else {
        warnings.push({
          message: `VLAN ${vlan.name} (${vlan.vlanId}) has no IRB interface`,
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
    return (
      content.includes('vlans {') &&
      (content.includes('vlan-id') || content.includes('l3-interface'))
    );
  }

  private parseVlans(content: string): VlanInfo[] {
    const vlans: VlanInfo[] = [];

    // Find "vlans {" and extract the block using balanced brace matching
    const vlansStartMatch = content.match(/vlans\s*\{/);
    if (!vlansStartMatch) return vlans;

    const startIdx = vlansStartMatch.index! + vlansStartMatch[0].length;
    let depth = 1;
    let endIdx = startIdx;
    while (depth > 0 && endIdx < content.length) {
      if (content[endIdx] === '{') depth++;
      if (content[endIdx] === '}') depth--;
      endIdx++;
    }

    const vlansBlock = content.slice(startIdx, endIdx - 1);

    // Find individual VLAN definitions using balanced brace matching
    const vlanStartRegex = /(\w+)\s*\{/g;
    let match;

    while ((match = vlanStartRegex.exec(vlansBlock)) !== null) {
      const name = match[1];
      if (!name) continue;

      const vlanStartIdx = match.index + match[0].length;
      let vlanDepth = 1;
      let vlanEndIdx = vlanStartIdx;
      while (vlanDepth > 0 && vlanEndIdx < vlansBlock.length) {
        if (vlansBlock[vlanEndIdx] === '{') vlanDepth++;
        if (vlansBlock[vlanEndIdx] === '}') vlanDepth--;
        vlanEndIdx++;
      }

      const body = vlansBlock.slice(vlanStartIdx, vlanEndIdx - 1);
      const vlanIdMatch = body.match(/vlan-id\s+(\d+)/);
      const l3Match = body.match(/l3-interface\s+([\w.]+)/);

      if (vlanIdMatch?.[1]) {
        vlans.push({
          name,
          vlanId: parseInt(vlanIdMatch[1], 10),
          l3Interface: l3Match?.[1],
        });
      }

      // Move regex past this VLAN's closing brace
      vlanStartRegex.lastIndex = match.index + (vlanEndIdx - vlanStartIdx) + match[0].length;
    }

    return vlans;
  }

  private parseIrbUnits(content: string): IrbUnit[] {
    const units: IrbUnit[] = [];

    // Find all "unit N {" patterns and extract content using balanced brace matching
    const unitStartRegex = /unit\s+(\d+)\s*\{/g;
    let match;

    while ((match = unitStartRegex.exec(content)) !== null) {
      const unitId = parseInt(match[1] ?? '0', 10);
      const startIdx = match.index + match[0].length;

      // Find balanced closing brace
      let depth = 1;
      let endIdx = startIdx;
      while (depth > 0 && endIdx < content.length) {
        if (content[endIdx] === '{') depth++;
        if (content[endIdx] === '}') depth--;
        endIdx++;
      }

      const body = content.slice(startIdx, endIdx - 1);
      const addressMatch = body.match(/address\s+(\d+\.\d+\.\d+\.\d+)\/(\d+)/);
      const descMatch = body.match(/description\s+"([^"]+)"/);

      if (addressMatch?.[1] && addressMatch[2]) {
        units.push({
          unit: unitId,
          ipAddress: addressMatch[1],
          cidr: parseInt(addressMatch[2], 10),
          description: descMatch?.[1],
        });
      }
    }

    return units;
  }

  private estimateDevices(cidr: number): number {
    const hosts = Math.pow(2, 32 - cidr) - 2;
    return Math.max(1, Math.floor(hosts * 0.5));
  }
}

export const juniperJunosParser = new JuniperJunosParser();
