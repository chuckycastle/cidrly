# Homebrew Tap Setup Instructions

This document explains how to set up the Homebrew tap for cidrly distribution.

## Overview

Homebrew taps are third-party repositories that allow users to install your formulae. For cidrly, we'll create a separate repository called `homebrew-cidrly`.

## Step-by-Step Setup

### 1. Create the Homebrew Tap Repository

Create a new GitHub repository named `homebrew-cidrly`:

```bash
# On GitHub, create a new repository: chuckycastle/homebrew-cidrly
# Description: "Homebrew tap for cidrly - Network architecture planning CLI"
# Public repository
# Initialize with README
```

### 2. Clone the Tap Repository

```bash
cd ~/git
git clone https://github.com/chuckycastle/homebrew-cidrly.git
cd homebrew-cidrly
```

### 3. Copy the Formula

Copy the formula from the cidrly project:

```bash
mkdir -p Formula
cp /Users/chuckycastle/git/cidrly/Formula/cidrly.rb Formula/
```

### 4. Update the SHA256 Checksum

After creating the v1.0.0-beta.1 GitHub release, download the tarball and generate the SHA256:

```bash
# Download the release tarball
curl -L https://github.com/chuckycastle/cidrly/archive/refs/tags/v1.0.0-beta.1.tar.gz -o cidrly-beta.1.tar.gz

# Generate SHA256
shasum -a 256 cidrly-beta.1.tar.gz

# Copy the SHA256 hash and update Formula/cidrly.rb
```

Edit `Formula/cidrly.rb` and replace the empty `sha256 ""` with the actual hash:

```ruby
sha256 "abc123..." # Replace with actual SHA256
```

### 5. Create Repository README

Create a `README.md` in the homebrew-cidrly repository:

````markdown
# Homebrew Tap for cidrly

Official Homebrew tap for [cidrly](https://github.com/chuckycastle/cidrly) - Network architecture and design planning CLI tool.

## Installation

```bash
# Tap the repository
brew tap chuckycastle/cidrly

# Install cidrly
brew install cidrly
```
````

## Upgrade

```bash
# Update Homebrew and upgrade cidrly
brew update
brew upgrade cidrly
```

## Uninstall

```bash
brew uninstall cidrly
brew untap chuckycastle/cidrly
```

## About cidrly

cidrly is a modern, type-safe command-line tool for network engineers to plan and design network architectures with:

- Interactive React-based dashboard
- Automatic subnet calculations with VLSM optimization
- VLAN management
- Dual efficiency metrics
- Save/load network plans

For more information, visit the [main repository](https://github.com/chuckycastle/cidrly).

````

### 6. Commit and Push

```bash
git add .
git commit -m "feat: add cidrly formula for beta.1 release"
git push origin main
````

### 7. Test the Tap

```bash
# Tap the repository
brew tap chuckycastle/cidrly

# Install cidrly
brew install cidrly

# Test it works
cidrly --help
```

## Updating for New Releases

When releasing a new version (e.g., v1.0.0-beta.2):

1. Update `Formula/cidrly.rb`:
   - Change the `url` to point to the new tag
   - Download the new tarball and update the `sha256`
   - Update the version in the URL

2. Commit and push:

   ```bash
   git add Formula/cidrly.rb
   git commit -m "chore: update cidrly to v1.0.0-beta.2"
   git push origin main
   ```

3. Users can upgrade with:
   ```bash
   brew update
   brew upgrade cidrly
   ```

## Troubleshooting

### Formula Audit

Before committing, audit the formula:

```bash
brew audit --strict Formula/cidrly.rb
```

### Test Installation

Test the formula locally before pushing:

```bash
brew install --build-from-source Formula/cidrly.rb
```

### Common Issues

- **SHA256 mismatch**: Download the exact tarball from GitHub releases and regenerate
- **Node version conflicts**: Ensure node@18 is available in Homebrew
- **Build failures**: Check that `npm run build:prod` works in the cidrly project

## Resources

- [Homebrew Formula Cookbook](https://docs.brew.sh/Formula-Cookbook)
- [How to Create a Homebrew Tap](https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap)
