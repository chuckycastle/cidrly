# cidrly

Network architecture and design planning CLI tool with automatic subnet calculations, VLAN management, and an interactive terminal dashboard.

## Features

- Interactive React-based terminal dashboard
- VLSM optimization with "Largest First" allocation
- Dual efficiency metrics (Supernet + Range)
- 50% capacity planning rule (auto-doubles device counts)
- Smart subnet and supernet calculation
- VLAN management
- Save/load network plans as JSON
- Full TypeScript with strict mode

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

**From Source:**

```bash
git clone https://github.com/chuckycastle/cidrly.git
cd cidrly
npm install
npm run build
npm start
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
- `b` - Change base IP
- `q` - Quit
- `Escape` - Cancel dialog

## Technology

Built with ink v6, React 19, Zustand, TypeScript, and Node.js 20+.

## Development

```bash
npm run build        # Build project
npm test             # Run tests (230 tests)
npm run lint         # Lint code
npm run security     # Security scan
```

## Examples

See [examples/](examples/) for sample network plans:

- `campus-network.json` - Multi-building university network
- `data-center.json` - Three-tier application infrastructure
- `branch-office.json` - Small office network

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture and design decisions
- [CHANGELOG.md](CHANGELOG.md) - Version history and release notes

## Development Status

cidrly is in **initial development** (v0.x.x). The API may change as we gather feedback and refine features. See [BETA_README.md](BETA_README.md) for:

- Beta testing guidelines
- Known limitations
- How to provide feedback
- Versioning strategy

## License

ISC

## Support

For issues or feature requests, open an issue on GitHub.
