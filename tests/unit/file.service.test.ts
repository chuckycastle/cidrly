/**
 * Unit tests for FileService
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { createNetworkPlan, createSubnet } from '../../src/core/models/network-plan.js';
import { FileOperationError, ValidationError } from '../../src/errors/network-plan-errors.js';
import { FileService } from '../../src/services/file.service.js';

describe('FileService', () => {
  let tempDir: string;
  let service: FileService;

  beforeEach(() => {
    // Create a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cidrly-test-'));
    service = new FileService(tempDir);
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create base directory if it does not exist', () => {
      const newDir = path.join(os.tmpdir(), 'cidrly-new-dir-' + Date.now());

      // Directory should not exist yet
      expect(fs.existsSync(newDir)).toBe(false);

      // Create service (should create directory)
      new FileService(newDir);

      // Directory should now exist
      expect(fs.existsSync(newDir)).toBe(true);

      // Clean up
      fs.rmdirSync(newDir);
    });
  });

  describe('savePlan', () => {
    it('should throw error if plan is null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(service.savePlan(null as any, 'test.json')).rejects.toThrow(ValidationError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(service.savePlan(null as any, 'test.json')).rejects.toThrow(
        'Plan is null or undefined',
      );
    });

    it('should throw error if filename is empty', async () => {
      const plan = createNetworkPlan('Test Plan');
      await expect(service.savePlan(plan, '')).rejects.toThrow('Filename cannot be empty');
      await expect(service.savePlan(plan, '   ')).rejects.toThrow('Filename cannot be empty');
    });

    it('should add .cidr extension if not present', async () => {
      const plan = createNetworkPlan('Test Plan');
      const filepath = await service.savePlan(plan, 'myplan');

      expect(filepath).toContain('myplan.cidr');
      expect(fs.existsSync(filepath)).toBe(true);
    });

    it('should accept .json extension for backward compatibility', async () => {
      const plan = createNetworkPlan('Test Plan');
      const filepath = await service.savePlan(plan, 'myplan.json');

      expect(filepath).not.toContain('.json.json');
      expect(filepath).toMatch(/myplan\.json$/);
    });

    it('should save plan with correct JSON structure', async () => {
      const plan = createNetworkPlan('Test Plan', '192.168.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      const filepath = await service.savePlan(plan, 'test-plan.json');

      const fileContent = fs.readFileSync(filepath, 'utf-8');
      const savedPlan = JSON.parse(fileContent);

      expect(savedPlan.name).toBe('Test Plan');
      expect(savedPlan.baseIp).toBe('192.168.0.0');
      expect(savedPlan.subnets).toHaveLength(1);
      expect(savedPlan.subnets[0].name).toBe('Engineering');
    });

    it('should reject invalid filenames with path traversal', async () => {
      const plan = createNetworkPlan('Test Plan');

      await expect(service.savePlan(plan, '../outside.json')).rejects.toThrow();
      await expect(service.savePlan(plan, '../../evil.json')).rejects.toThrow();
      await expect(service.savePlan(plan, './subdir/../../../etc/passwd')).rejects.toThrow();
    });

    it('should reject filenames with invalid characters', async () => {
      const plan = createNetworkPlan('Test Plan');

      // These should fail filename validation
      await expect(service.savePlan(plan, 'test\x00null.json')).rejects.toThrow();
    });

    it('should overwrite existing file', async () => {
      const plan1 = createNetworkPlan('Plan 1');
      const plan2 = createNetworkPlan('Plan 2');

      const filepath1 = await service.savePlan(plan1, 'test.json');
      const filepath2 = await service.savePlan(plan2, 'test.json');

      expect(filepath1).toBe(filepath2);

      const fileContent = fs.readFileSync(filepath2, 'utf-8');
      const savedPlan = JSON.parse(fileContent);

      expect(savedPlan.name).toBe('Plan 2');
    });
  });

  describe('loadPlan', () => {
    it('should throw error if filename is empty', async () => {
      await expect(service.loadPlan('')).rejects.toThrow('Filename cannot be empty');
      await expect(service.loadPlan('   ')).rejects.toThrow('Filename cannot be empty');
    });

    it('should throw error if file does not exist', async () => {
      await expect(service.loadPlan('nonexistent.json')).rejects.toThrow(FileOperationError);
      await expect(service.loadPlan('nonexistent.json')).rejects.toThrow('File not found');
    });

    it('should load plan successfully', async () => {
      const originalPlan = createNetworkPlan('Test Plan', '10.0.0.0');
      originalPlan.subnets.push(createSubnet('Engineering', 10, 50));

      await service.savePlan(originalPlan, 'test.json');
      const loadedPlan = await service.loadPlan('test.json');

      expect(loadedPlan.name).toBe('Test Plan');
      expect(loadedPlan.baseIp).toBe('10.0.0.0');
      expect(loadedPlan.subnets).toHaveLength(1);
      expect(loadedPlan.subnets[0].name).toBe('Engineering');
    });

    it('should add .json extension if not present', async () => {
      const originalPlan = createNetworkPlan('Test Plan');
      await service.savePlan(originalPlan, 'myplan.json');

      const loadedPlan = await service.loadPlan('myplan');
      expect(loadedPlan.name).toBe('Test Plan');
    });

    it('should reject path traversal attempts', async () => {
      // Create a file outside the temp directory
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cidrly-outside-'));
      const outsideFile = path.join(outsideDir, 'outside.json');
      fs.writeFileSync(outsideFile, JSON.stringify(createNetworkPlan('Outside')));

      try {
        await expect(
          service.loadPlan('../' + path.basename(outsideDir) + '/outside.json'),
        ).rejects.toThrow();
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });

    it('should throw error for invalid JSON', async () => {
      const filepath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(filepath, 'not valid json{{{');

      await expect(service.loadPlan('invalid.json')).rejects.toThrow();
    });

    it('should throw error for JSON that fails Zod validation', async () => {
      const filepath = path.join(tempDir, 'invalid-plan.json');
      fs.writeFileSync(
        filepath,
        JSON.stringify({
          name: 'Test',
          baseIp: 'not-an-ip', // Invalid IP format
          subnets: [],
        }),
      );

      await expect(service.loadPlan('invalid-plan.json')).rejects.toThrow();
    });

    it('should correctly parse dates from JSON', async () => {
      const originalPlan = createNetworkPlan('Test Plan');
      await service.savePlan(originalPlan, 'test.json');

      const loadedPlan = await service.loadPlan('test.json');

      expect(loadedPlan.createdAt).toBeInstanceOf(Date);
      expect(loadedPlan.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('listPlans', () => {
    it('should return empty array if directory is empty', async () => {
      const plans = await service.listPlans();
      expect(plans).toEqual([]);
    });

    it('should return empty array if directory does not exist', async () => {
      const nonExistentDir = path.join(os.tmpdir(), 'does-not-exist-' + Date.now());
      const emptyService = new FileService(nonExistentDir);

      // Remove the directory that was created by constructor
      fs.rmdirSync(nonExistentDir);

      const plans = await emptyService.listPlans();
      expect(plans).toEqual([]);
    });

    it('should list all saved plans', async () => {
      const plan1 = createNetworkPlan('Plan 1');
      const plan2 = createNetworkPlan('Plan 2');
      const plan3 = createNetworkPlan('Plan 3');

      await service.savePlan(plan1, 'plan1.json');
      await service.savePlan(plan2, 'plan2.json');
      await service.savePlan(plan3, 'plan3.json');

      const plans = await service.listPlans();

      expect(plans).toHaveLength(3);
      expect(plans.map((p) => p.filename)).toContain('plan1.json');
      expect(plans.map((p) => p.filename)).toContain('plan2.json');
      expect(plans.map((p) => p.filename)).toContain('plan3.json');
    });

    it('should only return .json files', async () => {
      // Create mix of JSON and non-JSON files
      await service.savePlan(createNetworkPlan('Plan 1'), 'plan1.json');
      fs.writeFileSync(path.join(tempDir, 'readme.txt'), 'not a plan');
      fs.writeFileSync(path.join(tempDir, 'data.xml'), '<plan></plan>');

      const plans = await service.listPlans();

      expect(plans).toHaveLength(1);
      expect(plans[0].filename).toBe('plan1.json');
    });

    it('should sort plans by modified date (most recent first)', async () => {
      const plan1 = createNetworkPlan('Plan 1');
      const plan2 = createNetworkPlan('Plan 2');
      const plan3 = createNetworkPlan('Plan 3');

      await service.savePlan(plan1, 'plan1.json');
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      await service.savePlan(plan2, 'plan2.json');
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
      await service.savePlan(plan3, 'plan3.json');

      const plans = await service.listPlans();

      expect(plans[0].filename).toBe('plan3.json'); // Most recent
      expect(plans[1].filename).toBe('plan2.json');
      expect(plans[2].filename).toBe('plan1.json'); // Oldest
    });

    it('should include file path and modified date', async () => {
      await service.savePlan(createNetworkPlan('Test Plan'), 'test.json');

      const plans = await service.listPlans();

      expect(plans[0].path).toContain('test.json');
      expect(plans[0].modifiedAt).toBeTruthy();
      expect(typeof plans[0].modifiedAt.getTime).toBe('function'); // Check it has Date methods
    });
  });

  describe('deletePlan', () => {
    it('should throw error if filename is empty', async () => {
      await expect(service.deletePlan('')).rejects.toThrow('Filename cannot be empty');
      await expect(service.deletePlan('   ')).rejects.toThrow('Filename cannot be empty');
    });

    it('should throw error if file does not exist', async () => {
      await expect(service.deletePlan('nonexistent.json')).rejects.toThrow(FileOperationError);
      await expect(service.deletePlan('nonexistent.json')).rejects.toThrow('File not found');
    });

    it('should delete file successfully', async () => {
      await service.savePlan(createNetworkPlan('Test Plan'), 'test.json');

      const filepath = path.join(tempDir, 'test.json');
      expect(fs.existsSync(filepath)).toBe(true);

      await service.deletePlan('test.json');

      expect(fs.existsSync(filepath)).toBe(false);
    });

    it('should add .json extension if not present', async () => {
      await service.savePlan(createNetworkPlan('Test Plan'), 'myplan.json');

      await service.deletePlan('myplan');

      const filepath = path.join(tempDir, 'myplan.json');
      expect(fs.existsSync(filepath)).toBe(false);
    });

    it('should reject path traversal attempts', async () => {
      await expect(service.deletePlan('../outside.json')).rejects.toThrow();
      await expect(service.deletePlan('../../evil.json')).rejects.toThrow();
    });
  });
});
