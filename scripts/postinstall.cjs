#!/usr/bin/env node

/**
 * Post-installation script for cidrly
 * Creates ~/cidrly/saved-plans directory and copies example network plans
 * Smart detection updates outdated example files while preserving user files
 * Runs after npm install (both global and Homebrew installations)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

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

// Known checksums of example files (for smart update detection)
const KNOWN_EXAMPLE_HASHES = {
  'example-branch-office.json': {
    current: '06d9837cd5b78092dec30239a9068f480f420ceb06e93bb18225ea760d7c3bcd', // v0.1.7+
    old: '548bd3245566da60fb013c3cbbd2afa91ef85ff5f88d2f961e209dc6035ef70c', // v0.1.6
  },
  'example-campus-network.json': {
    current: 'c9584bafd7af225dff0074fdb45d0ac8bea6206900d7a9d03ade4a3508c6c066', // v0.1.7+
    old: 'c55b5069757bd5345d6341dc7d312eed019de804356266ec0064a36459b4f356', // v0.1.6
  },
  'example-data-center.json': {
    current: '88afc274405a1bdfac7f63427d9cad6a646f121e1d7b210f4f2efa1a8118296f', // v0.1.7+
    old: '253f7688dc0ce52b94773cde25f9b216825cbe4cc340831fa22263822d35c210', // v0.1.6
  },
};

// Map of old unprefixed filenames to new prefixed filenames
const OLD_TO_NEW_FILENAMES = {
  'branch-office.json': 'example-branch-office.json',
  'campus-network.json': 'example-campus-network.json',
  'data-center.json': 'example-data-center.json',
};

/**
 * Calculate SHA-256 checksum of a file
 */
function calculateFileHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    return null;
  }
}

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
 * Smart copy/update example file with checksum detection
 * - Copies new example files
 * - Updates outdated example files (based on checksum)
 * - Preserves user-created files (unknown checksum)
 * - Handles migration from old unprefixed names to new prefixed names
 */
function smartCopyExample(sourceDir, destDir, filename) {
  const sourcePath = path.join(sourceDir, filename);
  const destPath = path.join(destDir, filename);

  // Check if source file exists
  if (!fs.existsSync(sourcePath)) {
    console.log(`${colors.yellow}⚠${colors.reset} Example file not found: ${filename}`);
    return false;
  }

  // Get the old unprefixed filename (if this is a prefixed example)
  const oldFilename = Object.keys(OLD_TO_NEW_FILENAMES).find(
    (key) => OLD_TO_NEW_FILENAMES[key] === filename,
  );
  const oldDestPath = oldFilename ? path.join(destDir, oldFilename) : null;

  // Check for old unprefixed file first
  if (oldDestPath && fs.existsSync(oldDestPath)) {
    const oldHash = calculateFileHash(oldDestPath);
    const knownHashes = KNOWN_EXAMPLE_HASHES[filename];

    if (knownHashes && oldHash === knownHashes.old) {
      // Old example file detected - migrate to new prefixed name
      try {
        fs.unlinkSync(oldDestPath);
        fs.copyFileSync(sourcePath, destPath);
        console.log(
          `${colors.green}✓${colors.reset} Migrated ${colors.blue}${oldFilename}${colors.reset} → ${colors.blue}${filename}${colors.reset} (updated from v0.1.6)`,
        );
        return true;
      } catch (error) {
        console.log(
          `${colors.yellow}⚠${colors.reset} Failed to migrate ${oldFilename}: ${error.message}`,
        );
        return false;
      }
    } else {
      // User file with old name - preserve it
      console.log(
        `${colors.dim}  ↳ ${oldFilename} exists (user file, preserving)${colors.reset}`,
      );
      // Still copy the new prefixed example for reference
      if (!fs.existsSync(destPath)) {
        try {
          fs.copyFileSync(sourcePath, destPath);
          console.log(
            `${colors.green}✓${colors.reset} Copied ${colors.blue}${filename}${colors.reset} (as reference)`,
          );
          return true;
        } catch (error) {
          return false;
        }
      }
      return false;
    }
  }

  // Check if new prefixed file exists
  if (fs.existsSync(destPath)) {
    const destHash = calculateFileHash(destPath);
    const knownHashes = KNOWN_EXAMPLE_HASHES[filename];

    if (!knownHashes) {
      // No known hashes for this file, skip
      console.log(`${colors.dim}  ↳ ${filename} already exists, skipping${colors.reset}`);
      return false;
    }

    if (destHash === knownHashes.current) {
      // Already up-to-date
      console.log(`${colors.dim}  ↳ ${filename} already up-to-date${colors.reset}`);
      return false;
    } else if (destHash === knownHashes.old) {
      // Outdated example - update it
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(
          `${colors.green}✓${colors.reset} Updated ${colors.blue}${filename}${colors.reset} (was outdated v0.1.6 version)`,
        );
        return true;
      } catch (error) {
        console.log(
          `${colors.yellow}⚠${colors.reset} Failed to update ${filename}: ${error.message}`,
        );
        return false;
      }
    } else {
      // Unknown hash - user file, preserve it
      console.log(`${colors.dim}  ↳ ${filename} exists (user file, preserving)${colors.reset}`);
      return false;
    }
  }

  // File doesn't exist - copy it
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
      console.log(
        `${colors.green}✓${colors.reset} Created directory: ${colors.dim}${savedPlansDir}${colors.reset}`,
      );
    } else {
      console.log(`${colors.dim}  ↳ Directory already exists: ${savedPlansDir}${colors.reset}`);
    }

    // Check if examples source directory exists
    if (!fs.existsSync(examplesSourceDir)) {
      console.log(
        `${colors.yellow}⚠${colors.reset} Examples directory not found in package, skipping example setup`,
      );
      console.log(`${colors.green}✓${colors.reset} cidrly setup complete!\n`);
      return;
    }

    // Copy/update example files with smart detection
    console.log(`\n${colors.blue}Setting up example network plans...${colors.reset}`);
    const examples = [
      'example-campus-network.json',
      'example-data-center.json',
      'example-branch-office.json',
    ];

    let updatedCount = 0;
    for (const example of examples) {
      if (smartCopyExample(examplesSourceDir, savedPlansDir, example)) {
        updatedCount++;
      }
    }

    // Final message
    if (updatedCount > 0) {
      console.log(
        `\n${colors.green}✓${colors.reset} Successfully set up ${updatedCount} example plan${updatedCount > 1 ? 's' : ''}`,
      );
      console.log(`${colors.dim}  Location: ${savedPlansDir}${colors.reset}`);
      console.log(
        `\n${colors.blue}Get started:${colors.reset} Run ${colors.green}cidrly${colors.reset} and press ${colors.green}l${colors.reset} to load an example!\n`,
      );
    } else {
      console.log(`\n${colors.green}✓${colors.reset} cidrly setup complete!\n`);
    }
  } catch (error) {
    // Don't fail installation on setup errors
    console.error(`${colors.yellow}⚠${colors.reset} Setup warning: ${error.message}`);
    console.log(
      `${colors.dim}  You can still use cidrly, but you may need to manually create ${getSavedPlansDir()}${colors.reset}\n`,
    );
  }
}

// Only run if not being imported
if (require.main === module) {
  setupCidrly();
}

module.exports = { setupCidrly, getSavedPlansDir };
