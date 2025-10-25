# cidrly Beta Testing Guide

Thank you for helping test cidrly, an interactive CLI tool for network architecture planning.

## What is cidrly?

An interactive terminal tool for network engineers with VLSM optimization, dual efficiency metrics, 50% capacity planning, and JSON-based plan persistence.

## Installation

**Homebrew (macOS/Linux):**

```bash
brew tap chuckycastle/cidrly && brew install cidrly
```

**NPM (All Platforms):**

```bash
npm install -g cidrly@beta
```

**From Source:**

```bash
git clone https://github.com/chuckycastle/cidrly.git && cd cidrly && npm install && npm run build && npm start
```

## Quick Start

1. Launch: `cidrly`
2. Press `n` to create a plan
3. Enter plan name and base IP (e.g., "10.0.0.0")
4. Press `a` to add subnets (name, VLAN ID, device count)
5. Press `c` to calculate IP ranges
6. Press `s` to save

## Keyboard Shortcuts

| Key            | Action              |
| -------------- | ------------------- |
| `↑/↓` or `k/j` | Navigate subnets    |
| `i` or `Enter` | Show subnet details |
| `a`            | Add subnet          |
| `e`            | Edit subnet         |
| `x`            | Delete subnet       |
| `c`            | Calculate plan      |
| `s`            | Save plan           |
| `l`            | Load plan           |
| `b`            | Change base IP      |
| `q`            | Quit                |
| `Esc`          | Cancel dialog       |

## Examples

Check `examples/` for sample plans:

- `campus-network.json`
- `data-center.json`
- `branch-office.json`

## What to Test

**Core Functionality:**

- Create/edit/delete network plans
- Add/edit/delete subnets
- Calculate IP ranges
- Save and load plans
- View subnet details

**UI/UX:**

- Keyboard navigation
- Terminal readability (light/dark themes)
- Different terminal sizes
- Error message clarity

**Edge Cases:**

- Large device counts (1000+)
- Small device counts (1-2)
- Invalid inputs
- Corrupted JSON files

## Known Limitations

- IPv4 only (IPv6 planned)
- JSON export only (CSV/YAML planned)
- No network diagrams (planned)
- Limited error recovery

## Provide Feedback

Report issues on GitHub with:

- cidrly version (`cidrly --version`)
- Operating system
- Terminal app and size
- Steps to reproduce
- Screenshots (helpful!)

## Documentation

- [README.md](README.md) - Full documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
- [CHANGELOG.md](CHANGELOG.md) - Version history

## Troubleshooting

**Command not found:**

```bash
npm config get prefix  # Check PATH for npm
brew doctor            # Check PATH for Homebrew
```

**Dashboard rendering issues:**
Requires 256-color support, Unicode support, and minimum 80x24 terminal size.

**Can't save/load:**
Check write permissions in current directory.

## Thank You!

Your feedback helps make cidrly better. We appreciate your time testing this beta release!
