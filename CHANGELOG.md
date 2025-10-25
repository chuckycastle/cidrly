# Changelog

All notable changes to cidrly will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- IPv6 network support
- Export to multiple formats (CSV, YAML, Terraform)
- Network visualization diagrams
- Import from existing network configurations

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

[Unreleased]: https://github.com/chuckycastle/cidrly/compare/v1.0.0-beta.1...HEAD
[1.0.0-beta.1]: https://github.com/chuckycastle/cidrly/releases/tag/v1.0.0-beta.1
[1.0.0-rc.2]: https://github.com/chuckycastle/cidrly/compare/v1.0.0-rc.1...v1.0.0-rc.2
[1.0.0-rc.1]: https://github.com/chuckycastle/cidrly/releases/tag/v1.0.0-rc.1
[0.1.0]: https://github.com/chuckycastle/cidrly/releases/tag/v0.1.0
