# Example Network Plans

This directory contains sample network plans demonstrating common network architectures and cidrly's features.

## Available Examples

### 1. Campus Network (`example-campus-network.json`)

**Scenario:** Multi-building university campus with diverse networking needs

**Subnets:**

- Engineering Building (VLAN 10): 100 devices → /24
- Science Lab (VLAN 20): 75 devices → /24
- Student WiFi (VLAN 30): 250 devices → /23
- Administration (VLAN 40): 30 devices → /26
- Guest WiFi (VLAN 50): 50 devices → /25

**Supernet:** 10.100.0.0/21 (2048 addresses)
**Efficiency:** 59.4% supernet, 100% range

**Demonstrates:**

- Mixed subnet sizes (from /23 to /26)
- VLSM optimization for diverse requirements
- Large WiFi networks with capacity planning
- VLAN organization for different departments

### 2. Data Center (`example-data-center.json`)

**Scenario:** Three-tier application infrastructure with specialized networks

**Subnets:**

- Web Tier (VLAN 100): 20 devices → /26
- Application Tier (VLAN 110): 30 devices → /26
- Database Tier (VLAN 120): 10 devices → /27
- Storage Network (VLAN 130): 15 devices → /27
- Management (VLAN 140): 8 devices → /27
- Backup Network (VLAN 150): 5 devices → /28

**Supernet:** 172.16.0.0/24 (256 addresses)
**Efficiency:** 93.8% supernet, 100% range

**Demonstrates:**

- High efficiency in tightly-packed networks
- Tier-based network segregation
- Small management and backup networks
- Optimal CIDR allocation for data center use

### 3. Branch Office (`example-branch-office.json`)

**Scenario:** Small branch office with basic networking requirements

**Subnets:**

- Office Workstations (VLAN 10): 25 devices → /26
- VoIP Phones (VLAN 20): 15 devices → /27
- Guest WiFi (VLAN 30): 10 devices → /27
- Printers (VLAN 40): 5 devices → /28
- Servers (VLAN 50): 3 devices → /29

**Supernet:** 192.168.10.0/25 (128 addresses)
**Efficiency:** 118.8% supernet, 100% range

**Demonstrates:**

- Small network with excellent packing
- VoIP network segregation
- Multiple small networks (/28, /29)
- Typical branch office architecture

## Loading Examples

### From the Dashboard

1. Launch cidrly: `cidrly`
2. Press `l` to load a plan
3. Navigate to the `examples/` directory
4. Select an example plan

### From Command Line

```bash
# Load campus network
cidrly view --plan=examples/example-campus-network.json

# Load data center
cidrly view --plan=examples/example-data-center.json

# Load branch office
cidrly view --plan=examples/example-branch-office.json
```

## Understanding the Plans

### Supernet Efficiency

Shows how well subnets fit into the smallest containing supernet:

- **< 60%**: Loose packing, larger IP block needed
- **60-80%**: Good efficiency, reasonable utilization
- **80-95%**: Excellent packing, minimal waste
- **> 95%**: Near-perfect utilization

### Range Efficiency

Shows how tightly subnets are packed (VLSM optimization):

- **100%**: Perfect VLSM allocation (no gaps)
- **< 100%**: Gaps between subnets (shouldn't happen with cidrly!)

### The 50% Planning Rule

Each example shows "expected devices" vs "planned devices":

- **Expected:** Devices you know about today
- **Planned:** 2x expected (50% growth capacity)
- **Allocated:** Next power of 2 that fits planned devices

Example: 25 expected → 50 planned → 64 allocated (/26)

## Modifying Examples

Feel free to experiment with these plans:

1. **Load an example**
2. **Add more subnets** (press `a`)
3. **Recalculate** (press `c`)
4. **See how efficiency changes**
5. **Save your modified version** (press `s`)

## Common Patterns

### High-Density Networks

Use the data center example to see:

- Tight address packing
- Smaller subnet sizes (/26-/28)
- High supernet efficiency (93.8%)

### Mixed Requirements

Use the campus example to see:

- Large WiFi networks (/23)
- Medium office networks (/24-/25)
- Small admin networks (/26)
- VLSM handling diverse needs

### Small Networks

Use the branch office example to see:

- Very small subnets (/28-/29)
- Efficient use of limited address space
- Over-allocation possibility (118.8%)

## Creating Your Own

These examples can serve as templates:

1. **Start with similar example**
2. **Change base IP** (press `b`)
3. **Edit subnet names** (press `e`)
4. **Adjust device counts**
5. **Add/remove subnets** (press `a`/`x`)
6. **Save as new plan** (press `s`)

## Testing Features

Use these examples to test cidrly features:

- ✅ Load/save functionality
- ✅ Subnet information dialog (press `i`)
- ✅ Edit existing subnets
- ✅ Delete and recalculate
- ✅ Base IP changes
- ✅ VLSM optimization
- ✅ Efficiency calculations

## Questions?

See [BETA_README.md](../BETA_README.md) for beta testing guidelines and feedback instructions.
