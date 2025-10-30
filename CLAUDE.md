# CLAUDE.md - cidrly Project Instructions

## Project Overview

**cidrly** is a network architecture and design planning CLI tool with automatic subnet calculations, VLAN management, and an interactive terminal dashboard built with React/Ink.

- **Language**: TypeScript
- **Framework**: Ink v6 (React for CLI), Pastel v4 (CLI framework)
- **State Management**: Zustand v5
- **Validation**: Zod v4
- **Testing**: Jest v30 with 289 tests
- **Package Manager**: npm
- **Node Version**: >= 20.0.0

## Architecture

### Layered Architecture
```
src/
├── cli.tsx                    # Entry point
├── commands/                  # Pastel CLI commands
├── components/                # Ink React components
│   ├── dialogs/              # Modal dialogs (Input, Confirm, Select, etc.)
│   ├── layout/               # Header, Footer, Layout
│   ├── views/                # Main views (Dashboard, Welcome)
│   └── widgets/              # Reusable UI components
├── core/                      # Business logic (domain layer)
│   ├── calculators/          # Subnet calculation algorithms
│   ├── models/               # Domain models (NetworkPlan, Subnet)
│   └── validators/           # Input validation functions
├── hooks/                     # React hooks
├── infrastructure/            # Cross-cutting concerns
│   ├── config/               # Validation rules
│   └── security/             # Security utilities (path traversal protection)
├── repositories/              # Data access layer
├── schemas/                   # Zod schemas for validation
├── services/                  # Business logic services
├── store/                     # Zustand stores (planStore, uiStore)
├── themes/                    # Color themes and styling
└── utils/                     # Utility functions
```

## Development Commands

```bash
# Development
npm run dev                    # Run with tsx (hot reload)
npm run dashboard             # Run dashboard directly

# Building
npm run build                 # TypeScript compilation
npm run build:prod            # Production build (no sourcemaps)
npm run clean                 # Remove dist and coverage

# Testing
npm test                      # Run tests
npm run test:coverage         # Tests with coverage report

# Code Quality
npm run lint                  # ESLint
npm run lint:fix              # ESLint with auto-fix
npm run format                # Prettier format
npm run format:check          # Prettier check only
npm run security              # Semgrep security scan
npm run verify                # Run all checks (format, lint, test, security)
```

## Key Learnings from Recent Sessions

### 1. Keyboard Input Handling in Ink

**Issue:** Space key not working for column sorting despite being documented.

**Root Cause:** Ink's `useInput` hook sends different values for different key types:
- **Special keys**: Sent as `key.upArrow`, `key.return`, `key.escape`, etc.
- **Character keys**: Sent as `input` string (e.g., `' '` for space, `'a'` for 'a')

**Solution:**
```typescript
// ❌ WRONG - Doesn't work
{ key: 'space', handler: () => { ... } }

// ✅ CORRECT - Use the actual character
{ key: ' ', handler: () => { ... } }
```

**Rule:** Always use the actual character that Ink sends, not a descriptive string.

### 2. Test Coverage Strategy

**Implemented:** Per-file coverage thresholds (Option 3) instead of global thresholds.

**Rationale:**
- UI components (React/Ink) are hard to test without E2E framework
- Business logic should have high coverage (80-100%)
- Different code has different criticality levels

**Configuration:** `jest.config.mjs`
```javascript
coverageThreshold: {
  // Per-file thresholds for critical code
  'src/core/calculators/subnet-calculator.ts': { branches: 70, ... },
  'src/services/file.service.ts': { branches: 80, functions: 100, ... },
  'src/schemas/preferences.schema.ts': { branches: 100, functions: 100, ... },
  'src/infrastructure/security/security-utils.ts': { branches: 80, functions: 100, ... },
}
```

**Tiers:**
- **Core domain (70-85%)**: Foundation business logic
- **Services (80-100%)**: Critical operations
- **Security (80-100%)**: Safety-critical code
- **Schemas (100%)**: Validation must be perfect
- **Utilities (70-100%)**: Pure functions

### 3. Repository Hygiene

**Learned:** Need strict .gitignore patterns to prevent accidental commits.

**Issues Found:**
- npm pack artifacts (*.tgz) were committed
- GitHub wiki clones (cidrly.wiki/) were committed
- Build artifacts weren't properly ignored

**Solution:** Comprehensive ignore files:
- `.gitignore` - 82 lines with clear sections
- `.prettierignore` - Prevents formatting generated files
- `.eslintignore` - Speeds up linting by skipping non-source files

**Best Practice:**
```bash
# Before committing, verify what's staged
git status --short

# Avoid using git add -A blindly
# Instead, add specific files
git add src/ tests/ package.json
```

### 4. CI/CD Pipeline Debugging

**Learned:** When CI fails, debug systematically:

1. **Check locally first:**
   ```bash
   npm run lint          # ESLint
   npm run format:check  # Prettier
   npm run test:coverage # Tests with coverage
   npm run build:prod    # Production build
   ```

2. **Check coverage thresholds:** Jest fails if coverage drops below thresholds
3. **Security scan:** Semgrep findings may be `continue-on-error: true` but still show warnings

**Common Issues:**
- ESLint: Missing return types, unused imports
- Prettier: Inconsistent formatting across files
- Coverage: Threshold mismatch (68% actual vs 69% required)
- Semgrep: TOCTOU race conditions (fs.existsSync followed by fs.unlinkSync)

### 5. Release Process

**Semver Strategy:**
- **MAJOR (x.0.0)**: Breaking changes (API changes, removed features)
- **MINOR (0.x.0)**: New features, backward-compatible (v0.2.0 - sortable columns)
- **PATCH (0.0.x)**: Bug fixes, no new features (v0.2.1 - Space key fix)

**Release Checklist:**
```bash
# 1. Bump version
npm version patch  # or minor, or major

# 2. Update CHANGELOG.md
# - Add new version section
# - Document all changes
# - Update version links at bottom

# 3. Commit and tag
git add -A
git commit -m "Release vX.Y.Z - <summary>"
git tag vX.Y.Z

# 4. Push with tags
git push origin main --tags

# 5. Verify GitHub Actions
gh run list --limit 5  # Check CI and Release workflows
gh release view vX.Y.Z # Verify release created
```

**Automation:** GitHub Actions automatically:
- Runs CI tests on push
- Creates GitHub release on tag push
- Publishes to npm (if configured)

## Common Pitfalls to Avoid

### 1. ❌ Using git add -A Blindly
**Problem:** Commits build artifacts, temporary files, user data
**Solution:** Use specific paths or verify with `git status` first

### 2. ❌ Assuming Keyboard Shortcuts Work Without Testing
**Problem:** Ink uses different key representation than expected
**Solution:** Test keyboard shortcuts in actual terminal, check Ink docs

### 3. ❌ Setting Unrealistic Global Coverage Thresholds
**Problem:** 80% global threshold fails because UI code is hard to test
**Solution:** Use per-file thresholds based on code criticality

### 4. ❌ Forgetting to Update CHANGELOG.md
**Problem:** Users don't know what changed in releases
**Solution:** Update CHANGELOG as you make changes, not at release time

### 5. ❌ Not Verifying CI Locally Before Pushing
**Problem:** CI fails, blocks release, requires hotfixes
**Solution:** Run `npm run verify` before pushing

## Testing Philosophy

### Unit Tests (289 tests)
- Business logic: `core/`, `services/`, `repositories/`
- Utilities: `utils/subnet-sorters.ts`, validators
- Stores: Zustand state management
- Integration: Service layer interactions

### Not Tested (Intentionally)
- React/Ink components (require ink-testing-library)
- Hooks using Ink primitives (useInput, useStdout)
- CLI commands (Pastel framework)
- UI themes and colors (pure utility)

### Coverage Goals
- **Business logic**: 80%+ (achieved via per-file thresholds)
- **Security code**: 80-100% (critical for safety)
- **Global**: ~70% (realistic given UI exclusions)

## Security Considerations

### Path Traversal Protection
All file operations use `security-utils.ts`:
- `validatePath()` - Checks for path traversal attempts
- `safeJoin()` - Safely joins paths with validation
- Never use user input directly in fs operations

### Input Validation
- All user inputs validated with Zod schemas
- IP addresses: `validateIpAddress()` with regex
- VLAN IDs: 1-4094 range validation
- Device counts: Positive integers only

### Known Security Findings
**Semgrep:** 1 finding (TOCTOU race condition in preferences.service.ts)
```typescript
// Current (race condition)
if (fs.existsSync(this.preferencesFile)) {
  fs.unlinkSync(this.preferencesFile);
}

// Better (no race)
try {
  fs.unlinkSync(this.preferencesFile);
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}
```

**Status:** Non-critical (preferences file, not security-sensitive)
**CI Setting:** `continue-on-error: true` allows build to pass

## Dependencies

### Production
- `ink@6.3.1` - React for CLI
- `react@19.2.0` - React library
- `zustand@5.0.8` - State management
- `zod@4.1.12` - Schema validation
- `chalk@5.6.2` - Terminal colors
- `pastel@4.0.0` - CLI framework
- Various ink plugins (spinner, table, text-input, etc.)

### Development
- `typescript@5.9.3` - Type safety
- `jest@30.2.0` - Testing framework
- `eslint@9.38.0` - Linting
- `prettier@3.6.2` - Code formatting
- `tsx@4.20.6` - TypeScript execution

## File Structure Conventions

### Naming
- React components: PascalCase (e.g., `DashboardView.tsx`)
- Utilities/services: kebab-case (e.g., `subnet-calculator.ts`)
- Tests: Same name with `.test.ts` suffix
- Types: Defined inline or in model files (no separate .d.ts files)

### Exports
- Use named exports (not default exports)
- Export types alongside implementations
- Re-export from index files for clean imports

### Comments
- TSDoc for public APIs
- Explain "why" not "what"
- Document complex algorithms (VLSM optimization)

## Useful Code Patterns

### Zustand Store Pattern
```typescript
interface MyState {
  value: string;
  setValue: (value: string) => void;
}

const useMyStore = create<MyState>()(
  immer((set) => ({
    value: '',
    setValue: (value) => {
      set((state) => {
        state.value = value;
      });
    },
  }))
);
```

### Ink Dialog Pattern
```typescript
const [dialog, setDialog] = useState<Dialog>({ type: 'none' });

// Open dialog
setDialog({
  type: 'input',
  title: 'Title',
  onSubmit: (value) => {
    // Handle submission
    setDialog({ type: 'none' });
  },
});

// Render dialog
{dialog.type === 'input' && (
  <Modal>
    <InputDialog {...dialog} />
  </Modal>
)}
```

### Keyboard Shortcut Pattern
```typescript
const shortcuts: KeyboardShortcut[] = [
  {
    key: 'a',  // Use actual character, not 'letter-a'
    description: 'Add subnet',
    handler: () => handleAdd(),
    enabled: plan !== null,
    category: 'actions',
  },
];

useKeyboardShortcuts(shortcuts);
```

## Performance Considerations

### Sorting Large Arrays
- Use stable sort algorithms
- Avoid mutating original arrays
- Current implementation handles thousands of subnets

### Ink Rendering
- Minimize re-renders with proper React.memo usage
- Use Zustand selectors to avoid full store subscriptions
- Keep component tree shallow

## Future Improvements

### Testing
- Add `ink-testing-library` for component tests
- Integration tests for full user workflows
- E2E tests with actual terminal rendering

### Features
- IPv6 support
- Export to multiple formats (CSV, YAML, Terraform)
- Network visualization diagrams
- Import from existing configurations

### Code Quality
- Fix semgrep TOCTOU race condition
- Increase coverage for untested utilities
- Add more comprehensive error boundaries

## Contact & Support

- **Issues**: https://github.com/chuckycastle/cidrly/issues
- **NPM**: https://www.npmjs.com/package/cidrly
- **License**: ISC
