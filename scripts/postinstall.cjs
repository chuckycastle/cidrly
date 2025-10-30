#!/usr/bin/env node

/**
 * Post-installation script for cidrly
 * Creates ~/cidrly/saved-plans directory and copies example network plans
 * Runs after npm install (both global and Homebrew installations)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Detect CI environment
const isCI = process.env.CI === 'true' || process.env.CONTINUOUS_INTEGRATION === 'true';

// Colors for terminal output (skip in CI)
const colors = {
  reset: isCI ? '' : '\x1b[0m',
  green: isCI ? '' : '\x1b[32m',
  yellow: isCI ? '' : '\x1b[33m',
  blue: isCI ? '' : '\x1b[34m',
  dim: isCI ? '' : '\x1b[2m',
};

/**
 * Resolve user's home directory cross-platform
 */
function getHomeDirectory() {
  return os.homedir();
}

/**
 * Get the saved plans directory path
 */
function getSavedPlansDir() {
  const homeDir = getHomeDirectory();
  return path.join(homeDir, 'cidrly', 'saved-plans');
}

/**
 * Get the examples source directory (in the installed package)
 */
function getExamplesSourceDir() {
  // When installed, examples/ is in the package root
  return path.join(__dirname, '..', 'examples');
}

/**
 * Create directory if it doesn't exist
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
}

/**
 * Copy example file to destination if it doesn't already exist
 */
function copyExampleIfNotExists(sourceDir, destDir, filename) {
  const sourcePath = path.join(sourceDir, filename);
  const destPath = path.join(destDir, filename);

  // Check if source file exists
  if (!fs.existsSync(sourcePath)) {
    console.log(`${colors.yellow}⚠${colors.reset} Example file not found: ${filename}`);
    return false;
  }

  // Skip if destination already exists
  if (fs.existsSync(destPath)) {
    console.log(`${colors.dim}  ↳ ${filename} already exists, skipping${colors.reset}`);
    return false;
  }

  // Copy the file
  try {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`${colors.green}✓${colors.reset} Copied ${colors.blue}${filename}${colors.reset}`);
    return true;
  } catch (error) {
    console.log(`${colors.yellow}⚠${colors.reset} Failed to copy ${filename}: ${error.message}`);
    return false;
  }
}

/**
 * Main setup function
 */
function setupCidrly() {
  try {
    console.log(`\n${colors.blue}Setting up cidrly...${colors.reset}`);

    // Get directories
    const savedPlansDir = getSavedPlansDir();
    const examplesSourceDir = getExamplesSourceDir();

    // Create saved-plans directory
    const dirCreated = ensureDirectoryExists(savedPlansDir);
    if (dirCreated) {
      console.log(`${colors.green}✓${colors.reset} Created directory: ${colors.dim}${savedPlansDir}${colors.reset}`);
    } else {
      console.log(`${colors.dim}  ↳ Directory already exists: ${savedPlansDir}${colors.reset}`);
    }

    // Check if examples source directory exists
    if (!fs.existsSync(examplesSourceDir)) {
      console.log(`${colors.yellow}⚠${colors.reset} Examples directory not found in package, skipping example setup`);
      console.log(`${colors.green}✓${colors.reset} cidrly setup complete!\n`);
      return;
    }

    // Copy example files
    console.log(`\n${colors.blue}Copying example network plans...${colors.reset}`);
    const examples = [
      'campus-network.json',
      'data-center.json',
      'branch-office.json',
    ];

    let copiedCount = 0;
    for (const example of examples) {
      if (copyExampleIfNotExists(examplesSourceDir, savedPlansDir, example)) {
        copiedCount++;
      }
    }

    // Final message
    if (copiedCount > 0) {
      console.log(`\n${colors.green}✓${colors.reset} Successfully copied ${copiedCount} example plan${copiedCount > 1 ? 's' : ''}`);
      console.log(`${colors.dim}  Location: ${savedPlansDir}${colors.reset}`);
      console.log(`\n${colors.blue}Get started:${colors.reset} Run ${colors.green}cidrly${colors.reset} and press ${colors.green}l${colors.reset} to load an example!\n`);
    } else {
      console.log(`\n${colors.green}✓${colors.reset} cidrly setup complete!\n`);
    }

  } catch (error) {
    // Don't fail installation on setup errors
    console.error(`${colors.yellow}⚠${colors.reset} Setup warning: ${error.message}`);
    console.log(`${colors.dim}  You can still use cidrly, but you may need to manually create ${getSavedPlansDir()}${colors.reset}\n`);
  }
}

// Only run if not being imported
if (require.main === module) {
  setupCidrly();
}

module.exports = { setupCidrly, getSavedPlansDir };
