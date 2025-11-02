/**
 * PDF Formatter
 * Generates professional PDF reports from NetworkPlan
 */

import fs from 'fs';
import PDFDocument from 'pdfkit';
import type { NetworkPlan, Subnet } from '../core/models/network-plan.js';

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

      renderSubnetTable(doc, plan.subnets, options);
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
 * Render subnet allocation table
 */
function renderSubnetTable(doc: PDFKit.PDFDocument, subnets: Subnet[], options: PDFOptions): void {
  doc
    .fontSize(options.fontSize.heading)
    .fillColor(options.colors.primary)
    .text('Subnet Allocation');

  doc.moveDown(0.5);

  // Table configuration
  const tableTop = doc.y;
  const colWidths = {
    name: 120,
    vlan: 45,
    devices: 60,
    planned: 60,
    capacity: 65,
    network: 100,
  };

  const startX = options.margin;
  let currentY = tableTop;

  // Draw table header
  doc.fontSize(options.fontSize.body).font('Helvetica-Bold').fillColor(options.colors.text);

  // Header background (reduced height for compact display)
  doc
    .rect(startX, currentY, doc.page.width - 2 * options.margin, 16)
    .fill(options.colors.lightGray);

  currentY += 3;

  // Header text
  let currentX = startX + 5;
  doc.fillColor(options.colors.text);
  doc.text('Subnet Name', currentX, currentY, { width: colWidths.name });
  currentX += colWidths.name;
  doc.text('VLAN', currentX, currentY, { width: colWidths.vlan });
  currentX += colWidths.vlan;
  doc.text('Devices', currentX, currentY, { width: colWidths.devices });
  currentX += colWidths.devices;
  doc.text('Planned', currentX, currentY, { width: colWidths.planned });
  currentX += colWidths.planned;
  doc.text('Capacity', currentX, currentY, { width: colWidths.capacity });
  currentX += colWidths.capacity;
  doc.text('Network Address', currentX, currentY, { width: colWidths.network });

  currentY += 16;
  doc.font('Helvetica');

  // Draw table rows
  subnets.forEach((subnet, index) => {
    // Check if we need a new page
    if (currentY > doc.page.height - options.margin - 50) {
      doc.addPage();
      currentY = options.margin;
    }

    // Alternate row colors (reduced height for compact display)
    if (index % 2 === 0) {
      doc
        .rect(startX, currentY, doc.page.width - 2 * options.margin, 14)
        .fill('#f8fafc')
        .fillColor(options.colors.text);
    }

    currentY += 2;
    currentX = startX + 5;

    doc.fontSize(options.fontSize.small);

    // Subnet name
    doc.text(subnet.name, currentX, currentY, {
      width: colWidths.name - 10,
      ellipsis: true,
    });

    // VLAN ID
    currentX += colWidths.name;
    doc.text(String(subnet.vlanId), currentX, currentY, { width: colWidths.vlan });

    // Device count (required)
    currentX += colWidths.vlan;
    doc.text(String(subnet.expectedDevices), currentX, currentY, { width: colWidths.devices });

    // Planned devices (after growth)
    currentX += colWidths.devices;
    const planned = subnet.subnetInfo?.plannedDevices ?? subnet.expectedDevices;
    doc.text(String(planned), currentX, currentY, { width: colWidths.planned });

    // Capacity (usable hosts)
    currentX += colWidths.planned;
    const capacity = subnet.subnetInfo?.usableHosts ?? 'N/A';
    doc.text(String(capacity), currentX, currentY, { width: colWidths.capacity });

    // Network address
    currentX += colWidths.capacity;
    const networkAddr = subnet.subnetInfo?.networkAddress ?? 'N/A';
    doc.text(networkAddr, currentX, currentY, { width: colWidths.network });

    currentY += 14;
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
    `Network: ${supernet.networkAddress}/${supernet.cidrPrefix}`,
    `Total: ${supernet.totalSize}`,
    `Used: ${supernet.usedSize}`,
    `Efficiency: ${supernet.efficiency.toFixed(2)}%`,
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
  doc.moveDown(2);

  doc
    .fontSize(options.fontSize.small)
    .fillColor(options.colors.secondary)
    .text(`Generated by cidrly v0.3.0 | ${new Date().toLocaleDateString()}`, {
      align: 'center',
    })
    .text('https://github.com/chuckycastle/cidrly', {
      align: 'center',
      link: 'https://github.com/chuckycastle/cidrly',
    });
}
