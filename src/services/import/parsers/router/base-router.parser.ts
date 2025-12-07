/**
 * Base Router Parser
 * Shared utilities for router configuration parsers
 */

import type { ParseResult } from '../../import.types.js';

/**
 * Base class for router configuration parsers
 */
export abstract class BaseRouterParser {
  /**
   * Parse an IP address with subnet mask to CIDR notation
   */
  protected toCidr(ip: string, mask: string): string {
    const cidr = this.maskToCidr(mask);
    return `${ip}/${cidr}`;
  }

  /**
   * Convert dotted decimal mask to CIDR prefix
   */
  protected maskToCidr(mask: string): number {
    const octets = mask.split('.').map(Number);
    let bits = 0;
    for (const octet of octets) {
      bits += this.countBits(octet);
    }
    return bits;
  }

  /**
   * Count the number of 1-bits in a byte
   */
  private countBits(n: number): number {
    let count = 0;
    let val = n;
    while (val) {
      count += val & 1;
      val >>>= 1;
    }
    return count;
  }

  /**
   * Calculate gateway from network address
   */
  protected calculateGateway(networkAddress: string): string {
    const parts = (networkAddress.split('/')[0] ?? '').split('.');
    if (parts.length === 4) {
      parts[3] = '1';
      return parts.join('.');
    }
    return networkAddress.split('/')[0] ?? '';
  }

  /**
   * Calculate network address from gateway IP and CIDR
   */
  protected gatewayToNetwork(gateway: string, cidr: number): string {
    const parts = gateway.split('.').map(Number);
    if (parts.length !== 4) return `${gateway}/${cidr}`;

    const mask = cidr === 0 ? 0 : (0xffffffff << (32 - cidr)) >>> 0;
    const ip =
      ((parts[0] ?? 0) << 24) | ((parts[1] ?? 0) << 16) | ((parts[2] ?? 0) << 8) | (parts[3] ?? 0);
    const network = (ip & mask) >>> 0;

    const networkParts = [
      (network >>> 24) & 0xff,
      (network >>> 16) & 0xff,
      (network >>> 8) & 0xff,
      network & 0xff,
    ];

    return `${networkParts.join('.')}/${cidr}`;
  }

  /**
   * Extract VLAN ID from interface name
   */
  protected extractVlanIdFromInterface(interfaceName: string): number | null {
    const match = interfaceName.match(/[Vv]lan\s*(\d+)/);
    return match?.[1] ? parseInt(match[1], 10) : null;
  }

  /**
   * Sanitize name for use as subnet name
   */
  protected sanitizeName(name: string): string {
    return (
      name
        .replace(/_/g, ' ')
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .trim() || 'Unnamed'
    );
  }

  /**
   * Create empty parse result with error
   */
  protected errorResult(message: string): ParseResult {
    return {
      success: false,
      subnets: [],
      warnings: [],
      errors: [{ message }],
    };
  }
}
