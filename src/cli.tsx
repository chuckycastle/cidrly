#!/usr/bin/env node
/**
 * cidrly CLI Entry Point
 * Pastel-based CLI framework for network architecture planning
 */

import Pastel from 'pastel';
import packageJson from '../package.json' with { type: 'json' };

const app = new Pastel({
  importMeta: import.meta,
  name: 'cidrly',
  description: 'Network architecture and design planning CLI tool',
  version: packageJson.version,
});

await app.run();
