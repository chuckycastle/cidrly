/**
 * CSV Parser
 * Parses CSV files containing subnet data
 */

import type {
  ImportFormat,
  ImportedSubnet,
  ParseError,
  ParseResult,
  ParseWarning,
} from '../import.types.js';
import type { ImportParser } from './parser.interface.js';

/**
 * Expected CSV column headers (case-insensitive)
 */
const COLUMN_MAPPINGS: Record<string, string[]> = {
  name: ['name', 'subnet_name', 'subnet', 'vlan_name'],
  vlanId: ['vlan', 'vlan_id', 'vlanid', 'id'],
  devices: ['devices', 'device_count', 'expected_devices', 'hosts', 'count'],
  network: ['network', 'network_address', 'cidr', 'address', 'ip'],
  description: ['description', 'desc', 'comment', 'notes'],
  gateway: ['gateway', 'gateway_ip', 'gw'],
};

type ColumnKey = 'name' | 'vlanId' | 'devices' | 'network' | 'description' | 'gateway';

/**
 * CSV Parser implementation
 */
export class CsvParser implements ImportParser {
  readonly formatId: ImportFormat = 'csv';
  readonly formatName = 'CSV (Comma Separated Values)';
  readonly extensions = ['.csv'];

  parse(content: string): ParseResult {
    const warnings: ParseWarning[] = [];
    const errors: ParseError[] = [];
    const subnets: ImportedSubnet[] = [];

    const lines = content.split(/\r?\n/).filter((line) => line.trim());

    if (lines.length === 0) {
      return {
        success: false,
        subnets: [],
        warnings: [],
        errors: [{ message: 'Empty CSV file' }],
      };
    }

    // Parse header row
    const headerLine = lines[0];
    if (!headerLine) {
      return {
        success: false,
        subnets: [],
        warnings: [],
        errors: [{ message: 'Missing header row' }],
      };
    }

    const headers = this.parseRow(headerLine);
    const columnMap = this.mapColumns(headers);

    // Validate required columns
    if (columnMap.name === -1) {
      errors.push({ line: 1, message: 'Missing required column: name', content: headerLine });
    }
    if (columnMap.vlanId === -1) {
      errors.push({ line: 1, message: 'Missing required column: vlan_id', content: headerLine });
    }
    if (columnMap.devices === -1) {
      errors.push({ line: 1, message: 'Missing required column: devices', content: headerLine });
    }

    if (errors.length > 0) {
      return { success: false, subnets: [], warnings, errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim().startsWith('#')) continue;

      const row = this.parseRow(line);
      const lineNum = i + 1;

      try {
        const subnet = this.parseSubnetRow(row, columnMap, lineNum, warnings);
        if (subnet) {
          subnets.push(subnet);
        }
      } catch (error) {
        errors.push({
          line: lineNum,
          message: error instanceof Error ? error.message : 'Unknown error',
          content: line,
        });
      }
    }

    return {
      success: errors.length === 0,
      subnets,
      warnings,
      errors,
    };
  }

  canParse(content: string): boolean {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return false;

    const firstLine = (lines[0] ?? '').toLowerCase();
    return (
      (firstLine.includes('name') || firstLine.includes('subnet')) &&
      (firstLine.includes('vlan') || firstLine.includes('id')) &&
      firstLine.includes(',')
    );
  }

  /**
   * Parse a CSV row, handling quoted values
   */
  private parseRow(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i] ?? '';
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * Map column headers to indices
   */
  private mapColumns(headers: string[]): Record<ColumnKey, number> {
    const result: Record<ColumnKey, number> = {
      name: -1,
      vlanId: -1,
      devices: -1,
      network: -1,
      description: -1,
      gateway: -1,
    };

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      for (const [key, aliases] of Object.entries(COLUMN_MAPPINGS)) {
        if (aliases.includes(normalizedHeader)) {
          result[key as ColumnKey] = index;
          break;
        }
      }
    });

    return result;
  }

  /**
   * Parse a data row into ImportedSubnet
   */
  private parseSubnetRow(
    row: string[],
    columnMap: Record<ColumnKey, number>,
    lineNum: number,
    warnings: ParseWarning[],
  ): ImportedSubnet | null {
    const nameValue = columnMap.name >= 0 ? row[columnMap.name] : undefined;
    const vlanValue = columnMap.vlanId >= 0 ? row[columnMap.vlanId] : undefined;
    const devicesValue = columnMap.devices >= 0 ? row[columnMap.devices] : undefined;

    const name = nameValue?.trim() ?? '';
    const vlanStr = vlanValue?.trim() ?? '';
    const devicesStr = devicesValue?.trim() ?? '';

    if (!name) {
      warnings.push({ line: lineNum, message: 'Skipping row with empty name' });
      return null;
    }

    const vlanId = parseInt(vlanStr, 10);
    if (isNaN(vlanId) || vlanId < 1 || vlanId > 4094) {
      warnings.push({
        line: lineNum,
        message: `Invalid VLAN ID: ${vlanStr}`,
        content: `name=${name}`,
      });
      return null;
    }

    const devices = parseInt(devicesStr, 10);
    if (isNaN(devices) || devices < 1) {
      warnings.push({
        line: lineNum,
        message: `Invalid device count: ${devicesStr}`,
        content: `name=${name}`,
      });
      return null;
    }

    const subnet: ImportedSubnet = {
      name,
      vlanId,
      expectedDevices: devices,
    };

    // Optional fields
    if (columnMap.network >= 0) {
      const networkValue = row[columnMap.network];
      if (networkValue) {
        subnet.networkAddress = networkValue.trim();
        const cidrMatch = subnet.networkAddress.match(/\/(\d+)$/);
        if (cidrMatch?.[1]) {
          subnet.cidrPrefix = parseInt(cidrMatch[1], 10);
        }
      }
    }

    if (columnMap.description >= 0) {
      const descValue = row[columnMap.description];
      if (descValue) {
        subnet.description = descValue.trim();
      }
    }

    if (columnMap.gateway >= 0) {
      const gwValue = row[columnMap.gateway];
      if (gwValue) {
        subnet.gatewayIp = gwValue.trim();
      }
    }

    return subnet;
  }
}

export const csvParser = new CsvParser();
