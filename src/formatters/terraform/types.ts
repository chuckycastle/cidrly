/**
 * Terraform Export Types
 */

export type TerraformProvider = 'aws' | 'azure' | 'gcp';

export interface TerraformExportOptions {
  /** Cloud provider */
  provider: TerraformProvider;
  /** AWS region (defaults to us-east-1) */
  awsRegion?: string;
  /** Azure resource group name */
  azureResourceGroup?: string;
  /** Azure location (defaults to eastus) */
  azureLocation?: string;
  /** GCP project ID */
  gcpProject?: string;
  /** GCP region (defaults to us-central1) */
  gcpRegion?: string;
  /** Include example security rules/ACLs */
  includeSecurityRules?: boolean;
  /** Parent interface for VLANs (eth0, internal, etc.) */
  parentInterface?: string;
}

export interface TerraformOutput {
  /** main.tf content - VPC/vNet, subnets, security */
  mainTf: string;
  /** variables.tf content - Configurable inputs */
  variablesTf: string;
  /** outputs.tf content - Resource IDs and attributes */
  outputsTf: string;
}

export const DEFAULT_OPTIONS: Required<TerraformExportOptions> = {
  provider: 'aws',
  awsRegion: 'us-east-1',
  azureResourceGroup: 'cidrly-network-rg',
  azureLocation: 'eastus',
  gcpProject: 'my-project',
  gcpRegion: 'us-central1',
  includeSecurityRules: true,
  parentInterface: 'eth0',
};
