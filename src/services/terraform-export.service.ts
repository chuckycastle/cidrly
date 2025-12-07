/**
 * Terraform Export Service
 * Handles directory-based export of Terraform configurations
 */

import * as fs from 'fs';
import * as path from 'path';
import type { NetworkPlan } from '../core/models/network-plan.js';
import { exportToAwsTerraform } from '../formatters/terraform/aws-formatter.js';
import { exportToAzureTerraform } from '../formatters/terraform/azure-formatter.js';
import { sanitizeResourceName } from '../formatters/terraform/base-formatter.js';
import { exportToGcpTerraform } from '../formatters/terraform/gcp-formatter.js';
import type {
  TerraformExportOptions,
  TerraformOutput,
  TerraformProvider,
} from '../formatters/terraform/types.js';

export interface TerraformExportResult {
  success: boolean;
  outputDir: string;
  files: string[];
  error?: string;
}

/**
 * Service for exporting NetworkPlan to Terraform configurations
 */
export class TerraformExportService {
  /**
   * Export plan to Terraform configuration directory
   * Creates {plan-name}-{provider}/ directory with main.tf, variables.tf, outputs.tf
   */
  async exportToDirectory(
    plan: NetworkPlan,
    baseDir: string,
    options: Partial<TerraformExportOptions> = {},
  ): Promise<TerraformExportResult> {
    const provider = options.provider ?? 'aws';
    const planName = sanitizeResourceName(plan.name);
    const outputDir = path.join(baseDir, `${planName}-${provider}`);

    try {
      // Generate Terraform files
      const output = this.generateTerraform(plan, provider, options);

      // Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write files
      const files: string[] = [];

      const mainPath = path.join(outputDir, 'main.tf');
      fs.writeFileSync(mainPath, output.mainTf, 'utf-8');
      files.push(mainPath);

      const varsPath = path.join(outputDir, 'variables.tf');
      fs.writeFileSync(varsPath, output.variablesTf, 'utf-8');
      files.push(varsPath);

      const outputsPath = path.join(outputDir, 'outputs.tf');
      fs.writeFileSync(outputsPath, output.outputsTf, 'utf-8');
      files.push(outputsPath);

      return {
        success: true,
        outputDir,
        files,
      };
    } catch (error) {
      return {
        success: false,
        outputDir,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Export plan to all three cloud providers
   */
  async exportToAllProviders(
    plan: NetworkPlan,
    baseDir: string,
    options: Omit<Partial<TerraformExportOptions>, 'provider'> = {},
  ): Promise<Map<TerraformProvider, TerraformExportResult>> {
    const results = new Map<TerraformProvider, TerraformExportResult>();
    const providers: TerraformProvider[] = ['aws', 'azure', 'gcp'];

    for (const provider of providers) {
      const result = await this.exportToDirectory(plan, baseDir, {
        ...options,
        provider,
      });
      results.set(provider, result);
    }

    return results;
  }

  /**
   * Generate Terraform configuration without writing to disk
   */
  generateTerraform(
    plan: NetworkPlan,
    provider: TerraformProvider,
    options: Partial<TerraformExportOptions> = {},
  ): TerraformOutput {
    switch (provider) {
      case 'aws':
        return exportToAwsTerraform(plan, options);
      case 'azure':
        return exportToAzureTerraform(plan, options);
      case 'gcp':
        return exportToGcpTerraform(plan, options);
      default: {
        const _exhaustiveCheck: never = provider;
        throw new Error(`Unsupported Terraform provider: ${String(_exhaustiveCheck)}`);
      }
    }
  }

  /**
   * Get provider-specific file extension hint
   */
  getProviderDescription(provider: TerraformProvider): string {
    switch (provider) {
      case 'aws':
        return 'AWS VPC (subnets, route tables, security groups)';
      case 'azure':
        return 'Azure Virtual Network (subnets, NSGs)';
      case 'gcp':
        return 'GCP VPC (subnetworks, firewall rules, NAT)';
    }
  }
}

// Singleton export
export const terraformExportService = new TerraformExportService();
