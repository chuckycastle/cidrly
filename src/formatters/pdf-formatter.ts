/**
 * PDF Formatter
 * Generates professional PDF reports from NetworkPlan
 */

import fs, { readFileSync } from 'fs';
import { dirname, join } from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import type { NetworkPlan, Subnet } from '../core/models/network-plan.js';
import type { Preferences } from '../schemas/preferences.schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8')) as {
  version: string;
};
const VERSION = packageJson.version;

interface PDFOptions {
  margin: number;
  fontSize: {
    title: number;
    heading: number;
    body: number;
    small: number;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    lightGray: string;
  };
}

const DEFAULT_OPTIONS: PDFOptions = {
  margin: 35,
  fontSize: {
    title: 20,
    heading: 14,
    body: 10,
    small: 8,
  },
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    text: '#1e293b',
    lightGray: '#e2e8f0',
  },
};

/**
 * Generate PDF report from NetworkPlan
 */
export async function generatePdfReport(
  plan: NetworkPlan,
  filepath: string,
  options: PDFOptions = DEFAULT_OPTIONS,
  preferences?: Preferences,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: {
          top: options.margin,
          bottom: options.margin,
          left: options.margin,
          right: options.margin,
        },
      });

      const stream = fs.createWriteStream(filepath);

      stream.on('finish', () => resolve());
      stream.on('error', (error) => reject(error));

      doc.pipe(stream);

      // Render document sections (ordered to match CLI dashboard flow)
      renderHeader(doc, plan, options);
      renderMetadata(doc, plan, options);

      if (plan.supernet) {
        renderSupernet(doc, plan.supernet, options);
      }

      renderSubnetTable(doc, plan.subnets, options, preferences);
      renderFooter(doc, options);

      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error('PDF generation failed'));
    }
  });
}

/**
 * Render document header
 */
function renderHeader(doc: PDFKit.PDFDocument, plan: NetworkPlan, options: PDFOptions): void {
  doc
    .fontSize(options.fontSize.title)
    .fillColor(options.colors.primary)
    .text('Network Plan Report', { align: 'center' })
    .moveDown(0.3);

  doc
    .fontSize(options.fontSize.heading)
    .fillColor(options.colors.text)
    .text(plan.name, { align: 'center' })
    .moveDown(0.3);

  // Add horizontal line
  doc
    .strokeColor(options.colors.lightGray)
    .lineWidth(1)
    .moveTo(options.margin, doc.y)
    .lineTo(doc.page.width - options.margin, doc.y)
    .stroke()
    .moveDown(0.3);
}

/**
 * Render metadata section with compact inline layout
 */
function renderMetadata(doc: PDFKit.PDFDocument, plan: NetworkPlan, options: PDFOptions): void {
  doc.fontSize(options.fontSize.heading).fillColor(options.colors.primary).text('Plan Details');

  doc.moveDown(0.3);

  // Build compact inline format: "Base IP: 10.0.0.0  •  Total Subnets: 5  •  Growth: 25%  •  Created: 1/15/2024"
  const metadataText = [
    `Base IP: ${plan.baseIp}`,
    `Total Subnets: ${plan.subnets.length}`,
    `Growth: ${plan.growthPercentage}%`,
    `Created: ${new Date(plan.createdAt).toLocaleDateString()}`,
  ].join('  •  ');

  doc
    .fontSize(options.fontSize.small)
    .fillColor(options.colors.text)
    .text(metadataText, options.margin, doc.y);

  doc.moveDown(0.5);
}

/**
 * Column configuration for PDF table
 */
type PdfColumnKey =
  | 'name'
  | 'vlan'
  | 'expected'
  | 'planned'
  | 'cidr'
  | 'usable'
  | 'network'
  | 'description';

interface PdfColumn {
  key: PdfColumnKey;
  label: string;
  width: number;
  getValue: (subnet: Subnet) => string;
}

const PDF_COLUMNS: Record<PdfColumnKey, PdfColumn> = {
  name: {
    key: 'name',
    label: 'Subnet Name',
    width: 90,
    getValue: (subnet) => subnet.name,
  },
  vlan: {
    key: 'vlan',
    label: 'VLAN',
    width: 40,
    getValue: (subnet) => String(subnet.vlanId),
  },
  expected: {
    key: 'expected',
    label: 'Devices',
    width: 50,
    getValue: (subnet) => String(subnet.expectedDevices),
  },
  planned: {
    key: 'planned',
    label: 'Planned',
    width: 50,
    getValue: (subnet) => String(subnet.subnetInfo?.plannedDevices ?? subnet.expectedDevices),
  },
  cidr: {
    key: 'cidr',
    label: 'CIDR',
    width: 40,
    getValue: (subnet) => (subnet.subnetInfo ? `/${subnet.subnetInfo.cidrPrefix}` : 'N/A'),
  },
  usable: {
    key: 'usable',
    label: 'Max\nHosts',
    width: 65,
    getValue: (subnet) => String(subnet.subnetInfo?.usableHosts ?? 'N/A'),
  },
  network: {
    key: 'network',
    label: 'Network',
    width: 90,
    getValue: (subnet) => {
      const addr = subnet.subnetInfo?.networkAddress ?? 'N/A';
      return subnet.networkLocked ? `${addr}*` : addr;
    },
  },
  description: {
    key: 'description',
    label: 'Description',
    width: 100,
    getValue: (subnet) => subnet.description ?? '',
  },
};

/**
 * Render subnet allocation table
 */
function renderSubnetTable(
  doc: PDFKit.PDFDocument,
  subnets: Subnet[],
  options: PDFOptions,
  preferences?: Preferences,
): void {
  doc
    .fontSize(options.fontSize.heading)
    .fillColor(options.colors.primary)
    .text('Subnet Allocation');

  doc.moveDown(0.5);

  // Determine which columns to display
  let columns: PdfColumn[];
  if (preferences?.columnPreferences) {
    const { columnOrder, visibleColumns } = preferences.columnPreferences;
    const visibleSet = new Set<string>(visibleColumns);
    columns = columnOrder
      .filter(
        (col): col is PdfColumnKey => col in PDF_COLUMNS && (col === 'name' || visibleSet.has(col)),
      )
      .map((col) => PDF_COLUMNS[col]);
  } else {
    // Default columns
    columns = [
      PDF_COLUMNS.name,
      PDF_COLUMNS.vlan,
      PDF_COLUMNS.expected,
      PDF_COLUMNS.planned,
      PDF_COLUMNS.usable,
      PDF_COLUMNS.network,
    ];
  }

  const tableTop = doc.y;
  const startX = options.margin;
  let currentY = tableTop;

  // Draw table header
  doc.fontSize(options.fontSize.body).font('Helvetica-Bold').fillColor(options.colors.text);

  // Calculate header height (support multi-line headers like "Max\nHosts")
  const headerHeight = 28; // Increased from 20 to accommodate 2-line headers

  // Header background
  doc
    .rect(startX, currentY, doc.page.width - 2 * options.margin, headerHeight)
    .fill(options.colors.lightGray);

  currentY += 3;

  // Header text (supports line breaks for multi-word headers like "Max\nHosts")
  let currentX = startX + 5;
  doc.fillColor(options.colors.text);
  columns.forEach((col) => {
    doc.text(col.label, currentX, currentY, {
      width: col.width - 5,
      align: 'left',
      lineBreak: true,
    });
    currentX += col.width;
  });

  currentY += headerHeight;
  doc.font('Helvetica');

  // Draw table rows
  subnets.forEach((subnet, index) => {
    // Calculate row height based on content (support multi-line text)
    const cellValues = columns.map((col) => col.getValue(subnet));
    const maxLines = Math.max(
      ...cellValues.map((val) => {
        const lines = String(val).split('\n').length;
        const wrappedLines = Math.ceil(String(val).length / 20); // Rough estimate
        return Math.max(lines, wrappedLines);
      }),
    );
    const rowHeight = Math.max(14, maxLines * 10 + 4);

    // Check if we need a new page
    if (currentY > doc.page.height - options.margin - rowHeight - 20) {
      doc.addPage();
      currentY = options.margin;
    }

    // Alternate row colors
    if (index % 2 === 0) {
      doc
        .rect(startX, currentY, doc.page.width - 2 * options.margin, rowHeight)
        .fill('#f8fafc')
        .fillColor(options.colors.text);
    }

    currentY += 2;
    currentX = startX + 5;

    doc.fontSize(options.fontSize.small);

    // Render each column's value (with text wrapping instead of ellipsis)
    columns.forEach((col) => {
      const value = col.getValue(subnet);
      doc.text(value, currentX, currentY, {
        width: col.width - 5,
        ellipsis: false,
        lineBreak: true,
      });
      currentX += col.width;
    });

    currentY += rowHeight;
  });

  doc.moveDown(0.5);
}

/**
 * Render supernet summary with compact inline layout
 */
function renderSupernet(
  doc: PDFKit.PDFDocument,
  supernet: NonNullable<NetworkPlan['supernet']>,
  options: PDFOptions,
): void {
  // Check if we need a new page
  if (doc.y > doc.page.height - options.margin - 150) {
    doc.addPage();
  }

  doc.fontSize(options.fontSize.heading).fillColor(options.colors.primary);
  doc.text('Supernet Summary', options.margin, doc.y);

  doc.moveDown(0.3);

  // Build compact inline format: "Network: 10.0.0.0/21  •  Total: 2048  •  Used: 1216  •  Efficiency: 59.38%  •  Range: 100.00%"
  const supernetText = [
    `Network: ${supernet.networkAddress}`,
    `Total: ${supernet.totalSize}`,
    `Used: ${supernet.usedSize}`,
    `Utilization: ${supernet.utilization.toFixed(2)}%`,
    `Range: ${supernet.rangeEfficiency.toFixed(2)}%`,
  ].join('  •  ');

  doc
    .fontSize(options.fontSize.small)
    .fillColor(options.colors.text)
    .text(supernetText, options.margin, doc.y);

  doc.moveDown(0.5);
}

/**
 * Render footer at bottom of current page
 */
function renderFooter(doc: PDFKit.PDFDocument, options: PDFOptions): void {
  doc.moveDown(1);

  const tableWidth = doc.page.width - 2 * options.margin;

  // Add legend for locked subnets
  doc
    .fontSize(options.fontSize.small)
    .fillColor(options.colors.secondary)
    .text('* = Locked network address (manual allocation)', options.margin, doc.y, {
      width: tableWidth,
      align: 'left',
    });

  doc.moveDown(1);

  doc
    .fontSize(options.fontSize.small)
    .fillColor(options.colors.secondary)
    .text(
      `Generated by cidrly v${VERSION} | ${new Date().toLocaleDateString()}`,
      options.margin,
      doc.y,
      {
        width: tableWidth,
        align: 'center',
      },
    )
    .text('https://github.com/chuckycastle/cidrly', options.margin, doc.y, {
      width: tableWidth,
      align: 'center',
      link: 'https://github.com/chuckycastle/cidrly',
    });
}
