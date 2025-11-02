/**
 * Export Service
 * Handles export operations to various formats (YAML, CSV, PDF)
 */

import fs from 'fs/promises';
import path from 'path';
import type { NetworkPlan } from '../core/models/network-plan.js';
import { ErrorFactory } from '../errors/index.js';
import { exportToCsv } from '../formatters/csv-formatter.js';
import { generatePdfReport } from '../formatters/pdf-formatter.js';
import { exportToYaml } from '../formatters/yaml-formatter.js';
import { FILE_RULES } from '../infrastructure/config/validation-rules.js';
import { sanitizeFilePath, validateFilename } from '../infrastructure/security/security-utils.js';

export type ExportFormat = 'yaml' | 'csv' | 'pdf';

/**
 * Service class for exporting network plans to various formats
 */
export class ExportService {
  constructor(private readonly exportsDirectory: string = FILE_RULES.EXPORTS_DIR) {
    // Ensure exports directory exists
    this.ensureDirectoryExists();
  }

  /**
   * Ensure the exports directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.exportsDirectory, { recursive: true });
    } catch {
      // Directory might already exist, that's fine
    }
  }

  /**
   * Export a network plan to the specified format
   *
   * @param plan - The network plan to export
   * @param format - The export format (yaml, csv, pdf)
   * @param filename - Optional custom filename (will use plan name if not provided)
   * @returns The full path to the exported file
   */
  async export(plan: NetworkPlan, format: ExportFormat, filename?: string): Promise<string> {
    await this.ensureDirectoryExists();

    // Determine filename
    const extension = this.getExtensionForFormat(format);
    const finalFilename = filename
      ? this.ensureExtension(filename, extension)
      : `${this.sanitizePlanName(plan.name)}${extension}`;

    // Validate filename
    const validation = validateFilename(finalFilename);
    if (validation !== true) {
      throw ErrorFactory.invalidFilename(finalFilename, validation);
    }

    // Build safe file path
    const filepath = sanitizeFilePath(finalFilename, this.exportsDirectory);

    // Route to appropriate formatter
    try {
      switch (format) {
        case 'yaml':
          await this.exportToYaml(plan, filepath);
          break;
        case 'csv':
          await this.exportToCsv(plan, filepath);
          break;
        case 'pdf':
          await this.exportToPdf(plan, filepath);
          break;
        default:
          throw ErrorFactory.unsupportedFormat(format);
      }

      return filepath;
    } catch (error) {
      if (error instanceof Error) {
        throw ErrorFactory.exportError(format, filepath, error);
      }
      throw new Error('Unknown export error');
    }
  }

  /**
   * Export plan to YAML format
   */
  private async exportToYaml(plan: NetworkPlan, filepath: string): Promise<void> {
    const yamlContent = exportToYaml(plan);
    await fs.writeFile(filepath, yamlContent, 'utf-8');
  }

  /**
   * Export plan to CSV format
   */
  private async exportToCsv(plan: NetworkPlan, filepath: string): Promise<void> {
    const csvContent = exportToCsv(plan);
    await fs.writeFile(filepath, csvContent, 'utf-8');
  }

  /**
   * Export plan to PDF format
   */
  private async exportToPdf(plan: NetworkPlan, filepath: string): Promise<void> {
    await generatePdfReport(plan, filepath);
  }

  /**
   * Get file extension for a given format
   */
  private getExtensionForFormat(format: ExportFormat): string {
    switch (format) {
      case 'yaml':
        return FILE_RULES.EXPORT_EXTENSIONS.YAML;
      case 'csv':
        return FILE_RULES.EXPORT_EXTENSIONS.CSV;
      case 'pdf':
        return FILE_RULES.EXPORT_EXTENSIONS.PDF;
      default:
        return FILE_RULES.DEFAULT_EXTENSION;
    }
  }

  /**
   * Ensure filename has correct extension
   */
  private ensureExtension(filename: string, extension: string): string {
    if (filename.endsWith(extension)) {
      return filename;
    }
    // Remove any existing extension
    const baseName = filename.replace(/\.[^.]+$/, '');
    return `${baseName}${extension}`;
  }

  /**
   * Sanitize plan name for use as filename
   */
  private sanitizePlanName(planName: string): string {
    return planName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * List all exported files
   */
  async listExports(): Promise<string[]> {
    try {
      await this.ensureDirectoryExists();
      const files = await fs.readdir(this.exportsDirectory);
      return files.filter((file) => {
        const ext = path.extname(file);
        return FILE_RULES.ALLOWED_EXTENSIONS.includes(
          ext as (typeof FILE_RULES.ALLOWED_EXTENSIONS)[number],
        );
      });
    } catch {
      return [];
    }
  }
}
