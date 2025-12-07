/**
 * AWS Terraform Formatter Tests
 */

import type { NetworkPlan, Subnet } from '../../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../../src/core/models/network-plan.js';
import { exportToAwsTerraform } from '../../../src/formatters/terraform/aws-formatter.js';

describe('AwsTerraformFormatter', () => {
  describe('exportToAwsTerraform', () => {
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
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('# cidrly Network Configuration');
        expect(mainTf).toContain('# Plan: Test Plan');
        expect(mainTf).toContain('# Provider: AWS');
      });

      it('should include terraform block with AWS provider', () => {
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('terraform {');
        expect(mainTf).toContain('required_version = ">= 1.0"');
        expect(mainTf).toContain('source  = "hashicorp/aws"');
        expect(mainTf).toContain('version = "~> 5.0"');
      });

      it('should include provider block', () => {
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('provider "aws" {');
        expect(mainTf).toContain('region = var.aws_region');
      });

      it('should include locals block', () => {
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('locals {');
        expect(mainTf).toContain('plan_name = "test_plan"');
        expect(mainTf).toContain('base_cidr = "10.0.0.0/22"');
        expect(mainTf).toContain('ManagedBy = "cidrly"');
      });

      it('should include VPC resource', () => {
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('resource "aws_vpc" "main"');
        expect(mainTf).toContain('cidr_block           = local.base_cidr');
        expect(mainTf).toContain('enable_dns_hostnames = true');
      });

      it('should include Internet Gateway', () => {
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('resource "aws_internet_gateway" "main"');
        expect(mainTf).toContain('vpc_id = aws_vpc.main.id');
      });

      it('should include subnet resources', () => {
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('# Subnet: Engineering (VLAN 10)');
        expect(mainTf).toContain('resource "aws_subnet" "engineering"');
        expect(mainTf).toContain('cidr_block        = "10.0.0.0/24"');
        expect(mainTf).toContain('VlanId = "10"');
      });

      it('should include route table', () => {
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('resource "aws_route_table" "main"');
        expect(mainTf).toContain('cidr_block = "0.0.0.0/0"');
        expect(mainTf).toContain('gateway_id = aws_internet_gateway.main.id');
      });

      it('should include route table associations', () => {
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('resource "aws_route_table_association" "engineering"');
        expect(mainTf).toContain('subnet_id      = aws_subnet.engineering.id');
      });

      it('should include security group by default', () => {
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('resource "aws_security_group" "main"');
        expect(mainTf).toContain('from_port   = 22');
        expect(mainTf).toContain('from_port   = 443');
      });

      it('should exclude security group when disabled', () => {
        const { mainTf } = exportToAwsTerraform(plan, { includeSecurityRules: false });

        expect(mainTf).not.toContain('resource "aws_security_group"');
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

        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('resource "aws_subnet" "engineering"');
        expect(mainTf).toContain('resource "aws_subnet" "sales"');
        expect(mainTf).toContain('cidr_block        = "10.0.0.0/24"');
        expect(mainTf).toContain('cidr_block        = "10.0.1.0/25"');
      });
    });

    describe('variables.tf', () => {
      it('should include aws_region variable', () => {
        const { variablesTf } = exportToAwsTerraform(plan);

        expect(variablesTf).toContain('variable "aws_region"');
        expect(variablesTf).toContain('default     = "us-east-1"');
      });

      it('should use custom region', () => {
        const { variablesTf } = exportToAwsTerraform(plan, { awsRegion: 'eu-west-1' });

        expect(variablesTf).toContain('default     = "eu-west-1"');
      });
    });

    describe('outputs.tf', () => {
      it('should include VPC outputs', () => {
        const { outputsTf } = exportToAwsTerraform(plan);

        expect(outputsTf).toContain('output "vpc_id"');
        expect(outputsTf).toContain('aws_vpc.main.id');
        expect(outputsTf).toContain('output "vpc_cidr"');
      });

      it('should include subnet outputs', () => {
        const { outputsTf } = exportToAwsTerraform(plan);

        expect(outputsTf).toContain('output "subnet_ids"');
        expect(outputsTf).toContain('engineering = aws_subnet.engineering.id');
        expect(outputsTf).toContain('output "subnet_cidrs"');
      });

      it('should include security group output by default', () => {
        const { outputsTf } = exportToAwsTerraform(plan);

        expect(outputsTf).toContain('output "security_group_id"');
      });

      it('should exclude security group output when disabled', () => {
        const { outputsTf } = exportToAwsTerraform(plan, { includeSecurityRules: false });

        expect(outputsTf).not.toContain('security_group_id');
      });
    });

    describe('resource naming', () => {
      it('should sanitize resource names', () => {
        subnet.name = 'Engineering Team 1';
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('resource "aws_subnet" "engineering_team_1"');
      });

      it('should handle names starting with numbers', () => {
        subnet.name = '1st Floor';
        const { mainTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('resource "aws_subnet" "_1st_floor"');
      });
    });

    describe('empty plan handling', () => {
      it('should handle empty subnet list', () => {
        plan.subnets = [];
        const { mainTf, outputsTf } = exportToAwsTerraform(plan);

        expect(mainTf).toContain('resource "aws_vpc" "main"');
        expect(mainTf).not.toContain('resource "aws_subnet"');
        expect(outputsTf).toContain('output "subnet_ids"');
      });
    });
  });
});
