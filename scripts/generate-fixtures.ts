/**
 * Conformance fixture generator
 *
 * Serializes engine inputs and outputs to JSON so that every cidrly implementation
 * (this CLI, the Swift package used by the iOS and macOS apps) can prove it produces
 * the same answers. The output is committed to the cidrly-spec repository.
 *
 * Usage:
 *   npx tsx scripts/generate-fixtures.ts --out <dir>
 *
 * Determinism rules:
 *   - No Date.now() or random ids anywhere in the inputs.
 *   - Timestamps in text exports are replaced with <timestamp>.
 *   - Object keys are written in a stable order; arrays keep engine order.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { autoFitSubnets, convertToAssignedBlocks } from '../src/core/calculators/auto-fit.js';
import { calculateAvailableSpace } from '../src/core/calculators/availability-calculator.js';
import { detectOverlaps } from '../src/core/calculators/overlap-detector.js';
import {
  calculateContainingBlock,
  calculateHostBits,
  calculateNetmask,
  calculateSubnet,
  calculateWildcard,
  getSubnetDetails,
} from '../src/core/calculators/subnet-calculator.js';
import type { AssignedBlock, NetworkPlan, Subnet } from '../src/core/models/network-plan.js';
import { calculateSubnetRanges } from '../src/core/models/network-plan.js';
import { exportToCsv } from '../src/formatters/csv-formatter.js';
import {
  exportToAwsTerraform,
  exportToAzureTerraform,
  exportToGcpTerraform,
} from '../src/formatters/terraform/index.js';
import { DEFAULT_OPTIONS as TERRAFORM_DEFAULTS } from '../src/formatters/terraform/types.js';
import {
  calculateGatewayIp,
  exportToAristaEos,
  exportToCiscoIos,
  exportToCiscoNxos,
  exportToFortinet,
  exportToJuniperJunos,
  exportToNetgear,
  exportToUbiquiti,
} from '../src/formatters/vendors/index.js';
import { exportToYaml } from '../src/formatters/yaml-formatter.js';
import {
  VLAN_RULES,
  getVendorVlanWarning,
  isConfirmationRequiredVlan,
  isPrivateIp,
  isReservedIp,
  isReservedVlan,
} from '../src/infrastructure/config/validation-rules.js';
import { CURRENT_SCHEMA_VERSION, parseNetworkPlan } from '../src/schemas/network-plan.schema.js';
import type { ImportFormat } from '../src/services/import/import.types.js';
import { getParser } from '../src/services/import/parsers/index.js';
import { parseAvailableBlocks } from '../src/utils/block-parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8')) as {
  version: string;
};

const FIXED_DATE = new Date('2026-01-01T00:00:00.000Z');
const TIMESTAMP_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs(): { out: string } {
  const idx = process.argv.indexOf('--out');
  const out = idx !== -1 ? process.argv[idx + 1] : undefined;
  if (!out) {
    console.error('Usage: tsx scripts/generate-fixtures.ts --out <dir>');
    process.exit(1);
  }
  return { out: path.resolve(out) };
}

function writeJson(file: string, data: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function writeText(file: string, text: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, normalize(text), 'utf-8');
}

function normalize(text: string): string {
  return text.replace(TIMESTAMP_RE, '<timestamp>');
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface SubnetSpec {
  id: string;
  name: string;
  vlanId: number;
  expectedDevices: number;
  description?: string;
  lockedAt?: string; // manual network address, locked
}

function makePlan(
  name: string,
  baseIp: string,
  growthPercentage: number,
  subnets: SubnetSpec[],
  assignedBlocks?: AssignedBlock[],
): NetworkPlan {
  const plan: NetworkPlan = {
    name,
    baseIp,
    growthPercentage,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    subnets: subnets.map((s): Subnet => {
      const base: Subnet = {
        id: s.id,
        name: s.name,
        vlanId: s.vlanId,
        expectedDevices: s.expectedDevices,
        networkLocked: false,
      };
      if (s.description) base.description = s.description;
      if (s.lockedAt) {
        const info = calculateSubnet(s.expectedDevices, growthPercentage);
        base.networkLocked = true;
        base.manualNetworkAddress = s.lockedAt;
        base.subnetInfo = { ...info, networkAddress: s.lockedAt };
      }
      return base;
    }),
  };
  if (assignedBlocks) plan.assignedBlocks = assignedBlocks;
  return plan;
}

function blocks(...cidrs: string[]): AssignedBlock[] {
  const parsed = parseAvailableBlocks(cidrs.join('\n'));
  if (!parsed.valid) throw new Error(parsed.errors.join('; '));
  return convertToAssignedBlocks(parsed.blocks).map((b, i) => ({
    ...b,
    id: `block-${i + 1}`,
    assignedAt: FIXED_DATE,
  }));
}

function allocationResult(plan: NetworkPlan): unknown {
  const calculated = calculateSubnetRanges(plan);
  return {
    subnets: calculated.subnets
      .map((s) => ({
        id: s.id,
        networkAddress: s.subnetInfo?.networkAddress ?? null,
        cidrPrefix: s.subnetInfo?.cidrPrefix ?? null,
        subnetSize: s.subnetInfo?.subnetSize ?? null,
        plannedDevices: s.subnetInfo?.plannedDevices ?? null,
        networkLocked: s.networkLocked,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    supernet: calculated.supernet
      ? {
          networkAddress: calculated.supernet.networkAddress,
          cidrPrefix: calculated.supernet.cidrPrefix,
          totalSize: calculated.supernet.totalSize,
          usedSize: calculated.supernet.usedSize,
          utilization: round(calculated.supernet.utilization),
          rangeEfficiency: round(calculated.supernet.rangeEfficiency),
        }
      : null,
  };
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

function planInput(plan: NetworkPlan): unknown {
  return {
    name: plan.name,
    baseIp: plan.baseIp,
    growthPercentage: plan.growthPercentage,
    subnets: plan.subnets.map((s) => ({
      id: s.id,
      name: s.name,
      vlanId: s.vlanId,
      expectedDevices: s.expectedDevices,
      ...(s.description && { description: s.description }),
      networkLocked: s.networkLocked,
      ...(s.manualNetworkAddress && { manualNetworkAddress: s.manualNetworkAddress }),
    })),
    ...(plan.assignedBlocks && {
      assignedBlocks: plan.assignedBlocks.map((b) => ({
        id: b.id,
        networkAddress: b.networkAddress,
      })),
    }),
  };
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function sizingFixtures(): unknown {
  const devices = [
    1, 2, 3, 5, 10, 25, 30, 50, 62, 63, 100, 126, 127, 200, 254, 255, 500, 1000, 5000, 65534,
  ];
  const growth = [0, 25, 50, 100, 200, 300];
  const cases = [];
  for (const d of devices) {
    for (const g of growth) {
      const info = calculateSubnet(d, g);
      cases.push({
        input: { expectedDevices: d, growthPercentage: g },
        expected: {
          plannedDevices: info.plannedDevices,
          hostBits: calculateHostBits(info.plannedDevices),
          cidrPrefix: info.cidrPrefix,
          subnetSize: info.subnetSize,
          usableHosts: info.usableHosts,
        },
      });
    }
  }
  return {
    description:
      'Subnet sizing: planned = ceil(expected * (1 + growth/100)); host bits = smallest n with 2^n >= planned + 2',
    cases,
  };
}

function maskFixtures(): unknown {
  const cases = [];
  for (let prefix = 0; prefix <= 32; prefix++) {
    cases.push({
      input: { prefix },
      expected: {
        netmask: calculateNetmask(prefix),
        wildcard: calculateWildcard(prefix),
        size: Math.pow(2, 32 - prefix),
      },
    });
  }
  return { description: 'Netmask and wildcard for every IPv4 prefix length', cases };
}

function subnetDetailFixtures(): unknown {
  const networks = [
    '10.0.0.0/24',
    '10.0.0.128/25',
    '10.0.0.64/26',
    '10.0.0.4/30',
    '10.0.2.0/23',
    '172.16.0.0/12',
    '192.168.10.192/27',
    '192.168.255.0/24',
    '224.0.0.0/4',
    '0.0.0.0/0',
  ];
  const cases = networks.map((networkAddress) => {
    const cidrPrefix = parseInt(networkAddress.split('/')[1]!, 10);
    const subnetSize = Math.pow(2, 32 - cidrPrefix);
    const details = getSubnetDetails({
      expectedDevices: 1,
      plannedDevices: 1,
      requiredHosts: 1,
      subnetSize,
      cidrPrefix,
      usableHosts: Math.max(0, subnetSize - 2),
      networkAddress,
    });
    return {
      input: { networkAddress },
      expected: {
        netmask: details.netmask,
        wildcard: details.wildcard,
        hostMin: details.hostMin,
        hostMax: details.hostMax,
        broadcast: details.broadcast,
        gateway: calculateGatewayIp(networkAddress),
      },
    };
  });
  return {
    description:
      'ipcalc-style details for prefixes the engine can produce (/0 to /30). /31 and /32 semantics are unspecified in this spec version.',
    cases,
  };
}

function gatewayFixtures(): unknown {
  const networks = [
    '10.0.0.0/24',
    '10.0.0.128/25',
    '10.0.0.64/26',
    '10.0.0.4/30',
    '10.0.2.0/23',
    '172.16.0.0/12',
    '192.168.10.192/27',
    '10.0.0.0/31',
    '10.0.0.5/32',
  ];
  return {
    description:
      'Default gateway used by vendor exports: network + 1 for /30 and larger; the network address itself for /31 and /32',
    cases: networks.map((networkAddress) => ({
      input: { networkAddress },
      expected: { gateway: calculateGatewayIp(networkAddress) },
    })),
  };
}

function containingBlockFixtures(): unknown {
  const inputs: string[][] = [
    ['10.0.0.0/24'],
    ['10.0.1.0/24', '10.0.2.0/24'],
    ['10.0.0.0/25', '10.0.0.128/27', '10.0.0.160/28'],
    ['192.168.0.0/24', '192.168.1.0/24'],
    ['10.0.0.0/24', '192.168.1.0/24'],
    ['172.16.0.0/16', '172.31.255.0/24'],
  ];
  const cases = inputs.map((cidrs) => {
    const ranges = cidrs.map((c) => {
      const [ip, p] = c.split('/') as [string, string];
      const octets = ip.split('.').map(Number) as [number, number, number, number];
      const start = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
      const size = Math.pow(2, 32 - parseInt(p, 10));
      return { start, end: start + size - 1 };
    });
    const result = calculateContainingBlock(ranges);
    return { input: { networks: cidrs }, expected: result ?? null };
  });
  return {
    description: 'Smallest CIDR-aligned block that contains every input network',
    cases,
  };
}

function allocationFixtures(examplePlans: NetworkPlan[]): unknown {
  const constructed: NetworkPlan[] = [
    makePlan('aligned base, mixed sizes', '10.0.0.0', 100, [
      { id: 's1', name: 'Engineering', vlanId: 10, expectedDevices: 50 },
      { id: 's2', name: 'Sales', vlanId: 20, expectedDevices: 10 },
      { id: 's3', name: 'Guests', vlanId: 30, expectedDevices: 100 },
      { id: 's4', name: 'Printers', vlanId: 40, expectedDevices: 4 },
    ]),
    makePlan('unaligned base', '10.0.1.0', 100, [
      { id: 's1', name: 'A', vlanId: 10, expectedDevices: 100 },
      { id: 's2', name: 'B', vlanId: 20, expectedDevices: 100 },
    ]),
    makePlan('zero growth', '10.10.0.0', 0, [
      { id: 's1', name: 'A', vlanId: 10, expectedDevices: 62 },
      { id: 's2', name: 'B', vlanId: 20, expectedDevices: 63 },
      { id: 's3', name: 'C', vlanId: 30, expectedDevices: 2 },
    ]),
    makePlan('locked subnet in the middle', '10.0.0.0', 100, [
      { id: 's1', name: 'A', vlanId: 10, expectedDevices: 100 },
      { id: 's2', name: 'Locked', vlanId: 20, expectedDevices: 20, lockedAt: '10.0.1.0/26' },
      { id: 's3', name: 'C', vlanId: 30, expectedDevices: 100 },
      { id: 's4', name: 'D', vlanId: 40, expectedDevices: 10 },
    ]),
    makePlan('high half of address space', '192.168.0.0', 100, [
      { id: 's1', name: 'A', vlanId: 10, expectedDevices: 200 },
      { id: 's2', name: 'B', vlanId: 20, expectedDevices: 25 },
    ]),
    makePlan('172.16 base with 300% growth', '172.16.0.0', 300, [
      { id: 's1', name: 'A', vlanId: 100, expectedDevices: 300 },
      { id: 's2', name: 'B', vlanId: 200, expectedDevices: 30 },
      { id: 's3', name: 'C', vlanId: 300, expectedDevices: 3 },
    ]),
    makePlan('ties sorted deterministically', '10.20.0.0', 100, [
      { id: 's1', name: 'Z', vlanId: 5, expectedDevices: 10 },
      { id: 's2', name: 'Y', vlanId: 4, expectedDevices: 10 },
      { id: 's3', name: 'X', vlanId: 3, expectedDevices: 10 },
    ]),
  ];
  const cases = [...constructed, ...examplePlans].map((plan) => ({
    name: plan.name,
    input: planInput(plan),
    expected: allocationResult(plan),
  }));
  return {
    description:
      'VLSM allocation: largest-first, boundary aligned, gap-aware around locked subnets. Expected subnets are sorted by id. Supernet is the containing block.',
    cases,
  };
}

function ipamFixtures(): unknown {
  const scenarios: Array<{ name: string; blocks: string[]; subnets: SubnetSpec[] }> = [
    {
      name: 'single block, two subnets',
      blocks: ['10.1.241.0/24'],
      subnets: [
        { id: 's1', name: 'A', vlanId: 10, expectedDevices: 50 },
        { id: 's2', name: 'B', vlanId: 20, expectedDevices: 10 },
      ],
    },
    {
      name: 'two blocks, best fit',
      blocks: ['10.1.241.0/24', '10.1.244.0/22'],
      subnets: [
        { id: 's1', name: 'Big', vlanId: 10, expectedDevices: 400 },
        { id: 's2', name: 'Small', vlanId: 20, expectedDevices: 10 },
        { id: 's3', name: 'Medium', vlanId: 30, expectedDevices: 100 },
      ],
    },
    {
      name: 'block above 128.0.0.0',
      blocks: ['192.168.0.0/16'],
      subnets: [
        { id: 's1', name: 'A', vlanId: 10, expectedDevices: 50 },
        { id: 's2', name: 'B', vlanId: 20, expectedDevices: 50 },
      ],
    },
    {
      name: 'does not fit',
      blocks: ['10.5.0.0/26'],
      subnets: [
        { id: 's1', name: 'Fits', vlanId: 10, expectedDevices: 10 },
        { id: 's2', name: 'Too big', vlanId: 20, expectedDevices: 200 },
      ],
    },
    {
      name: 'locked subnet inside block',
      blocks: ['10.9.0.0/24'],
      subnets: [
        { id: 's1', name: 'Locked', vlanId: 10, expectedDevices: 20, lockedAt: '10.9.0.64/26' },
        { id: 's2', name: 'A', vlanId: 20, expectedDevices: 50 },
        { id: 's3', name: 'B', vlanId: 30, expectedDevices: 5 },
      ],
    },
  ];
  const cases = scenarios.map((sc) => {
    const assigned = blocks(...sc.blocks);
    const plan = makePlan(sc.name, sc.blocks[0]!.split('/')[0]!, 100, sc.subnets, assigned);
    const calculated = calculateSubnetRanges(plan);
    const report = calculateAvailableSpace(assigned, calculated.subnets);
    return {
      name: sc.name,
      input: planInput(plan),
      expected: {
        allocation: allocationResult(plan),
        spaceReport: {
          totalAssignedCapacity: report.totalAssignedCapacity,
          totalUsedCapacity: report.totalUsedCapacity,
          totalAvailableCapacity: report.totalAvailableCapacity,
          overallUtilizationPercent: round(report.overallUtilizationPercent),
          blocks: report.blockSummaries.map((b) => ({
            blockId: b.blockId,
            networkAddress: b.block.networkAddress,
            allocatedSubnetIds: [...b.allocatedSubnetIds].sort(),
            usedCapacity: b.usedCapacity,
            availableCapacity: b.availableCapacity,
            utilizationPercent: round(b.utilizationPercent),
            fragments: b.fragments.map((f) => f.networkAddress),
          })),
        },
      },
    };
  });
  return {
    description:
      'IPAM-lite: allocation into assigned blocks (best-fit fragment, aligned) and the resulting free-space report',
    cases,
  };
}

function autoFitFixtures(): unknown {
  const scenarios: Array<{ name: string; blocks: string[]; subnets: SubnetSpec[] }> = [
    {
      name: 'pack three subnets into two blocks',
      blocks: ['10.1.241.0/24', '10.1.242.0/25'],
      subnets: [
        { id: 's1', name: 'A', vlanId: 10, expectedDevices: 100 },
        { id: 's2', name: 'B', vlanId: 20, expectedDevices: 50 },
        { id: 's3', name: 'C', vlanId: 30, expectedDevices: 50 },
      ],
    },
    {
      name: 'one subnet cannot be placed',
      blocks: ['10.1.241.0/26'],
      subnets: [
        { id: 's1', name: 'A', vlanId: 10, expectedDevices: 10 },
        { id: 's2', name: 'B', vlanId: 20, expectedDevices: 100 },
      ],
    },
  ];
  const cases = scenarios.map((sc) => {
    const parsed = parseAvailableBlocks(sc.blocks.join('\n'));
    const subnets: Subnet[] = sc.subnets.map((s) => ({
      id: s.id,
      name: s.name,
      vlanId: s.vlanId,
      expectedDevices: s.expectedDevices,
      networkLocked: false,
      subnetInfo: calculateSubnet(s.expectedDevices, 100),
    }));
    const result = autoFitSubnets(subnets, parsed.blocks);
    return {
      name: sc.name,
      input: {
        blocks: sc.blocks,
        subnets: sc.subnets.map((s) => ({
          id: s.id,
          vlanId: s.vlanId,
          expectedDevices: s.expectedDevices,
        })),
        growthPercentage: 100,
      },
      expected: {
        success: result.success,
        allocations: result.allocations
          .map((a) => ({
            subnetId: subnets[a.subnetIndex]!.id,
            block: parsed.blocks[a.blockIndex]!.networkAddress,
            networkAddress: a.networkAddress,
          }))
          .sort((a, b) => a.subnetId.localeCompare(b.subnetId)),
        unallocatedSubnetIds: result.unallocatedSubnets.map((i) => subnets[i]!.id).sort(),
        blockUtilizations: result.blockUtilizations.map((u) => ({
          block: u.block.networkAddress,
          usedCapacity: u.usedCapacity,
          utilizationPercent: round(u.utilizationPercent),
        })),
      },
    };
  });
  return { description: 'Auto-fit bin packing across available blocks', cases };
}

function overlapFixtures(): unknown {
  const inputs = [
    ['10.0.0.0/24', '10.0.1.0/24'],
    ['10.0.0.0/24', '10.0.0.128/25'],
    ['10.0.0.0/25', '10.0.0.64/26', '10.0.0.96/27'],
    ['192.168.0.0/16', '192.168.10.0/24', '10.0.0.0/8'],
    ['10.0.0.0/23', '10.0.1.0/24', '10.0.2.0/24'],
  ];
  const cases = inputs.map((networks) => ({
    input: { networks },
    expected: detectOverlaps(networks.map((n) => ({ networkAddress: n }))),
  }));
  return { description: 'Pairwise overlap detection with complete/partial classification', cases };
}

function vlanRuleFixtures(): unknown {
  const vlans = [0, 1, 2, 10, 1001, 1002, 1005, 1006, 3967, 3968, 4093, 4094, 4095];
  const formats = [
    'cisco-ios',
    'cisco-nxos',
    'arista-eos',
    'juniper-junos',
    'fortinet',
    'netgear',
    'ubiquiti',
  ];
  return {
    description: 'VLAN reservation rules and per-vendor warnings',
    reserved: VLAN_RULES.RESERVED,
    confirmationRequired: VLAN_RULES.CONFIRMATION_REQUIRED,
    cases: vlans.map((vlanId) => ({
      input: { vlanId },
      expected: {
        reserved: isReservedVlan(vlanId),
        confirmationRequired: isConfirmationRequiredVlan(vlanId),
        vendorWarnings: Object.fromEntries(
          formats.map((f) => [f, getVendorVlanWarning(vlanId, f) ?? null]),
        ),
      },
    })),
  };
}

function ipClassFixtures(): unknown {
  const ips = [
    '0.0.0.0',
    '10.0.0.1',
    '127.0.0.1',
    '169.254.1.1',
    '172.15.255.255',
    '172.16.0.0',
    '172.31.255.255',
    '172.32.0.0',
    '192.0.2.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.51.100.7',
    '203.0.113.9',
    '224.0.0.1',
    '240.0.0.1',
    '255.255.255.255',
    '8.8.8.8',
  ];
  return {
    description: 'Reserved (RFC 5735/6890) and private (RFC 1918) classification',
    cases: ips.map((ip) => ({
      input: { ip },
      expected: { reserved: isReservedIp(ip), private: isPrivateIp(ip) },
    })),
  };
}

async function goldenExports(out: string, plans: NetworkPlan[]): Promise<string[]> {
  const written: string[] = [];
  for (const plan of plans) {
    const calculated = { ...calculateSubnetRanges(plan), updatedAt: FIXED_DATE };
    const dir = path.join(out, 'golden', slug(plan.name));
    const files: Record<string, string> = {
      'plan.yaml': await exportToYaml(calculated),
      'plan.csv': exportToCsv(calculated),
      'cisco-ios.cfg': exportToCiscoIos(calculated),
      'cisco-nxos.cfg': exportToCiscoNxos(calculated),
      'arista-eos.cfg': exportToAristaEos(calculated),
      'juniper-junos.conf': exportToJuniperJunos(calculated),
      'fortinet.cfg': exportToFortinet(calculated),
      'netgear.cfg': exportToNetgear(calculated),
      'ubiquiti.cfg': exportToUbiquiti(calculated),
    };
    const tf = {
      aws: exportToAwsTerraform(calculated, { ...TERRAFORM_DEFAULTS, provider: 'aws' }),
      azure: exportToAzureTerraform(calculated, { ...TERRAFORM_DEFAULTS, provider: 'azure' }),
      gcp: exportToGcpTerraform(calculated, { ...TERRAFORM_DEFAULTS, provider: 'gcp' }),
    };
    for (const [provider, output] of Object.entries(tf)) {
      files[`terraform-${provider}/main.tf`] = output.mainTf;
      files[`terraform-${provider}/variables.tf`] = output.variablesTf;
      files[`terraform-${provider}/outputs.tf`] = output.outputsTf;
    }
    for (const [name, text] of Object.entries(files)) {
      writeText(path.join(dir, name), text);
      written.push(path.relative(out, path.join(dir, name)));
    }
  }
  return written;
}

async function importRoundTrips(plans: NetworkPlan[]): Promise<unknown> {
  const formats: Array<{
    format: ImportFormat;
    exporter: (p: NetworkPlan) => Promise<string> | string;
  }> = [
    { format: 'cisco-ios', exporter: exportToCiscoIos },
    { format: 'cisco-nxos', exporter: exportToCiscoNxos },
    { format: 'arista-eos', exporter: exportToAristaEos },
    { format: 'juniper-junos', exporter: exportToJuniperJunos },
    { format: 'fortinet', exporter: exportToFortinet },
    { format: 'netgear', exporter: exportToNetgear },
    { format: 'ubiquiti', exporter: exportToUbiquiti },
    { format: 'csv', exporter: exportToCsv },
    { format: 'yaml', exporter: exportToYaml },
  ];
  const cases = [];
  for (const plan of plans) {
    const calculated = { ...calculateSubnetRanges(plan), updatedAt: FIXED_DATE };
    for (const { format, exporter } of formats) {
      const content = normalize(await exporter(calculated));
      const parser = getParser(format);
      if (!parser) continue;
      const result = parser.parse(content);
      cases.push({
        name: `${slug(plan.name)} via ${format}`,
        input: { format, content },
        expected: {
          success: result.success,
          detectedBaseIp: result.detectedBaseIp ?? null,
          detectedPlanName: result.detectedPlanName ?? null,
          subnets: result.subnets.map((s) => ({
            name: s.name,
            vlanId: s.vlanId,
            expectedDevices: s.expectedDevices,
            networkAddress: s.networkAddress ?? null,
            cidrPrefix: s.cidrPrefix ?? null,
            description: s.description ?? null,
            gatewayIp: s.gatewayIp ?? null,
          })),
          warningCount: result.warnings.length,
          errorCount: result.errors.length,
        },
      });
    }
  }
  return {
    description:
      'Import parsers applied to the golden exports of the example plans. expectedDevices is the parser estimate, not the original count.',
    cases,
  };
}

function planFileFixtures(): unknown {
  const v1LegacyFile = {
    name: 'Legacy',
    baseIp: '10.0.0.0',
    subnets: [
      {
        id: 'subnet-1',
        name: 'Users',
        vlanId: 10,
        expectedDevices: 50,
        subnetInfo: {
          expectedDevices: 50,
          plannedDevices: 100,
          requiredHosts: 50,
          subnetSize: 128,
          cidrPrefix: 25,
          usableHosts: 126,
          networkAddress: '10.0.0.0/25',
        },
      },
    ],
    supernet: {
      cidrPrefix: 25,
      totalSize: 128,
      usedSize: 128,
      efficiency: 100,
      networkAddress: '10.0.0.0/25',
    },
    createdAt: '2025-06-01T00:00:00.000Z',
    updatedAt: '2025-06-01T00:00:00.000Z',
  };
  const v2FileWithUnknownFields = {
    schemaVersion: 2,
    name: 'From app',
    baseIp: '10.0.0.0',
    growthPercentage: 50,
    subnets: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tags: ['campus'],
    reservations: [{ address: '10.0.0.1', purpose: 'gateway' }],
  };
  const parsedLegacy = parseNetworkPlan(v1LegacyFile);
  const parsedV2 = parseNetworkPlan(v2FileWithUnknownFields) as unknown as Record<string, unknown>;
  return {
    description:
      'Plan file parsing rules: defaults for v1 files, legacy field migration, and preservation of unknown fields',
    currentSchemaVersion: CURRENT_SCHEMA_VERSION,
    cases: [
      {
        name: 'v1 file without growthPercentage or rangeEfficiency; legacy efficiency',
        input: v1LegacyFile,
        expected: {
          growthPercentage: parsedLegacy.growthPercentage,
          subnetsNetworkLocked: parsedLegacy.subnets.map((s) => s.networkLocked),
          supernetUtilization: parsedLegacy.supernet?.utilization,
          supernetRangeEfficiency: parsedLegacy.supernet?.rangeEfficiency,
        },
      },
      {
        name: 'v2 file with fields this client does not understand',
        input: v2FileWithUnknownFields,
        expected: {
          preservedFields: {
            tags: parsedV2['tags'],
            reservations: parsedV2['reservations'],
          },
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { out } = parseArgs();
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const exampleDir = path.join(ROOT, 'examples');
  const examplePlans = fs
    .readdirSync(exampleDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const raw = JSON.parse(fs.readFileSync(path.join(exampleDir, f), 'utf-8')) as unknown;
      const plan = parseNetworkPlan(raw, f);
      // Strip derived data and timestamps so the fixture is about the engine, not the file
      const { supernet: _s, spaceReport: _r, ...rest } = plan;
      return { ...rest, createdAt: FIXED_DATE, updatedAt: FIXED_DATE } as NetworkPlan;
    });

  const files: Record<string, unknown> = {
    'engine/sizing.json': sizingFixtures(),
    'engine/masks.json': maskFixtures(),
    'engine/subnet-details.json': subnetDetailFixtures(),
    'engine/gateway.json': gatewayFixtures(),
    'engine/containing-block.json': containingBlockFixtures(),
    'engine/allocation.json': allocationFixtures(examplePlans),
    'engine/ipam.json': ipamFixtures(),
    'engine/auto-fit.json': autoFitFixtures(),
    'engine/overlap.json': overlapFixtures(),
    'rules/vlan.json': vlanRuleFixtures(),
    'rules/ip-classification.json': ipClassFixtures(),
    'format/plan-file.json': planFileFixtures(),
    'format/import-round-trip.json': await importRoundTrips(examplePlans),
  };

  for (const [rel, data] of Object.entries(files)) {
    writeJson(path.join(out, rel), data);
  }
  const golden = await goldenExports(out, examplePlans);

  writeJson(path.join(out, 'manifest.json'), {
    generator: `cidrly@${packageJson.version}`,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    normalization: {
      timestamps: 'ISO-8601 UTC timestamps in text outputs are replaced with <timestamp>',
      ordering: 'expected.subnets arrays are sorted by id; all other arrays keep engine order',
      floats: 'percentages are rounded to 6 decimal places',
    },
    files: [...Object.keys(files), ...golden].sort(),
  });

  console.log(`Wrote ${Object.keys(files).length + golden.length + 1} files to ${out}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
