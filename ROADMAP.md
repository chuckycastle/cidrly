# cidrly Roadmap

This document outlines the planned development roadmap for cidrly, organized by version milestones.

## Version Strategy

cidrly follows [Semantic Versioning](https://semver.org/):

- **MAJOR (x.0.0)**: Breaking changes, API changes, removed features
- **MINOR (0.x.0)**: New features, backward-compatible enhancements
- **PATCH (0.0.x)**: Bug fixes, security patches, documentation improvements

## Release History

### v0.2.2 (2025-10-31) - Security & Quality Improvements

**Status**: Released

Security fixes and enhanced input validation:

- Fixed TOCTOU race condition in file operations
- Added symlink detection for path traversal protection
- Enhanced input sanitization (whitespace trimming, leading zero detection)
- Comprehensive TSDoc documentation for complex algorithms

**Issues**: #40, #12, #13, #42

---

### v0.2.1 (2025-10-28) - Keyboard Input Fix

**Status**: Released

Critical bug fix for space key handling in column sorting.

**Issues**: #41

---

### v0.2.0 (2025-10-27) - Sortable Columns

**Status**: Released

First feature release with interactive column sorting in the dashboard.

---

## Upcoming Releases

### v0.3.0 - Multi-Format Export System (Released Nov 1, 2025)

**Status**: Released
**Effort**: 16 hours

Major feature release focusing on data export capabilities.

#### Features Delivered

- **#17**: Export to YAML format for infrastructure-as-code workflows ✅
- **#18**: Export to PDF for professional documentation and reporting ✅
- Export to CSV with metadata headers for data portability ✅

#### User Impact

Enables integration with DevOps workflows (Terraform/Ansible), professional documentation generation, and data sharing via CSV.

#### Features Deferred to Future Milestones

- **#14**: OpenAPI/Swagger generation - Deferred (documentation-only, not user-facing export)
- **#19**: Import functionality (CSV/YAML/JSON) - Deferred to focus on core features

---

### v0.3.1 - Polish & Usability (Week of Nov 11)

**Due Date**: November 11, 2025
**Status**: Planning
**Estimated Effort**: 6-8 hours

Patch release focused on user experience improvements.

#### Features

- **#21**: Add dedicated help view with keyboard shortcuts and feature explanations
- **#20**: Improve error messages with specific guidance and recovery suggestions
- **#33**: Add subnet detail view showing full ipcalc-style information

#### User Impact

Easier onboarding, clearer error handling, more detailed subnet information.

#### Technical Considerations

- Help view: React/Ink component with tabbed sections
- Error messages: Centralized error factory with context-aware suggestions
- Detail view: Modal dialog showing host ranges, netmask, wildcard, broadcast

---

### v0.3.2 - Testing & Validation (Week of Nov 18)

**Due Date**: November 18, 2025
**Status**: Planning
**Estimated Effort**: 12-16 hours

Patch release improving test coverage and validation robustness.

#### Features

- **#26**: Add Ink component tests using ink-testing-library
- **#27**: Increase test coverage for utility functions
- **#15**: Add integration tests for full user workflows
- **#25**: Add more validation rules for edge cases

#### User Impact

Higher quality, fewer bugs, more reliable application behavior.

#### Technical Considerations

- ink-testing-library: Setup and configuration for component testing
- Integration tests: Test complete workflows (create → edit → save → load)
- Edge case validation: VLAN ranges, maximum device counts, reserved IPs

---

### v0.3.3 - Documentation & DX (Week of Nov 25)

**Due Date**: November 25, 2025
**Status**: Planning
**Estimated Effort**: 8-10 hours

Patch release focused on developer experience and documentation.

#### Features

- **#31**: Create step-by-step tutorials and guides
- **#28**: Add comprehensive error boundaries for better error handling

#### User Impact

Better onboarding, clearer documentation, more graceful error handling.

#### Technical Considerations

- Tutorials: Getting started, campus network design, data center planning
- Error boundaries: React error boundaries for component trees, fallback UI

---

## Future Releases

### v0.4.0 - Advanced Features (Week of Dec 2)

**Due Date**: December 2, 2025
**Status**: Planning
**Estimated Effort**: 56-74 hours

Major feature release with advanced capabilities for power users.

#### Features

- **#24**: Support advanced IP addressing scenarios (hierarchical designs, BGP summarization)
- **#46**: Improve supernetting for complex enterprise scenarios
- **#22**: Add plugin system for custom validators and calculators
- **#23**: Add API mode for programmatic access
- **#30**: Add file system versioning and backup
- **#29**: Performance optimizations for large networks (thousands of subnets)

#### User Impact

Enterprise-grade features, extensibility, automation support.

#### Technical Considerations

- Plugin system: API design, security sandbox, plugin discovery
- API mode: RESTful API, authentication, rate limiting
- Versioning: Automatic backups, retention policy, diff/compare
- Performance: Algorithm optimization, virtual scrolling, caching

---

## Won't Implement

The following features have been evaluated and will not be implemented, as they conflict with cidrly's CLI-focused architecture:

### #32 - Theme Customization (Dark/Light Mode)

**Rationale**: Users configure terminal themes in their terminal emulator settings. cidrly respects the terminal's color scheme automatically.

### #34 - Cloud Backup and Synchronization

**Rationale**: Conflicts with CLI-focused architecture. Users should use version control (git) for backup and synchronization.

### #35 - Network Visualization Diagrams

**Rationale**: Dedicated visualization tools (draw.io, Lucidchart) are better suited for network diagrams. cidrly focuses on calculation and planning.

### #36 - Web Interface Version

**Rationale**: cidrly is designed as a terminal application. A web version would require complete rewrite and dilute the CLI focus.

### #44 - Integration with Network Devices

**Rationale**: Device integration adds significant complexity (vendor APIs, authentication, configuration management). Better served by tools like Ansible, Terraform, or NetBox.

### #45 - Auto-Update Mechanism

**Rationale**: Users manage updates through npm (`npm update -g cidrly`). Auto-updates conflict with CLI package management conventions.

---

## How to Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) for information on how to contribute to cidrly.

### Roadmap Process

1. **Planning**: Issues are analyzed and grouped into milestone versions
2. **Estimation**: Effort estimates are provided for each milestone
3. **Prioritization**: Milestones are ordered by user value and technical dependencies
4. **Implementation**: Features are developed, tested, and documented
5. **Release**: Versions are tagged, released, and announced

### Feedback

Have feedback on the roadmap? Open an issue with the `roadmap-feedback` label or discuss in GitHub Discussions.

---

## Archive

### Completed Milestones

#### v0.2.2 - Security & Quality Improvements ✅

Completed: 2025-10-31

Security fixes (#40, #12), input sanitization (#13), TSDoc documentation (#42)

#### v0.2.1 - Keyboard Input Fix ✅

Completed: 2025-10-28

Fixed space key handling for column sorting (#41)

#### v0.2.0 - Sortable Columns ✅

Completed: 2025-10-27

Interactive column sorting in dashboard view

---

_This roadmap is subject to change based on user feedback, technical constraints, and project priorities._
