# cidrly - Network Architecture & Design Planning CLI Tool

A modern, type-safe command-line tool for network engineers to plan and design network architectures with automatic subnet calculations, VLAN management, and an interactive React-based dashboard.

## ✨ Features

- **Interactive Dashboard** - Modern React-based TUI with ink v6, gradient effects, and real-time visualization
- **Pure Ink Architecture** - Beautiful, component-driven interface using React 19 and Zustand state management
- **VLSM Optimization** - "Largest First" allocation strategy for maximum network efficiency (zero gaps)
- **Dual Efficiency Metrics** - Supernet efficiency (fit in supernet) and Range efficiency (address packing)
- **50% Planning Rule** - Automatically doubles expected device count for capacity planning
- **Smart Subnet Calculation** - Finds the optimal CIDR block for your requirements
- **Supernet Calculation** - Automatically calculates the smallest supernet to contain all subnets
- **VLAN Management** - Track VLAN IDs per subnet
- **Save/Load Plans** - Export and import network plans as JSON files with type-safe validation
- **Comprehensive Security** - Multi-layer path protection and input validation
- **Type Safety** - Full TypeScript with strict mode and Zod validation

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

#### Option 1: Homebrew (macOS/Linux)

```bash
# Tap the cidrly repository
brew tap chuckycastle/cidrly

# Install cidrly
brew install cidrly

# Run cidrly
cidrly
```

#### Option 2: NPM (All Platforms)

```bash
# Install globally
npm install -g cidrly@beta

# Run cidrly
cidrly
```

#### Option 3: From Source (Development)

```bash
# Clone the repository
git clone https://github.com/chuckycastle/cidrly.git
cd cidrly

# Install dependencies
npm install

# Build the project
npm run build

# Run cidrly
npm start
```

### Usage

```bash
# Launch interactive dashboard (recommended)
npm run build && node dist/cli.js

# Or launch dashboard directly
npm run build && node dist/dashboard/dashboard-cli.js

# Development mode (requires tsx, may have permission issues)
npm run dashboard
# Note: If tsx has permission errors, use compiled version above
```

### CLI Commands

cidrly also provides command-line tools for quick operations:

```bash
# Create a new plan
node dist/cli.js create --name="My Network" --save

# Add subnet to a plan
node dist/cli.js add --name="Engineering" --vlan=10 --devices=50 --plan=my-network.json

# Calculate IP ranges
node dist/cli.js calculate --plan=my-network.json

# View plan details
node dist/cli.js view --plan=my-network.json

# List all saved plans
node dist/cli.js load --list

# Remove a subnet
node dist/cli.js remove --name="Engineering" --plan=my-network.json

# Launch dashboard
node dist/cli.js dashboard
# or just
node dist/cli.js
```

## 📖 Documentation

### Core Documentation

- **README.md** (this file) - Quick start and basic usage
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture, design decisions, and directory structure
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide (npm, Docker, Kubernetes)
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes
- **[CLAUDE.md](CLAUDE.md)** - Development guide for Claude Code and problem-solving principles

### Archived Documentation

Historical progress documents from development are archived in **[docs/archive/](docs/archive/)**:

- UI-MODERNIZATION.md - UI transformation summary
- VALIDATION_REPORT.md - Subnet calculation validation
- PRODUCTION-OPTIMIZATION.md - Deployment optimization notes
- IMPLEMENTATION.md - Original progress tracking document

For architecture and technical details, see **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## 🎯 Dashboard Interface

The cidrly dashboard provides an intuitive, keyboard-driven interface:

### Welcome Screen

- Beautiful gradient lowercase ASCII art
- Create new network plan
- Load existing plan from file

### Main Dashboard

- **Header** - Plan status, metrics, and dual efficiency bars (Supernet + Range efficiency)
- **Subnet Table** - Interactive table with header row and navigation (sorted by size, largest first)
- **Footer** - Available keyboard shortcuts
- **Real-time notifications** - Success, error, and info messages

### Keyboard Shortcuts

- `↑/↓` or `k/j` - Navigate subnets
- `i` or `Enter` - Show detailed subnet information (ipcalc-style)
- `a` - Add new subnet
- `e` - Edit selected subnet
- `x` - Delete selected subnet
- `c` - Calculate network plan
- `s` - Save plan to file
- `l` - Load plan from file
- `b` - Change base IP address
- `q` - Quit dashboard
- `Escape` - Cancel current dialog

## 📦 Technology Stack

- **ink v6.3.1** - React renderer for CLI
- **React v19.2.0** - Component framework
- **Zustand v5.0.8** - State management
- **chalk v5.6.2** - Terminal styling
- **TypeScript v5.7.2** - Type safety
- **Node.js v24.10.0** - Runtime

### Enhancement Libraries

- ink-gradient - Gradient text effects ✅
- ink-spinner - Loading indicators ✅
- ink-table - Professional table rendering ✅
- date-fns - Date formatting ✅
- Custom ASCII art - Lowercase branding (replaced ink-big-text)

## 🏗️ Project Structure

```
src/
├── dashboard-cli.ts           # Pure ink entry point
├── components/
│   ├── DashboardApp.tsx       # View router
│   ├── layout/                # Header, Footer, Layout
│   ├── views/                 # WelcomeView, DashboardView
│   ├── widgets/               # SubnetTable, NotificationDisplay
│   └── dialogs/               # InputDialog, SelectDialog, ConfirmDialog
├── store/
│   ├── planStore.ts           # Zustand - Network plan state
│   └── uiStore.ts             # Zustand - UI state
├── services/                  # Business logic
├── repositories/              # Data persistence
└── themes/                    # Color constants
```

## 🧪 Development

### Available Scripts

```bash
# Build
npm run build
npm run build:prod

# Development
npm run dashboard          # Run dashboard

# Testing
npm test                   # Run all tests
npm run test:coverage      # Coverage report

# Code Quality
npm run format            # Format with Prettier
npm run lint              # Lint with ESLint
npm run security          # Security scan with Semgrep
```

### Code Quality

- TypeScript strict mode
- Prettier formatting (100-char width, 2-space indent)
- ESLint with TypeScript rules
- Semgrep security scanning
- Jest testing with high coverage

## 🔒 Security

- Multi-layer path protection with URL-decode detection
- Input validation and sanitization
- Path traversal prevention
- Type-safe file operations with Zod validation
- Custom error classes with user-friendly messages

## 📝 The 50% Planning Rule

When you specify **25 expected devices**, cidrly automatically plans for **50 devices** (double the count), providing capacity for:

- Future growth
- Temporary devices
- Guest devices
- Testing equipment

### Example Calculation

For 25 expected devices:

1. Planning rule: 25 × 2 = 50 devices
2. Required addresses: 50 + 2 = 52
3. Next power of 2: 64 addresses
4. Subnet: /26 (64 addresses, 62 usable hosts)

## 📄 File Format

Network plans are saved as JSON with complete subnet and supernet information:

```json
{
  "name": "Campus Network",
  "baseIp": "10.0.0.0",
  "subnets": [
    {
      "name": "Engineering",
      "vlanId": 10,
      "expectedDevices": 25,
      "subnetInfo": {
        "plannedDevices": 50,
        "cidrPrefix": 26,
        "networkAddress": "10.0.0.0/26"
      }
    }
  ],
  "supernet": {
    "networkAddress": "10.0.0.0/23",
    "efficiency": 68.75,
    "rangeEfficiency": 100.0
  }
}
```

## 🛠️ Development

### Custom Hooks Pattern

cidrly follows modern React best practices with custom hooks for state management. Instead of accessing Zustand stores directly, use the provided custom hooks for better developer experience and type safety.

#### Plan Management Hooks

```typescript
import { usePlan, usePlanActions, useSubnets } from '@hooks/usePlan.js';

// Get the current plan (returns NetworkPlan | null)
const plan = usePlan();

// Get just the subnets array (returns Subnet[])
const subnets = useSubnets();

// Get plan actions
const { addSubnet, updateSubnet, removeSubnet, calculatePlan, updateBaseIp, loadPlan, clearPlan } =
  usePlanActions();

// Usage example
const handleAddSubnet = () => {
  const subnet = createSubnet('VLAN 10', 10, 50);
  addSubnet(subnet);
  calculatePlan();
};
```

#### UI State Hooks

```typescript
import {
  useCurrentView,
  useNavigation,
  useNotify,
  useSelection,
  useNotifications,
  useUIActions,
} from '@hooks/useUI.js';

// Get current view
const currentView = useCurrentView();

// Navigation helpers
const { goToWelcome, goToDashboard, goToDetail, goToHelp } = useNavigation();
goToDashboard(); // Navigate to dashboard

// Notification helpers
const notify = useNotify();
notify.success('Plan saved successfully!');
notify.error('Failed to load plan');
notify.warning('Calculation incomplete');
notify.info('Use arrow keys to navigate');

// Selection state with vim-style navigation
const { selectedIndex, select, moveUp, moveDown } = useSelection(maxIndex);
moveUp(); // Move selection up
moveDown(); // Move selection down
select(5); // Jump to index 5

// All notifications
const notifications = useNotifications();

// All UI actions (when you need multiple)
const { setView, showNotification, setSelectedIndex, moveSelectionUp, moveSelectionDown } =
  useUIActions();
```

### Performance Optimization

All presentational components are wrapped in `React.memo` for optimized re-rendering:

- **Pure components**: `NotificationDisplay`, `EfficiencyBar`, `StatusCard`
- **Components with hooks**: `Header`, `Footer`, `SubnetTable`

These components only re-render when their props change, improving dashboard performance.

### Testing

Custom hooks are fully tested with React Testing Library:

```bash
# Run all tests (230 tests)
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Hook tests are located in `tests/hooks/` and use `@jest-environment jsdom` for React hook testing.

## 🤝 Contributing

This project follows Conventional Commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

See [ARCHITECTURE.md](ARCHITECTURE.md) for technical architecture and [CHANGELOG.md](CHANGELOG.md) for version history.

## 📊 Current Status

**Version:** 1.0.0-beta.1

**Implementation Progress:** 100% ✅

All core functionality is complete and fully tested:

- ✅ Phase 1: Dependencies & Tooling
- ✅ Phase 2: CLI Refactor with Pastel
- ✅ Phase 3: Dashboard Pure Ink Migration
- ✅ Phase 4: Enhancement & Polish
- ✅ Phase 5: Testing & Integration (230 tests passing)
- ✅ Phase 6: UI/UX Fixes & Polish
- ✅ Phase 7: VLSM Optimization & Range Efficiency

**Status:** Production-ready! Dashboard and CLI commands fully functional with VLSM optimization.

See [ARCHITECTURE.md](ARCHITECTURE.md) for technical architecture and design decisions.

## 📞 Support

For issues, questions, or feature requests, please open an issue on the project repository.

## 📜 License

ISC

## 👨‍💻 Author

Network planning tool built with TypeScript, ink, React, and Zustand.
