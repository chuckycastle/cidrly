# cidrly

Network architecture and design planning CLI tool with automatic subnet calculations, VLAN management, and an interactive terminal dashboard.

[![npm version](https://img.shields.io/npm/v/cidrly)](https://www.npmjs.com/package/cidrly)
[![npm downloads](https://img.shields.io/npm/dm/cidrly)](https://www.npmjs.com/package/cidrly)
[![Node Version](https://img.shields.io/node/v/cidrly)](https://nodejs.org)

## Features

- Interactive React-based terminal dashboard
- VLSM optimization with "Largest First" allocation
- Dual efficiency metrics (Supernet + Range)
- 50% capacity planning rule (auto-doubles device counts)
- Smart subnet and supernet calculation
- VLAN management
- Save/load network plans as JSON

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

- `↑/↓` or `k/j` - Navigate subnets
- `i` or `Enter` - Show subnet details
- `a` - Add subnet
- `e` - Edit subnet
- `x` - Delete subnet
- `c` - Calculate network plan
- `s` - Save plan
- `l` - Load plan
- `n` - Create new plan
- `b` - Change base IP
- `q` - Quit
- `Escape` - Cancel dialog

## Examples

See [examples/](examples/) for sample network plans:

- `example-campus-network.json` - Multi-building university network
- `example-data-center.json` - Three-tier application infrastructure
- `example-branch-office.json` - Small office network

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
