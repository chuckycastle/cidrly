/**
 * View Command
 * Displays network plan details in a formatted table
 */

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import path from 'path';
import React from 'react';
import { z as zod } from 'zod';
import type { NetworkPlan, Subnet } from '../core/models/network-plan.js';
import { FILE_RULES } from '../infrastructure/config/validation-rules.js';
import { FileSystemRepository } from '../repositories/index.js';
import { FileService } from '../services/file.service.js';

export const options = zod.object({
  plan: zod.string().describe('Plan file to view (e.g., my-plan.json)'),
  format: zod.enum(['table', 'json']).default('table').describe('Output format: table or json'),
});

type Props = {
  options: zod.infer<typeof options>;
};

function SubnetRow({ subnet, isLast }: { subnet: Subnet; isLast: boolean }): React.ReactElement {
  const ipRange = subnet.subnetInfo?.networkAddress ?? null;
  const cidr = subnet.subnetInfo?.cidrPrefix;

  return (
    <Box flexDirection="column">
      <Box>
        <Box width={20}>
          <Text bold>{subnet.name}</Text>
        </Box>
        <Box width={8}>
          <Text color="cyan">VLAN {subnet.vlanId}</Text>
        </Box>
        <Box width={12}>
          <Text>{subnet.expectedDevices} devices</Text>
        </Box>
        <Box width={18}>
          <Text color={ipRange ? 'green' : 'yellow'}>{ipRange ?? 'Not calculated'}</Text>
        </Box>
        <Box width={6}>
          <Text dimColor>/{cidr ?? '?'}</Text>
        </Box>
      </Box>
      {!isLast && (
        <Text dimColor>─────────────────────────────────────────────────────────────</Text>
      )}
    </Box>
  );
}

function PlanView({ plan }: { plan: NetworkPlan }): React.ReactElement {
  const calculatedCount = plan.subnets.filter((s) => s.subnetInfo?.networkAddress).length;
  const efficiency = plan.supernet?.efficiency ? `${plan.supernet.efficiency.toFixed(1)}%` : 'N/A';

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box borderStyle="round" borderColor="cyan" padding={1} marginBottom={1}>
        <Box flexDirection="column">
          <Text>
            <Text bold color="cyan">
              Network Plan:{' '}
            </Text>
            <Text bold>{plan.name}</Text>
          </Text>
          <Text>
            <Text dimColor>Base IP: </Text>
            <Text color="green">{plan.baseIp}</Text>
            <Text dimColor> │ </Text>
            <Text dimColor>Subnets: </Text>
            <Text>{plan.subnets.length}</Text>
            <Text dimColor> │ </Text>
            <Text dimColor>Calculated: </Text>
            <Text color={calculatedCount === plan.subnets.length ? 'green' : 'yellow'}>
              {calculatedCount}/{plan.subnets.length}
            </Text>
            <Text dimColor> │ </Text>
            <Text dimColor>Efficiency: </Text>
            <Text color="cyan">{efficiency}</Text>
          </Text>
        </Box>
      </Box>

      {/* Table Header */}
      {plan.subnets.length > 0 && (
        <>
          <Box marginBottom={1}>
            <Box width={20}>
              <Text bold dimColor>
                NAME
              </Text>
            </Box>
            <Box width={8}>
              <Text bold dimColor>
                VLAN
              </Text>
            </Box>
            <Box width={12}>
              <Text bold dimColor>
                DEVICES
              </Text>
            </Box>
            <Box width={18}>
              <Text bold dimColor>
                IP RANGE
              </Text>
            </Box>
            <Box width={6}>
              <Text bold dimColor>
                CIDR
              </Text>
            </Box>
          </Box>
          <Text dimColor>═════════════════════════════════════════════════════════════</Text>

          {/* Subnet Rows */}
          {plan.subnets.map((subnet, idx) => (
            <SubnetRow key={subnet.id} subnet={subnet} isLast={idx === plan.subnets.length - 1} />
          ))}
        </>
      )}

      {plan.subnets.length === 0 && (
        <Box borderStyle="round" borderColor="yellow" padding={1}>
          <Text color="yellow">
            ⚠ Plan has no subnets. Use <Text bold>cidrly add</Text> to add subnets.
          </Text>
        </Box>
      )}

      {/* Footer */}
      {plan.subnets.length > 0 && calculatedCount < plan.subnets.length && (
        <Box marginTop={1}>
          <Text dimColor>
            Run{' '}
            <Text bold>
              cidrly calculate --plan={plan.name.replace(/\s+/g, '-').toLowerCase()}.json
            </Text>{' '}
            to allocate IP ranges.
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default function View({ options }: Props): React.ReactElement | null {
  const [status, setStatus] = React.useState<'loading' | 'done' | 'error'>('loading');
  const [plan, setPlan] = React.useState<NetworkPlan | null>(null);
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    async function loadPlan(): Promise<void> {
      try {
        setStatus('loading');
        const fileService = new FileService(
          path.resolve(process.cwd(), FILE_RULES.SAVED_PLANS_DIR),
        );
        const repository = new FileSystemRepository(fileService);

        const loadedPlan = await repository.load(options.plan);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check
        if (!loadedPlan) {
          throw new Error(`Plan not found: ${options.plan}`);
        }

        setPlan(loadedPlan);
        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    }

    void loadPlan();
  }, []);

  if (status === 'loading') {
    return (
      <Box>
        <Text color="cyan">
          <Spinner type="dots" /> Loading plan "{options.plan}"...
        </Text>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box borderStyle="round" borderColor="red" padding={1}>
        <Text color="red">✗ ERROR: {error}</Text>
      </Box>
    );
  }

  if (options.format === 'json' && plan) {
    return <Text>{JSON.stringify(plan, null, 2)}</Text>;
  }

  return plan ? <PlanView plan={plan} /> : null;
}
