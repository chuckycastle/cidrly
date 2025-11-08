/**
 * CSV Formatter Tests
 * Tests for CSV export functionality with metadata headers
 */

import { createNetworkPlan, createSubnet } from '../../src/core/models/network-plan.js';
import {
  exportToCsv,
  formatPlanToCsv,
  formatSubnetsToCsv,
} from '../../src/formatters/csv-formatter.js';
import { NetworkPlanService } from '../../src/services/network-plan.service.js';

describe('CSV Formatter', () => {
  describe('formatPlanToCsv', () => {
    it('should format a basic plan with metadata headers', () => {
      const plan = createNetworkPlan('Test Plan', '10.0.0.0');
      plan.growthPercentage = 20;
      plan.subnets.push(createSubnet('Engineering', 10, 50));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = formatPlanToCsv(plan);

      // Check metadata section
      expect(csv).toContain('# Plan Metadata');
      expect(csv).toContain('# name: Test Plan');
      expect(csv).toContain('# baseIp: 10.0.0.0');
      expect(csv).toContain('# growthPercentage: 20');
      expect(csv).toContain('# createdAt:');
      expect(csv).toContain('# updatedAt:');

      // Check subnet allocation section
      expect(csv).toContain('# Subnet Allocation');
      expect(csv).toContain('name,vlan,devices');
      expect(csv).toContain('Engineering,10,50');
    });

    it('should include all SubnetInfo fields', () => {
      const plan = createNetworkPlan('Full Plan', '192.168.1.0');
      plan.subnets.push(createSubnet('Sales', 20, 25));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = formatPlanToCsv(plan);

      // Check all subnet fields are present
      expect(csv).toContain('network_address');
      expect(csv).toContain('cidr_prefix');
      expect(csv).toContain('max_hosts');
      expect(csv).toContain('subnet_size');
      expect(csv).toContain('required_hosts');
      expect(csv).toContain('planned');

      // Check data row has values (description is optional, can be empty)
      const lines = csv.split('\n');
      const dataLine = lines.find((line) => line.startsWith('Sales,'));
      expect(dataLine).toBeDefined();
      expect(dataLine).toMatch(/Sales,20,25,.*,\d+\.\d+\.\d+\.\d+,\d+,\d+,\d+,\d+,\d+/);
    });

    it('should include supernet summary when present', () => {
      const plan = createNetworkPlan('Supernet Plan', '10.0.0.0');
      plan.subnets.push(createSubnet('Dev', 10, 100));
      plan.subnets.push(createSubnet('Prod', 20, 200));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = formatPlanToCsv(plan);

      // Check supernet section
      expect(csv).toContain('# Supernet Summary');
      expect(csv).toContain('# supernet.networkAddress:');
      expect(csv).toContain('# supernet.cidrPrefix:');
      expect(csv).toContain('# supernet.totalSize:');
      expect(csv).toContain('# supernet.usedSize:');
      expect(csv).toContain('# supernet.utilization:');
      expect(csv).toContain('# supernet.rangeEfficiency:');
    });

    it('should escape subnet names containing commas', () => {
      const plan = createNetworkPlan('Escape Test', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering, Dev', 10, 50));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = formatPlanToCsv(plan);

      // Name with comma should be quoted
      expect(csv).toContain('"Engineering, Dev"');
    });

    it('should escape subnet names containing quotes', () => {
      const plan = createNetworkPlan('Quote Test', '10.0.0.0');
      plan.subnets.push(createSubnet('Dev "Primary"', 10, 30));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = formatPlanToCsv(plan);

      // Quotes should be escaped and value should be quoted
      expect(csv).toContain('"Dev ""Primary"""');
    });

    it('should escape plan names containing commas', () => {
      const plan = createNetworkPlan('Corporate, Main Office', '10.0.0.0');
      plan.subnets.push(createSubnet('IT', 10, 25));

      const csv = formatPlanToCsv(plan);

      expect(csv).toContain('# name: "Corporate, Main Office"');
    });

    it('should handle multiple subnets correctly', () => {
      const plan = createNetworkPlan('Multi-Subnet', '172.16.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 100));
      plan.subnets.push(createSubnet('Sales', 20, 50));
      plan.subnets.push(createSubnet('Management', 30, 25));
      plan.subnets.push(createSubnet('Guest', 40, 10));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = formatPlanToCsv(plan);

      // Check all subnets are present
      expect(csv).toContain('Engineering,10,100');
      expect(csv).toContain('Sales,20,50');
      expect(csv).toContain('Management,30,25');
      expect(csv).toContain('Guest,40,10');

      // Count data rows (should be 4 subnets + 1 header)
      const lines = csv.split('\n');
      const dataLines = lines.filter(
        (line) => !line.startsWith('#') && line.includes(',') && !line.includes('name,'),
      );
      expect(dataLines.length).toBe(4);
    });

    it('should preserve timestamp formats', () => {
      const plan = createNetworkPlan('Timestamp Test', '10.0.0.0');
      const testDate = new Date('2025-11-01T12:00:00.000Z');
      plan.createdAt = testDate;
      plan.updatedAt = testDate;

      const csv = formatPlanToCsv(plan);

      expect(csv).toContain('# createdAt: 2025-11-01T12:00:00.000Z');
      expect(csv).toContain('# updatedAt: 2025-11-01T12:00:00.000Z');
    });

    it('should not include supernet section if no supernet', () => {
      const plan = createNetworkPlan('No Supernet', '10.0.0.0');
      plan.subnets.push(createSubnet('Dev', 10, 50));
      // Don't calculate plan, so no supernet is created

      const csv = formatPlanToCsv(plan);

      expect(csv).not.toContain('# Supernet Summary');
      expect(csv).not.toContain('supernet.networkAddress');
    });
  });

  describe('formatSubnetsToCsv', () => {
    it('should format subnets without metadata (legacy format)', () => {
      const plan = createNetworkPlan('Legacy Test', '10.0.0.0');
      plan.subnets.push(createSubnet('Engineering', 10, 50));
      plan.subnets.push(createSubnet('Sales', 20, 30));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = formatSubnetsToCsv(plan.subnets);

      // Should NOT contain metadata headers
      expect(csv).not.toContain('# Plan Metadata');
      expect(csv).not.toContain('# baseIp:');

      // Should contain header and data
      expect(csv).toContain('name,vlan,devices');
      expect(csv).toContain('Engineering,10,50');
      expect(csv).toContain('Sales,20,30');
    });

    it('should include all subnet fields in header', () => {
      const plan = createNetworkPlan('Fields Test', '10.0.0.0');
      plan.subnets.push(createSubnet('IT', 10, 25));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = formatSubnetsToCsv(plan.subnets);

      // Check that all expected fields are present (order: configurable columns + extra fields)
      expect(csv).toContain('name,vlan,devices,description,network_address,cidr_prefix');
      expect(csv).toContain('max_hosts,planned,subnet_size,required_hosts');
    });
  });

  describe('exportToCsv', () => {
    it('should export using full format with metadata', () => {
      const plan = createNetworkPlan('Export Test', '192.168.0.0');
      plan.growthPercentage = 15;
      plan.subnets.push(createSubnet('Development', 100, 75));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = exportToCsv(plan);

      // Should use full format (same as formatPlanToCsv)
      expect(csv).toContain('# Plan Metadata');
      expect(csv).toContain('# name: Export Test');
      expect(csv).toContain('# baseIp: 192.168.0.0');
      expect(csv).toContain('# growthPercentage: 15');
      expect(csv).toContain('Development,100,75');
    });

    it('should produce valid CSV format', () => {
      const plan = createNetworkPlan('Valid CSV', '10.0.0.0');
      plan.subnets.push(createSubnet('Subnet A', 10, 20));
      plan.subnets.push(createSubnet('Subnet B', 20, 30));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = exportToCsv(plan);

      // Validate CSV structure
      const lines = csv.split('\n');

      // Should have metadata lines, header, and data rows
      const metadataLines = lines.filter((line) => line.startsWith('#'));
      const headerLine = lines.find((line) => line.startsWith('name,'));
      const dataLines = lines.filter(
        (line) => !line.startsWith('#') && line.includes(',') && !line.startsWith('name,'),
      );

      expect(metadataLines.length).toBeGreaterThan(0);
      expect(headerLine).toBeDefined();
      expect(dataLines.length).toBe(2); // Two subnets
    });
  });

  describe('Edge Cases', () => {
    it('should handle plan with no subnets', () => {
      const plan = createNetworkPlan('Empty Plan', '10.0.0.0');

      const csv = formatPlanToCsv(plan);

      // Should still have metadata
      expect(csv).toContain('# Plan Metadata');
      expect(csv).toContain('# name: Empty Plan');

      // Should have header but no data rows
      expect(csv).toContain('name,vlan,devices');

      const lines = csv.split('\n');
      const dataLines = lines.filter(
        (line) => !line.startsWith('#') && line.includes(',') && !line.startsWith('name,'),
      );
      expect(dataLines.length).toBe(0);
    });

    it('should handle special characters in subnet names', () => {
      const plan = createNetworkPlan('Special Chars', '10.0.0.0');
      plan.subnets.push(createSubnet('Subnet-1_test', 10, 20));
      plan.subnets.push(createSubnet('Subnet@#$%', 20, 30));

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = formatPlanToCsv(plan);

      expect(csv).toContain('Subnet-1_test');
      expect(csv).toContain('Subnet@#$%');
    });

    it('should handle very large subnet counts', () => {
      const plan = createNetworkPlan('Large Plan', '10.0.0.0');

      // Add 100 subnets
      for (let i = 0; i < 100; i++) {
        plan.subnets.push(createSubnet(`Subnet-${i}`, 10 + i, 10 + i));
      }

      const networkService = new NetworkPlanService();
      networkService.calculatePlan(plan);

      const csv = formatPlanToCsv(plan);

      const lines = csv.split('\n');
      const dataLines = lines.filter(
        (line) => !line.startsWith('#') && line.includes(',') && !line.startsWith('name,'),
      );

      expect(dataLines.length).toBe(100);
    });

    it('should handle subnets without subnetInfo gracefully', () => {
      const plan = createNetworkPlan('Uncalculated', '10.0.0.0');
      plan.subnets.push(createSubnet('Dev', 10, 50));
      // Don't calculate - subnetInfo will be undefined

      const csv = formatPlanToCsv(plan);

      // Should export with empty values for calculated fields
      expect(csv).toContain('Dev,10,50,,,,,,');
    });
  });
});
