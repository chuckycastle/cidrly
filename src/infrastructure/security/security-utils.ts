/**
 * Security Utilities
 * Provides security-related helper functions with enhanced path traversal protection
 */

import path from 'path';
import { FILENAME_RULES } from '../config/validation-rules.js';

/**
 * Decode URL-encoded characters to prevent bypassing validation
 * @param input - String that may contain URL-encoded characters
 * @returns Decoded string
 */
function decodePathSafe(input: string): string {
  try {
    // Decode URL-encoded characters (e.g., %2e%2e%2f -> ../)
    let decoded = decodeURIComponent(input);
    // Double-decode to catch double-encoding attacks
    decoded = decodeURIComponent(decoded);
    return decoded;
  } catch {
    // If decoding fails, return original to let other checks catch it
    return input;
  }
}

/**
 * Normalize path and check for dangerous patterns
 * @param filePath - Path to normalize
 * @returns Normalized path
 */
function normalizePath(filePath: string): string {
  // Decode URL encoding first
  const decoded = decodePathSafe(filePath);

  // Normalize the path (resolve ., .., etc.)
  const normalized = path.normalize(decoded);

  return normalized;
}

/**
 * Validates and sanitizes a file path to prevent path traversal attacks
 * Enhanced with multiple layers of protection
 * @param filePath - The file path to validate
 * @param baseDir - The base directory to restrict access to
 * @returns Sanitized absolute path
 * @throws Error if path is invalid or attempts to escape base directory
 */
export function sanitizeFilePath(filePath: string, baseDir: string): string {
  // Normalize both paths to prevent path traversal
  const normalizedBase = path.resolve(baseDir);

  // Decode and normalize input path
  const decodedPath = normalizePath(filePath);

  // Check for null bytes (path traversal technique)
  if (filePath.includes('\0') || decodedPath.includes('\0')) {
    throw new Error('Invalid file path: Null byte detected');
  }

  // Check for dangerous patterns even after decoding
  if (decodedPath.includes('..') || filePath.includes('..')) {
    throw new Error('Invalid file path: Parent directory reference detected');
  }

  // Check for absolute paths (should be relative to baseDir)
  if (path.isAbsolute(filePath)) {
    throw new Error('Invalid file path: Absolute paths not allowed');
  }

  // Resolve the final path
  const normalizedPath = path.resolve(normalizedBase, decodedPath);

  // Check if the resolved path is within the base directory
  if (!normalizedPath.startsWith(normalizedBase + path.sep) && normalizedPath !== normalizedBase) {
    throw new Error('Invalid file path: Path traversal detected');
  }

  return normalizedPath;
}

/**
 * Validates that a filename is safe and doesn't contain dangerous characters
 * Enhanced with URL-encoding detection
 * @param filename - The filename to validate
 * @returns true if valid, error message otherwise
 */
export function validateFilename(filename: string): string | true {
  if (!filename || filename.trim().length === 0) {
    return 'Filename cannot be empty';
  }

  // Decode URL encoding to catch bypass attempts
  const decoded = decodePathSafe(filename);

  // Check for path separators (/, \) in both original and decoded
  if (
    filename.includes('/') ||
    filename.includes('\\') ||
    decoded.includes('/') ||
    decoded.includes('\\')
  ) {
    return 'Filename cannot contain path separators';
  }

  // Check for parent directory references in both original and decoded
  if (filename.includes('..') || decoded.includes('..')) {
    return 'Filename cannot contain parent directory references';
  }

  // Check for null bytes
  if (filename.includes('\0') || decoded.includes('\0')) {
    return 'Filename contains invalid characters';
  }

  // Check for dangerous characters
  if (
    FILENAME_RULES.FORBIDDEN_CHARS.test(filename) ||
    FILENAME_RULES.FORBIDDEN_CHARS.test(decoded)
  ) {
    return 'Filename contains invalid characters';
  }

  // Check filename length (common filesystem limit is 255)
  if (filename.length > FILENAME_RULES.MAX_LENGTH) {
    return `Filename is too long (max ${FILENAME_RULES.MAX_LENGTH} characters)`;
  }

  return true;
}

/**
 * Checks if a path is within an allowed directory
 * Enhanced with additional security checks
 * @param filePath - The file path to check
 * @param allowedDir - The allowed base directory
 * @returns true if path is safe, false otherwise
 */
export function isPathSafe(filePath: string, allowedDir: string): boolean {
  try {
    const normalizedBase = path.resolve(allowedDir);

    // Normalize and decode the input path
    const decodedPath = normalizePath(filePath);
    const normalizedPath = path.resolve(normalizedBase, decodedPath);

    // Check for dangerous patterns
    if (filePath.includes('\0') || filePath.includes('..')) {
      return false;
    }

    return (
      normalizedPath.startsWith(normalizedBase + path.sep) || normalizedPath === normalizedBase
    );
  } catch {
    return false;
  }
}

/**
 * Create a whitelist validator for allowed directories
 * @param allowedDirs - Array of allowed base directories
 * @returns Function that validates if a path is within allowed directories
 */
export function createPathWhitelist(allowedDirs: string[]): (filePath: string) => boolean {
  const normalizedAllowed = allowedDirs.map((dir) => path.resolve(dir));

  return (filePath: string): boolean => {
    try {
      const decoded = normalizePath(filePath);
      const normalized = path.resolve(decoded);

      return normalizedAllowed.some(
        (allowedDir) => normalized.startsWith(allowedDir + path.sep) || normalized === allowedDir,
      );
    } catch {
      return false;
    }
  };
}
