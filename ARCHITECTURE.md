# cidrly Architecture

## Overview

cidrly is a type-safe CLI tool for network architecture planning built with React/ink for terminal UI, Pastel for CLI framework, and Zustand for state management.

**Core Capabilities:**
- Interactive React-based dashboard
- Command-line interface with 9 commands
- Automatic VLSM subnet calculations
- 50% capacity planning rule
- Type-safe operations with Zod validation
- Multi-layer security

## Technology Stack

**Core:**
- Node.js 20+ - Runtime
- TypeScript 5.7+ - Type safety with strict mode
- ink 6.3 - React renderer for terminal
- React 19 - Component framework
- Pastel 4.0 - CLI framework
- Zustand 5.0 - State management
- Zod 4.1 - Schema validation

**Libraries:**
- ink-gradient, ink-spinner, ink-table - UI enhancements
- chalk - Terminal styling
- date-fns - Date formatting

**Development:**
- Jest - Testing (230 tests)
- Prettier - Code formatting
- ESLint - TypeScript linting
- Semgrep - Security scanning

## Architecture

### Layered Design

```
┌─────────────────────────────────────────┐
│  Presentation Layer                     │
│  ├── CLI Commands (Pastel)              │
│  └── Dashboard Components (ink/React)   │
├─────────────────────────────────────────┤
│  State Management                       │
│  └── Zustand Stores (plan, UI)          │
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
│  Infrastructure                         │
│  ├── Security (Path validation)         │
│  └── Schemas (Zod validation)           │
└─────────────────────────────────────────┘
```

### Application Modes

**Command-line Mode:**
- Quick operations via Pastel commands
- Non-interactive, scriptable
- Commands: `create`, `add`, `calculate`, `view`, `save`, `load`, `remove`

**Interactive Dashboard:**
- Full-screen React UI with keyboard navigation
- Real-time state updates with Zustand
- Visual feedback with spinners and notifications

## Directory Structure

```
src/
├── cli.tsx                     # Pastel CLI entry point
├── commands/                   # CLI command modules
│   ├── index.tsx               # Dashboard launcher (default)
│   ├── create.tsx, add.tsx, calculate.tsx
│   └── view.tsx, save.tsx, load.tsx, remove.tsx
├── components/                 # React UI components
│   ├── DashboardApp.tsx        # View router
│   ├── layout/                 # Header, Footer, Layout
│   ├── views/                  # WelcomeView, DashboardView
│   ├── widgets/                # SubnetTable, NotificationDisplay
│   └── dialogs/                # InputDialog, SelectDialog, ConfirmDialog
├── store/                      # Zustand state management
│   ├── planStore.ts            # Network plan state
│   └── uiStore.ts              # UI state (view, selection, notifications)
├── hooks/                      # React hooks
│   ├── usePlan.ts              # Plan management hooks
│   └── useUI.ts                # UI state hooks
├── services/                   # Business logic
│   ├── network-plan.service.ts # Network calculations
│   └── file.service.ts         # File I/O operations
├── repositories/               # Data persistence
│   ├── network-plan.repository.ts
│   └── file-system.repository.ts
├── core/                       # Domain logic
│   ├── models/                 # NetworkPlan, Subnet
│   ├── calculators/            # Subnet calculations
│   └── validators/             # Input validation
├── schemas/                    # Zod schemas
│   ├── network-plan.schema.ts  # Plan validation
│   └── subnet.schema.ts        # Subnet validation
├── infrastructure/             # Security & config
│   └── security/               # Path validation
└── themes/                     # Colors and styling
    └── colors.ts
```

## Key Design Decisions

### 1. State Management with Zustand

**Why Zustand over Redux:**
- Simpler API with less boilerplate
- Built-in Immer support for immutable updates
- Better TypeScript integration
- Perfect fit for CLI tool complexity

**Store Structure:**
```typescript
// planStore: Network plan state
{
  plan: NetworkPlan | null,
  addSubnet, updateSubnet, removeSubnet,
  calculatePlan, loadPlan, clearPlan
}

// uiStore: UI state
{
  view: ViewType,
  selectedIndex: number,
  notifications: Notification[],
  showNotification, setView, setSelectedIndex
}
```

### 2. Pure Ink Architecture

No hybrid approaches - dashboard is pure ink/React:
- Clean separation from CLI commands
- Consistent React patterns throughout
- Better performance and maintainability

### 3. VLSM Optimization

**Largest First Allocation:**
- Sorts subnets by size (descending)
- Allocates largest subnets first
- Eliminates address gaps
- Maximizes range efficiency (typically 100%)

**Dual Efficiency Metrics:**
- **Supernet Efficiency**: How well subnets fit in the supernet
- **Range Efficiency**: Address packing efficiency (shows VLSM benefit)

### 4. Security by Default

**Multi-layer Path Protection:**
- Validates all file paths against directory traversal
- URL-decode detection and blocking
- Null byte and special character checks
- Validates paths are within project directory

**Type-safe Operations:**
- Zod schemas validate all external data
- TypeScript strict mode enforced
- Input sanitization before use

### 5. Custom Hooks Pattern

All state access through custom hooks for better DX:
```typescript
// Plan management
const plan = usePlan();
const subnets = useSubnets();
const { addSubnet, calculatePlan } = usePlanActions();

// UI state
const notify = useNotify();
const { goToDashboard } = useNavigation();
const { selectedIndex, moveUp, moveDown } = useSelection(max);
```

## Testing Strategy

**Coverage:** 230 tests across 12 suites

**Test Categories:**
- Unit tests: Core calculators, validators, models
- Component tests: React components with Testing Library
- Integration tests: Service and repository layers
- Hook tests: Custom hooks with renderHook

**Quality Checks:**
- TypeScript compilation
- Prettier formatting
- ESLint linting
- Semgrep security scanning
- Jest coverage reporting

## Build & Deployment

**Production Build:**
```bash
npm run build:prod  # Clean + compile with production tsconfig
```

**Distribution:**
- NPM: Published as `cidrly@beta`
- Homebrew: `chuckycastle/cidrly` tap
- Binary: `dist/cli.js` with shebang

**Requirements:**
- Node.js 20+
- Terminal with 256-color and Unicode support
- Minimum 80x24 terminal size

## Future Enhancements

Planned features:
- IPv6 network support
- Export to CSV/YAML/Terraform
- Network visualization diagrams
- Import from existing configurations
- Multi-supernet planning
