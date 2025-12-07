/**
 * Azure Terraform Formatter
 * Generates Terraform HCL for Azure Virtual Network resources
 */

import type { NetworkPlan, Subnet } from '../../core/models/network-plan.js';
import { BaseTerraformFormatter, generateHeader, sanitizeResourceName } from './base-formatter.js';
import type { TerraformExportOptions, TerraformOutput } from './types.js';
import { DEFAULT_OPTIONS } from './types.js';

/**
 * Azure-specific Terraform formatter
 */
export class AzureTerraformFormatter extends BaseTerraformFormatter {
  constructor(plan: NetworkPlan, options?: Partial<TerraformExportOptions>) {
    super(plan, { ...DEFAULT_OPTIONS, ...options, provider: 'azure' });
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
    sections.push(generateHeader(this.plan, 'Azure'));

    // Terraform and provider blocks
    sections.push(this.generateProviderBlock());

    // Locals
    sections.push(this.generateLocals());

    // Resource Group
    sections.push(this.generateResourceGroup());

    // Virtual Network with inline subnets
    sections.push(this.generateVirtualNetwork());

    // Network Security Group (if enabled)
    if (this.options.includeSecurityRules) {
      sections.push(this.generateNetworkSecurityGroup());
      this.validSubnets.forEach((subnet) => {
        sections.push(this.generateNsgAssociation(subnet));
      });
    }

    return sections.join('\n');
  }

  private generateProviderBlock(): string {
    const lines: string[] = [];
    lines.push('terraform {');
    lines.push('  required_version = ">= 1.0"');
    lines.push('  required_providers {');
    lines.push('    azurerm = {');
    lines.push('      source  = "hashicorp/azurerm"');
    lines.push('      version = "~> 3.0"');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('provider "azurerm" {');
    lines.push('  features {}');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateLocals(): string {
    const planName = sanitizeResourceName(this.plan.name);
    const baseCidr = this.plan.supernet?.networkAddress ?? `${this.plan.baseIp}/16`;
    const lines: string[] = [];
    lines.push('locals {');
    lines.push(`  plan_name = "${planName}"`);
    lines.push(`  base_cidr = "${baseCidr}"`);
    lines.push('  tags = {');
    lines.push('    ManagedBy = "cidrly"');
    lines.push(`    PlanName  = "${this.plan.name}"`);
    lines.push('  }');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateResourceGroup(): string {
    const lines: string[] = [];
    lines.push('# Resource Group');
    lines.push('resource "azurerm_resource_group" "main" {');
    lines.push('  name     = var.resource_group_name');
    lines.push('  location = var.location');
    lines.push('  tags     = local.tags');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateVirtualNetwork(): string {
    const lines: string[] = [];
    lines.push('# Virtual Network');
    lines.push('resource "azurerm_virtual_network" "main" {');
    lines.push('  name                = "${local.plan_name}-vnet"');
    lines.push('  location            = azurerm_resource_group.main.location');
    lines.push('  resource_group_name = azurerm_resource_group.main.name');
    lines.push('  address_space       = [local.base_cidr]');
    lines.push('  tags                = local.tags');
    lines.push('}');
    lines.push('');

    // Individual subnet resources
    this.validSubnets.forEach((subnet) => {
      lines.push(this.generateSubnet(subnet));
    });

    return lines.join('\n');
  }

  private generateSubnet(subnet: Subnet): string {
    const name = sanitizeResourceName(subnet.name);
    const cidr = subnet.subnetInfo!.networkAddress!;
    const lines: string[] = [];
    lines.push(`# Subnet: ${subnet.name} (VLAN ${subnet.vlanId})`);
    lines.push(`resource "azurerm_subnet" "${name}" {`);
    lines.push(`  name                 = "${name}"`);
    lines.push('  resource_group_name  = azurerm_resource_group.main.name');
    lines.push('  virtual_network_name = azurerm_virtual_network.main.name');
    lines.push(`  address_prefixes     = ["${cidr}"]`);
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateNetworkSecurityGroup(): string {
    const lines: string[] = [];
    lines.push('# Network Security Group');
    lines.push('resource "azurerm_network_security_group" "main" {');
    lines.push('  name                = "${local.plan_name}-nsg"');
    lines.push('  location            = azurerm_resource_group.main.location');
    lines.push('  resource_group_name = azurerm_resource_group.main.name');
    lines.push('');
    lines.push('  # Allow SSH from VNet');
    lines.push('  security_rule {');
    lines.push('    name                       = "AllowSSH"');
    lines.push('    priority                   = 100');
    lines.push('    direction                  = "Inbound"');
    lines.push('    access                     = "Allow"');
    lines.push('    protocol                   = "Tcp"');
    lines.push('    source_port_range          = "*"');
    lines.push('    destination_port_range     = "22"');
    lines.push('    source_address_prefix      = "VirtualNetwork"');
    lines.push('    destination_address_prefix = "*"');
    lines.push('  }');
    lines.push('');
    lines.push('  # Allow HTTPS from VNet');
    lines.push('  security_rule {');
    lines.push('    name                       = "AllowHTTPS"');
    lines.push('    priority                   = 110');
    lines.push('    direction                  = "Inbound"');
    lines.push('    access                     = "Allow"');
    lines.push('    protocol                   = "Tcp"');
    lines.push('    source_port_range          = "*"');
    lines.push('    destination_port_range     = "443"');
    lines.push('    source_address_prefix      = "VirtualNetwork"');
    lines.push('    destination_address_prefix = "*"');
    lines.push('  }');
    lines.push('');
    lines.push('  tags = local.tags');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateNsgAssociation(subnet: Subnet): string {
    const name = sanitizeResourceName(subnet.name);
    const lines: string[] = [];
    lines.push(`resource "azurerm_subnet_network_security_group_association" "${name}" {`);
    lines.push(`  subnet_id                 = azurerm_subnet.${name}.id`);
    lines.push('  network_security_group_id = azurerm_network_security_group.main.id');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  protected generateVariables(): string {
    const lines: string[] = [];
    lines.push(generateHeader(this.plan, 'Azure'));

    lines.push('variable "resource_group_name" {');
    lines.push('  description = "Name of the Azure resource group"');
    lines.push('  type        = string');
    lines.push(`  default     = "${this.options.azureResourceGroup}"`);
    lines.push('}');
    lines.push('');

    lines.push('variable "location" {');
    lines.push('  description = "Azure region for resources"');
    lines.push('  type        = string');
    lines.push(`  default     = "${this.options.azureLocation}"`);
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  protected generateOutputs(): string {
    const lines: string[] = [];
    lines.push(generateHeader(this.plan, 'Azure'));

    lines.push('output "resource_group_name" {');
    lines.push('  description = "Resource group name"');
    lines.push('  value       = azurerm_resource_group.main.name');
    lines.push('}');
    lines.push('');

    lines.push('output "vnet_id" {');
    lines.push('  description = "Virtual Network ID"');
    lines.push('  value       = azurerm_virtual_network.main.id');
    lines.push('}');
    lines.push('');

    lines.push('output "vnet_name" {');
    lines.push('  description = "Virtual Network name"');
    lines.push('  value       = azurerm_virtual_network.main.name');
    lines.push('}');
    lines.push('');

    lines.push('output "subnet_ids" {');
    lines.push('  description = "Map of subnet names to IDs"');
    lines.push('  value = {');
    this.validSubnets.forEach((subnet) => {
      const name = sanitizeResourceName(subnet.name);
      lines.push(`    ${name} = azurerm_subnet.${name}.id`);
    });
    lines.push('  }');
    lines.push('}');
    lines.push('');

    if (this.options.includeSecurityRules) {
      lines.push('output "nsg_id" {');
      lines.push('  description = "Network Security Group ID"');
      lines.push('  value       = azurerm_network_security_group.main.id');
      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Export NetworkPlan to Azure Terraform configuration
 */
export function exportToAzureTerraform(
  plan: NetworkPlan,
  options?: Partial<TerraformExportOptions>,
): TerraformOutput {
  const formatter = new AzureTerraformFormatter(plan, options);
  return formatter.generate();
}
