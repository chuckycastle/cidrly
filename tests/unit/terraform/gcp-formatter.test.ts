/**
 * GCP Terraform Formatter Tests
 */

import type { NetworkPlan, Subnet } from '../../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../../src/core/models/network-plan.js';
import { exportToGcpTerraform } from '../../../src/formatters/terraform/gcp-formatter.js';

describe('GcpTerraformFormatter', () => {
  describe('exportToGcpTerraform', () => {
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
        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('# cidrly Network Configuration');
        expect(mainTf).toContain('# Plan: Test Plan');
        expect(mainTf).toContain('# Provider: GCP');
      });

      it('should include terraform block with google provider', () => {
        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('terraform {');
        expect(mainTf).toContain('source  = "hashicorp/google"');
        expect(mainTf).toContain('version = "~> 5.0"');
      });

      it('should include provider block', () => {
        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('provider "google" {');
        expect(mainTf).toContain('project = var.project_id');
        expect(mainTf).toContain('region  = var.region');
      });

      it('should include VPC network', () => {
        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('resource "google_compute_network" "main"');
        expect(mainTf).toContain('auto_create_subnetworks = false');
        expect(mainTf).toContain('routing_mode            = "REGIONAL"');
      });

      it('should include subnetwork resources', () => {
        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('# Subnetwork: Engineering (VLAN 10)');
        expect(mainTf).toContain('resource "google_compute_subnetwork" "engineering"');
        expect(mainTf).toContain('ip_cidr_range = "10.0.0.0/24"');
        expect(mainTf).toContain('private_ip_google_access = true');
      });

      it('should include flow log config for subnetworks', () => {
        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('log_config {');
        expect(mainTf).toContain('aggregation_interval = "INTERVAL_5_SEC"');
        expect(mainTf).toContain('flow_sampling        = 0.5');
      });

      it('should include firewall rules by default', () => {
        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('resource "google_compute_firewall" "allow_internal"');
        expect(mainTf).toContain('resource "google_compute_firewall" "allow_ssh"');
        expect(mainTf).toContain('source_ranges = ["35.235.240.0/20"]'); // IAP range
      });

      it('should exclude firewall rules when disabled', () => {
        const { mainTf } = exportToGcpTerraform(plan, { includeSecurityRules: false });

        expect(mainTf).not.toContain('resource "google_compute_firewall"');
      });

      it('should include Cloud Router', () => {
        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('resource "google_compute_router" "main"');
      });

      it('should include Cloud NAT', () => {
        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('resource "google_compute_router_nat" "main"');
        expect(mainTf).toContain('nat_ip_allocate_option             = "AUTO_ONLY"');
        expect(mainTf).toContain(
          'source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"',
        );
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

        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('resource "google_compute_subnetwork" "engineering"');
        expect(mainTf).toContain('resource "google_compute_subnetwork" "sales"');
      });

      it('should include all subnet CIDRs in firewall source_ranges', () => {
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

        const { mainTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('"10.0.0.0/24"');
        expect(mainTf).toContain('"10.0.1.0/25"');
      });
    });

    describe('variables.tf', () => {
      it('should include project_id variable', () => {
        const { variablesTf } = exportToGcpTerraform(plan);

        expect(variablesTf).toContain('variable "project_id"');
        expect(variablesTf).toContain('default     = "my-project"');
      });

      it('should include region variable', () => {
        const { variablesTf } = exportToGcpTerraform(plan);

        expect(variablesTf).toContain('variable "region"');
        expect(variablesTf).toContain('default     = "us-central1"');
      });

      it('should use custom values', () => {
        const { variablesTf } = exportToGcpTerraform(plan, {
          gcpProject: 'custom-project',
          gcpRegion: 'europe-west1',
        });

        expect(variablesTf).toContain('default     = "custom-project"');
        expect(variablesTf).toContain('default     = "europe-west1"');
      });
    });

    describe('outputs.tf', () => {
      it('should include network outputs', () => {
        const { outputsTf } = exportToGcpTerraform(plan);

        expect(outputsTf).toContain('output "network_id"');
        expect(outputsTf).toContain('output "network_name"');
        expect(outputsTf).toContain('output "network_self_link"');
        expect(outputsTf).toContain('google_compute_network.main.id');
      });

      it('should include subnetwork outputs', () => {
        const { outputsTf } = exportToGcpTerraform(plan);

        expect(outputsTf).toContain('output "subnetwork_ids"');
        expect(outputsTf).toContain('output "subnetwork_self_links"');
        expect(outputsTf).toContain('engineering = google_compute_subnetwork.engineering.id');
      });

      it('should include NAT output', () => {
        const { outputsTf } = exportToGcpTerraform(plan);

        expect(outputsTf).toContain('output "nat_ip"');
        expect(outputsTf).toContain('google_compute_router_nat.main.nat_ips');
      });
    });

    describe('empty plan handling', () => {
      it('should handle empty subnet list', () => {
        plan.subnets = [];
        const { mainTf, outputsTf } = exportToGcpTerraform(plan);

        expect(mainTf).toContain('resource "google_compute_network" "main"');
        expect(mainTf).not.toContain('resource "google_compute_subnetwork"');
        expect(outputsTf).toContain('output "subnetwork_ids"');
      });
    });
  });
});
