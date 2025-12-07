/**
 * Import Parser Interface
 * Base interface for all configuration parsers
 */

import type { ImportFormat, ParseResult } from '../import.types.js';

/**
 * Interface for configuration parsers
 */
export interface ImportParser {
  /** Unique identifier for this format */
  readonly formatId: ImportFormat;

  /** Human-readable format name */
  readonly formatName: string;

  /** File extensions this parser handles */
  readonly extensions: string[];

  /**
   * Parse configuration content into subnet data
   * @param content - Raw file content
   * @returns Parse result with subnets, warnings, and errors
   */
  parse(content: string): ParseResult;

  /**
   * Check if this parser can handle the given content
   * Used for auto-detection when format is not specified
   * @param content - Raw file content
   * @returns True if this parser can likely handle the content
   */
  canParse(content: string): boolean;
}

/**
 * Parser registry entry
 */
export interface ParserRegistryEntry {
  parser: ImportParser;
  priority: number; // Higher = checked first for auto-detection
}
