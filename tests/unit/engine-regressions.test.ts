/**
 * Engine regression tests
 * Each block reproduces a defect found in the v0.5.1 review (docs/ios/01-codebase-review.md)
 * and pins the corrected behavior. These cases are mirrored in the cidrly-spec fixtures.
 */

import { describe, expect, it } from '@jest/globals';
import { convertToAssignedBlocks } from '../../src/core/calculators/auto-fit.js';
import { calculateAvailableSpace } from '../../src/core/calculators/availability-calculator.js';
import {
  calculateContainingBlock,
  calculateNetmask,
  calculateWildcard,
  generateNetworkAddress,
} from '../../src/core/calculators/subnet-calculator.js';
import {
  addSubnet,
  calculateSubnetRanges,
  createNetworkPlan,
} from '../../src/core/models/network-plan.js';
import { calculateGatewayIp } from '../../src/formatters/vendors/utils.js';
import { parseNetworkPlan } from '../../src/schemas/network-plan.schema.js';
import { parseAvailableBlocks } from '../../src/utils/block-parser.js';

describe('D1: vendor gateway is network address + 1', () => {
  it('uses the subnet network address, not .1 of the enclosing /24', () => {
    expect(calculateGatewayIp('10.0.0.128/25')).toBe('10.0.0.129');
    expect(calculateGatewayIp('10.0.0.4/30')).toBe('10.0.0.5');
    expect(calculateGatewayIp('10.0.0.64/26')).toBe('10.0.0.65');
    expect(calculateGatewayIp('192.168.10.192/27')).toBe('192.168.10.193');
  });

  it('keeps existing behavior for /24 and larger, /31 and /32', () => {
    expect(calculateGatewayIp('10.0.0.0/24')).toBe('10.0.0.1');
    expect(calculateGatewayIp('10.0.2.0/23')).toBe('10.0.2.1');
    expect(calculateGatewayIp('10.0.0.0/31')).toBe('10.0.0.0');
    expect(calculateGatewayIp('10.0.0.5/32')).toBe('10.0.0.5');
  });
});

describe('D2: supernet contains every allocated subnet', () => {
  it('grows the supernet when the base IP is not aligned to the sum of sizes', () => {
    let plan = createNetworkPlan('t', '10.0.1.0');
    plan = addSubnet(plan, { name: 'a', vlan: 10, expectedDevices: 100 });
    plan = addSubnet(plan, { name: 'b', vlan: 20, expectedDevices: 100 });
    plan = calculateSubnetRanges(plan);

    const addresses = plan.subnets.map((s) => s.subnetInfo?.networkAddress);
    expect(addresses).toEqual(['10.0.1.0/24', '10.0.2.0/24']);
    expect(plan.supernet?.networkAddress).toBe('10.0.0.0/22');
    expect(plan.supernet?.cidrPrefix).toBe(22);
    expect(plan.supernet?.totalSize).toBe(1024);
    expect(plan.supernet?.usedSize).toBe(512);
    expect(plan.supernet?.utilization).toBe(50);
  });

  it('is unchanged for an aligned base IP', () => {
    let plan = createNetworkPlan('t', '10.0.0.0');
    plan = addSubnet(plan, { name: 'a', vlan: 10, expectedDevices: 100 });
    plan = addSubnet(plan, { name: 'b', vlan: 20, expectedDevices: 100 });
    plan = calculateSubnetRanges(plan);
    expect(plan.supernet?.networkAddress).toBe('10.0.0.0/23');
  });

  it('computes the containing block for arbitrary ranges', () => {
    expect(calculateContainingBlock([{ start: 0, end: 255 }])).toEqual({
      networkAddress: '0.0.0.0/24',
      cidrPrefix: 24,
      size: 256,
    });
    // 10.0.1.0/24 .. 10.0.2.0/24 -> 10.0.0.0/22
    const s1 = ((10 << 24) | (0 << 16) | (1 << 8)) >>> 0;
    const s2 = ((10 << 24) | (0 << 16) | (2 << 8)) >>> 0;
    expect(
      calculateContainingBlock([
        { start: s1, end: s1 + 255 },
        { start: s2, end: s2 + 255 },
      ]),
    ).toEqual({ networkAddress: '10.0.0.0/22', cidrPrefix: 22, size: 1024 });
    expect(calculateContainingBlock([])).toBeUndefined();
  });
});

describe('D3: blocks at or above 128.0.0.0 use unsigned arithmetic', () => {
  it('parses 172.16/12 and 192.168/16 with positive integer bounds', () => {
    const result = parseAvailableBlocks('192.168.0.0/16\n172.16.0.0/12');
    expect(result.valid).toBe(true);
    for (const block of result.blocks) {
      expect(block.startInt).toBeGreaterThan(0);
      expect(block.endInt).toBeGreaterThan(block.startInt);
    }
    const b192 = result.blocks.find((b) => b.networkAddress === '192.168.0.0/16');
    expect(b192?.startInt).toBe(3232235520);
    expect(b192?.endInt).toBe(3232301055);
  });

  it('attributes allocations to their block in the space report', () => {
    const parsed = parseAvailableBlocks('192.168.0.0/16');
    const assigned = convertToAssignedBlocks(parsed.blocks);
    let plan = { ...createNetworkPlan('ipam', '192.168.0.0'), assignedBlocks: assigned };
    plan = addSubnet(plan, { name: 'x', vlan: 10, expectedDevices: 50 });
    plan = addSubnet(plan, { name: 'y', vlan: 20, expectedDevices: 50 });
    plan = calculateSubnetRanges(plan);

    const addresses = plan.subnets.map((s) => s.subnetInfo?.networkAddress).sort();
    expect(addresses).toEqual(['192.168.0.0/25', '192.168.0.128/25']);

    const report = calculateAvailableSpace(assigned, plan.subnets);
    expect(report.totalUsedCapacity).toBe(256);
    expect(report.blockSummaries[0]?.allocatedSubnetIds).toHaveLength(2);
    expect(report.blockSummaries[0]?.utilizationPercent).toBeCloseTo((256 / 65536) * 100);
  });
});

describe('D4: /0 masks', () => {
  it('returns the correct netmask, wildcard, and network for /0', () => {
    expect(calculateNetmask(0)).toBe('0.0.0.0');
    expect(calculateWildcard(0)).toBe('255.255.255.255');
    expect(generateNetworkAddress('10.1.2.3', 0)).toBe('0.0.0.0/0');
    expect(calculateNetmask(32)).toBe('255.255.255.255');
    expect(calculateWildcard(32)).toBe('0.0.0.0');
  });
});

describe('Plan file forward compatibility', () => {
  it('preserves unknown top-level fields written by newer clients', () => {
    const file = {
      schemaVersion: 2,
      name: 'App plan',
      baseIp: '10.0.0.0',
      subnets: [],
      growthPercentage: 100,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      tags: ['campus', 'draft'],
      reservations: [{ address: '10.0.0.1', purpose: 'gateway' }],
    };
    const plan = parseNetworkPlan(file) as unknown as Record<string, unknown>;
    expect(plan['schemaVersion']).toBe(2);
    expect(plan['tags']).toEqual(['campus', 'draft']);
    expect(plan['reservations']).toEqual([{ address: '10.0.0.1', purpose: 'gateway' }]);
    // Round trip through JSON keeps them too
    const roundTrip = JSON.parse(JSON.stringify(plan)) as Record<string, unknown>;
    expect(roundTrip['tags']).toEqual(['campus', 'draft']);
  });

  it('still reads v1 files with no schemaVersion', () => {
    const plan = parseNetworkPlan({
      name: 'Old',
      baseIp: '10.0.0.0',
      subnets: [],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    expect(plan.growthPercentage).toBe(100);
    expect((plan as unknown as Record<string, unknown>)['schemaVersion']).toBeUndefined();
  });
});

describe('CSV export can be imported by the CSV parser', () => {
  it('skips the metadata comment block before the header row', async () => {
    const { exportToCsv } = await import('../../src/formatters/csv-formatter.js');
    const { CsvParser } = await import('../../src/services/import/parsers/csv.parser.js');
    let plan = createNetworkPlan('Round trip', '10.0.0.0');
    plan = addSubnet(plan, { name: 'Users', vlan: 10, expectedDevices: 50 });
    plan = addSubnet(plan, { name: 'Servers', vlan: 20, expectedDevices: 20 });
    plan = calculateSubnetRanges(plan);

    const csv = exportToCsv(plan);
    expect(csv.startsWith('# Plan Metadata')).toBe(true);

    const result = new CsvParser().parse(csv);
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.subnets.map((s) => [s.name, s.vlanId])).toEqual([
      ['Users', 10],
      ['Servers', 20],
    ]);
  });
});
