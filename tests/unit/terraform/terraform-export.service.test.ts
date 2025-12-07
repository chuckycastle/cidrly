/**
 * Terraform Export Service Tests
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { NetworkPlan, Subnet } from '../../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../../src/core/models/network-plan.js';
import { TerraformExportService } from '../../../src/services/terraform-export.service.js';

describe('TerraformExportService', () => {
  let service: TerraformExportService;
  let plan: NetworkPlan;
  let subnet: Subnet;
  let tempDir: string;

  beforeEach(() => {
    service = new TerraformExportService();
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

    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terraform-test-'));
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('generateTerraform', () => {
    it('should generate AWS Terraform', () => {
      const output = service.generateTerraform(plan, 'aws');

      expect(output.mainTf).toContain('aws_vpc');
      expect(output.variablesTf).toContain('aws_region');
      expect(output.outputsTf).toContain('vpc_id');
    });

    it('should generate Azure Terraform', () => {
      const output = service.generateTerraform(plan, 'azure');

      expect(output.mainTf).toContain('azurerm_virtual_network');
      expect(output.variablesTf).toContain('resource_group_name');
      expect(output.outputsTf).toContain('vnet_id');
    });

    it('should generate GCP Terraform', () => {
      const output = service.generateTerraform(plan, 'gcp');

      expect(output.mainTf).toContain('google_compute_network');
      expect(output.variablesTf).toContain('project_id');
      expect(output.outputsTf).toContain('network_id');
    });

    it('should throw for invalid provider', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        service.generateTerraform(plan, 'invalid' as any);
      }).toThrow('Unsupported Terraform provider');
    });
  });

  describe('exportToDirectory', () => {
    it('should create directory structure for AWS', async () => {
      const result = await service.exportToDirectory(plan, tempDir, { provider: 'aws' });

      expect(result.success).toBe(true);
      expect(result.outputDir).toContain('test_plan-aws');
      expect(result.files).toHaveLength(3);

      // Verify files exist
      expect(fs.existsSync(path.join(result.outputDir, 'main.tf'))).toBe(true);
      expect(fs.existsSync(path.join(result.outputDir, 'variables.tf'))).toBe(true);
      expect(fs.existsSync(path.join(result.outputDir, 'outputs.tf'))).toBe(true);
    });

    it('should create directory structure for Azure', async () => {
      const result = await service.exportToDirectory(plan, tempDir, { provider: 'azure' });

      expect(result.success).toBe(true);
      expect(result.outputDir).toContain('test_plan-azure');
    });

    it('should create directory structure for GCP', async () => {
      const result = await service.exportToDirectory(plan, tempDir, { provider: 'gcp' });

      expect(result.success).toBe(true);
      expect(result.outputDir).toContain('test_plan-gcp');
    });

    it('should write valid Terraform content', async () => {
      const result = await service.exportToDirectory(plan, tempDir, { provider: 'aws' });

      const mainContent = fs.readFileSync(path.join(result.outputDir, 'main.tf'), 'utf-8');
      expect(mainContent).toContain('resource "aws_vpc" "main"');
      expect(mainContent).toContain('resource "aws_subnet" "engineering"');
    });

    it('should handle export errors gracefully', async () => {
      // Try to write to an invalid path
      const result = await service.exportToDirectory(plan, '/invalid/path/that/does/not/exist', {
        provider: 'aws',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should default to AWS provider', async () => {
      const result = await service.exportToDirectory(plan, tempDir);

      expect(result.outputDir).toContain('-aws');
    });
  });

  describe('exportToAllProviders', () => {
    it('should export to all three providers', async () => {
      const results = await service.exportToAllProviders(plan, tempDir);

      expect(results.size).toBe(3);
      expect(results.get('aws')?.success).toBe(true);
      expect(results.get('azure')?.success).toBe(true);
      expect(results.get('gcp')?.success).toBe(true);
    });

    it('should create separate directories for each provider', async () => {
      await service.exportToAllProviders(plan, tempDir);

      expect(fs.existsSync(path.join(tempDir, 'test_plan-aws'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'test_plan-azure'))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, 'test_plan-gcp'))).toBe(true);
    });
  });

  describe('getProviderDescription', () => {
    it('should return AWS description', () => {
      const desc = service.getProviderDescription('aws');
      expect(desc).toContain('AWS VPC');
    });

    it('should return Azure description', () => {
      const desc = service.getProviderDescription('azure');
      expect(desc).toContain('Azure Virtual Network');
    });

    it('should return GCP description', () => {
      const desc = service.getProviderDescription('gcp');
      expect(desc).toContain('GCP VPC');
    });
  });
});
