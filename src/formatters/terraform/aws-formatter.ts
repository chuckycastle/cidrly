/**
 * AWS Terraform Formatter
 * Generates Terraform HCL for AWS VPC resources
 */

import type { NetworkPlan, Subnet } from '../../core/models/network-plan.js';
import {
  BaseTerraformFormatter,
  generateHeader,
  generateLocals,
  sanitizeResourceName,
} from './base-formatter.js';
import type { TerraformExportOptions, TerraformOutput } from './types.js';
import { DEFAULT_OPTIONS } from './types.js';

/**
 * AWS-specific Terraform formatter
 */
export class AwsTerraformFormatter extends BaseTerraformFormatter {
  constructor(plan: NetworkPlan, options?: Partial<TerraformExportOptions>) {
    super(plan, { ...DEFAULT_OPTIONS, ...options, provider: 'aws' });
  }

  generate(): TerraformOutput {
    return {
      mainTf: this.generateMain(),
      variablesTf: this.generateVariables(),
      outputsTf: this.generateOutputs(),
    };
  }

  protected generateMain(): string {
    const sections: string[] = [];

    // Header
    sections.push(generateHeader(this.plan, 'AWS'));

    // Terraform and provider blocks
    sections.push(this.generateProviderBlock());

    // Locals
    sections.push(generateLocals(this.plan));

    // VPC
    sections.push(this.generateVpc());

    // Internet Gateway
    sections.push(this.generateInternetGateway());

    // Subnets
    this.validSubnets.forEach((subnet) => {
      sections.push(this.generateSubnet(subnet));
    });

    // Route table
    sections.push(this.generateRouteTable());

    // Route table associations
    this.validSubnets.forEach((subnet) => {
      sections.push(this.generateRouteTableAssociation(subnet));
    });

    // Security groups (if enabled)
    if (this.options.includeSecurityRules) {
      sections.push(this.generateSecurityGroup());
    }

    return sections.join('\n');
  }

  private generateProviderBlock(): string {
    const lines: string[] = [];
    lines.push('terraform {');
    lines.push('  required_version = ">= 1.0"');
    lines.push('  required_providers {');
    lines.push('    aws = {');
    lines.push('      source  = "hashicorp/aws"');
    lines.push('      version = "~> 5.0"');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('provider "aws" {');
    lines.push('  region = var.aws_region');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateVpc(): string {
    const lines: string[] = [];
    lines.push('# VPC');
    lines.push('resource "aws_vpc" "main" {');
    lines.push('  cidr_block           = local.base_cidr');
    lines.push('  enable_dns_hostnames = true');
    lines.push('  enable_dns_support   = true');
    lines.push('');
    lines.push('  tags = merge(local.tags, {');
    lines.push('    Name = "${local.plan_name}-vpc"');
    lines.push('  })');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateInternetGateway(): string {
    const lines: string[] = [];
    lines.push('# Internet Gateway');
    lines.push('resource "aws_internet_gateway" "main" {');
    lines.push('  vpc_id = aws_vpc.main.id');
    lines.push('');
    lines.push('  tags = merge(local.tags, {');
    lines.push('    Name = "${local.plan_name}-igw"');
    lines.push('  })');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateSubnet(subnet: Subnet): string {
    const name = sanitizeResourceName(subnet.name);
    const cidr = subnet.subnetInfo!.networkAddress!;
    const lines: string[] = [];
    lines.push(`# Subnet: ${subnet.name} (VLAN ${subnet.vlanId})`);
    lines.push(`resource "aws_subnet" "${name}" {`);
    lines.push(`  vpc_id            = aws_vpc.main.id`);
    lines.push(`  cidr_block        = "${cidr}"`);
    lines.push(`  availability_zone = "\${var.aws_region}a"`);
    lines.push('');
    lines.push('  tags = merge(local.tags, {');
    lines.push(`    Name   = "${name}"`);
    lines.push(`    VlanId = "${subnet.vlanId}"`);
    lines.push('  })');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateRouteTable(): string {
    const lines: string[] = [];
    lines.push('# Route Table');
    lines.push('resource "aws_route_table" "main" {');
    lines.push('  vpc_id = aws_vpc.main.id');
    lines.push('');
    lines.push('  route {');
    lines.push('    cidr_block = "0.0.0.0/0"');
    lines.push('    gateway_id = aws_internet_gateway.main.id');
    lines.push('  }');
    lines.push('');
    lines.push('  tags = merge(local.tags, {');
    lines.push('    Name = "${local.plan_name}-rt"');
    lines.push('  })');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateRouteTableAssociation(subnet: Subnet): string {
    const name = sanitizeResourceName(subnet.name);
    const lines: string[] = [];
    lines.push(`resource "aws_route_table_association" "${name}" {`);
    lines.push(`  subnet_id      = aws_subnet.${name}.id`);
    lines.push('  route_table_id = aws_route_table.main.id');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateSecurityGroup(): string {
    const lines: string[] = [];
    lines.push('# Security Group');
    lines.push('resource "aws_security_group" "main" {');
    lines.push('  name        = "${local.plan_name}-sg"');
    lines.push('  description = "Security group for ${local.plan_name}"');
    lines.push('  vpc_id      = aws_vpc.main.id');
    lines.push('');
    lines.push('  # Allow all outbound traffic');
    lines.push('  egress {');
    lines.push('    from_port   = 0');
    lines.push('    to_port     = 0');
    lines.push('    protocol    = "-1"');
    lines.push('    cidr_blocks = ["0.0.0.0/0"]');
    lines.push('  }');
    lines.push('');
    lines.push('  # Allow SSH from VPC');
    lines.push('  ingress {');
    lines.push('    from_port   = 22');
    lines.push('    to_port     = 22');
    lines.push('    protocol    = "tcp"');
    lines.push('    cidr_blocks = [local.base_cidr]');
    lines.push('  }');
    lines.push('');
    lines.push('  # Allow HTTPS from VPC');
    lines.push('  ingress {');
    lines.push('    from_port   = 443');
    lines.push('    to_port     = 443');
    lines.push('    protocol    = "tcp"');
    lines.push('    cidr_blocks = [local.base_cidr]');
    lines.push('  }');
    lines.push('');
    lines.push('  tags = merge(local.tags, {');
    lines.push('    Name = "${local.plan_name}-sg"');
    lines.push('  })');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  protected generateVariables(): string {
    const lines: string[] = [];
    lines.push(generateHeader(this.plan, 'AWS'));
    lines.push('variable "aws_region" {');
    lines.push('  description = "AWS region for resources"');
    lines.push('  type        = string');
    lines.push(`  default     = "${this.options.awsRegion}"`);
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  protected generateOutputs(): string {
    const lines: string[] = [];
    lines.push(generateHeader(this.plan, 'AWS'));

    lines.push('output "vpc_id" {');
    lines.push('  description = "VPC ID"');
    lines.push('  value       = aws_vpc.main.id');
    lines.push('}');
    lines.push('');

    lines.push('output "vpc_cidr" {');
    lines.push('  description = "VPC CIDR block"');
    lines.push('  value       = aws_vpc.main.cidr_block');
    lines.push('}');
    lines.push('');

    lines.push('output "subnet_ids" {');
    lines.push('  description = "Map of subnet names to IDs"');
    lines.push('  value = {');
    this.validSubnets.forEach((subnet) => {
      const name = sanitizeResourceName(subnet.name);
      lines.push(`    ${name} = aws_subnet.${name}.id`);
    });
    lines.push('  }');
    lines.push('}');
    lines.push('');

    lines.push('output "subnet_cidrs" {');
    lines.push('  description = "Map of subnet names to CIDR blocks"');
    lines.push('  value = {');
    this.validSubnets.forEach((subnet) => {
      const name = sanitizeResourceName(subnet.name);
      lines.push(`    ${name} = aws_subnet.${name}.cidr_block`);
    });
    lines.push('  }');
    lines.push('}');
    lines.push('');

    if (this.options.includeSecurityRules) {
      lines.push('output "security_group_id" {');
      lines.push('  description = "Security group ID"');
      lines.push('  value       = aws_security_group.main.id');
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Export NetworkPlan to AWS Terraform configuration
 */
export function exportToAwsTerraform(
  plan: NetworkPlan,
  options?: Partial<TerraformExportOptions>,
): TerraformOutput {
  const formatter = new AwsTerraformFormatter(plan, options);
  return formatter.generate();
}
