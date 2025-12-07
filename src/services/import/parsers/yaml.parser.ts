/**
 * YAML Parser
 * Parses YAML files containing subnet data (cidrly format or generic)
 */

import type {
  ImportFormat,
  ImportedSubnet,
  ParseError,
  ParseResult,
  ParseWarning,
} from '../import.types.js';
import type { ImportParser } from './parser.interface.js';

type ParsedYaml = Record<string, unknown> | unknown[];

/**
 * YAML Parser implementation
 * Supports both cidrly native format and generic YAML subnet lists
 */
export class YamlParser implements ImportParser {
  readonly formatId: ImportFormat = 'yaml';
  readonly formatName = 'YAML Configuration';
  readonly extensions = ['.yaml', '.yml'];

  parse(content: string): ParseResult {
    const warnings: ParseWarning[] = [];
    const errors: ParseError[] = [];
    const subnets: ImportedSubnet[] = [];
    let detectedBaseIp: string | undefined;
    let detectedPlanName: string | undefined;

    try {
      const parsed = this.parseYaml(content);

      if (Array.isArray(parsed)) {
        // Array of subnets at root
        for (const item of parsed) {
          const subnet = this.parseSubnetObject(item, warnings);
          if (subnet) {
            subnets.push(subnet);
          }
        }
      } else {
        // Object format
        const name = parsed['name'] as string | undefined;
        const baseIp = parsed['baseIp'] as string | undefined;
        const subnetsArray = parsed['subnets'] as unknown[] | undefined;
        const basIpAlt = parsed['base_ip'] as string | undefined;
        const planNameAlt = parsed['plan_name'] as string | undefined;

        if (name && baseIp) {
          // cidrly format
          detectedPlanName = name;
          detectedBaseIp = baseIp;

          if (Array.isArray(subnetsArray)) {
            for (const item of subnetsArray) {
              const subnet = this.parseSubnetObject(item, warnings);
              if (subnet) {
                subnets.push(subnet);
              }
            }
          }
        } else if (Array.isArray(subnetsArray)) {
          // Generic format with subnets key
          if (basIpAlt) detectedBaseIp = basIpAlt;
          if (planNameAlt) detectedPlanName = planNameAlt;

          for (const item of subnetsArray) {
            const subnet = this.parseSubnetObject(item, warnings);
            if (subnet) {
              subnets.push(subnet);
            }
          }
        } else {
          errors.push({
            message: 'Invalid YAML structure: expected subnets array or cidrly plan format',
          });
        }
      }
    } catch (error) {
      errors.push({
        message: `YAML parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return {
      success: errors.length === 0 && subnets.length > 0,
      subnets,
      detectedBaseIp,
      detectedPlanName,
      warnings,
      errors,
    };
  }

  canParse(content: string): boolean {
    const lines = content.split(/\r?\n/);
    const firstLines = lines.slice(0, 10).join('\n');

    return (
      (firstLines.includes('subnets:') ||
        firstLines.includes('- name:') ||
        firstLines.includes('baseIp:')) &&
      !firstLines.includes('{')
    );
  }

  /**
   * Simple YAML parser (handles common cases without external deps)
   */
  private parseYaml(content: string): ParsedYaml {
    const lines = content.split(/\r?\n/);
    const result: Record<string, unknown> = {};
    let currentArray: unknown[] | null = null;
    let currentArrayKey: string | null = null;
    let currentObject: Record<string, unknown> | null = null;
    let inArray = false;
    let arrayIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';

      if (!line.trim() || line.trim().startsWith('#')) continue;

      const indent = line.search(/\S/);
      const trimmed = line.trim();

      if (trimmed.startsWith('- ')) {
        const itemContent = trimmed.slice(2).trim();

        if (!inArray) {
          if (itemContent.includes(':')) {
            currentObject = {};
            currentArray = [currentObject];
            inArray = true;
            arrayIndent = indent;

            const colonIdx = itemContent.indexOf(':');
            const key = itemContent.slice(0, colonIdx).trim();
            const value = itemContent.slice(colonIdx + 1).trim();
            if (key) {
              currentObject[key] = this.parseValue(value);
            }
          } else {
            currentArray = [this.parseValue(itemContent)];
            inArray = true;
            arrayIndent = indent;
          }
        } else if (currentArray && currentArrayKey) {
          if (itemContent.includes(':')) {
            currentObject = {};
            currentArray.push(currentObject);
            const colonIdx = itemContent.indexOf(':');
            const key = itemContent.slice(0, colonIdx).trim();
            const value = itemContent.slice(colonIdx + 1).trim();
            if (key) {
              currentObject[key] = this.parseValue(value);
            }
          } else {
            currentArray.push(this.parseValue(itemContent));
          }
        }
        continue;
      }

      if (trimmed.includes(':')) {
        const colonIndex = trimmed.indexOf(':');
        const key = trimmed.slice(0, colonIndex).trim();
        const value = trimmed.slice(colonIndex + 1).trim();

        if (
          value === '' &&
          i + 1 < lines.length &&
          (lines[i + 1]?.trim().startsWith('- ') ?? false)
        ) {
          currentArray = [];
          currentArrayKey = key;
          inArray = true;
          arrayIndent = lines[i + 1]?.search(/\S/) ?? 0;
          result[key] = currentArray;
          continue;
        }

        if (inArray && currentObject && indent > arrayIndent) {
          currentObject[key] = this.parseValue(value);
        } else {
          inArray = false;
          currentArray = null;
          currentArrayKey = null;
          currentObject = null;
          result[key] = this.parseValue(value);
        }
      }
    }

    if (Object.keys(result).length === 0 && currentArray) {
      return currentArray;
    }

    return result;
  }

  /**
   * Parse a YAML value
   */
  private parseValue(value: string): unknown {
    if (!value || value === '~' || value === 'null') return null;
    if (value === 'true') return true;
    if (value === 'false') return false;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }

    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') return num;

    return value;
  }

  /**
   * Parse a subnet object from YAML data
   */
  private parseSubnetObject(obj: unknown, warnings: ParseWarning[]): ImportedSubnet | null {
    if (typeof obj !== 'object' || obj === null) {
      warnings.push({ message: 'Invalid subnet entry: not an object' });
      return null;
    }

    const item = obj as Record<string, unknown>;

    const nameValue = item['name'] ?? item['subnet_name'];
    const name = (typeof nameValue === 'string' ? nameValue : '').trim();
    if (!name) {
      warnings.push({ message: 'Skipping subnet with empty name' });
      return null;
    }

    const vlanId = Number(item['vlanId'] ?? item['vlan_id'] ?? item['vlan'] ?? 0);
    if (!vlanId || vlanId < 1 || vlanId > 4094) {
      warnings.push({ message: `Invalid VLAN ID for subnet "${name}"` });
      return null;
    }

    const devices = Number(
      item['expectedDevices'] ?? item['devices'] ?? item['device_count'] ?? item['hosts'] ?? 0,
    );
    if (!devices || devices < 1) {
      warnings.push({ message: `Invalid device count for subnet "${name}"` });
      return null;
    }

    const subnet: ImportedSubnet = {
      name,
      vlanId,
      expectedDevices: devices,
    };

    const subnetInfo = item['subnetInfo'];
    if (subnetInfo && typeof subnetInfo === 'object') {
      const info = subnetInfo as Record<string, unknown>;
      const networkAddr = info['networkAddress'];
      if (typeof networkAddr === 'string') {
        subnet.networkAddress = networkAddr;
        subnet.cidrPrefix = Number(info['cidrPrefix'] ?? 0);
      }
    } else {
      const networkAddr = item['network_address'] ?? item['networkAddress'] ?? item['cidr'];
      if (typeof networkAddr === 'string') {
        subnet.networkAddress = networkAddr;
        const cidrMatch = subnet.networkAddress.match(/\/(\d+)$/);
        if (cidrMatch?.[1]) {
          subnet.cidrPrefix = parseInt(cidrMatch[1], 10);
        }
      }
    }

    const desc = item['description'];
    if (typeof desc === 'string') {
      subnet.description = desc;
    }

    const gw = item['gateway'] ?? item['gatewayIp'];
    if (typeof gw === 'string') {
      subnet.gatewayIp = gw;
    }

    return subnet;
  }
}

export const yamlParser = new YamlParser();
