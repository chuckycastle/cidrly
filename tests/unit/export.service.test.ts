/**
 * Unit tests for ExportService
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import YAML from 'yaml';
import { createNetworkPlan, createSubnet } from '../../src/core/models/network-plan.js';
import { ExportService } from '../../src/services/export.service.js';

describe('ExportService', () => {
  let tempDir: string;
  let service: ExportService;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cidrly-export-test-'));
    service = new ExportService(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create exports directory if it does not exist', async () => {
      const newDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cidrly-export-new-'));

      // Remove the directory to test creation
      fs.rmdirSync(newDir);
      expect(fs.existsSync(newDir)).toBe(false);

      // Create service (should create directory)
      new ExportService(newDir);

      // Wait a bit for async directory creation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Clean up
      if (fs.existsSync(newDir)) {
        fs.rmdirSync(newDir);
      }
    });
  });

  describe('export to YAML', () => {
    it('should export a plan to YAML format', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      const filepath = await service.export(plan, 'yaml');

      // File should exist
      expect(fs.existsSync(filepath)).toBe(true);

      // File should be in exports directory
      expect(path.dirname(filepath)).toBe(tempDir);

      // Filename should have .yaml extension
      expect(path.extname(filepath)).toBe('.yaml');

      // Content should be valid YAML
      const content = fs.readFileSync(filepath, 'utf-8');
      expect(() => YAML.parse(content)).not.toThrow();

      const parsed = YAML.parse(content);
      expect(parsed.name).toBe('Test Plan');
      expect(parsed.baseIp).toBe('10.0.0.0');
    });

    it('should use custom filename when provided', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      const customFilename = 'custom-export-name.yaml';

      const filepath = await service.export(plan, 'yaml', customFilename);

      expect(path.basename(filepath)).toBe(customFilename);
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('should auto-add .yaml extension if missing', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      const filepath = await service.export(plan, 'yaml', 'test-export');

      expect(path.basename(filepath)).toBe('test-export.yaml');
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('should sanitize plan name for default filename', async () => {
      const plan = createNetworkPlan('My Complex Plan Name!', '10.0.0.0');

      const filepath = await service.export(plan, 'yaml');

      expect(path.basename(filepath)).toBe('my-complex-plan-name.yaml');
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('should replace existing extension with correct one', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      const filepath = await service.export(plan, 'yaml', 'test.json');

      expect(path.basename(filepath)).toBe('test.yaml');
      expect(fs.existsSync(filepath)).toBe(true);
    });
  });

  describe('export validation', () => {
    it('should reject invalid filenames', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      // Filename with forbidden characters
      await expect(service.export(plan, 'yaml', 'test<invalid>.yaml')).rejects.toThrow();
    });

    it('should reject unsupported formats', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      // @ts-expect-error - Testing invalid format
      await expect(service.export(plan, 'xml')).rejects.toThrow('Failed to export');
    });
  });

  describe('CSV export', () => {
    it('should export a plan to CSV format', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      const filepath = await service.export(plan, 'csv');

      expect(fs.existsSync(filepath)).toBe(true);
      expect(path.extname(filepath)).toBe('.csv');

      // Verify CSV contains metadata headers and data
      const content = fs.readFileSync(filepath, 'utf-8');
      expect(content).toContain('# Plan Metadata');
      expect(content).toContain('# name: Test Plan');
      expect(content).toContain('name,vlan,devices');
      expect(content).toContain('Engineering,10,50');
    });
  });

  describe('PDF export', () => {
    it('should export a plan to PDF format', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      const filepath = await service.export(plan, 'pdf');

      expect(fs.existsSync(filepath)).toBe(true);
      expect(path.extname(filepath)).toBe('.pdf');

      // Verify it's a valid PDF (starts with %PDF)
      const content = fs.readFileSync(filepath);
      expect(content.toString('utf-8', 0, 4)).toBe('%PDF');
    });
  });

  describe('listExports', () => {
    it('should return empty array when no exports exist', async () => {
      const files = await service.listExports();
      expect(files).toEqual([]);
    });

    it('should list exported files', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      // Create some exports
      await service.export(plan, 'yaml', 'export1.yaml');
      await service.export(plan, 'yaml', 'export2.yaml');

      const files = await service.listExports();

      expect(files).toHaveLength(2);
      expect(files).toContain('export1.yaml');
      expect(files).toContain('export2.yaml');
    });

    it('should filter by allowed extensions', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      // Create a valid export
      await service.export(plan, 'yaml', 'valid.yaml');

      // Create an invalid file manually
      fs.writeFileSync(path.join(tempDir, 'invalid.txt'), 'test');

      const files = await service.listExports();

      expect(files).toHaveLength(1);
      expect(files).toContain('valid.yaml');
      expect(files).not.toContain('invalid.txt');
    });
  });

  describe('security', () => {
    it('should prevent path traversal attacks', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      // Attempt path traversal
      await expect(service.export(plan, 'yaml', '../../../etc/passwd')).rejects.toThrow();
    });

    it('should prevent absolute path injection', async () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');

      // Attempt absolute path
      await expect(service.export(plan, 'yaml', '/etc/passwd')).rejects.toThrow();
    });
  });

  describe('filename sanitization', () => {
    it('should convert spaces to hyphens', async () => {
      const plan = createNetworkPlan('Plan With Spaces', '10.0.0.0');

      const filepath = await service.export(plan, 'yaml');

      expect(path.basename(filepath)).toBe('plan-with-spaces.yaml');
    });

    it('should remove special characters', async () => {
      const plan = createNetworkPlan('Plan@#$%Name!', '10.0.0.0');

      const filepath = await service.export(plan, 'yaml');

      expect(path.basename(filepath)).toBe('plan-name.yaml');
    });

    it('should handle consecutive hyphens', async () => {
      const plan = createNetworkPlan('Plan   Multiple   Spaces', '10.0.0.0');

      const filepath = await service.export(plan, 'yaml');

      expect(path.basename(filepath)).toBe('plan-multiple-spaces.yaml');
    });

    it('should trim leading/trailing hyphens', async () => {
      const plan = createNetworkPlan('---Plan---', '10.0.0.0');

      const filepath = await service.export(plan, 'yaml');

      expect(path.basename(filepath)).toBe('plan.yaml');
    });

    it('should convert to lowercase', async () => {
      const plan = createNetworkPlan('UPPERCASE PLAN', '10.0.0.0');

      const filepath = await service.export(plan, 'yaml');

      expect(path.basename(filepath)).toBe('uppercase-plan.yaml');
    });
  });
});
