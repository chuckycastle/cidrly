/**
 * Theme System Types
 * Type definitions for theme management and color adaptation
 */

import type chalk from 'chalk';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'auto';

// Chalk instance type
type ChalkInstance = typeof chalk;

/**
 * Color palette for a specific theme mode
 */
export interface ThemeColors {
  // Base colors
  slate: ChalkInstance;
  muted: ChalkInstance;
  subtle: ChalkInstance;
  dim: ChalkInstance;

  // Accent colors
  accent: ChalkInstance;
  success: ChalkInstance;
  warning: ChalkInstance;
  error: ChalkInstance;
  info: ChalkInstance;

  // Special states
  highlight: ChalkInstance;
  border: ChalkInstance;

  // Semantic aliases
  primary: ChalkInstance;
  text: ChalkInstance;
  textDim: ChalkInstance;

  // Status colors
  calculated: ChalkInstance;
  draft: ChalkInstance;
  empty: ChalkInstance;

  // Efficiency colors
  efficiencyHigh: ChalkInstance;
  efficiencyMedium: ChalkInstance;
  efficiencyLow: ChalkInstance;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  mode: ThemeMode;
  colors: ThemeColors;
}
