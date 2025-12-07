/**
 * GCP Terraform Formatter
 * Generates Terraform HCL for Google Cloud VPC resources
 */

import type { NetworkPlan, Subnet } from '../../core/models/network-plan.js';
import { BaseTerraformFormatter, generateHeader, sanitizeResourceName } from './base-formatter.js';
import type { TerraformExportOptions, TerraformOutput } from './types.js';
import { DEFAULT_OPTIONS } from './types.js';

/**
 * GCP-specific Terraform formatter
 */
export class GcpTerraformFormatter extends BaseTerraformFormatter {
  constructor(plan: NetworkPlan, options?: Partial<TerraformExportOptions>) {
    super(plan, { ...DEFAULT_OPTIONS, ...options, provider: 'gcp' });
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
    sections.push(generateHeader(this.plan, 'GCP'));

    // Terraform and provider blocks
    sections.push(this.generateProviderBlock());

    // Locals
    sections.push(this.generateLocals());

    // VPC Network
    sections.push(this.generateVpcNetwork());

    // Subnetworks
    this.validSubnets.forEach((subnet) => {
      sections.push(this.generateSubnetwork(subnet));
    });

    // Firewall rules (if enabled)
    if (this.options.includeSecurityRules) {
      sections.push(this.generateFirewallRules());
    }

    // Cloud Router (for NAT)
    sections.push(this.generateCloudRouter());

    // Cloud NAT
    sections.push(this.generateCloudNat());

    return sections.join('\n');
  }

  private generateProviderBlock(): string {
    const lines: string[] = [];
    lines.push('terraform {');
    lines.push('  required_version = ">= 1.0"');
    lines.push('  required_providers {');
    lines.push('    google = {');
    lines.push('      source  = "hashicorp/google"');
    lines.push('      version = "~> 5.0"');
    lines.push('    }');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    lines.push('provider "google" {');
    lines.push('  project = var.project_id');
    lines.push('  region  = var.region');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateLocals(): string {
    const planName = sanitizeResourceName(this.plan.name);
    const lines: string[] = [];
    lines.push('locals {');
    lines.push(`  plan_name = "${planName}"`);
    lines.push('  labels = {');
    lines.push('    managed_by = "cidrly"');
    lines.push(`    plan_name  = "${planName}"`);
    lines.push('  }');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateVpcNetwork(): string {
    const lines: string[] = [];
    lines.push('# VPC Network');
    lines.push('resource "google_compute_network" "main" {');
    lines.push('  name                    = "${local.plan_name}-vpc"');
    lines.push('  auto_create_subnetworks = false');
    lines.push('  routing_mode            = "REGIONAL"');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateSubnetwork(subnet: Subnet): string {
    const name = sanitizeResourceName(subnet.name);
    const cidr = subnet.subnetInfo!.networkAddress!;
    const lines: string[] = [];
    lines.push(`# Subnetwork: ${subnet.name} (VLAN ${subnet.vlanId})`);
    lines.push(`resource "google_compute_subnetwork" "${name}" {`);
    lines.push(`  name          = "${name}"`);
    lines.push(`  ip_cidr_range = "${cidr}"`);
    lines.push('  region        = var.region');
    lines.push('  network       = google_compute_network.main.id');
    lines.push('');
    lines.push('  private_ip_google_access = true');
    lines.push('');
    lines.push('  log_config {');
    lines.push('    aggregation_interval = "INTERVAL_5_SEC"');
    lines.push('    flow_sampling        = 0.5');
    lines.push('    metadata             = "INCLUDE_ALL_METADATA"');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateFirewallRules(): string {
    const lines: string[] = [];

    lines.push('# Firewall Rules');
    lines.push('');

    // Allow internal traffic
    lines.push('resource "google_compute_firewall" "allow_internal" {');
    lines.push('  name    = "${local.plan_name}-allow-internal"');
    lines.push('  network = google_compute_network.main.name');
    lines.push('');
    lines.push('  allow {');
    lines.push('    protocol = "icmp"');
    lines.push('  }');
    lines.push('');
    lines.push('  allow {');
    lines.push('    protocol = "tcp"');
    lines.push('    ports    = ["0-65535"]');
    lines.push('  }');
    lines.push('');
    lines.push('  allow {');
    lines.push('    protocol = "udp"');
    lines.push('    ports    = ["0-65535"]');
    lines.push('  }');
    lines.push('');
    lines.push('  source_ranges = [');
    this.validSubnets.forEach((subnet, index) => {
      const cidr = subnet.subnetInfo!.networkAddress!;
      const comma = index < this.validSubnets.length - 1 ? ',' : '';
      lines.push(`    "${cidr}"${comma}`);
    });
    lines.push('  ]');
    lines.push('}');
    lines.push('');

    // Allow SSH
    lines.push('resource "google_compute_firewall" "allow_ssh" {');
    lines.push('  name    = "${local.plan_name}-allow-ssh"');
    lines.push('  network = google_compute_network.main.name');
    lines.push('');
    lines.push('  allow {');
    lines.push('    protocol = "tcp"');
    lines.push('    ports    = ["22"]');
    lines.push('  }');
    lines.push('');
    lines.push('  # Restrict to IAP for secure SSH');
    lines.push('  source_ranges = ["35.235.240.0/20"]');
    lines.push('  target_tags   = ["allow-ssh"]');
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  private generateCloudRouter(): string {
    const lines: string[] = [];
    lines.push('# Cloud Router for NAT');
    lines.push('resource "google_compute_router" "main" {');
    lines.push('  name    = "${local.plan_name}-router"');
    lines.push('  region  = var.region');
    lines.push('  network = google_compute_network.main.id');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  private generateCloudNat(): string {
    const lines: string[] = [];
    lines.push('# Cloud NAT');
    lines.push('resource "google_compute_router_nat" "main" {');
    lines.push('  name                               = "${local.plan_name}-nat"');
    lines.push('  router                             = google_compute_router.main.name');
    lines.push('  region                             = var.region');
    lines.push('  nat_ip_allocate_option             = "AUTO_ONLY"');
    lines.push('  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"');
    lines.push('');
    lines.push('  log_config {');
    lines.push('    enable = true');
    lines.push('    filter = "ERRORS_ONLY"');
    lines.push('  }');
    lines.push('}');
    lines.push('');
    return lines.join('\n');
  }

  protected generateVariables(): string {
    const lines: string[] = [];
    lines.push(generateHeader(this.plan, 'GCP'));

    lines.push('variable "project_id" {');
    lines.push('  description = "GCP project ID"');
    lines.push('  type        = string');
    lines.push(`  default     = "${this.options.gcpProject}"`);
    lines.push('}');
    lines.push('');

    lines.push('variable "region" {');
    lines.push('  description = "GCP region for resources"');
    lines.push('  type        = string');
    lines.push(`  default     = "${this.options.gcpRegion}"`);
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }

  protected generateOutputs(): string {
    const lines: string[] = [];
    lines.push(generateHeader(this.plan, 'GCP'));

    lines.push('output "network_id" {');
    lines.push('  description = "VPC Network ID"');
    lines.push('  value       = google_compute_network.main.id');
    lines.push('}');
    lines.push('');

    lines.push('output "network_name" {');
    lines.push('  description = "VPC Network name"');
    lines.push('  value       = google_compute_network.main.name');
    lines.push('}');
    lines.push('');

    lines.push('output "network_self_link" {');
    lines.push('  description = "VPC Network self link"');
    lines.push('  value       = google_compute_network.main.self_link');
    lines.push('}');
    lines.push('');

    lines.push('output "subnetwork_ids" {');
    lines.push('  description = "Map of subnetwork names to IDs"');
    lines.push('  value = {');
    this.validSubnets.forEach((subnet) => {
      const name = sanitizeResourceName(subnet.name);
      lines.push(`    ${name} = google_compute_subnetwork.${name}.id`);
    });
    lines.push('  }');
    lines.push('}');
    lines.push('');

    lines.push('output "subnetwork_self_links" {');
    lines.push('  description = "Map of subnetwork names to self links"');
    lines.push('  value = {');
    this.validSubnets.forEach((subnet) => {
      const name = sanitizeResourceName(subnet.name);
      lines.push(`    ${name} = google_compute_subnetwork.${name}.self_link`);
    });
    lines.push('  }');
    lines.push('}');
    lines.push('');

    lines.push('output "nat_ip" {');
    lines.push('  description = "Cloud NAT external IP (auto-allocated)"');
    lines.push('  value       = google_compute_router_nat.main.nat_ips');
    lines.push('}');
    lines.push('');

    return lines.join('\n');
  }
}

/**
 * Export NetworkPlan to GCP Terraform configuration
 */
export function exportToGcpTerraform(
  plan: NetworkPlan,
  options?: Partial<TerraformExportOptions>,
): TerraformOutput {
  const formatter = new GcpTerraformFormatter(plan, options);
  return formatter.generate();
}
