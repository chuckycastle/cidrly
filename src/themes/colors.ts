/**
 * Modern Color Theme
 * Sophisticated, professional palette inspired by Claude Code CLI
 * Muted tones, strategic accents, visual hierarchy
 * Now supports automatic light/dark theme adaptation
 */

import chalk from 'chalk';
import type { ThemeColors } from './theme-types.js';

/**
 * Dark theme colors (default)
 * Optimized for dark terminal backgrounds
 */
export const darkTheme: ThemeColors = {
  // Base colors - sophisticated neutrals for dark backgrounds
  slate: chalk.hex('#cbd5e1'), // primary text (lighter for dark bg)
  muted: chalk.hex('#94a3b8'), // secondary text
  subtle: chalk.hex('#64748b'), // tertiary elements
  dim: chalk.hex('#475569'), // background elements

  // Accent colors - vibrant but not harsh
  accent: chalk.hex('#60a5fa'), // brighter blue for dark bg
  success: chalk.hex('#34d399'), // brighter emerald
  warning: chalk.hex('#fbbf24'), // brighter amber
  error: chalk.hex('#f87171'), // brighter red
  info: chalk.hex('#818cf8'), // brighter indigo

  // Special states
  highlight: chalk.hex('#7dd3fc'), // sky blue for selection
  border: chalk.hex('#475569'), // subtle borders

  // Semantic aliases
  primary: chalk.hex('#60a5fa'),
  text: chalk.hex('#cbd5e1'),
  textDim: chalk.hex('#94a3b8'),

  // Status colors
  calculated: chalk.hex('#34d399'),
  draft: chalk.hex('#fbbf24'),
  empty: chalk.hex('#64748b'),

  // Efficiency colors
  efficiencyHigh: chalk.hex('#34d399'),
  efficiencyMedium: chalk.hex('#fbbf24'),
  efficiencyLow: chalk.hex('#f87171'),
} as const;

/**
 * Light theme colors
 * Optimized for light terminal backgrounds
 */
export const lightTheme: ThemeColors = {
  // Base colors - darker neutrals for light backgrounds
  slate: chalk.hex('#334155'), // primary text (darker for light bg)
  muted: chalk.hex('#475569'), // secondary text
  subtle: chalk.hex('#64748b'), // tertiary elements
  dim: chalk.hex('#94a3b8'), // background elements

  // Accent colors - deeper tones for light bg
  accent: chalk.hex('#2563eb'), // deeper blue
  success: chalk.hex('#059669'), // deeper emerald
  warning: chalk.hex('#d97706'), // deeper amber
  error: chalk.hex('#dc2626'), // deeper red
  info: chalk.hex('#4f46e5'), // deeper indigo

  // Special states
  highlight: chalk.hex('#0ea5e9'), // deeper sky blue
  border: chalk.hex('#cbd5e1'), // subtle borders

  // Semantic aliases
  primary: chalk.hex('#2563eb'),
  text: chalk.hex('#334155'),
  textDim: chalk.hex('#64748b'),

  // Status colors
  calculated: chalk.hex('#059669'),
  draft: chalk.hex('#d97706'),
  empty: chalk.hex('#94a3b8'),

  // Efficiency colors
  efficiencyHigh: chalk.hex('#059669'),
  efficiencyMedium: chalk.hex('#d97706'),
  efficiencyLow: chalk.hex('#dc2626'),
} as const;

/**
 * Default color export
 * Uses dark theme colors for consistency
 */
export const colors = darkTheme;

export const symbols = {
  // Status indicators
  success: '✓',
  error: '✕', // × not ✗ - cleaner
  pending: '○',
  active: '●',

  // Navigation
  chevronRight: '›', // modern chevron, not arrow
  chevronDown: '∨',
  bullet: '·', // interpunct, not bullet

  // UI elements
  selected: '▸', // pointer for selected item
  unselected: ' ', // space for alignment
  divider: '│',
  horizontalDivider: '─',

  // Special
  info: 'ℹ',
  warning: '⚠',

  // Legacy (for gradual migration)
  checkmark: '✓',
  cross: '✕',
  circle: '○',
  filledCircle: '●',
  arrow: '›',

  // Progress/loading
  bar: '█',
  lightBar: '░',
  mediumBar: '▒',
} as const;
