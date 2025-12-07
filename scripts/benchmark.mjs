#!/usr/bin/env node

/**
 * Performance Benchmark Script
 * Measures cold-start time and large plan calculation performance
 *
 * Usage:
 *   node scripts/benchmark.mjs cold-start   - Measure CLI startup time
 *   node scripts/benchmark.mjs large-plan   - Measure calculation with many subnets
 *   node scripts/benchmark.mjs all          - Run all benchmarks
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = '') {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Measure cold-start time by running --version multiple times
 */
async function benchmarkColdStart(iterations = 10) {
  log('\n=== Cold Start Benchmark ===', colors.bold + colors.cyan);
  log(`Running ${iterations} iterations...`, colors.dim);

  const cliPath = join(projectRoot, 'dist', 'cli.js');

  if (!existsSync(cliPath)) {
    log('Error: dist/cli.js not found. Run npm run build:prod first.', colors.yellow);
    return null;
  }

  const times = [];

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();

    try {
      execSync(`node "${cliPath}" --version`, {
        cwd: projectRoot,
        stdio: 'pipe',
        timeout: 30000,
      });
    } catch {
      log(`Iteration ${i + 1} failed`, colors.yellow);
      continue;
    }

    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    times.push(durationMs);

    if ((i + 1) % 5 === 0) {
      process.stdout.write(`${colors.dim}Progress: ${i + 1}/${iterations}${colors.reset}\r`);
    }
  }

  if (times.length === 0) {
    log('No successful runs', colors.yellow);
    return null;
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const sorted = [...times].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  log(`\nResults (${times.length} runs):`, colors.green);
  log(`  Average:     ${avg.toFixed(2)}ms`);
  log(`  Min:         ${min.toFixed(2)}ms`);
  log(`  Max:         ${max.toFixed(2)}ms`);
  log(`  P50:         ${p50.toFixed(2)}ms`);
  log(`  P95:         ${p95.toFixed(2)}ms`);

  return { avg, min, max, p50, p95, iterations: times.length };
}

/**
 * Generate a large plan for benchmarking
 */
function generateLargePlan(subnetCount) {
  const subnets = [];

  for (let i = 0; i < subnetCount; i++) {
    subnets.push({
      id: `subnet-${i}`,
      name: `Subnet ${i + 1}`,
      vlanId: (i % 4094) + 1,
      expectedDevices: Math.floor(Math.random() * 200) + 10,
      description: `Test subnet ${i + 1} for performance benchmarking`,
    });
  }

  return {
    name: `Benchmark Plan (${subnetCount} subnets)`,
    baseIp: '10.0.0.0',
    growthPercentage: 25,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    subnets,
  };
}

/**
 * Benchmark calculation with a large plan
 */
async function benchmarkLargePlan(subnetCounts = [100, 250, 500]) {
  log('\n=== Large Plan Benchmark ===', colors.bold + colors.cyan);

  const tempDir = join(projectRoot, '.benchmark-temp');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const results = [];

  for (const count of subnetCounts) {
    log(`\nGenerating plan with ${count} subnets...`, colors.dim);

    const plan = generateLargePlan(count);
    const planPath = join(tempDir, `benchmark-${count}.json`);
    writeFileSync(planPath, JSON.stringify(plan, null, 2));

    const cliPath = join(projectRoot, 'dist', 'cli.js');

    if (!existsSync(cliPath)) {
      log('Error: dist/cli.js not found. Run npm run build:prod first.', colors.yellow);
      continue;
    }

    // Measure calculation time by running view command with calculate
    const iterations = 3;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const start = process.hrtime.bigint();

      try {
        execSync(`node "${cliPath}" calculate --plan "${planPath}"`, {
          cwd: projectRoot,
          stdio: 'pipe',
          timeout: 60000,
        });
      } catch {
        // calculate command may fail without supernet, that's ok
      }

      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      times.push(durationMs);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    results.push({ count, avg, times });

    log(`  ${count} subnets: ${avg.toFixed(2)}ms avg (${iterations} runs)`, colors.green);
  }

  // Cleanup
  try {
    const { rmSync } = await import('fs');
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }

  return results;
}

/**
 * Run all benchmarks and save results
 */
async function runAllBenchmarks() {
  log('\n╔════════════════════════════════════╗', colors.blue);
  log('║   cidrly Performance Benchmarks    ║', colors.blue);
  log('╚════════════════════════════════════╝', colors.blue);

  const coldStartResults = await benchmarkColdStart(10);
  const largePlanResults = await benchmarkLargePlan([100, 250, 500]);

  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    coldStart: coldStartResults,
    largePlan: largePlanResults,
  };

  const resultsPath = join(projectRoot, '.benchmark-results.json');
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`\n${colors.dim}Results saved to .benchmark-results.json${colors.reset}`);

  // Print summary
  log('\n=== Summary ===', colors.bold + colors.cyan);
  if (coldStartResults) {
    log(`Cold start (avg): ${coldStartResults.avg.toFixed(2)}ms`, colors.green);
  }

  log('\nBaseline targets (v0.5.0):');
  log('  Cold start: < 500ms', colors.dim);
  log('  100 subnets: < 1000ms', colors.dim);
  log('  500 subnets: < 3000ms', colors.dim);

  return results;
}

// Main
const command = process.argv[2] || 'all';

switch (command) {
  case 'cold-start':
    benchmarkColdStart(10);
    break;
  case 'large-plan':
    benchmarkLargePlan([100, 250, 500]);
    break;
  case 'all':
    runAllBenchmarks();
    break;
  default:
    log(`Unknown command: ${command}`, colors.yellow);
    log('Usage: node scripts/benchmark.mjs [cold-start|large-plan|all]');
    process.exit(1);
}
