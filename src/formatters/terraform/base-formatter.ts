/**
 * Base Terraform Formatter
 * Shared utilities for all cloud provider formatters
 */

import type { NetworkPlan, Subnet } from '../../core/models/network-plan.js';
import type { TerraformExportOptions, TerraformOutput } from './types.js';

/**
 * Sanitize resource name for Terraform
 * Must start with letter, contain only alphanumerics and underscores
 */
export function sanitizeResourceName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/^(\d)/, '_$1'); // Can't start with number
}

/**
 * Escape a value for use inside a double-quoted HCL string literal.
 * Escapes backslash and double quote, neutralizes `${` and `%{` template
 * sequences, and folds line breaks so a plan value cannot close the literal
 * or start a new attribute or block.
 */
export function hclString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$\{/g, '$$$${')
    .replace(/%\{/g, '%%{')
    .replace(/\r?\n|\r/g, ' ');
}

/**
 * Fold line breaks so a value stays on one line (comments and headers)
 */
export function singleLine(value: string): string {
  return value.replace(/\r?\n|\r/g, ' ');
}

/**
 * Generate header comment for Terraform files
 */
export function generateHeader(plan: NetworkPlan, provider: string): string {
  const lines: string[] = [];
  lines.push('#');
  lines.push('# cidrly Network Configuration');
  lines.push(`# Plan: ${singleLine(plan.name)}`);
  lines.push(`# Provider: ${provider}`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push('#');
  lines.push('');
  return lines.join('\n');
}

/**
 * Generate locals block for reusable values
 */
export function generateLocals(plan: NetworkPlan): string {
  const lines: string[] = [];
  lines.push('locals {');
  lines.push(`  plan_name = "${sanitizeResourceName(plan.name)}"`);
  lines.push(`  base_cidr = "${hclString(plan.supernet?.networkAddress ?? `${plan.baseIp}/16`)}"`);
  lines.push('  tags = {');
  lines.push('    ManagedBy = "cidrly"');
  lines.push(`    PlanName  = "${hclString(plan.name)}"`);
  lines.push('  }');
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

/**
 * Filter subnets that have valid network addresses
 */
export function getSubnetsWithAddresses(subnets: Subnet[]): Subnet[] {
  return subnets.filter((s) => s.subnetInfo?.networkAddress && s.subnetInfo.cidrPrefix);
}

/**
 * Abstract base for Terraform formatters
 */
export abstract class BaseTerraformFormatter {
  protected plan: NetworkPlan;
  protected options: Required<TerraformExportOptions>;
  protected validSubnets: Subnet[];

  constructor(plan: NetworkPlan, options: Required<TerraformExportOptions>) {
    this.plan = plan;
    this.options = options;
    this.validSubnets = getSubnetsWithAddresses(plan.subnets);
  }

  /**
   * Generate all Terraform files
   */
  abstract generate(): TerraformOutput;

  /**
   * Generate main.tf content
   */
  protected abstract generateMain(): string;

  /**
   * Generate variables.tf content
   */
  protected abstract generateVariables(): string;

  /**
   * Generate outputs.tf content
   */
  protected abstract generateOutputs(): string;
}
