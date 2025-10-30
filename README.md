# cidrly

Network architecture and design planning CLI tool with automatic subnet calculations, VLAN management, and an interactive terminal dashboard.

[![npm version](https://img.shields.io/npm/v/cidrly)](https://www.npmjs.com/package/cidrly)
[![npm downloads](https://img.shields.io/npm/dm/cidrly)](https://www.npmjs.com/package/cidrly)
[![Node Version](https://img.shields.io/node/v/cidrly)](https://nodejs.org)

## Features

- **Interactive React-based terminal dashboard** with keyboard navigation
- **VLSM optimization** with "Largest First" allocation
- **Dual efficiency metrics** (Supernet + Range)
- **Configurable capacity planning** - Adjust growth percentage from 0-200% (default: 100%)
- **Sortable table columns** - Sort by any column with Tab + arrow keys
- **Smart subnet and supernet calculation**
- **VLAN management** with per-subnet tracking
- **Save/load network plans** as JSON with per-plan preferences

## Installation

**Homebrew (macOS/Linux):**

```bash
brew tap chuckycastle/cidrly
brew install cidrly
cidrly
```

**NPM (All Platforms):**

```bash
npm install -g cidrly
cidrly
```

## Usage

Launch the interactive dashboard:

```bash
cidrly
```

Or use CLI commands:

```bash
cidrly create --name="My Network" --save
cidrly add --name="Engineering" --vlan=10 --devices=50 --plan=my-network.json
cidrly calculate --plan=my-network.json
cidrly view --plan=my-network.json
```

## Dashboard Shortcuts

### Navigation

- `↑/↓` - Navigate subnet rows
- `Tab` - Toggle header mode (for column sorting)
- `←/→` - Navigate columns (header mode only)
- `Escape` - Cancel dialog / Exit header mode

### Actions

- `i` - Show subnet details
- `Enter` - Show subnet details (row mode) / Sort column (header mode)
- `Space` - Sort selected column (header mode only)
- `a` - Add subnet
- `e` - Edit subnet
- `d` - Delete subnet
- `c` - Calculate network plan

### File Operations

- `s` - Save plan
- `l` - Load plan
- `n` - Create new plan
- `b` - Change base IP
- `p` - Preferences (adjust growth percentage)
- `q` - Quit

## Examples

See [examples/](examples/) for sample network plans:

- `example-campus-network.json` - Multi-building university network
- `example-data-center.json` - Three-tier application infrastructure
- `example-branch-office.json` - Small office network

## Roadmap

For planned features and enhancements, see:

- **[GitHub Issues](https://github.com/chuckycastle/cidrly/issues)** - All open issues and feature requests
- **[Milestones](https://github.com/chuckycastle/cidrly/milestones)** - Organized by version (v0.2.0, v0.3.0, Future)

Issues are prioritized with labels:

- `priority: high` - Critical features like Terraform export, IPv6 support, network diagrams
- `priority: medium` - Important improvements like PDF reports, plugin system, API mode
- `priority: low` - Nice-to-have enhancements like theme customization, cloud sync

## Contributing

We welcome contributions! Here's how you can help:

### Reporting Bugs

Found a bug? Please use our [Bug Report template](https://github.com/chuckycastle/cidrly/issues/new?template=bug_report.yml) to provide:

- Clear description of the issue
- Steps to reproduce
- Your environment (cidrly version, Node.js version, OS)
- Error logs if available

### Feature Requests

Have an idea? Submit a [Feature Request](https://github.com/chuckycastle/cidrly/issues/new?template=feature_request.yml) with:

- Description of the feature
- Use case and problem it solves
- Proposed implementation ideas

### Questions & Documentation

- **Questions**: Use our [Question template](https://github.com/chuckycastle/cidrly/issues/new?template=question.yml)
- **Documentation**: Help improve docs with our [Documentation template](https://github.com/chuckycastle/cidrly/issues/new?template=documentation.yml)

### Code Contributions

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

ISC

## Support

For issues or feature requests, open an issue on [GitHub](https://github.com/chuckycastle/cidrly/issues).
