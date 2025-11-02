# cidrly Roadmap

Development roadmap organized by version milestones. Follows [Semantic Versioning](https://semver.org/).

## Release History

### v0.2.2 (2025-10-31) - Security & Quality Improvements

Security fixes and input validation:

- Fixed TOCTOU race condition in file operations
- Added symlink detection for path traversal protection
- Input sanitization (whitespace trimming, leading zero detection)
- TSDoc documentation for complex algorithms

**Issues**: #40, #12, #13, #42

---

### v0.2.1 (2025-10-28) - Keyboard Input Fix

Bug fix for space key handling in column sorting.

**Issues**: #41

---

### v0.2.0 (2025-10-27) - Sortable Columns

Interactive column sorting in the dashboard.

---

## Current Release

### v0.3.0 - Multi-Format Export System (Released Nov 1, 2025)

Data export capabilities.

#### Features Delivered

- **#17**: Export to YAML format for infrastructure-as-code workflows ✅
- **#18**: Export to PDF for documentation and reporting ✅
- Export to CSV with metadata headers for data portability ✅

#### User Impact

Enables integration with DevOps workflows (Terraform/Ansible), documentation generation, and data sharing via CSV.

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

### Feedback

Have feedback on the roadmap? Open an issue with the `roadmap-feedback` label or discuss in GitHub Discussions.
