/**
 * Parser Registry
 * Central registry for all import parsers with auto-detection support
 */

import type { ImportFormat } from '../import.types.js';
import { csvParser } from './csv.parser.js';
import type { ImportParser, ParserRegistryEntry } from './parser.interface.js';
import { aristaEosParser } from './router/arista-eos.parser.js';
import { ciscoIosParser } from './router/cisco-ios.parser.js';
import { ciscoNxosParser } from './router/cisco-nxos.parser.js';
import { fortinetParser } from './router/fortinet.parser.js';
import { juniperJunosParser } from './router/juniper-junos.parser.js';
import { netgearParser } from './router/netgear.parser.js';
import { ubiquitiParser } from './router/ubiquiti.parser.js';
import { yamlParser } from './yaml.parser.js';

export * from './csv.parser.js';
export type * from './parser.interface.js';
export * from './router/index.js';
export * from './yaml.parser.js';

/**
 * Parser registry with priority ordering
 * Higher priority parsers are checked first for auto-detection
 */
const parserRegistry: ParserRegistryEntry[] = [
  // Structured formats (high priority for auto-detection)
  { parser: yamlParser, priority: 100 },
  { parser: csvParser, priority: 90 },

  // Router configs (check more specific patterns first)
  { parser: ciscoNxosParser, priority: 80 }, // Check NX-OS before IOS
  { parser: fortinetParser, priority: 75 },
  { parser: juniperJunosParser, priority: 70 },
  { parser: ubiquitiParser, priority: 65 },
  { parser: netgearParser, priority: 60 },
  { parser: aristaEosParser, priority: 55 },
  { parser: ciscoIosParser, priority: 50 }, // Most generic, check last
];

/**
 * Get parser by format ID
 */
export function getParser(format: ImportFormat): ImportParser | undefined {
  return parserRegistry.find((entry) => entry.parser.formatId === format)?.parser;
}

/**
 * Get all registered parsers
 */
export function getAllParsers(): ImportParser[] {
  return parserRegistry.map((entry) => entry.parser);
}

/**
 * Auto-detect parser for given content
 * Returns the first parser that can handle the content (by priority)
 */
export function detectParser(content: string): ImportParser | undefined {
  const sortedEntries = [...parserRegistry].sort((a, b) => b.priority - a.priority);

  for (const entry of sortedEntries) {
    if (entry.parser.canParse(content)) {
      return entry.parser;
    }
  }

  return undefined;
}

/**
 * Get parser by file extension
 */
export function getParserByExtension(filename: string): ImportParser | undefined {
  const lowerFilename = filename.toLowerCase();

  for (const entry of parserRegistry) {
    for (const ext of entry.parser.extensions) {
      if (lowerFilename.endsWith(ext)) {
        return entry.parser;
      }
    }
  }

  return undefined;
}

/**
 * Get all supported format information
 */
export function getSupportedFormats(): Array<{
  id: ImportFormat;
  name: string;
  extensions: string[];
}> {
  return parserRegistry.map((entry) => ({
    id: entry.parser.formatId,
    name: entry.parser.formatName,
    extensions: entry.parser.extensions,
  }));
}
