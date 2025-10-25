#!/usr/bin/env node
/**
 * NetPlan Dashboard Entry Point
 * Launches the interactive dashboard interface using pure ink + React
 */

import { render } from 'ink';
import React from 'react';
import { DashboardApp } from '../components/DashboardApp.js';

/**
 * Clear terminal and prepare for full-screen mode
 */
function clearTerminal(): void {
  // Full terminal reset (clears screen and scrollback)
  process.stdout.write('\x1Bc');

  // Alternative: Clear screen and move cursor to top
  // process.stdout.write('\x1B[2J\x1B[H');

  // Hide cursor for cleaner rendering
  process.stdout.write('\x1B[?25l');
}

/**
 * Restore terminal state on exit
 */
function restoreTerminal(): void {
  // Show cursor again
  process.stdout.write('\x1B[?25h');
}

/**
 * Start dashboard with pure ink interface
 */
function startDashboard(): void {
  // Clear terminal for full-screen experience
  clearTerminal();

  // Render the app with full-screen options
  const { waitUntilExit } = render(React.createElement(DashboardApp), {
    patchConsole: false, // Prevent console interference
    exitOnCtrlC: true, // Clean exit on Ctrl+C
  });

  // Restore terminal on exit
  waitUntilExit()
    .then(() => {
      restoreTerminal();
    })
    .catch(() => {
      restoreTerminal();
    });
}

// Run the dashboard
try {
  startDashboard();
} catch (error) {
  process.stderr.write(
    `Error: Failed to start dashboard: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
  );
  process.exit(1);
}
