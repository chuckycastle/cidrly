# cidrly Architecture Guide

**Version:** 1.0.0-rc.2
**Last Updated:** 2025-10-24

---

## 🎯 Overview

cidrly is a modern, type-safe CLI tool for network architecture planning. Built with React/ink for a beautiful terminal UI, Pastel for CLI framework, and Zustand for state management.

### Core Capabilities

- Interactive React-based dashboard with keyboard navigation
- Command-line interface with 9 commands for quick operations
- Automatic subnet calculations with CIDR boundary alignment
- 50% capacity planning rule for future growth
- Type-safe file operations with Zod validation
- Multi-layer security with path traversal protection

---

## 🏗️ Technology Stack

### Core Framework

- **Node.js** v24.10.0 - Runtime environment
- **TypeScript** v5.7.2 - Type safety with strict mode
- **ink** v6.3.1 - React renderer for terminal UIs
- **React** v19.2.0 - Component framework with automatic JSX runtime
- **Pastel** v4.0.0 - CLI framework for command routing
- **Zustand** v5.0.8 - State management
- **chalk** v5.6.2 - Terminal text styling
- **Zod** v4.1.12 - Schema validation

### Enhancement Libraries

- **ink-gradient** v3.0.0 - Gradient text effects
- **ink-spinner** v5.0.0 - Loading indicators
- **ink-link** v5.0.0 - Clickable terminal links
- **ink-table** v3.1.0 - Professional table rendering
- **date-fns** v4.1.0 - Date formatting

### Development Tools

- **Jest** - Testing framework (184 tests across 9 suites)
- **Prettier** - Code formatting (100-char width)
- **ESLint** - TypeScript linting
- **Semgrep** - Security scanning

---

## 🏛️ Architecture

### Layered Architecture

```
┌─────────────────────────────────────────┐
│  Presentation Layer                     │
│  ├── CLI Commands (Pastel)              │
│  └── Dashboard Components (ink/React)   │
├─────────────────────────────────────────┤
│  State Management                       │
│  └── Zustand Stores (planStore, uiStore)│
├─────────────────────────────────────────┤
│  Service Layer                          │
│  ├── FileService                        │
│  └── NetworkPlanService                 │
├─────────────────────────────────────────┤
│  Repository Layer                       │
│  ├── FileSystemRepository               │
│  └── NetworkPlanRepository              │
├─────────────────────────────────────────┤
│  Domain Layer                           │
│  ├── Models (NetworkPlan, Subnet)       │
│  ├── Calculators (SubnetCalculator)     │
│  └── Validators                         │
├─────────────────────────────────────────┤
│  Infrastructure Layer                   │
│  ├── Security (Path sanitization)       │
│  ├── Configuration                      │
│  └── Schemas (Zod validation)           │
└─────────────────────────────────────────┘
```

### Application Modes

1. **Command-line Mode** (via Pastel)
   - Quick operations: `cidrly create`, `cidrly add`, `cidrly calculate`
   - Non-interactive, scriptable commands
   - Output to stdout/files

2. **Interactive Dashboard** (via ink)
   - Full-screen React UI with keyboard navigation
   - Real-time state updates with Zustand
   - Visual feedback with spinners and notifications

---

## 📁 Directory Structure

```
src/
├── cli.tsx                         # Pastel CLI entry point
├── commands/                       # CLI command modules
│   ├── index.tsx                   # Default dashboard launcher
│   ├── dashboard.tsx               # Explicit dashboard command
│   ├── create.tsx                  # Create network plan
│   ├── add.tsx                     # Add subnet
│   ├── calculate.tsx               # Calculate IP ranges
│   ├── view.tsx                    # View plan details
│   ├── save.tsx                    # Save plan
│   ├── load.tsx                    # Load/list plans
│   └── remove.tsx                  # Remove subnet
├── dashboard/
│   └── dashboard-cli.ts            # Dashboard entry point
├── core/                           # Domain logic layer
│   ├── models/
│   │   └── network-plan.ts         # Domain model
│   ├── calculators/
│   │   └── subnet-calculator.ts    # Subnet calculations
│   └── validators/
│       └── validators.ts           # Input validation
├── infrastructure/                 # Cross-cutting concerns
│   ├── security/
│   │   └── security-utils.ts       # Path sanitization
│   └── config/
│       └── validation-rules.ts     # Validation rules
├── services/                       # Business logic layer
│   ├── file.service.ts             # File operations
│   └── network-plan.service.ts     # Plan management
├── repositories/                   # Data access layer
│   ├── file-system.repository.ts   # File system operations
│   ├── network-plan.repository.ts  # Plan persistence
│   └── index.ts                    # Repository exports
├── components/                     # React components (ink)
│   ├── DashboardApp.tsx            # View router
│   ├── layout/
│   │   ├── Header.tsx              # Top header
│   │   ├── Footer.tsx              # Bottom shortcuts
│   │   └── Layout.tsx              # Main wrapper
│   ├── views/
│   │   ├── WelcomeView.tsx         # Welcome screen
│   │   └── DashboardView.tsx       # Main dashboard
│   ├── widgets/
│   │   ├── SubnetTable.tsx         # Subnet list
│   │   ├── NotificationDisplay.tsx # Notifications with priorities
│   │   ├── StatusCard.tsx          # Status widget
│   │   ├── EfficiencyBar.tsx       # Efficiency visualization
│   │   └── FilePicker.tsx          # File selection with metadata
│   └── dialogs/
│       ├── InputDialog.tsx         # Text input modal
│       ├── SelectDialog.tsx        # Selection modal
│       ├── ConfirmDialog.tsx       # Confirmation modal
│       └── SubnetInfoDialog.tsx    # Subnet details
├── hooks/                          # Custom React hooks
│   ├── useKeyboardShortcuts.ts     # Centralized keyboard management
│   └── useTerminalWidth.ts         # Terminal width detection
├── store/                          # Zustand state
│   ├── planStore.ts                # Network plan state
│   └── uiStore.ts                  # UI state
├── utils/
│   └── input-helpers.ts            # Input parsing
├── schemas/
│   └── network-plan.schema.ts      # Zod schemas
├── errors/
│   └── index.ts                    # Custom errors
└── themes/
    └── colors.ts                   # Color constants
```

---

## 🔑 Key Design Decisions

### Why Pastel + Ink + Chalk?

1. **Pastel** - CLI framework by ink's author (Vadim Demedes)
   - Command routing with argument parsing
   - Automatic help generation
   - TypeScript-first design

2. **Ink** - React for terminals
   - Component-driven UI development
   - Familiar React patterns (hooks, state, effects)
   - Composable, testable components

3. **Chalk** - Terminal styling
   - Industry standard for text colors
   - Works seamlessly with ink
   - Wide terminal compatibility

### Why Zustand for State?

- Lightweight (< 1KB) compared to Redux
- No boilerplate, simple API
- Works perfectly with React hooks
- Built-in devtools support
- TypeScript-friendly

### Security Architecture

**Multi-layer Path Protection:**

1. **Input sanitization** - Remove dangerous characters
2. **Path resolution** - Resolve relative paths to absolute
3. **Boundary checking** - Ensure paths stay within base directory
4. **URL-decode detection** - Catch encoded traversal attempts
5. **Symbolic link validation** - Verify resolved paths

**Example:**

```typescript
// All of these are blocked:
'../../../etc/passwd';
'..%2F..%2F..%2Fetc%2Fpasswd'; // URL encoded
'plans/../../secret.txt';
```

### Domain-Driven Design

- **Domain layer** (`core/`) is framework-agnostic
- Can be extracted to separate package
- Clear boundaries between layers
- Repository pattern for data access
- Service layer for business logic

---

## 🎨 Enhanced UI Features (v1.0.0-rc.1)

### VLSM Optimization Algorithm

**Location:** `src/core/models/network-plan.ts` - `calculateSubnetRanges()`

Implements **"Largest First" Variable Length Subnet Masking (VLSM)** optimization to maximize network efficiency.

**Problem Solved:**
Linear subnet allocation (processing subnets in user-defined order) creates large gaps of wasted IP space due to CIDR boundary alignment requirements. When a smaller subnet is allocated before a larger one, the larger subnet must align to its stricter boundary, creating wasted space between them.

**Example of Inefficiency (Linear Allocation):**

```
User adds subnets: Small (10 devices), Large (100 devices), Tiny (5 devices)

Linear allocation:
10.0.0.0/27   Small (32 addresses)
10.0.0.32     Next available
              Large needs /24 (256-aligned boundary)
              Must skip to 10.0.1.0
10.0.0.32 - 10.0.0.255  WASTED (224 addresses!)
10.0.1.0/24   Large (256 addresses)
10.0.2.0/28   Tiny (16 addresses)

Used: 304 addresses
Range: 10.0.0.0 - 10.0.2.15 = 528 addresses
Efficiency: 57.6% ❌
```

**Optimization Strategy:**

1. **Sort subnets by size (DESCENDING)** before allocation
2. Allocate addresses to sorted subnets (largest first)
3. **Display subnets in optimized order** (largest first)
4. Sequential allocation with zero gaps

**Optimized Allocation:**

```
Sorted order: Large (/24), Small (/27), Tiny (/28)

Optimized allocation:
10.0.0.0/24   Large (256 addresses)
10.0.1.0/27   Small (32 addresses)  ← naturally aligned!
10.0.1.32/28  Tiny (16 addresses)   ← naturally aligned!

Used: 304 addresses
Range: 10.0.0.0 - 10.0.1.47 = 304 addresses
Range Efficiency: 100% ✅ (perfect packing, zero waste)
```

**Why It Works:**

- Larger subnets have stricter alignment (larger boundaries)
- Their ending addresses are **naturally aligned** for smaller subnets
- Smaller subnets "fill gaps" perfectly without wasting space
- Each boundary is a multiple of all smaller subnet sizes

**Mathematical Proof:**
For CIDR `/n`, size = `2^(32-n)` and boundary = `2^(32-n)`:

- `/24` = 256 addresses (256-aligned)
- `/26` = 64 addresses (64-aligned)
- `/27` = 32 addresses (32-aligned)

Since `256 = 64 × 4 = 32 × 8`, allocating `/24` first means:

- End address: `base + 256`
- Next address is automatically 64-aligned AND 32-aligned
- **No gaps created!**

**Implementation Details:**

- Subnets are displayed in optimized order (largest first)
- Network addresses are allocated sequentially with zero gaps
- 100% backward compatible (existing plans recalculate with better efficiency)
- Service layer calls `calculateSubnetRanges()` for consistent optimization

**Test Coverage:** `tests/unit/vlsm-optimization.test.ts`

- 10 test cases covering efficiency improvements, edge cases, and real-world scenarios
- Validates efficiency gains of 2-3% over linear allocation
- Tests worst-case ascending order optimization

### Range Efficiency Metric (v1.0.0-rc.2)

**Location:** `src/core/calculators/subnet-calculator.ts` - `calculateSupernet()`

Measures actual address packing efficiency to show the real benefit of VLSM optimization.

**Problem with Supernet Efficiency Alone:**
Supernet efficiency only measures "how well subnets fit in the chosen supernet" but doesn't capture wasted space between subnets due to poor allocation order.

**Example:**

```
Linear allocation plan:
- Total subnet sizes: 1,792 addresses
- Supernet: /21 (2,048 addresses)
- Supernet Efficiency: 1,792 / 2,048 = 87.5%

VLSM optimized plan:
- Total subnet sizes: 1,792 addresses (same)
- Supernet: /21 (2,048 addresses) (same)
- Supernet Efficiency: 1,792 / 2,048 = 87.5% (same!)

❌ Supernet efficiency doesn't change!
```

**Range Efficiency Definition:**
Measures how efficiently addresses are packed within the actual allocated range (from first subnet start to last subnet end).

**Formula:**

```
Range Efficiency = (Total Subnet Sizes) / (Actual Range Used) × 100%

Where:
- Total Subnet Sizes = Sum of all subnet sizes
- Actual Range Used = (Last IP + Last Subnet Size - 1) - First IP + 1
```

**Calculation Algorithm:**

```typescript
// Find actual min/max addresses (don't assume array order!)
const addressData = subnetInfos
  .filter((subnet) => subnet.networkAddress)
  .map((subnet) => ({
    subnet,
    ipInt: parseNetworkAddress(subnet.networkAddress!).ipInt,
  }));

// Find minimum IP (first allocated subnet)
const firstIp = Math.min(...addressData.map((d) => d.ipInt));

// Find maximum IP + its subnet size (last allocated subnet)
const maxData = addressData.reduce((max, current) => (current.ipInt > max.ipInt ? current : max));
const lastAddress = maxData.ipInt + maxData.subnet.subnetSize - 1;

// Calculate actual range used (inclusive)
const rangeUsed = lastAddress - firstIp + 1;

// Range efficiency
rangeEfficiency = (totalAddresses / rangeUsed) * 100;
```

**Critical Bug Fix (v1.0.0-rc.2):**
Initial implementation assumed subnets were sorted by network address using `subnetInfos[0]` and `subnetInfos[length-1]`, but they were actually in VLAN order. Fixed to find actual min/max using `Math.min()` and `reduce()`.

**Comparison:**

```
Linear allocation:
- Used: 1,792 addresses
- Range: 10.0.0.0 - 10.0.8.175 = 2,208 addresses
- Range Efficiency: 1,792 / 2,208 = 81.2% ❌
- Wasted: 416 addresses in gaps (18.8%)

VLSM optimization:
- Used: 1,792 addresses
- Range: 10.0.0.0 - 10.0.6.255 = 1,792 addresses
- Range Efficiency: 1,792 / 1,792 = 100% ✅
- Wasted: 0 addresses (perfect packing!)
```

**Display:**
Both metrics are shown in the dashboard header:

- **Supernet Efficiency** - How well subnets fit in the supernet (affects CIDR choice)
- **Range Efficiency** - How well addresses are packed (shows VLSM benefit)

**Backward Compatibility:**

- Zod schema uses `.default(100)` for old plans
- Old plans show 100% range efficiency until recalculated
- User must press 'c' to recalculate for accurate metrics

**Test Coverage:** Updated `tests/unit/vlsm-optimization.test.ts`

- Validates range efficiency calculation for linear vs VLSM
- Tests edge case with subnets in non-sequential order
- Verifies correct min/max detection regardless of array order

---

### Keyboard Shortcuts Hook

**Location:** `src/hooks/useKeyboardShortcuts.ts`

Centralized keyboard management system with:

- **Category grouping** - Navigation, actions, system categories
- **Enable/disable control** - Useful for modal contexts
- **Duplicate detection** - Warns about conflicting key bindings

**Example Usage:**

```typescript
useKeyboardShortcuts({
  shortcuts: [
    {
      key: 'a',
      description: 'Add subnet',
      handler: handleAdd,
      category: 'actions',
      enabled: true,
    },
  ],
  enabled: dialog === 'none',
});
```

### FilePicker Widget

**Location:** `src/components/widgets/FilePicker.tsx`

Interactive file selection component with:

- **Metadata display** - Shows file modification dates using date-fns
- **Keyboard navigation** - Arrow keys and vim bindings (j/k)
- **Scrolling support** - Handles long file lists (>8 items)
- **Empty state handling** - Custom message when no files found
- **Integration with FileService** - Uses `listPlans()` for type-safe file listing

**Features:**

- Displays files sorted by modification date (most recent first)
- Shows relative time format ("2 hours ago")
- Automatic filename truncation for long names
- Consistent styling with other dialogs

### Advanced Notification System

**Locations:**

- Store: `src/store/uiStore.ts`
- Display: `src/components/widgets/NotificationDisplay.tsx`

Enhanced notification system with:

**Priority Levels:**

- **Low** - 1.5 second duration, subtle indicator (·)
- **Normal** - 2.5 second duration (default)
- **High** - 4 second duration, prominent indicator (‼)

**Notification Types:**

- **info** (ℹ) - Informational messages
- **success** (✓) - Success confirmations
- **warning** (⚠) - Warning messages
- **error** (✕) - Error notifications

**Queue Management:**

- Configurable max visible notifications (default: 5)
- Automatic queue trimming (keeps most recent)
- Per-notification duration control
- Auto-dismiss with configurable timeouts

**Example Usage:**

```typescript
// Simple notification
showNotification('Plan saved successfully!', 'success');

// With priority and custom duration
showNotification('Critical error occurred', 'error', {
  priority: 'high',
  duration: 5000, // 5 seconds
});

// No auto-dismiss
showNotification('Permanent message', 'info', {
  duration: 0, // requires manual dismissal
});
```

---

## 🔗 Important Code References

### Entry Points

- **CLI Entry:** `src/cli.tsx:9-16`
- **Dashboard Entry:** `src/dashboard/dashboard-cli.ts:14-16`
- **View Router:** `src/components/DashboardApp.tsx:13-29`

### Core Logic

- **Domain Model:** `src/core/models/network-plan.ts`
- **Subnet Calculator:** `src/core/calculators/subnet-calculator.ts`
- **Validators:** `src/core/validators/validators.ts`
- **Security Utils:** `src/infrastructure/security/security-utils.ts`

### State Management

- **Plan Store:** `src/store/planStore.ts` - Network plan state
- **UI Store:** `src/store/uiStore.ts` - UI state (views, notifications)

### Key Components

- **Welcome Screen:** `src/components/views/WelcomeView.tsx` - ASCII art + gradient
- **Main Dashboard:** `src/components/views/DashboardView.tsx` - Keyboard handling with useKeyboardShortcuts hook
- **Subnet Info Dialog:** `src/components/dialogs/SubnetInfoDialog.tsx` - ipcalc-style display
- **FilePicker Widget:** `src/components/widgets/FilePicker.tsx` - File selection with metadata (date modified)
- **Keyboard Shortcuts Hook:** `src/hooks/useKeyboardShortcuts.ts` - Centralized keyboard management with categories
- **Notification System:** `src/store/uiStore.ts` + `src/components/widgets/NotificationDisplay.tsx` - Priority-based notifications

---

## 📊 Testing Strategy

### Test Coverage

- **184 tests** across **9 test suites**
- **Unit tests:** Validators, calculators, models, services, repositories
- **Integration tests:** Full workflow testing (create → add → calculate → save → load)
- **Coverage targets:** 80%+ on all metrics

### Test Structure

```
tests/
├── unit/
│   ├── file.service.test.ts
│   ├── network-plan.service.test.ts
│   ├── repository.test.ts
│   └── security-utils.test.ts
├── integration/
│   └── services.test.ts
├── network-plan.test.ts
├── network-plan-helpers.test.ts
├── subnet-calculator.test.ts
└── validators.test.ts
```

---

## 🚀 Build & Deployment

### Build Configuration

```json
{
  "main": "dist/cli.js",
  "bin": {
    "cidrly": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "build:prod": "npm run clean && tsc -p tsconfig.prod.json",
    "start": "node dist/cli.js"
  }
}
```

### TypeScript Configuration

- **Strict mode** enabled
- **Target:** ES2022
- **Module:** ESNext with Node resolution
- **Source maps** enabled in development
- **Excludes:** node_modules, dist, tests

---

## 📚 External Resources

### Documentation

- [ink v6 Documentation](https://github.com/vadimdemedes/ink)
- [Pastel Documentation](https://github.com/vadimdemedes/pastel)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [React 19 Release Notes](https://react.dev/blog/2025/01/21/react-19)

### Project Documentation

- **README.md** - User guide and quick start
- **DEPLOYMENT.md** - Production deployment guide
- **CHANGELOG.md** - Version history
- **docs/archive/** - Historical progress documents

---

## 🔮 Future Enhancements

### Planned Features

1. **IPv6 Support** - Extend calculations for IPv6 networks
2. **Export Formats** - CSV, YAML, Terraform output
3. **Visualization** - Network diagrams and topology views
4. **Import** - Load from existing network configs

### Recently Completed

- ✅ **Range Efficiency Metric (v1.0.0-rc.2)** - Added second efficiency metric to measure actual address packing (shows VLSM benefit)
- ✅ **VLSM Display Order (v1.0.0-rc.2)** - Subnets now display in optimized order (largest first) for clearer understanding
- ✅ **Range Efficiency Bug Fix (v1.0.0-rc.2)** - Fixed calculation to find actual min/max addresses regardless of array order
- ✅ **Service Layer Integration (v1.0.0-rc.2)** - NetworkPlanService now uses calculateSubnetRanges() for consistent optimization
- ✅ **VLSM Optimization (v1.0.0-rc.1)** - "Largest First" allocation algorithm for maximum network efficiency
- ✅ **EfficiencyBar Widget** - Extracted as reusable component (replaced inline implementations)
- ✅ **Legacy Code Cleanup** - Removed neo-blessed type definitions
- ✅ **Keyboard Shortcuts Hook** - Centralized keyboard management with categories and duplicate detection
- ✅ **FilePicker Widget** - Interactive file selection with metadata display (modification dates)
- ✅ **Advanced Notification System** - Priority-based notifications with configurable durations and queue management

### Extension Points

- **Custom calculators** - Extend `core/calculators/`
- **Additional commands** - Add to `commands/` directory
- **New components** - Extend `components/` structure
- **Export plugins** - Implement in `services/` layer
- **Validation rules** - Add to `infrastructure/config/`

---

**For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**
**For version history, see [CHANGELOG.md](CHANGELOG.md)**
