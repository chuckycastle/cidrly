/**
 * Repository Pattern Tests
 * Tests for NetworkPlanRepository interface and FileSystemRepository implementation
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { NetworkPlan } from '../../src/core/models/network-plan.js';
import { createNetworkPlan, createSubnet } from '../../src/core/models/network-plan.js';
import { FileSystemRepository } from '../../src/repositories/file-system.repository.js';
import { FileService } from '../../src/services/file.service.js';
import { NetworkPlanService } from '../../src/services/network-plan.service.js';

describe('FileSystemRepository', () => {
  let tempDir: string;
  let repository: FileSystemRepository;
  let fileService: FileService;
  let testPlan: NetworkPlan;

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cidrly-repo-test-'));
    fileService = new FileService(tempDir);
    repository = new FileSystemRepository(fileService);

    // Create a test plan
    testPlan = createNetworkPlan('Test Plan', '10.0.0.0');
    const subnet1 = createSubnet('Management', 10, 50);
    const subnet2 = createSubnet('Users', 20, 100);

    const planService = new NetworkPlanService();
    testPlan = planService.addSubnet(testPlan, subnet1);
    testPlan = planService.addSubnet(testPlan, subnet2);
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('save', () => {
    it('should save a network plan and return filepath', async () => {
      const result = await repository.save(testPlan, 'test-plan.json');

      expect(result).toBeDefined();
      expect(result).toContain('test-plan.json');
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should save plan with auto-added .cidr extension', async () => {
      const result = await repository.save(testPlan, 'test-plan');

      expect(result).toContain('test-plan.cidr');
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should overwrite existing plan', async () => {
      // Save first version
      await repository.save(testPlan, 'test-plan.json');

      // Modify plan
      testPlan.baseIp = '192.168.0.0';

      // Save modified version
      await repository.save(testPlan, 'test-plan.json');

      // Load and verify
      const loaded = await repository.load('test-plan.json');
      expect(loaded.baseIp).toBe('192.168.0.0');
    });

    it('should throw error when plan is null', async () => {
      await expect(repository.save(null as unknown as NetworkPlan, 'test.json')).rejects.toThrow();
    });

    it('should throw error when filename is empty', async () => {
      await expect(repository.save(testPlan, '')).rejects.toThrow();
    });
  });

  describe('load', () => {
    it('should load a saved network plan', async () => {
      await repository.save(testPlan, 'test-plan.json');

      const loaded = await repository.load('test-plan.json');

      expect(loaded).toBeDefined();
      expect(loaded.name).toBe('Test Plan');
      expect(loaded.baseIp).toBe('10.0.0.0');
      expect(loaded.subnets).toHaveLength(2);
    });

    it('should load plan without .json extension', async () => {
      await repository.save(testPlan, 'test-plan.json');

      const loaded = await repository.load('test-plan');

      expect(loaded).toBeDefined();
      expect(loaded.name).toBe('Test Plan');
    });

    it('should throw error when file does not exist', async () => {
      await expect(repository.load('non-existent.json')).rejects.toThrow();
    });

    it('should throw error when filename is empty', async () => {
      await expect(repository.load('')).rejects.toThrow();
    });

    it('should validate loaded plan with Zod schema', async () => {
      // Write invalid JSON manually
      const invalidPath = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(
        invalidPath,
        JSON.stringify({
          name: 'Invalid',
          // Missing required fields
        }),
      );

      await expect(repository.load('invalid.json')).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no plans exist', async () => {
      const plans = await repository.findAll();

      expect(plans).toEqual([]);
    });

    it('should return all saved plans', async () => {
      await repository.save(testPlan, 'plan1.json');
      await repository.save(testPlan, 'plan2.json');
      await repository.save(testPlan, 'plan3.json');

      const plans = await repository.findAll();

      expect(plans).toHaveLength(3);
      expect(plans.map((p) => p.identifier)).toContain('plan1.json');
      expect(plans.map((p) => p.identifier)).toContain('plan2.json');
      expect(plans.map((p) => p.identifier)).toContain('plan3.json');
    });

    it('should return plans sorted by modification date (newest first)', async () => {
      // Save plans with delays to ensure different timestamps
      await repository.save(testPlan, 'plan1.json');
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.save(testPlan, 'plan2.json');
      await new Promise((resolve) => setTimeout(resolve, 10));

      await repository.save(testPlan, 'plan3.json');

      const plans = await repository.findAll();

      expect(plans).toHaveLength(3);
      // plan3 should be first (most recent)
      expect(plans[0].identifier).toBe('plan3.json');
    });

    it('should include plan metadata (name, path, modifiedAt, size)', async () => {
      await repository.save(testPlan, 'test-plan.json');

      const plans = await repository.findAll();

      expect(plans).toHaveLength(1);
      expect(plans[0]).toHaveProperty('identifier');
      expect(plans[0]).toHaveProperty('name');
      expect(plans[0]).toHaveProperty('path');
      expect(plans[0]).toHaveProperty('modifiedAt');
      expect(plans[0]).toHaveProperty('size');
      // Check if modifiedAt is a valid date
      expect(plans[0].modifiedAt).toBeTruthy();
      expect(typeof plans[0].modifiedAt.getTime).toBe('function');
      expect(typeof plans[0].size).toBe('number');
    });

    it('should only return .json files', async () => {
      // Save valid plan
      await repository.save(testPlan, 'plan.json');

      // Create non-JSON file
      fs.writeFileSync(path.join(tempDir, 'readme.txt'), 'Not a plan');

      const plans = await repository.findAll();

      expect(plans).toHaveLength(1);
      expect(plans[0].identifier).toBe('plan.json');
    });
  });

  describe('delete', () => {
    it('should delete an existing plan', async () => {
      await repository.save(testPlan, 'test-plan.json');
      expect(fs.existsSync(path.join(tempDir, 'test-plan.json'))).toBe(true);

      await repository.delete('test-plan.json');

      expect(fs.existsSync(path.join(tempDir, 'test-plan.json'))).toBe(false);
    });

    it('should delete plan without .json extension', async () => {
      await repository.save(testPlan, 'test-plan.json');

      await repository.delete('test-plan');

      expect(fs.existsSync(path.join(tempDir, 'test-plan.json'))).toBe(false);
    });

    it('should throw error when file does not exist', async () => {
      await expect(repository.delete('non-existent.json')).rejects.toThrow();
    });

    it('should throw error when filename is empty', async () => {
      await expect(repository.delete('')).rejects.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true when plan exists', async () => {
      await repository.save(testPlan, 'test-plan.json');

      const exists = await repository.exists('test-plan.json');

      expect(exists).toBe(true);
    });

    it('should return true when checking without .json extension', async () => {
      await repository.save(testPlan, 'test-plan.json');

      const exists = await repository.exists('test-plan');

      expect(exists).toBe(true);
    });

    it('should return false when plan does not exist', async () => {
      const exists = await repository.exists('non-existent.json');

      expect(exists).toBe(false);
    });

    it('should return false when filename is empty', async () => {
      const exists = await repository.exists('');

      expect(exists).toBe(false);
    });
  });

  describe('integration with FileService', () => {
    it('should work seamlessly with FileService security features', async () => {
      // Attempt path traversal
      await expect(repository.save(testPlan, '../outside.json')).rejects.toThrow();
    });

    it('should maintain data integrity through save/load cycle', async () => {
      // Save complex plan
      const planService = new NetworkPlanService();
      const subnet3 = createSubnet('Servers', 30, 200);
      const complexPlan = planService.addSubnet(testPlan, subnet3);

      await repository.save(complexPlan, 'complex-plan.json');

      // Load and verify
      const loaded = await repository.load('complex-plan.json');

      expect(loaded.subnets).toHaveLength(3);
      // After VLSM, subnets are reordered by size (largest first)
      // Servers (200 devices → 512 addresses) → Users (100 → 256) → Management (50 → 128)
      expect(loaded.subnets[0].name).toBe('Servers'); // Largest
      expect(loaded.subnets[0].vlanId).toBe(30);
      expect(loaded.supernet).toBeDefined();
    });
  });
});
