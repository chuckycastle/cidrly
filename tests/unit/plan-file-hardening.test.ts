/**
 * Plan file hardening tests
 *
 * A plan file is authored outside the process (shared, synced, or imported), so the
 * schema is the trust boundary. These tests pin the constraints that keep file
 * content out of generated configurations, the terminal, and the allocators.
 */

import { calculateAvailableSpace } from '../../src/core/calculators/availability-calculator.js';
import { calculateSubnetRanges } from '../../src/core/models/network-plan.js';
import { exportToCsv } from '../../src/formatters/csv-formatter.js';
import { exportToAwsTerraform } from '../../src/formatters/terraform/aws-formatter.js';
import { exportToAzureTerraform } from '../../src/formatters/terraform/azure-formatter.js';
import { hclString, singleLine } from '../../src/formatters/terraform/base-formatter.js';
import { exportToGcpTerraform } from '../../src/formatters/terraform/gcp-formatter.js';
import {
  exportToAristaEos,
  exportToCiscoIos,
  exportToCiscoNxos,
  exportToFortinet,
  exportToJuniperJunos,
  exportToNetgear,
  exportToUbiquiti,
} from '../../src/formatters/vendors/index.js';
import { calculateGatewayIp } from '../../src/formatters/vendors/utils.js';
import {
  hasNoControlChars,
  stripControlChars,
} from '../../src/infrastructure/security/security-utils.js';
import type { NetworkPlan } from '../../src/schemas/network-plan.schema.js';
import { parseNetworkPlan } from '../../src/schemas/network-plan.schema.js';
import { csvParser } from '../../src/services/import/parsers/csv.parser.js';
import { yamlParser } from '../../src/services/import/parsers/yaml.parser.js';

const DATE = '2026-01-01T00:00:00.000Z';

function basePlanFile(): Record<string, unknown> {
  return {
    name: 'Plan',
    baseIp: '10.0.0.0',
    createdAt: DATE,
    updatedAt: DATE,
    subnets: [
      {
        id: 's1',
        name: 'Servers',
        vlanId: 10,
        expectedDevices: 50,
        subnetInfo: {
          expectedDevices: 50,
          plannedDevices: 100,
          requiredHosts: 100,
          subnetSize: 128,
          cidrPrefix: 25,
          usableHosts: 126,
          networkAddress: '10.0.0.0/25',
        },
      },
    ],
    supernet: {
      cidrPrefix: 22,
      totalSize: 1024,
      usedSize: 128,
      utilization: 12.5,
      rangeEfficiency: 100,
      networkAddress: '10.0.0.0/22',
    },
  };
}

/** Build a plan object that bypasses the schema, to exercise sink-side escaping. */
function rawPlan(overrides: Partial<NetworkPlan> = {}): NetworkPlan {
  const plan = parseNetworkPlan(basePlanFile());
  return { ...plan, ...overrides } as NetworkPlan;
}

describe('plan file schema: address fields', () => {
  it('accepts a well-formed plan', () => {
    expect(() => parseNetworkPlan(basePlanFile())).not.toThrow();
  });

  it.each([
    [
      'supernet quote and newline',
      (f: Record<string, unknown>) => {
        (f['supernet'] as Record<string, unknown>)['networkAddress'] = '10.0.0.0/22"\nx = "y';
      },
    ],
    [
      'subnetInfo newline',
      (f: Record<string, unknown>) => {
        const subnet = (f['subnets'] as Record<string, unknown>[])[0]!;
        (subnet['subnetInfo'] as Record<string, unknown>)['networkAddress'] = '10.0.1.0\nLINE/31';
      },
    ],
    [
      'manualNetworkAddress free text',
      (f: Record<string, unknown>) => {
        (f['subnets'] as Record<string, unknown>[])[0]!['manualNetworkAddress'] = '=cmd,extra';
      },
    ],
    [
      'octet out of range',
      (f: Record<string, unknown>) => {
        (f['supernet'] as Record<string, unknown>)['networkAddress'] = '10.0.0.999/22';
      },
    ],
    [
      'prefix out of range',
      (f: Record<string, unknown>) => {
        (f['supernet'] as Record<string, unknown>)['networkAddress'] = '10.0.0.0/40';
      },
    ],
  ])('rejects %s', (_label, mutate) => {
    const file = basePlanFile();
    mutate(file);
    expect(() => parseNetworkPlan(file, 'plan.json')).toThrow(/Invalid CIDR notation/);
  });
});

describe('plan file schema: text fields', () => {
  it.each([
    [
      'plan name with OSC sequence',
      (f: Record<string, unknown>) => {
        f['name'] = '\u001b]0;PWNED\u0007Plan';
      },
    ],
    [
      'subnet name with newline',
      (f: Record<string, unknown>) => {
        (f['subnets'] as Record<string, unknown>[])[0]!['name'] = 'eng\nresource "x" "y" {}';
      },
    ],
    [
      'description with carriage return',
      (f: Record<string, unknown>) => {
        (f['subnets'] as Record<string, unknown>[])[0]!['description'] = 'a\rb';
      },
    ],
  ])('rejects %s', (_label, mutate) => {
    const file = basePlanFile();
    mutate(file);
    expect(() => parseNetworkPlan(file, 'plan.json')).toThrow(/Control characters are not allowed/);
  });

  it('accepts tabs and unicode text', () => {
    const file = basePlanFile();
    (file['subnets'] as Record<string, unknown>[])[0]!['description'] = 'Büro\tEtage 2';
    expect(() => parseNetworkPlan(file)).not.toThrow();
  });
});

describe('plan file schema: IPv4 magnitude bounds', () => {
  it('rejects subnetSize beyond the IPv4 address space', () => {
    const file = basePlanFile();
    const subnet = (file['subnets'] as Record<string, unknown>[])[0]!;
    (subnet['subnetInfo'] as Record<string, unknown>)['subnetSize'] = 9007199254740990;
    expect(() => parseNetworkPlan(file, 'plan.json')).toThrow(/subnetSize/);
  });

  it('rejects assigned block bounds beyond the IPv4 address space', () => {
    const file = basePlanFile();
    file['assignedBlocks'] = [
      {
        id: 'b1',
        networkAddress: '10.0.0.0/8',
        cidrPrefix: 8,
        totalCapacity: 16777216,
        startInt: 0,
        endInt: 9007199254740990,
        assignedAt: DATE,
      },
    ];
    expect(() => parseNetworkPlan(file, 'plan.json')).toThrow(/endInt/);
  });

  it('rejects an assigned block whose end precedes its start', () => {
    const file = basePlanFile();
    file['assignedBlocks'] = [
      {
        id: 'b1',
        networkAddress: '10.0.0.0/8',
        cidrPrefix: 8,
        totalCapacity: 16777216,
        startInt: 100,
        endInt: 50,
        assignedAt: DATE,
      },
    ];
    expect(() => parseNetworkPlan(file, 'plan.json')).toThrow(/greater than or equal to startInt/);
  });

  it('accepts a full /0 block', () => {
    const file = basePlanFile();
    file['assignedBlocks'] = [
      {
        id: 'b1',
        networkAddress: '0.0.0.0/0',
        cidrPrefix: 0,
        totalCapacity: 4294967296,
        startInt: 0,
        endInt: 4294967295,
        assignedAt: DATE,
      },
    ];
    expect(() => parseNetworkPlan(file)).not.toThrow();
  });
});

describe('control character helpers', () => {
  it('strips C0, DEL, C1 and ESC but keeps tab', () => {
    expect(stripControlChars('a\u001b[2Jb\u0007c\u007fd\u009be\tf')).toBe('a[2Jbcde\tf');
  });

  it('reports control characters', () => {
    expect(hasNoControlChars('plain text')).toBe(true);
    expect(hasNoControlChars('with\nnewline')).toBe(false);
    expect(hasNoControlChars('esc\u001b')).toBe(false);
  });
});

describe('Terraform sinks keep plan values inside their tokens', () => {
  it('hclString escapes quotes, backslashes, templates and line breaks', () => {
    expect(hclString('a"b')).toBe('a\\"b');
    expect(hclString('a\\b')).toBe('a\\\\b');
    expect(hclString('${x} %{y}')).toBe('$${x} %%{y}');
    expect(hclString('line1\nline2\r\nline3')).toBe('line1 line2 line3');
    expect(singleLine('a\nb')).toBe('a b');
  });

  const hostile = rawPlan({
    name: 'Plan"\n}\nresource "null_resource" "pwn" {}',
    supernet: {
      cidrPrefix: 22,
      totalSize: 1024,
      usedSize: 128,
      utilization: 12.5,
      rangeEfficiency: 100,
      networkAddress: '10.0.0.0/22"\n}\nresource "null_resource" "pwn" {}\nlocals {\n_a = "',
    },
  });
  hostile.subnets[0]!.name = 'eng\nresource "null_resource" "pwn" {}';
  hostile.subnets[0]!.subnetInfo!.networkAddress = '10.0.0.0/25"\ninjected = "y';

  it.each([
    ['aws', () => exportToAwsTerraform(hostile).mainTf],
    ['azure', () => exportToAzureTerraform(hostile).mainTf],
    ['gcp', () => exportToGcpTerraform(hostile).mainTf],
  ])('%s main.tf contains no injected resource or attribute line', (_provider, render) => {
    const tf = render();
    expect(tf).not.toMatch(/^resource "null_resource"/m);
    expect(tf).not.toMatch(/^injected = /m);
    expect(tf).not.toMatch(/^_a = /m);
    // Top-level blocks are only the ones the formatter emits itself
    const topLevel = tf.split('\n').filter((line) => /^[a-z]/.test(line));
    expect(
      topLevel.every((line) =>
        /^(terraform|provider|locals|resource "(aws|azurerm|google)_)/.test(line),
      ),
    ).toBe(true);
  });
});

describe('vendor config sinks keep plan values on one line', () => {
  it('calculateGatewayIp validates octets before the /31 and /32 shortcut', () => {
    expect(calculateGatewayIp('10.0.1.0\nINJECTED/31')).toBe('');
    expect(calculateGatewayIp('10.0.1.0/31')).toBe('10.0.1.0');
    expect(calculateGatewayIp('10.0.0.5/32')).toBe('10.0.0.5');
    expect(calculateGatewayIp('10.0.0.128/25')).toBe('10.0.0.129');
  });

  const hostile = rawPlan({
    name: 'Plan\nusername attacker privilege 15',
    supernet: {
      cidrPrefix: 22,
      totalSize: 1024,
      usedSize: 128,
      utilization: 12.5,
      rangeEfficiency: 100,
      networkAddress: '10.0.0.0/22\nusername attacker privilege 15',
    },
  });
  hostile.subnets[0]!.subnetInfo!.networkAddress = '10.0.1.0\nusername attacker privilege 15/31';
  hostile.subnets[0]!.subnetInfo!.cidrPrefix = 31;

  it.each([
    ['cisco-ios', exportToCiscoIos],
    ['cisco-nxos', exportToCiscoNxos],
    ['arista-eos', exportToAristaEos],
    ['juniper-junos', exportToJuniperJunos],
    ['fortinet', exportToFortinet],
    ['netgear', exportToNetgear],
    ['ubiquiti', exportToUbiquiti],
  ])('%s output has no line starting with the injected command', (_vendor, render) => {
    const config = render(hostile);
    expect(config).not.toMatch(/^\s*username attacker/m);
  });
});

describe('CSV export neutralizes formula prefixes and escapes every column', () => {
  const hostile = rawPlan({
    supernet: {
      cidrPrefix: 22,
      totalSize: 1024,
      usedSize: 128,
      utilization: 12.5,
      rangeEfficiency: 100,
      networkAddress: '10.0.0.0/22\nINJECTED_ROW,41,9',
    },
  });
  hostile.subnets[0]!.name = '=HYPERLINK("http://x","y")';
  hostile.subnets[0]!.description = '+plus';
  hostile.subnets[0]!.subnetInfo!.networkAddress = '10.0.1.0,extra,99/25';
  hostile.subnets[0]!.manualNetworkAddress = '@at\nINJECTED_ROW,40,7';

  const csv = exportToCsv(hostile);
  const lines = csv.split('\n');

  it('prefixes formula characters with a quote and wraps the cell', () => {
    expect(csv).toContain('"\'=HYPERLINK(""http://x"",""y"")"');
    expect(csv).toContain('"\'+plus"');
    expect(csv).toContain('"\'@at');
  });

  it('keeps address values inside their cells', () => {
    expect(csv).toContain('"10.0.1.0,extra,99"');
    expect(lines.some((line) => line.startsWith('INJECTED_ROW'))).toBe(false);
  });

  it('round-trips through the CSV importer without the neutralizing prefix', () => {
    const result = csvParser.parse(csv);
    expect(result.success).toBe(true);
    expect(result.subnets.map((s) => s.name)).toEqual(['=HYPERLINK("http://x","y")']);
    expect(result.subnets[0]!.description).toBe('+plus');
    expect(result.subnets.some((s) => s.name === 'INJECTED_ROW')).toBe(false);
  });
});

describe('import parsers drop control characters', () => {
  it('CSV import strips escape sequences from names and descriptions', () => {
    const result = csvParser.parse(
      'name,vlan,devices,description\n\u001b]0;X\u0007eng,10,50,\u001b[2Jdesc',
    );
    expect(result.subnets[0]!.name).toBe(']0;Xeng');
    expect(result.subnets[0]!.description).toBe('[2Jdesc');
  });

  it('YAML import strips escape sequences from plan and subnet names', () => {
    const result = yamlParser.parse(
      'name: "\u001b]0;X\u0007Plan"\nbaseIp: 10.0.0.0\nsubnets:\n  - name: "\u001b[2Jeng"\n    vlanId: 10\n    devices: 50\n',
    );
    expect(result.detectedPlanName).toBe(']0;XPlan');
    expect(result.subnets[0]!.name).toBe('[2Jeng');
  });
});

describe('allocators fail fast instead of hanging on out-of-range inputs', () => {
  it('allocation throws when an occupied range cannot be advanced past', () => {
    const plan = rawPlan();
    plan.subnets = [
      {
        id: 'locked',
        name: 'locked',
        vlanId: 1,
        expectedDevices: 10,
        networkLocked: true,
        subnetInfo: {
          expectedDevices: 10,
          plannedDevices: 20,
          requiredHosts: 12,
          subnetSize: 9007199254740990,
          cidrPrefix: 24,
          usableHosts: 10,
          networkAddress: '0.0.0.4/24',
        },
      },
      { id: 'unlocked', name: 'unlocked', vlanId: 2, expectedDevices: 10, networkLocked: false },
    ];
    plan.baseIp = '0.0.0.0';
    expect(() => calculateSubnetRanges(plan)).toThrow(/did not make progress/);
  });

  it('available-space fragmentation throws when a block exceeds the IPv4 space', () => {
    expect(() =>
      calculateAvailableSpace(
        [
          {
            id: 'b1',
            networkAddress: '10.0.0.0/8',
            cidrPrefix: 8,
            totalCapacity: 16777216,
            startInt: 0,
            endInt: 9007199254740990,
            assignedAt: new Date(DATE),
          },
        ],
        [],
      ),
    ).toThrow(/exceeds the IPv4 address space/);
  });

  it('still fragments a full /8 block', () => {
    const report = calculateAvailableSpace(
      [
        {
          id: 'b1',
          networkAddress: '10.0.0.0/8',
          cidrPrefix: 8,
          totalCapacity: 16777216,
          startInt: 167772160,
          endInt: 184549375,
          assignedAt: new Date(DATE),
        },
      ],
      [],
    );
    expect(report.totalAvailableCapacity).toBe(16777216);
  });
});
