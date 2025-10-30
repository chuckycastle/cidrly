# Changelog

All notable changes to cidrly will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

For planned features and enhancements, see [GitHub Issues](https://github.com/chuckycastle/cidrly/issues) and [Milestones](https://github.com/chuckycastle/cidrly/milestones).

## [0.2.1] - 2025-10-30

### Fixed

- **Space Key Sorting** - Fixed Space key not working for column sorting in header mode
  - Space key was documented but non-functional due to key mapping mismatch
  - Changed keyboard shortcut from `'space'` to `' '` to match Ink's character input
  - Space now correctly activates sorting on selected column in header mode
  - Enter key continues to work as alternative

### Improved

- **Repository Cleanup** - Enhanced ignore files and removed accidentally committed artifacts
  - Removed npm pack tarball (cidrly-0.1.6.tgz) from version control
  - Removed GitHub wiki clones (cidrly.wiki/, cidrly.wiki.backup/) from main repo
  - Enhanced .gitignore with comprehensive patterns (yarn logs, OS files, temp files)
  - Added .eslintignore for better linting performance
  - Updated .prettierignore to prevent formatting generated files

- **Test Coverage Strategy** - Implemented per-file coverage thresholds (Option 3)
  - Core domain layer: 70-85% coverage requirements
  - Service layer: 80-100% (critical business operations)
  - Security code: 80-100% (critical infrastructure)
  - Schemas: 100% (validation must be bulletproof)
  - Realistic standards based on testability vs criticality

## [0.2.0] - 2025-10-29

### Added

- **User Preferences for Growth Percentage** - Configurable capacity planning per plan
  - Press 'p' to open preferences dialog and adjust growth percentage (0-200%)
  - Default remains 100% (doubles device count for capacity planning)
  - Growth percentage stored per-plan (new plans default to 100%, loaded plans restore saved value)
  - Header displays current growth percentage: "Growth: 100%"
  - Notifications show planned device count with current growth percentage
  - Automatic plan recalculation when growth percentage changes
  - Closes [Issue #2](https://github.com/chuckycastle/cidrly/issues/2)

- **Sortable Table Columns** - Interactive column sorting with keyboard navigation
  - Press **Tab** to enter header mode, navigate columns with ← → (or h/l)
  - Press **Enter** or **Space** to sort by selected column
  - Toggle sort direction (ascending ↑ / descending ↓) by sorting same column again
  - Press **Tab** or **Esc** to exit header mode and return to row navigation
  - Sort by: Name, VLAN, Expected Devices, Planned Devices, Network Address, CIDR, Usable Hosts
  - Yellow highlight indicates selected column and current sort state
  - Subnets without calculated data sort to the end automatically
  - IP address sorting works correctly across octets (10.x.x.x vs 192.x.x.x)
  - Closes [Issue #4](https://github.com/chuckycastle/cidrly/issues/4)

### Changed

- **Keyboard Shortcuts** - Context-aware multi-purpose key bindings with intelligent input detection
  - 'l' key is dual-purpose: Load plan (row mode) / Move right (header mode)
  - 'q' key is multi-purpose with smart behavior:
    - Quit app (row mode)
    - Exit header mode (header mode)
    - Close non-input dialogs (info, confirm, preferences, filepicker, select)
    - Smart input dialog handling:
      - Closes dialogs where 'q' is invalid (e.g., IP address: only allows 0-9 and .)
      - Types 'q' in dialogs where it's valid (e.g., filenames, subnet names)
      - Uses `allowedChars` pattern to determine behavior automatically
  - Enter key is dual-purpose: Show details (row mode) / Sort column (header mode)
  - Vim-style navigation (hjkl, q to exit) works as hidden power-user feature in header mode
  - Helper text only shows arrow keys and Esc - vim shortcuts are discoverable easter eggs
  - Updated footer to show compact shortcuts: `add`, `edit`, `del`, `calc`, `save`, `load`, `new`, `base ip`, `prefs`, `quit`
  - Added `tabsort` to footer navigation group

- **Input Validation** - Dynamic character filtering for IP address inputs
  - Change Base IP dialog now restricts input to valid IP characters (0-9 and .)
  - Invalid characters are silently rejected as user types
  - Validation error shows on submit if IP format is invalid

- **Visual Design** - Improved column sorting indicators
  - Column headers use yellow/amber highlight (matching efficiency bar color)
  - Selected column in header mode shows yellow highlight
  - Sort indicators (↑/↓) displayed directly on column headers
  - Header row shows selection indicator (▸) when in header mode

### Improved

- **Growth Percentage Architecture** - Refactored as per-plan property
  - Moved from global preference to per-plan storage
  - Each plan remembers its own growth percentage setting
  - New plans always start with 100% growth (default capacity planning)
  - Loaded plans restore their saved growth percentage
  - Backward compatible: old plans without field default to 100%

- **Sorting Performance** - Efficient sorting with stable algorithms
  - IP address sorting uses numeric comparison (not bitwise operators)
  - Sorts work on arrays up to thousands of subnets
  - Original array never mutated (immutable sorting)
  - 22 comprehensive test cases covering all sort scenarios

### Technical

- **New Files Added**:
  - `src/utils/subnet-sorters.ts` - Sorting utilities for all column types
  - `tests/unit/subnet-sorters.test.ts` - 22 test cases for sorting logic
  - `src/components/dialogs/PreferencesDialog.tsx` - Growth percentage configuration UI
  - `src/services/preferences.service.ts` - Preferences persistence (deprecated in favor of per-plan)
  - `src/schemas/preferences.schema.ts` - Zod validation for preferences (deprecated)
  - `src/store/preferencesStore.ts` - Zustand store for preferences (deprecated)
  - `tests/unit/preferences.service.test.ts` - Preferences service tests

- **Modified Files**:
  - `src/store/uiStore.ts` - Added sort state (sortColumn, sortDirection, setSortColumn, clearSort)
  - `src/components/widgets/SubnetTable.tsx` - Interactive headers with sort indicators
  - `src/components/views/DashboardView.tsx` - Header mode navigation and sorting logic
  - `src/components/layout/Footer.tsx` - Updated shortcuts display
  - `src/core/models/network-plan.ts` - Added growthPercentage field to NetworkPlan
  - `src/services/network-plan.service.ts` - Uses plan.growthPercentage for calculations
  - `src/schemas/network-plan.schema.ts` - Added growthPercentage with default 100
  - `src/hooks/usePlan.ts` - Added setGrowthPercentage action

- **Test Coverage**: 289 tests passing (added 22 new tests for sorting)

## [0.1.8] - 2025-10-29

### Fixed

- **Example File Validation** - Fixed "plan validation failed" error when loading sample plans
  - Users upgrading from v0.1.6 had outdated example files in `~/cidrly/saved-plans/`
  - Postinstall script now uses smart checksum detection to identify outdated examples
  - Old example files are automatically updated while preserving user-created plans
  - Closes [Issue #6](https://github.com/chuckycastle/cidrly/issues/6)

### Changed

- **Example File Naming** - Renamed example files with "example-" prefix for safety
  - `branch-office.json` → `example-branch-office.json`
  - `campus-network.json` → `example-campus-network.json`
  - `data-center.json` → `example-data-center.json`
  - Prevents accidentally overwriting user plans with common names
  - Postinstall script automatically migrates old unprefixed examples

### Improved

- **Smart Example Updates** - Enhanced postinstall script with intelligent file management
  - Detects outdated example files using SHA-256 checksums
  - Updates old examples (v0.1.6) to current versions automatically
  - Preserves user-created files (unknown checksums)
  - Migrates old unprefixed examples to new prefixed names
  - Shows clear status messages for each operation

## [0.1.7] - 2025-10-29

### Added

- **New Plan Creation Shortcut** - Press 'n' to create new plans from dashboard
  - Interactive two-step workflow: plan name → base IP address
  - Smart save detection prompts to save current plan before creating new
  - Validates plan names and IP addresses with helpful error messages
  - Footer displays 'n' shortcut in file operations group
  - Closes [Issue #5](https://github.com/chuckycastle/cidrly/issues/5)

## [0.1.6] - 2025-10-27

### Changed

- **README Badges** - Simplified to show only npm-related metrics
  - Removed: License, CI, Install Size, GitHub Stars, GitHub Issues badges
  - Kept: npm version, npm downloads, Node.js version requirement

## [0.1.5] - 2025-10-27

### Changed

- **README Badges** - Added shields.io badges for npm metrics
  - npm version badge with link to npm package
  - npm downloads badge showing monthly download count
  - Node.js version requirement badge (>=20.0.0)

## [0.1.4] - 2025-10-27

### Added

- **Dashboard Version Display** - Application version now visible in dashboard header
  - Format: "cidrly v0.1.4 › plan name"
  - Keeps version information visible throughout the application

### Improved

- **Directory Path Visibility** - Enhanced user awareness of default save location
  - WelcomeView: Error message shows `~/cidrly/saved-plans` path when no plans found
  - Create plan dialog: Added helper text "Plans save to ~/cidrly/saved-plans"
  - Save/Load dialogs: Updated labels to indicate default directory location

## [0.1.3] - 2025-10-27

### Fixed

- **ESLint Warnings** - Resolved all 137 ESLint warnings (100% reduction)
  - Added explicit return type annotations to all React components, hooks, and store functions
  - Replaced `||` with `??` for safer nullish coalescing (14 instances)
  - Fixed unused expression errors in keyboard handlers
  - Added ESLint suppressions for intentional defensive runtime checks
- **Code Formatting** - Applied Prettier formatting to maintain consistent code style
  - Created `.prettierignore` to exclude wiki directories from formatting checks

### Changed

- **Default Save Directory** - Plans now save to `~/cidrly/saved-plans` instead of `{cwd}/saved-plans`
  - More predictable behavior regardless of current working directory
  - Users can still override with full paths in `--output` option
  - Removed dependency on `process.cwd()` from all command files

## [1.0.0-beta.1] - 2025-10-25

### Added

- **Limited Beta Release** - First public beta release for testing and feedback
- **Homebrew Distribution** - Install via `brew tap chuckycastle/cidrly && brew install cidrly`
- **NPM Beta Tag** - Install via `npm install -g cidrly@beta`
- **Example Network Plans** - Sample plans demonstrating common network architectures

### Fixed

- Removed orphaned theme detection test that was causing test failures
- Fixed code formatting issues across 12 files

### Changed

- Updated package metadata with author and repository information
- Improved documentation for beta testers
- Streamlined CI/CD workflows (removed Docker, enabled npm publishing)

### Known Limitations

- Beta release for testing purposes only
- Limited to IPv4 networks
- Export format is JSON only
- Feedback collected through private channels

## [1.0.0-rc.2] - 2024-10-24

### Added

- **Range Efficiency Metric** - Second efficiency metric to measure actual address packing efficiency
  - Shows the real benefit of VLSM optimization (linear: ~81%, VLSM: 100%)
  - Calculated as: (Total Subnet Sizes) / (Actual Range Used) × 100%
  - Displayed alongside Supernet Efficiency in dashboard header
  - Supernet Efficiency measures fit in supernet (affects CIDR choice)
  - Range Efficiency measures address packing (shows VLSM benefit)

### Fixed

- **Range Efficiency Calculation** - Fixed bug where calculation assumed subnets were sorted by network address
  - Now correctly finds actual min/max addresses using Math.min() and reduce()
  - Works correctly regardless of subnet array order (VLAN order, creation order, etc.)
- **UI Redundant Display** - Removed duplicate percentage display in efficiency bar
  - Was showing "87.5% 87.5% (Supernet)"
  - Now shows "87.5% (Supernet) • Range: 100.0%"

### Changed

- **VLSM Display Order** - Subnets now display in optimized order (largest first) instead of original creation order
  - Makes network allocation more intuitive and easier to understand
  - Sequential network addresses are now visually sequential in the table
  - Removed `sortOrder` field from Subnet interface (no longer needed)
- **Service Layer Integration** - NetworkPlanService.calculatePlan() now uses calculateSubnetRanges()
  - Ensures consistent VLSM optimization across all calculation paths
  - Removed duplicate calculation logic from service layer
  - Dashboard and CLI commands now use same optimized allocation

### Backward Compatibility

- Old saved plans use default rangeEfficiency=100% (via Zod schema .default(100))
- User must press 'c' in dashboard to recalculate old plans for accurate metrics
- All existing plans remain loadable and functional

## [1.0.0-rc.1] - 2024-10-24

### Added

- **Interactive Dashboard** - Modern React-based TUI with ink v6
- **Pure Ink Architecture** - Component-driven interface using React 19 and Zustand
- **50% Planning Rule** - Automatic capacity planning with device count doubling
- **Smart Subnet Calculation** - Optimal CIDR block finder
- **Supernet Calculation** - Automatic supernet computation
- **VLAN Management** - Track VLAN IDs per subnet
- **Save/Load Plans** - JSON export/import with type-safe validation
- **Security Features** - Multi-layer path protection and input validation
- **Type Safety** - Full TypeScript with strict mode and Zod validation
- **CLI Commands** - 9 commands with Pastel framework:
  - `create` - Create new network plan
  - `add` - Add subnet to plan
  - `calculate` - Calculate IP ranges
  - `view` - View plan details
  - `save` - Save plan to file
  - `load` - Load/list plans
  - `remove` - Remove subnet
  - `dashboard` - Launch interactive dashboard (default)
- **Dashboard Features**:
  - Welcome screen with gradient ASCII art
  - Main dashboard with subnet table
  - Keyboard navigation (vi-style + arrows)
  - Real-time notifications
  - Comprehensive subnet information dialog (ipcalc-style)
  - Help view with shortcuts
- **Visual Enhancements**:
  - Gradient headers and titles
  - Loading spinners for operations
  - Professional table rendering
  - Status cards and efficiency indicators
  - Color-coded notifications
- **Testing** - 184 automated tests across 9 test suites
- **Documentation**:
  - Comprehensive README
  - Detailed implementation guide
  - Architecture documentation

### Technical Stack

- **Runtime**: Node.js >=20.0.0
- **Framework**: ink v6.3.1 + React v19.2.0
- **CLI**: Pastel v4.0.0
- **State**: Zustand v5.0.8
- **Validation**: Zod v4.1.12
- **Styling**: chalk v5.6.2
- **Enhancement Libraries**: ink-gradient, ink-spinner, ink-table, ink-link, date-fns

### Architecture

- Layered architecture with separation of concerns
- Domain-driven design with core models
- Repository pattern for data persistence
- Service layer for business logic
- React components for UI
- Zustand stores for state management
- Type-safe schemas with Zod validation
- Security-hardened file operations

### Security

- Multi-layer path traversal protection
- URL-decode detection
- Input validation and sanitization
- Custom error classes
- Semgrep security scanning
- No secrets in code

### Development

- TypeScript strict mode
- Prettier formatting (100-char width)
- ESLint with TypeScript rules
- Jest testing with high coverage
- Pre-commit hooks
- Automated CI/CD pipelines

## [0.1.0] - Initial Development

### Added

- Initial project setup
- Basic CLI structure
- Core calculation logic

---

## Version History

- **1.0.0-beta.1** - Limited beta release with Homebrew support (2025-10-25)
- **1.0.0-rc.2** - Enhanced VLSM with Range Efficiency metric (2024-10-24)
- **1.0.0-rc.1** - Production-ready release candidate (2024-10-24)
- **0.1.0** - Initial development version

## Release Notes

### How to Release

1. Update version in package.json: `npm version [major|minor|patch]`
2. Update CHANGELOG.md with release notes
3. Create git tag: `git tag v1.0.0`
4. Push with tags: `git push origin main --tags`
5. GitHub Actions will automatically create release and publish

### Semantic Versioning

- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality
- **PATCH** version for backwards-compatible bug fixes
- **Pre-release** suffixes: `-alpha`, `-beta`, `-rc` for pre-release versions

[Unreleased]: https://github.com/chuckycastle/cidrly/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/chuckycastle/cidrly/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/chuckycastle/cidrly/compare/v0.1.8...v0.2.0
[0.1.8]: https://github.com/chuckycastle/cidrly/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/chuckycastle/cidrly/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/chuckycastle/cidrly/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/chuckycastle/cidrly/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/chuckycastle/cidrly/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/chuckycastle/cidrly/releases/tag/v0.1.3
[1.0.0-beta.1]: https://github.com/chuckycastle/cidrly/releases/tag/v1.0.0-beta.1
[1.0.0-rc.2]: https://github.com/chuckycastle/cidrly/compare/v1.0.0-rc.1...v1.0.0-rc.2
[1.0.0-rc.1]: https://github.com/chuckycastle/cidrly/releases/tag/v1.0.0-rc.1
[0.1.0]: https://github.com/chuckycastle/cidrly/releases/tag/v0.1.0
