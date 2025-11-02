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

## Current Release

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

## Future Releases

The following features are planned for future development. See [GitHub Issues](https://github.com/chuckycastle/cidrly/issues) and [Milestones](https://github.com/chuckycastle/cidrly/milestones) for current status and discussion.

### User Experience Enhancements

- **#21**: Dedicated help view with keyboard shortcuts and feature explanations
- **#20**: Improved error messages with specific guidance and recovery suggestions
- **#33**: Subnet detail view showing full ipcalc-style information
- **#45**: Optional auto-update check with user approval (similar to gh CLI, Homebrew)
- **#31**: Step-by-step tutorials and guides
- **#28**: Comprehensive error boundaries for graceful error handling

### Export & Import Features

- **#19**: Import functionality for CSV, YAML, and JSON formats
- **#44**: Vendor-specific configuration exports (Arista EOS, Cisco IOS, Cisco NX-OS) - generates copy-pasteable VLAN configurations for network devices

### Testing & Quality

- **#26**: Ink component tests using ink-testing-library
- **#27**: Increased test coverage for utility functions
- **#15**: Integration tests for complete user workflows
- **#25**: Enhanced validation rules for edge cases (VLAN ranges, device counts, reserved IPs)

### Advanced Features

- **#24**: Advanced IP addressing scenarios (hierarchical designs, BGP summarization)
- **#46**: Enhanced supernetting for complex enterprise scenarios
- **#22**: Plugin system for custom validators and calculators
- **#23**: API mode for programmatic access
- **#30**: File system versioning and backup
- **#29**: Performance optimizations for large networks (thousands of subnets)

See individual issues for detailed requirements, technical considerations, and implementation discussion

---

## Won't Implement

The following features conflict with cidrly's CLI-focused architecture and will not be implemented:

- **#32 - Theme Customization**: Terminal emulators handle themes; cidrly respects your terminal's color scheme
- **#34 - Cloud Backup**: Use git for version control and synchronization
- **#35 - Network Diagrams**: Better served by dedicated visualization tools (draw.io, Lucidchart)
- **#36 - Web Interface**: Would require complete rewrite and dilute the CLI focus

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
