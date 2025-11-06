# CLAUDE.md - cidrly Project Instructions

## Project Overview

**cidrly** is a network architecture and design planning CLI tool with automatic subnet calculations, VLAN management, and an interactive terminal dashboard built with React/Ink.

- **Language**: TypeScript
- **Framework**: Ink v6 (React for CLI), Pastel v4 (CLI framework)
- **State Management**: Zustand v5
- **Validation**: Zod v4
- **Testing**: Jest v30 with 347 tests
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
# 0. Pre-Release Validation (DO THIS FIRST!)
# Verify milestone completion
gh issue list --milestone "vX.Y.Z" --state open
# ❌ If ANY issues are open, STOP and resolve them first

# Verify milestone description matches what was built
gh api repos/chuckycastle/cidrly/milestones --jq '.[] | select(.title=="vX.Y.Z") | .description'
# Read description and confirm all features are implemented

# Check for CURRENT_MILESTONE.md and verify all items complete
cat .github/CURRENT_MILESTONE.md
# All checkboxes should be [x] marked

# ⚠️ If validation fails, DO NOT PROCEED with release

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

# 6. Post-Release Cleanup
# Delete CURRENT_MILESTONE.md after successful release
rm .github/CURRENT_MILESTONE.md
git add .github/CURRENT_MILESTONE.md
git commit -m "chore: Clean up milestone tracking file"
git push origin main
```

**Automation:** GitHub Actions automatically:
- Runs CI tests on push
- Creates GitHub release on tag push
- Publishes to npm (if configured)

## Release Planning

### Pre-Release Milestone Validation Checklist

Before releasing ANY version, verify:

1. **Check GitHub Milestone**
   ```bash
   gh issue list --milestone "vX.Y.Z" --state all
   ```
   - All issues assigned to milestone are closed OR explicitly moved to next milestone
   - No open issues remain in the milestone being released

2. **Verify Milestone Description Matches Reality**
   - Read the milestone description on GitHub
   - Confirm all promised features are implemented
   - Update description if scope changed during development

3. **Review Release Scope**
   - MAJOR (vX.0.0): Breaking changes, API changes, removed features
   - MINOR (v0.X.0): New features, backward-compatible enhancements
   - PATCH (v0.0.X): Bug fixes only, no new features
   - Validate that milestone contents match version type

4. **Cross-Session Planning Artifact**
   - Check if `.github/CURRENT_MILESTONE.md` exists
   - If exists, verify all items completed before releasing
   - Update or remove file after release

### Current Milestone Tracking

**Active Development:** (Update this section when starting work on a milestone)

```yaml
Current Milestone: v0.X.Y
Planned Features:
  - [ ] Feature description (Issue #XX)
  - [ ] Feature description (Issue #XX)
Status: In Progress | Ready for Release | Released
Release Blocker Issues: #XX, #YY
Target Date: YYYY-MM-DD
```

**Example:**
```yaml
Current Milestone: v0.3.2
Planned Features:
  - [ ] Subnet overlap detection (Issue #10)
  - [ ] Improve error messages (Issue #20)
  - [ ] Complete Help View (Issue #21)
Status: In Progress
Release Blocker Issues: #10
Target Date: 2025-11-15
```

### Release Validation Process

**MANDATORY steps before running `npm version` or creating a release tag:**

```bash
# Step 1: Validate milestone completion
gh issue list --milestone "vX.Y.Z" --state open

# If ANY issues are open, STOP and either:
# a) Complete the features, OR
# b) Move issues to next milestone with comment explaining why

# Step 2: Verify milestone description
gh api repos/chuckycastle/cidrly/milestones --jq '.[] | select(.title=="vX.Y.Z") | .description'

# Read the description and confirm all features are implemented

# Step 3: Update CURRENT_MILESTONE.md
# Mark all features as complete, or document what changed

# Step 4: Proceed with release checklist (existing section)
```

### Planning Artifact: .github/CURRENT_MILESTONE.md

**Create this file when starting a new milestone:**

```markdown
# Current Milestone: vX.Y.Z

**Status:** In Progress
**Target Date:** YYYY-MM-DD
**Type:** Major | Minor | Patch

## Planned Features

- [ ] Feature name (Issue #XX) - Status: Not Started | In Progress | Complete
- [ ] Feature name (Issue #YY) - Status: Not Started | In Progress | Complete

## Scope Changes

- YYYY-MM-DD: Removed feature Z (Issue #ZZ) - Reason: Too large for patch release, moved to vX.Y+1.Z

## Blockers

- Issue #XX: Waiting on dependency Y
- Issue #YY: Needs design decision on Z

## Release Criteria

All features marked Complete + All tests passing + Security scan clean + No open blocker issues
```

**Update this file throughout development. DELETE after release.**

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

## Documentation Writing Standards

### Principles

- **Factual over qualitative** - State what it does, not how good it is
- **Concise over verbose** - Remove redundancy and unnecessary explanations
- **Show, don't tell** - Features demonstrate quality; don't claim it
- **Consistent tone** - Use imperative voice, avoid "we" and greetings

### Forbidden Qualifiers

Never use these marketing words in documentation:

- **Quality claims**: "professional", "robust", "powerful", "comprehensive", "enterprise-grade"
- **Subjective assessments**: "easy", "simple", "intuitive", "smart", "intelligent"
- **Superlatives**: "best", "most", "ultimate", "perfect", "optimal"
- **Vague improvements**: "enhanced", "improved", "better", "superior"
- **Buzzwords**: "cutting-edge", "next-generation", "revolutionary", "innovative"

### Good vs Bad Examples

#### Feature Descriptions

❌ **Bad**: "Smart subnet calculation with comprehensive VLSM optimization"
✅ **Good**: "Automatic subnet calculation with VLSM optimization"

❌ **Bad**: "Powerful export system supporting multiple professional formats"
✅ **Good**: "Export to YAML, CSV, and PDF formats"

#### Documentation Updates

❌ **Bad**: "Enhanced security with comprehensive path validation"
✅ **Good**: "Path validation with symlink detection"

❌ **Bad**: "Export to PDF for professional documentation and reporting"
✅ **Good**: "Export to PDF for documentation and reporting"

#### Commit Messages

❌ **Bad**: "Professional documentation cleanup and enhancements"
❌ **Also verbose**: "docs: Remove marketing qualifiers and redundant sections"
✅ **Good**: "docs: Simplify documentation"

❌ **Bad**: "Enhanced security hardening with comprehensive improvements"
✅ **Good**: "security: Fix TOCTOU race condition"

#### CHANGELOG Entries

❌ **Bad**: "Added comprehensive export service architecture"
✅ **Good**: "Export service architecture with modular formatters"

❌ **Bad**: "Improved maintainability and contributor onboarding"
✅ **Good**: "Added TSDoc comments for subnet calculation algorithms"

### Writing Guidelines

**Use imperative mood** - "Add feature" not "Added feature" or "Adding feature"

**Avoid "we" voice** - "Use GitHub Issues" not "We use GitHub Issues"

**Remove greetings** - No "Thank you for..." or "We're excited to..." in technical docs

**State facts, not opinions** - "100% efficiency" not "Perfect utilization"

**Let work speak for itself** - Don't call your own work "professional" or "high-quality"

**Be specific** - "Export to YAML" not "Support multiple export formats"

**Remove redundancy** - Don't restate titles in opening paragraphs

### Application to cidrly

These standards apply to all user-facing documentation:

- README.md
- CONTRIBUTING.md
- CHANGELOG.md
- examples/README.md
- GitHub milestone descriptions
- Commit messages
- Pull request descriptions
- Issue descriptions
- Code comments (when user-facing)

**Rule**: If it feels like marketing copy, it doesn't belong in technical documentation.
