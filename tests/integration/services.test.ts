/**
 * Integration tests for Services
 * Tests NetworkPlanService and FileService working together
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { createNetworkPlan, createSubnet } from '../../src/core/models/network-plan.js';
import { FileService } from '../../src/services/file.service.js';
import { NetworkPlanService } from '../../src/services/network-plan.service.js';

describe('Services Integration', () => {
  let tempDir: string;
  let planService: NetworkPlanService;
  let fileService: FileService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cidrly-integration-'));
    planService = new NetworkPlanService();
    fileService = new FileService(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('End-to-End Workflow', () => {
    it('should complete full workflow: create → add subnets → calculate → save → load → verify', async () => {
      // 1. Create plan
      const plan = createNetworkPlan('Integration Test Plan', '10.0.0.0');

      // 2. Add subnets
      const subnet1 = createSubnet('Engineering', 10, 50);
      const subnet2 = createSubnet('Marketing', 20, 25);
      const subnet3 = createSubnet('Sales', 30, 100);

      planService.addSubnet(plan, subnet1);
      planService.addSubnet(plan, subnet2);
      planService.addSubnet(plan, subnet3);

      // Verify subnets were added and calculated
      expect(plan.subnets).toHaveLength(3);
      expect(plan.supernet).toBeDefined();
      expect(plan.subnets[0].subnetInfo).toBeDefined();

      // 3. Save plan
      const savedPath = await fileService.savePlan(plan, 'integration-test.json');
      expect(fs.existsSync(savedPath)).toBe(true);

      // 4. Load plan
      const loadedPlan = await fileService.loadPlan('integration-test.json');

      // 5. Verify integrity
      expect(loadedPlan.name).toBe('Integration Test Plan');
      expect(loadedPlan.baseIp).toBe('10.0.0.0');
      expect(loadedPlan.subnets).toHaveLength(3);
      // After VLSM optimization, subnets are sorted by size (largest first)
      // Sales (100 devices → 256 addresses) → Engineering (50 → 128) → Marketing (25 → 64)
      expect(loadedPlan.subnets[0].name).toBe('Sales'); // Largest
      expect(loadedPlan.subnets[1].name).toBe('Engineering'); // Medium
      expect(loadedPlan.subnets[2].name).toBe('Marketing'); // Smallest
      expect(loadedPlan.supernet).toBeDefined();
      expect(loadedPlan.supernet?.networkAddress).toBeDefined();

      // Verify calculation results persisted
      expect(loadedPlan.subnets[0].subnetInfo?.networkAddress).toBeDefined();
      expect(loadedPlan.subnets[0].subnetInfo?.cidrPrefix).toBeDefined();
    });

    it('should handle plan modifications and re-save', async () => {
      // Create and save initial plan
      const plan = createNetworkPlan('Modifiable Plan', '192.168.0.0');
      const subnet1 = createSubnet('Initial Subnet', 10, 50);
      planService.addSubnet(plan, subnet1);

      await fileService.savePlan(plan, 'modifiable.json');

      // Load the plan
      const loadedPlan = await fileService.loadPlan('modifiable.json');

      // Modify the plan
      const subnet2 = createSubnet('New Subnet', 20, 75);
      planService.addSubnet(loadedPlan, subnet2);
      planService.updateBaseIp(loadedPlan, '172.16.0.0');

      // Save modified plan
      await fileService.savePlan(loadedPlan, 'modifiable.json');

      // Load again and verify modifications
      const reloadedPlan = await fileService.loadPlan('modifiable.json');

      expect(reloadedPlan.subnets).toHaveLength(2);
      expect(reloadedPlan.baseIp).toBe('172.16.0.0');
      // After VLSM, subnets are reordered by size
      // New Subnet (75 devices → 256 addresses) is larger than Initial Subnet (50 → 128)
      expect(reloadedPlan.subnets[0].name).toBe('New Subnet'); // Largest
      expect(reloadedPlan.subnets[1].name).toBe('Initial Subnet'); // Smallest
    });

    it('should handle subnet removal and recalculation', async () => {
      const plan = createNetworkPlan('Removal Test', '10.0.0.0');

      planService.addSubnet(plan, createSubnet('Subnet A', 10, 50));
      planService.addSubnet(plan, createSubnet('Subnet B', 20, 25));
      planService.addSubnet(plan, createSubnet('Subnet C', 30, 100));

      expect(plan.subnets).toHaveLength(3);

      // Save with 3 subnets
      await fileService.savePlan(plan, 'removal-test.json');

      // After VLSM, subnets are reordered:
      // Index 0: Subnet C (largest - 256 addresses)
      // Index 1: Subnet A (medium - 128 addresses)
      // Index 2: Subnet B (smallest - 64 addresses)

      // Remove middle subnet (Subnet A)
      const removed = planService.removeSubnet(plan, 1);
      expect(removed.name).toBe('Subnet A'); // Subnet A is at index 1
      expect(plan.subnets).toHaveLength(2);

      // Save with 2 subnets
      await fileService.savePlan(plan, 'removal-test.json');

      // Reload and verify - remaining subnets are Subnet C (largest) and Subnet B (smallest)
      const loadedPlan = await fileService.loadPlan('removal-test.json');
      expect(loadedPlan.subnets).toHaveLength(2);
      expect(loadedPlan.subnets[0].name).toBe('Subnet C'); // Largest
      expect(loadedPlan.subnets[1].name).toBe('Subnet B'); // Smallest
    });

    it('should handle subnet updates correctly', async () => {
      const plan = createNetworkPlan('Update Test', '10.0.0.0');
      planService.addSubnet(plan, createSubnet('Original Name', 10, 50));

      await fileService.savePlan(plan, 'update-test.json');

      // Update the subnet
      planService.updateSubnet(plan, 0, 'Updated Name', 99, 200);

      await fileService.savePlan(plan, 'update-test.json');

      // Reload and verify
      const loadedPlan = await fileService.loadPlan('update-test.json');
      expect(loadedPlan.subnets[0].name).toBe('Updated Name');
      expect(loadedPlan.subnets[0].vlanId).toBe(99);
      expect(loadedPlan.subnets[0].expectedDevices).toBe(200);
    });
  });

  describe('Multiple Plans Management', () => {
    it('should handle saving and loading multiple plans', async () => {
      const plan1 = createNetworkPlan('Plan 1', '10.0.0.0');
      const plan2 = createNetworkPlan('Plan 2', '192.168.0.0');
      const plan3 = createNetworkPlan('Plan 3', '172.16.0.0');

      planService.addSubnet(plan1, createSubnet('P1 Subnet', 10, 50));
      planService.addSubnet(plan2, createSubnet('P2 Subnet', 20, 25));
      planService.addSubnet(plan3, createSubnet('P3 Subnet', 30, 100));

      await fileService.savePlan(plan1, 'plan1.json');
      await fileService.savePlan(plan2, 'plan2.json');
      await fileService.savePlan(plan3, 'plan3.json');

      // List all plans
      const savedPlans = await fileService.listPlans();
      expect(savedPlans).toHaveLength(3);

      // Load each plan and verify
      const loaded1 = await fileService.loadPlan('plan1.json');
      const loaded2 = await fileService.loadPlan('plan2.json');
      const loaded3 = await fileService.loadPlan('plan3.json');

      expect(loaded1.name).toBe('Plan 1');
      expect(loaded2.name).toBe('Plan 2');
      expect(loaded3.name).toBe('Plan 3');

      expect(loaded1.baseIp).toBe('10.0.0.0');
      expect(loaded2.baseIp).toBe('192.168.0.0');
      expect(loaded3.baseIp).toBe('172.16.0.0');
    });

    it('should handle plan deletion', async () => {
      const plan1 = createNetworkPlan('Plan 1');
      const plan2 = createNetworkPlan('Plan 2');

      await fileService.savePlan(plan1, 'plan1.json');
      await fileService.savePlan(plan2, 'plan2.json');

      let plans = await fileService.listPlans();
      expect(plans).toHaveLength(2);

      // Delete one plan
      await fileService.deletePlan('plan1.json');

      plans = await fileService.listPlans();
      expect(plans).toHaveLength(1);
      expect(plans[0].filename).toBe('plan2.json');

      // Verify deleted plan cannot be loaded
      await expect(fileService.loadPlan('plan1.json')).rejects.toThrow();
    });
  });

  describe('Data Integrity', () => {
    it('should preserve subnet calculation results through save/load', async () => {
      const plan = createNetworkPlan('Calculation Test', '10.0.0.0');
      planService.addSubnet(plan, createSubnet('Engineering', 10, 50));

      const originalSubnetInfo = plan.subnets[0].subnetInfo;
      const originalSupernet = plan.supernet;

      await fileService.savePlan(plan, 'calc-test.json');
      const loadedPlan = await fileService.loadPlan('calc-test.json');

      // Verify all calculation details are preserved
      expect(loadedPlan.subnets[0].subnetInfo?.plannedDevices).toBe(
        originalSubnetInfo?.plannedDevices,
      );
      expect(loadedPlan.subnets[0].subnetInfo?.cidrPrefix).toBe(originalSubnetInfo?.cidrPrefix);
      expect(loadedPlan.subnets[0].subnetInfo?.networkAddress).toBe(
        originalSubnetInfo?.networkAddress,
      );
      expect(loadedPlan.supernet?.cidrPrefix).toBe(originalSupernet?.cidrPrefix);
      expect(loadedPlan.supernet?.utilization).toBe(originalSupernet?.utilization);
    });

    it('should preserve timestamps through save/load', async () => {
      const plan = createNetworkPlan('Timestamp Test');
      const originalCreatedAt = plan.createdAt.getTime();
      const originalUpdatedAt = plan.updatedAt.getTime();

      await fileService.savePlan(plan, 'timestamp-test.json');
      const loadedPlan = await fileService.loadPlan('timestamp-test.json');

      // Timestamps should be preserved (within small margin for serialization)
      expect(Math.abs(loadedPlan.createdAt.getTime() - originalCreatedAt)).toBeLessThan(1000);
      expect(Math.abs(loadedPlan.updatedAt.getTime() - originalUpdatedAt)).toBeLessThan(1000);
    });

    it('should handle base IP changes correctly', async () => {
      const plan = createNetworkPlan('IP Change Test', '10.0.0.0');
      planService.addSubnet(plan, createSubnet('Subnet', 10, 50));

      const originalNetworkAddress = plan.subnets[0].subnetInfo?.networkAddress;
      expect(originalNetworkAddress).toMatch(/^10\.0\./);

      // Change base IP
      planService.updateBaseIp(plan, '192.168.0.0');

      const newNetworkAddress = plan.subnets[0].subnetInfo?.networkAddress;
      expect(newNetworkAddress).toMatch(/^192\.168\./);
      expect(newNetworkAddress).not.toBe(originalNetworkAddress);

      // Save and reload
      await fileService.savePlan(plan, 'ip-change.json');
      const loadedPlan = await fileService.loadPlan('ip-change.json');

      expect(loadedPlan.baseIp).toBe('192.168.0.0');
      expect(loadedPlan.subnets[0].subnetInfo?.networkAddress).toMatch(/^192\.168\./);
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors without corrupting service state', async () => {
      const plan = createNetworkPlan('Error Test');
      planService.addSubnet(plan, createSubnet('Subnet', 10, 50));

      // Try to save with invalid filename
      await expect(fileService.savePlan(plan, '../invalid.json')).rejects.toThrow();

      // Service should still be functional
      await expect(fileService.savePlan(plan, 'valid.json')).resolves.toBeTruthy();
    });

    it('should handle load errors gracefully', async () => {
      // Try to load non-existent file
      await expect(fileService.loadPlan('nonexistent.json')).rejects.toThrow();

      // FileService should still be functional
      const plan = createNetworkPlan('Test');
      await expect(fileService.savePlan(plan, 'test.json')).resolves.toBeTruthy();
    });

    it('should handle calculation errors without breaking plan', async () => {
      const plan = createNetworkPlan('Empty Plan');

      // Try to calculate empty plan
      expect(() => planService.calculatePlan(plan)).toThrow();

      // Plan should still be valid and we can add subnets
      planService.addSubnet(plan, createSubnet('Subnet', 10, 50));
      expect(plan.subnets).toHaveLength(1);
      expect(plan.supernet).toBeDefined();
    });

    it('should handle growth percentage changes and recalculation', async () => {
      // Create plan with default growth (100%)
      const plan = createNetworkPlan('Growth Test', '10.0.0.0');
      planService.addSubnet(plan, createSubnet('Engineering', 10, 50));

      // With 100% growth, 50 devices → 100 planned → /25 subnet (126 usable)
      expect(plan.subnets[0].subnetInfo?.cidrPrefix).toBe(25);
      expect(plan.subnets[0].subnetInfo?.usableHosts).toBe(126);

      // Save plan
      await fileService.savePlan(plan, 'growth-test.json');

      // Change growth to 0% (exact capacity)
      planService.setGrowthPercentage(plan, 0);

      // With 0% growth, 50 devices → 50 planned → /26 subnet (62 usable)
      expect(plan.subnets[0].subnetInfo?.cidrPrefix).toBe(26);
      expect(plan.subnets[0].subnetInfo?.usableHosts).toBe(62);
      expect(plan.growthPercentage).toBe(0);

      // Save and reload
      await fileService.savePlan(plan, 'growth-test.json');
      const loadedPlan = await fileService.loadPlan('growth-test.json');

      // Verify growth percentage persisted
      expect(loadedPlan.growthPercentage).toBe(0);
      expect(loadedPlan.subnets[0].subnetInfo?.cidrPrefix).toBe(26);

      // Change growth to 200% (triple capacity)
      planService.setGrowthPercentage(loadedPlan, 200);

      // With 200% growth, 50 devices → 150 planned → /24 subnet (254 usable)
      expect(loadedPlan.subnets[0].subnetInfo?.cidrPrefix).toBe(24);
      expect(loadedPlan.subnets[0].subnetInfo?.usableHosts).toBe(254);
    });

    it('should detect subnet overlaps after recalculation', async () => {
      const plan = createNetworkPlan('Overlap Test', '10.0.0.0');

      // Add subnets - VLSM should prevent overlaps
      planService.addSubnet(plan, createSubnet('Subnet A', 10, 50));
      planService.addSubnet(plan, createSubnet('Subnet B', 20, 25));

      // Check for overlaps (should be none with proper VLSM)
      const overlapResult = planService.checkOverlaps(plan);
      expect(overlapResult.hasOverlap).toBe(false);
      expect(overlapResult.conflicts).toHaveLength(0);

      // Verify subnet addresses are allocated without overlap
      expect(plan.subnets[0].subnetInfo?.networkAddress).toBeDefined();
      expect(plan.subnets[1].subnetInfo?.networkAddress).toBeDefined();

      // Save and reload
      await fileService.savePlan(plan, 'overlap-test.json');
      const loadedPlan = await fileService.loadPlan('overlap-test.json');

      // Verify no overlaps after reload
      const reloadOverlapResult = planService.checkOverlaps(loadedPlan);
      expect(reloadOverlapResult.hasOverlap).toBe(false);
    });

    it('should preserve subnet descriptions through full workflow', async () => {
      const plan = createNetworkPlan('Description Test', '192.168.0.0');

      // Add subnets with descriptions
      const subnet1 = createSubnet('Engineering', 10, 50);
      subnet1.description = 'Primary engineering team network';
      const subnet2 = createSubnet('Guest WiFi', 20, 25);
      subnet2.description = 'Guest wireless access network';

      planService.addSubnet(plan, subnet1);
      planService.addSubnet(plan, subnet2);

      // Verify descriptions are set
      expect(plan.subnets[0].description).toBe('Primary engineering team network');
      expect(plan.subnets[1].description).toBe('Guest wireless access network');

      // Save plan
      await fileService.savePlan(plan, 'description-test.json');

      // Load plan
      const loadedPlan = await fileService.loadPlan('description-test.json');

      // Verify descriptions persisted (note: subnets are reordered by size after VLSM)
      const loadedEngineering = loadedPlan.subnets.find((s) => s.name === 'Engineering');
      const loadedGuest = loadedPlan.subnets.find((s) => s.name === 'Guest WiFi');

      expect(loadedEngineering?.description).toBe('Primary engineering team network');
      expect(loadedGuest?.description).toBe('Guest wireless access network');

      // Update description
      const engineeringIndex = loadedPlan.subnets.findIndex((s) => s.name === 'Engineering');
      planService.updateSubnet(
        loadedPlan,
        engineeringIndex,
        'Engineering',
        10,
        50,
        'Updated engineering description',
      );

      // Save and reload
      await fileService.savePlan(loadedPlan, 'description-test.json');
      const reloadedPlan = await fileService.loadPlan('description-test.json');

      const reloadedEngineering = reloadedPlan.subnets.find((s) => s.name === 'Engineering');
      expect(reloadedEngineering?.description).toBe('Updated engineering description');
    });

    it('should handle complex workflow: create → add → edit → change base IP → adjust growth → save → load', async () => {
      // 1. Create plan with custom growth
      const plan = createNetworkPlan('Complex Workflow', '10.0.0.0');
      plan.growthPercentage = 50; // 50% growth

      // 2. Add multiple subnets with descriptions
      const engineering = createSubnet('Engineering', 10, 100);
      engineering.description = 'Engineering department';
      const sales = createSubnet('Sales', 20, 50);
      sales.description = 'Sales team';
      const guest = createSubnet('Guest WiFi', 30, 20);

      planService.addSubnet(plan, engineering);
      planService.addSubnet(plan, sales);
      planService.addSubnet(plan, guest);

      expect(plan.subnets).toHaveLength(3);
      expect(plan.baseIp).toBe('10.0.0.0');

      // 3. Edit a subnet
      const salesIndex = plan.subnets.findIndex((s) => s.name === 'Sales');
      planService.updateSubnet(plan, salesIndex, 'Sales & Marketing', 20, 75, 'Combined team');

      expect(plan.subnets[salesIndex].name).toBe('Sales & Marketing');
      expect(plan.subnets[salesIndex].expectedDevices).toBe(75);

      // 4. Change base IP
      planService.updateBaseIp(plan, '172.16.0.0');
      expect(plan.baseIp).toBe('172.16.0.0');

      // Verify addresses updated
      expect(plan.subnets[0].subnetInfo?.networkAddress).toContain('172.16.');

      // 5. Adjust growth percentage
      planService.setGrowthPercentage(plan, 100); // Back to default
      expect(plan.growthPercentage).toBe(100);

      // 6. Check for overlaps
      const overlapResult = planService.checkOverlaps(plan);
      expect(overlapResult.hasOverlap).toBe(false);

      // 7. Save plan
      await fileService.savePlan(plan, 'complex-workflow.json');

      // 8. Load and verify everything
      const loadedPlan = await fileService.loadPlan('complex-workflow.json');

      expect(loadedPlan.name).toBe('Complex Workflow');
      expect(loadedPlan.baseIp).toBe('172.16.0.0');
      expect(loadedPlan.growthPercentage).toBe(100);
      expect(loadedPlan.subnets).toHaveLength(3);

      const loadedSales = loadedPlan.subnets.find((s) => s.name === 'Sales & Marketing');
      expect(loadedSales?.expectedDevices).toBe(75);
      expect(loadedSales?.description).toBe('Combined team');

      const loadedEngineering = loadedPlan.subnets.find((s) => s.name === 'Engineering');
      expect(loadedEngineering?.description).toBe('Engineering department');

      // Verify all subnets have network addresses
      loadedPlan.subnets.forEach((subnet) => {
        expect(subnet.subnetInfo?.networkAddress).toBeDefined();
        expect(subnet.subnetInfo?.networkAddress).toContain('172.16.');
      });
    });
  });
});
