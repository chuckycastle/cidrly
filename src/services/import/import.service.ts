/**
 * Import Service
 * Orchestrates network configuration import from various formats
 */

import * as fs from 'fs';
import type { NetworkPlan, Subnet } from '../../core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../core/models/network-plan.js';
import { isReservedVlan } from '../../infrastructure/config/validation-rules.js';
import type {
  ImportFormat,
  ImportMode,
  ImportOptions,
  ImportResult,
  ImportedSubnet,
  ParseResult,
} from './import.types.js';
import {
  detectParser,
  getParser,
  getParserByExtension,
  getSupportedFormats,
} from './parsers/index.js';

export interface ImportServiceOptions {
  /** Import options */
  options: Partial<ImportOptions>;
  /** Optional existing plan for merge mode */
  existingPlan?: NetworkPlan;
}

/**
 * Service for importing network configurations
 */
export class ImportService {
  /**
   * Import from file path
   * @param filepath - Path to configuration file
   * @param format - Import format (auto-detect if not specified)
   * @param serviceOptions - Import service options
   */
  async importFromFile(
    filepath: string,
    format?: ImportFormat,
    serviceOptions?: ImportServiceOptions,
  ): Promise<{ parseResult: ParseResult; plan?: NetworkPlan; importResult?: ImportResult }> {
    // Read file
    if (!fs.existsSync(filepath)) {
      return {
        parseResult: {
          success: false,
          subnets: [],
          warnings: [],
          errors: [{ message: `File not found: ${filepath}` }],
        },
      };
    }

    const content = fs.readFileSync(filepath, 'utf-8');

    // Get parser
    let parser = format ? getParser(format) : undefined;

    // Try by extension
    parser ??= getParserByExtension(filepath);

    // Try auto-detection
    parser ??= detectParser(content);

    if (!parser) {
      return {
        parseResult: {
          success: false,
          subnets: [],
          warnings: [],
          errors: [{ message: 'Unable to detect file format. Please specify format explicitly.' }],
        },
      };
    }

    return this.importFromContent(content, parser.formatId, serviceOptions);
  }

  /**
   * Import from string content
   * @param content - Configuration content
   * @param format - Import format
   * @param serviceOptions - Import service options
   */
  async importFromContent(
    content: string,
    format: ImportFormat,
    serviceOptions?: ImportServiceOptions,
  ): Promise<{ parseResult: ParseResult; plan?: NetworkPlan; importResult?: ImportResult }> {
    const parser = getParser(format);

    if (!parser) {
      return {
        parseResult: {
          success: false,
          subnets: [],
          warnings: [],
          errors: [{ message: `Unknown format: ${format}` }],
        },
      };
    }

    // Parse content
    const parseResult = parser.parse(content);

    if (!parseResult.success || parseResult.subnets.length === 0) {
      return { parseResult };
    }

    // Create or merge plan
    const options = serviceOptions?.options ?? {};
    const mode: ImportMode = options.mode ?? 'create';

    if (mode === 'create') {
      const plan = this.createPlanFromImport(parseResult, options);
      return {
        parseResult,
        plan,
        importResult: {
          success: true,
          importedCount: plan.subnets.length,
          skippedCount: parseResult.subnets.length - plan.subnets.length,
          warnings: parseResult.warnings.map((w) => w.message),
        },
      };
    } else {
      // Merge mode
      if (!serviceOptions?.existingPlan) {
        return {
          parseResult,
          importResult: {
            success: false,
            importedCount: 0,
            skippedCount: 0,
            warnings: [],
            error: 'Merge mode requires an existing plan',
          },
        };
      }

      const mergeResult = this.mergePlanFromImport(
        serviceOptions.existingPlan,
        parseResult,
        options,
      );
      return {
        parseResult,
        plan: mergeResult.plan,
        importResult: mergeResult.importResult,
      };
    }
  }

  /**
   * Create a new NetworkPlan from parsed import data
   */
  private createPlanFromImport(
    parseResult: ParseResult,
    options: Partial<ImportOptions>,
  ): NetworkPlan {
    const planName = options.planName ?? parseResult.detectedPlanName ?? 'Imported Plan';
    const baseIp = options.baseIp ?? parseResult.detectedBaseIp ?? '10.0.0.0';

    const plan = createNetworkPlan(planName, baseIp);

    const seenVlans = new Set<number>();

    for (const imported of parseResult.subnets) {
      // Skip reserved VLANs (IEEE 802.1Q + Cisco Token Ring/FDDI)
      if (isReservedVlan(imported.vlanId)) {
        parseResult.warnings.push({
          message: `Skipped VLAN ${imported.vlanId}: reserved`,
        });
        continue;
      }

      // Skip duplicates if configured
      if (options.skipDuplicateVlans && seenVlans.has(imported.vlanId)) {
        continue;
      }
      seenVlans.add(imported.vlanId);

      const subnet = this.createSubnetFromImport(imported);
      plan.subnets.push(subnet);
    }

    return plan;
  }

  /**
   * Merge imported subnets into existing plan
   */
  private mergePlanFromImport(
    existingPlan: NetworkPlan,
    parseResult: ParseResult,
    options: Partial<ImportOptions>,
  ): { plan: NetworkPlan; importResult: ImportResult } {
    const warnings: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    const existingVlanIds = new Set(existingPlan.subnets.map((s) => s.vlanId));

    for (const imported of parseResult.subnets) {
      // Skip reserved VLANs (IEEE 802.1Q + Cisco Token Ring/FDDI)
      if (isReservedVlan(imported.vlanId)) {
        warnings.push(`Skipped VLAN ${imported.vlanId}: reserved`);
        skippedCount++;
        continue;
      }

      if (existingVlanIds.has(imported.vlanId)) {
        if (options.overrideExisting) {
          // Replace existing subnet
          const index = existingPlan.subnets.findIndex((s) => s.vlanId === imported.vlanId);
          if (index !== -1) {
            existingPlan.subnets[index] = this.createSubnetFromImport(imported);
            importedCount++;
          }
        } else {
          warnings.push(`Skipped VLAN ${imported.vlanId}: already exists`);
          skippedCount++;
        }
      } else {
        existingPlan.subnets.push(this.createSubnetFromImport(imported));
        importedCount++;
      }
    }

    // Add parse warnings
    warnings.push(...parseResult.warnings.map((w) => w.message));

    return {
      plan: existingPlan,
      importResult: {
        success: true,
        importedCount,
        skippedCount,
        warnings,
      },
    };
  }

  /**
   * Create a Subnet from ImportedSubnet data
   */
  private createSubnetFromImport(imported: ImportedSubnet): Subnet {
    const subnet = createSubnet(imported.name, imported.vlanId, imported.expectedDevices);

    if (imported.description) {
      subnet.description = imported.description;
    }

    // Set subnetInfo if network address is available
    if (imported.networkAddress && imported.cidrPrefix) {
      const cidr = imported.cidrPrefix;
      const subnetSize = Math.pow(2, 32 - cidr);
      const usableHosts = cidr >= 31 ? (cidr === 32 ? 1 : 2) : subnetSize - 2;

      subnet.subnetInfo = {
        networkAddress: imported.networkAddress,
        cidrPrefix: cidr,
        subnetSize,
        usableHosts,
        requiredHosts: imported.expectedDevices * 2, // 50% rule
        plannedDevices: imported.expectedDevices,
        expectedDevices: imported.expectedDevices,
      };
    }

    return subnet;
  }

  /**
   * Get list of supported import formats
   */
  getSupportedFormats(): Array<{
    id: ImportFormat;
    name: string;
    extensions: string[];
  }> {
    return getSupportedFormats();
  }

  /**
   * Detect format from file content
   */
  detectFormat(content: string): ImportFormat | undefined {
    const parser = detectParser(content);
    return parser?.formatId;
  }
}

// Singleton export
export const importService = new ImportService();
