#!/usr/bin/env node
/**
 * cidrly CLI Entry Point
 * Pastel-based CLI framework for network architecture planning
 */

import Pastel from 'pastel';

const app = new Pastel({
  importMeta: import.meta,
  name: 'cidrly',
  description: 'Network architecture and design planning CLI tool',
  version: '1.0.0-rc.1',
});

await app.run();
