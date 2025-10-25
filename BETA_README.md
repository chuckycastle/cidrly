# cidrly Beta Testing Guide

Welcome to the cidrly beta program! Thank you for helping us test and improve this network architecture planning tool.

## What is cidrly?

cidrly is a modern, interactive CLI tool that helps network engineers plan and design network architectures with:

- 🎨 **Interactive Dashboard** - Beautiful React-based terminal interface
- 📊 **VLSM Optimization** - Automatic subnet calculations with zero address gaps
- 📈 **Dual Efficiency Metrics** - Supernet fit and address packing efficiency
- 🔢 **Smart Planning** - 50% capacity rule for future growth
- 💾 **Save/Load Plans** - JSON-based network plan persistence
- 🔒 **Type-Safe** - Full TypeScript with Zod validation

## Installation

### Option 1: Homebrew (macOS/Linux) - Recommended

```bash
# Tap the cidrly repository
brew tap chuckycastle/cidrly

# Install cidrly
brew install cidrly

# Run cidrly
cidrly
```

### Option 2: NPM (All Platforms)

```bash
# Install globally with beta tag
npm install -g cidrly@beta

# Run cidrly
cidrly
```

### Option 3: From Source (Development)

```bash
# Clone the repository
git clone https://github.com/chuckycastle/cidrly.git
cd cidrly

# Install dependencies
npm install

# Build and run
npm run build
npm start
```

## Quick Start

1. **Launch the dashboard:**

   ```bash
   cidrly
   ```

2. **Create your first network plan:**
   - Press `n` to create a new plan
   - Enter a plan name (e.g., "Campus Network")
   - Enter a base IP address (e.g., "10.0.0.0")

3. **Add subnets:**
   - Press `a` to add a subnet
   - Enter subnet name (e.g., "Engineering")
   - Enter VLAN ID (e.g., 10)
   - Enter expected device count (e.g., 25)
   - cidrly automatically plans for 50 devices (2x expected)

4. **Calculate network plan:**
   - Press `c` to calculate IP ranges
   - View optimized VLSM allocation with dual efficiency metrics

5. **Save your plan:**
   - Press `s` to save
   - Plans are saved as JSON in `saved-plans/`

## Keyboard Shortcuts

| Key            | Action                 |
| -------------- | ---------------------- |
| `↑/↓` or `k/j` | Navigate subnets       |
| `i` or `Enter` | Show subnet details    |
| `a`            | Add new subnet         |
| `e`            | Edit selected subnet   |
| `x`            | Delete selected subnet |
| `c`            | Calculate network plan |
| `s`            | Save plan to file      |
| `l`            | Load plan from file    |
| `b`            | Change base IP address |
| `q`            | Quit dashboard         |
| `Esc`          | Cancel current dialog  |

## Example Network Plans

Check the `examples/` directory for sample network plans:

- `campus-network.json` - Multi-building campus with VLANs
- `data-center.json` - Server infrastructure with multiple tiers
- `branch-office.json` - Small office network

Load an example with `l` and select from the file picker.

## What to Test

### Core Functionality

- [ ] Create new network plans with different base IPs
- [ ] Add multiple subnets with varying device counts
- [ ] Calculate network plans and verify IP ranges
- [ ] Edit existing subnets and recalculate
- [ ] Delete subnets and verify plan updates
- [ ] Save and load network plans
- [ ] View detailed subnet information

### UI/UX

- [ ] Navigate with keyboard shortcuts
- [ ] Check readability on your terminal (light/dark themes)
- [ ] Test with different terminal sizes
- [ ] Verify error messages are helpful
- [ ] Check that dialogs work properly

### Edge Cases

- [ ] Very large device counts (1000+)
- [ ] Very small device counts (1-2)
- [ ] Maximum VLAN ID (4094)
- [ ] Invalid inputs (letters where numbers expected)
- [ ] Loading corrupted/invalid JSON files
- [ ] Disk space errors when saving

## Known Limitations

This is a **beta release** with the following known limitations:

- ✅ IPv4 only (IPv6 support planned)
- ✅ JSON export only (CSV/YAML planned)
- ✅ No network visualization (diagrams planned)
- ✅ No import from existing configs (planned)
- ✅ Limited error recovery in some scenarios

## How to Provide Feedback

We're collecting feedback through **[Your Private Channel Here - Slack/Discord/Email]**.

### Bug Reports

When reporting bugs, please include:

1. **cidrly version:**

   ```bash
   cidrly --version  # or npm list -g cidrly
   ```

2. **Operating System:**
   - macOS version, Linux distribution, or Windows version

3. **Terminal:**
   - Terminal app name (iTerm2, Terminal.app, Alacritty, etc.)
   - Terminal size (output of `tput cols` and `tput lines`)

4. **Steps to reproduce:**
   - Exact steps to trigger the bug
   - What you expected to happen
   - What actually happened

5. **Screenshots:**
   - Terminal screenshots are very helpful!

6. **Saved plan (if applicable):**
   - Attach the JSON file that triggers the issue

### Feature Requests

Tell us about features you'd like to see:

- What problem would this solve?
- How would you use this feature?
- Is there a workaround you're currently using?

### General Feedback

We'd love to hear about:

- What you like about cidrly
- What's confusing or frustrating
- How cidrly fits into your workflow
- Comparison with other tools you use

## Beta Timeline

- **Beta Start:** October 25, 2025
- **Beta Duration:** 2-4 weeks
- **Expected Feedback Deadline:** November 15, 2025
- **Planned Beta.2 Release:** Early November (if needed)
- **Target 1.0 Release:** Late November 2025

## Getting Help

### Documentation

- [README.md](README.md) - Full project documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
- [CHANGELOG.md](CHANGELOG.md) - Version history

### Common Issues

**Q: Command not found after installation**

A: Make sure your PATH includes npm global bin:

```bash
# For npm installation
npm config get prefix  # Should be in your PATH

# For Homebrew installation
brew doctor  # Check for PATH issues
```

**Q: Dashboard not rendering correctly**

A: Try a different terminal or check your terminal color settings. cidrly works best with:

- 256-color support
- Unicode support
- Minimum 80x24 terminal size

**Q: Can't save/load plans**

A: Check that you have write permissions in the current directory or use the `saved-plans/` directory.

## Upgrading

### Homebrew

```bash
brew update
brew upgrade cidrly
```

### NPM

```bash
npm update -g cidrly@beta
```

## Uninstalling

### Homebrew

```bash
brew uninstall cidrly
brew untap chuckycastle/cidrly
```

### NPM

```bash
npm uninstall -g cidrly
```

## Thank You!

Your feedback is invaluable in making cidrly better for the network engineering community. We appreciate your time and effort in testing this beta release!

---

**Questions?** Reach out via **[Your Contact Method]**

**Found a critical bug?** Contact us immediately via **[Emergency Contact]**
