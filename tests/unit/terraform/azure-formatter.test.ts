/**
 * Azure Terraform Formatter Tests
 */

import type { NetworkPlan, Subnet } from '../../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../../src/core/models/network-plan.js';
import { exportToAzureTerraform } from '../../../src/formatters/terraform/azure-formatter.js';

describe('AzureTerraformFormatter', () => {
  describe('exportToAzureTerraform', () => {
    let plan: NetworkPlan;
    let subnet: Subnet;

    beforeEach(() => {
      plan = createNetworkPlan('Test Plan', '10.0.0.0');
      subnet = createSubnet('Engineering', 10, 50);
      subnet.subnetInfo = {
        networkAddress: '10.0.0.0/24',
        cidrPrefix: 24,
        subnetSize: 256,
        usableHosts: 254,
        requiredHosts: 100,
        plannedDevices: 50,
      };
      plan.subnets = [subnet];
      plan.supernet = {
        networkAddress: '10.0.0.0/22',
        cidrPrefix: 22,
        totalSize: 1024,
        usedSize: 256,
        utilization: 25,
        rangeEfficiency: 100,
      };
    });

    describe('main.tf', () => {
      it('should generate valid header', () => {
        const { mainTf } = exportToAzureTerraform(plan);

        expect(mainTf).toContain('# cidrly Network Configuration');
        expect(mainTf).toContain('# Plan: Test Plan');
        expect(mainTf).toContain('# Provider: Azure');
      });

      it('should include terraform block with azurerm provider', () => {
        const { mainTf } = exportToAzureTerraform(plan);

        expect(mainTf).toContain('terraform {');
        expect(mainTf).toContain('source  = "hashicorp/azurerm"');
        expect(mainTf).toContain('version = "~> 3.0"');
      });

      it('should include provider block with features', () => {
        const { mainTf } = exportToAzureTerraform(plan);

        expect(mainTf).toContain('provider "azurerm" {');
        expect(mainTf).toContain('features {}');
      });

      it('should include resource group', () => {
        const { mainTf } = exportToAzureTerraform(plan);

        expect(mainTf).toContain('resource "azurerm_resource_group" "main"');
        expect(mainTf).toContain('name     = var.resource_group_name');
        expect(mainTf).toContain('location = var.location');
      });

      it('should include virtual network', () => {
        const { mainTf } = exportToAzureTerraform(plan);

        expect(mainTf).toContain('resource "azurerm_virtual_network" "main"');
        expect(mainTf).toContain('address_space       = [local.base_cidr]');
      });

      it('should include subnet resources', () => {
        const { mainTf } = exportToAzureTerraform(plan);

        expect(mainTf).toContain('# Subnet: Engineering (VLAN 10)');
        expect(mainTf).toContain('resource "azurerm_subnet" "engineering"');
        expect(mainTf).toContain('address_prefixes     = ["10.0.0.0/24"]');
      });

      it('should include NSG by default', () => {
        const { mainTf } = exportToAzureTerraform(plan);

        expect(mainTf).toContain('resource "azurerm_network_security_group" "main"');
        expect(mainTf).toContain('security_rule {');
        expect(mainTf).toContain('name                       = "AllowSSH"');
        expect(mainTf).toContain('name                       = "AllowHTTPS"');
      });

      it('should include NSG associations', () => {
        const { mainTf } = exportToAzureTerraform(plan);

        expect(mainTf).toContain(
          'resource "azurerm_subnet_network_security_group_association" "engineering"',
        );
        expect(mainTf).toContain('subnet_id                 = azurerm_subnet.engineering.id');
      });

      it('should exclude NSG when disabled', () => {
        const { mainTf } = exportToAzureTerraform(plan, { includeSecurityRules: false });

        expect(mainTf).not.toContain('resource "azurerm_network_security_group"');
        expect(mainTf).not.toContain('azurerm_subnet_network_security_group_association');
      });

      it('should handle multiple subnets', () => {
        const subnet2 = createSubnet('Sales', 20, 30);
        subnet2.subnetInfo = {
          networkAddress: '10.0.1.0/25',
          cidrPrefix: 25,
          subnetSize: 128,
          usableHosts: 126,
          requiredHosts: 60,
          plannedDevices: 30,
        };
        plan.subnets.push(subnet2);

        const { mainTf } = exportToAzureTerraform(plan);

        expect(mainTf).toContain('resource "azurerm_subnet" "engineering"');
        expect(mainTf).toContain('resource "azurerm_subnet" "sales"');
      });
    });

    describe('variables.tf', () => {
      it('should include resource_group_name variable', () => {
        const { variablesTf } = exportToAzureTerraform(plan);

        expect(variablesTf).toContain('variable "resource_group_name"');
        expect(variablesTf).toContain('default     = "cidrly-network-rg"');
      });

      it('should include location variable', () => {
        const { variablesTf } = exportToAzureTerraform(plan);

        expect(variablesTf).toContain('variable "location"');
        expect(variablesTf).toContain('default     = "eastus"');
      });

      it('should use custom values', () => {
        const { variablesTf } = exportToAzureTerraform(plan, {
          azureResourceGroup: 'my-rg',
          azureLocation: 'westeurope',
        });

        expect(variablesTf).toContain('default     = "my-rg"');
        expect(variablesTf).toContain('default     = "westeurope"');
      });
    });

    describe('outputs.tf', () => {
      it('should include resource group output', () => {
        const { outputsTf } = exportToAzureTerraform(plan);

        expect(outputsTf).toContain('output "resource_group_name"');
        expect(outputsTf).toContain('azurerm_resource_group.main.name');
      });

      it('should include vnet outputs', () => {
        const { outputsTf } = exportToAzureTerraform(plan);

        expect(outputsTf).toContain('output "vnet_id"');
        expect(outputsTf).toContain('output "vnet_name"');
        expect(outputsTf).toContain('azurerm_virtual_network.main.id');
      });

      it('should include subnet outputs', () => {
        const { outputsTf } = exportToAzureTerraform(plan);

        expect(outputsTf).toContain('output "subnet_ids"');
        expect(outputsTf).toContain('engineering = azurerm_subnet.engineering.id');
      });

      it('should include NSG output by default', () => {
        const { outputsTf } = exportToAzureTerraform(plan);

        expect(outputsTf).toContain('output "nsg_id"');
      });

      it('should exclude NSG output when disabled', () => {
        const { outputsTf } = exportToAzureTerraform(plan, { includeSecurityRules: false });

        expect(outputsTf).not.toContain('nsg_id');
      });
    });

    describe('empty plan handling', () => {
      it('should handle empty subnet list', () => {
        plan.subnets = [];
        const { mainTf, outputsTf } = exportToAzureTerraform(plan);

        expect(mainTf).toContain('resource "azurerm_virtual_network" "main"');
        expect(mainTf).not.toContain('resource "azurerm_subnet"');
        expect(outputsTf).toContain('output "subnet_ids"');
      });
    });
  });
});
