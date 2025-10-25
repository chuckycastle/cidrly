# Beta 1 Release Checklist

Follow these steps in order to release cidrly v1.0.0-beta.1

## ✅ Completed Preparation Tasks

- [x] Version updated to 1.0.0-beta.1
- [x] Package metadata updated
- [x] CHANGELOG.md updated
- [x] README.md updated with installation instructions
- [x] Git repository initialized
- [x] Homebrew formula created
- [x] Beta documentation created
- [x] Example network plans created
- [x] CI/CD workflows updated
- [x] All tests passing (230/230)
- [x] Security scan clean (0 findings)
- [x] Code committed to git

## 📋 Release Steps (Follow in Order)

### Step 1: Generate NPM Access Token

1. Open your browser and go to: https://www.npmjs.com/login
2. Log in as `chuckycastle`
3. Click your profile picture (top right) → "Access Tokens"
4. Or go directly to: https://www.npmjs.com/settings/chuckycastle/tokens
5. Click **"Generate New Token"**
6. Select **"Classic Token"**
7. Choose token type: **"Automation"**
   - This allows publishing from CI/CD
8. **Copy the token immediately** (starts with `npm_...`)
   - You won't be able to see it again!
9. Save it temporarily in a secure location

### Step 2: Add NPM Token to GitHub Secrets

1. Go to: https://github.com/chuckycastle/cidrly/settings/secrets/actions
2. Click **"New repository secret"**
3. Fill in:
   - **Name**: `NPM_TOKEN`
   - **Secret**: Paste the npm token from Step 1
4. Click **"Add secret"**
5. Verify it appears in the secrets list

### Step 3: Push Code to GitHub

```bash
# Make sure you're in the cidrly directory
cd /Users/chuckycastle/git/cidrly

# Push the main branch
git push -u origin main
```

**What happens:**

- Code is pushed to GitHub
- CI workflow will run (tests, linting, build)
- Check at: https://github.com/chuckycastle/cidrly/actions
- Wait for CI to complete successfully (green checkmark)

### Step 4: Create and Push Release Tag

```bash
# Create the tag
git tag v1.0.0-beta.1

# Push the tag to GitHub
git push origin v1.0.0-beta.1
```

**What happens:**

- Release workflow is triggered
- Runs tests, linting, security scan
- Builds production version
- Publishes to npm with @beta tag
- Creates GitHub Release

**Monitor at:**

- GitHub Actions: https://github.com/chuckycastle/cidrly/actions
- GitHub Releases: https://github.com/chuckycastle/cidrly/releases

**Expected duration:** 3-5 minutes

### Step 5: Verify NPM Publication

```bash
# Check if package was published
npm view cidrly@beta

# Should show version 1.0.0-beta.1
```

**Test installation:**

```bash
# Install globally
npm install -g cidrly@beta

# Verify it works
cidrly --version
cidrly --help

# Optional: Uninstall if you don't want it globally yet
npm uninstall -g cidrly
```

### Step 6: Create Homebrew Tap Repository

1. Go to: https://github.com/new
2. Fill in:
   - **Repository name**: `homebrew-cidrly`
   - **Description**: Homebrew tap for cidrly - Network architecture planning CLI
   - **Visibility**: Public
   - **Initialize with**: README (check the box)
3. Click **"Create repository"**

### Step 7: Set Up Homebrew Formula

```bash
# Clone the homebrew tap repository
cd ~/git
git clone https://github.com/chuckycastle/homebrew-cidrly.git
cd homebrew-cidrly

# Create Formula directory and copy formula
mkdir -p Formula
cp /Users/chuckycastle/git/cidrly/Formula/cidrly.rb Formula/

# Download the release tarball
curl -L https://github.com/chuckycastle/cidrly/archive/refs/tags/v1.0.0-beta.1.tar.gz -o cidrly-beta.1.tar.gz

# Generate SHA256 checksum
shasum -a 256 cidrly-beta.1.tar.gz
```

**Copy the SHA256 hash** (the long string of letters/numbers)

### Step 8: Update Homebrew Formula with SHA256

```bash
# Edit the formula
nano Formula/cidrly.rb

# Or use your preferred editor:
# code Formula/cidrly.rb
# vim Formula/cidrly.rb
```

Find this line:

```ruby
sha256 "" # TODO: Update this after creating the GitHub release
```

Replace with (use YOUR actual SHA256):

```ruby
sha256 "abc123def456..." # Replace with the actual SHA256 from Step 7
```

Save and exit.

### Step 9: Create Homebrew Tap README

````bash
# In the homebrew-cidrly directory
cat > README.md << 'EOF'
# Homebrew Tap for cidrly

Official Homebrew tap for [cidrly](https://github.com/chuckycastle/cidrly) - Network architecture and design planning CLI tool.

## Installation

```bash
# Tap the repository
brew tap chuckycastle/cidrly

# Install cidrly
brew install cidrly
````

## Usage

```bash
# Launch the interactive dashboard
cidrly

# View help
cidrly --help
```

## Upgrading

```bash
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
- Dual efficiency metrics (Supernet + Range)
- Save/load network plans as JSON
- 50% capacity planning rule

For more information, visit the [main repository](https://github.com/chuckycastle/cidrly).

## License

ISC
EOF

````

### Step 10: Commit and Push Homebrew Tap

```bash
# Still in homebrew-cidrly directory
git add .
git commit -m "feat: add cidrly formula for v1.0.0-beta.1"
git push origin main
````

### Step 11: Test Homebrew Installation

```bash
# Tap your repository
brew tap chuckycastle/cidrly

# Install cidrly
brew install cidrly

# Test it works
cidrly --version
cidrly --help

# Try launching the dashboard
cidrly
# (Press 'q' to quit)
```

### Step 12: Create GitHub Release Notes

1. Go to: https://github.com/chuckycastle/cidrly/releases
2. Click on the `v1.0.0-beta.1` release (auto-created by workflow)
3. Click **"Edit release"**
4. Add/verify these details:

**Title:**

```
v1.0.0-beta.1 - Limited Beta Release
```

**Description:**

````markdown
# cidrly Beta 1 Release

First public beta release for testing and feedback! 🎉

## Installation

### Homebrew (macOS/Linux)

```bash
brew tap chuckycastle/cidrly
brew install cidrly
```
````

### NPM (All Platforms)

```bash
npm install -g cidrly@beta
```

## What's New

- ✨ Interactive React-based terminal dashboard
- 📊 VLSM optimization with dual efficiency metrics
- 🔢 Smart 50% capacity planning rule
- 💾 Save/load network plans as JSON
- 🎯 Example network plans (campus, data-center, branch-office)
- 🔒 Full TypeScript with comprehensive security
- ✅ 230 automated tests

## Documentation

- [Beta Testing Guide](https://github.com/chuckycastle/cidrly/blob/main/BETA_README.md)
- [README](https://github.com/chuckycastle/cidrly/blob/main/README.md)
- [Architecture](https://github.com/chuckycastle/cidrly/blob/main/ARCHITECTURE.md)
- [Examples](https://github.com/chuckycastle/cidrly/tree/main/examples)

## Known Limitations

- IPv4 only (IPv6 planned)
- JSON export only (CSV/YAML planned)
- No visualization diagrams (planned)

## Beta Testing

This is a **beta release** for testing purposes. See [BETA_README.md](https://github.com/chuckycastle/cidrly/blob/main/BETA_README.md) for:

- Installation instructions
- Testing guidelines
- How to provide feedback
- Known limitations

## Changelog

See [CHANGELOG.md](https://github.com/chuckycastle/cidrly/blob/main/CHANGELOG.md#100-beta1---2025-10-25) for full details.

---

**Feedback:** [Your Private Channel Here]

````

5. Check **"Set as a pre-release"** (it's a beta)
6. Click **"Update release"**

### Step 13: Final Verification

**NPM:**
```bash
# Search for your package
npm search cidrly

# View package info
npm info cidrly@beta

# Test clean installation
npm install -g cidrly@beta
cidrly
````

**Homebrew:**

```bash
# Verify tap
brew tap

# Check formula
brew info cidrly

# Test reinstall
brew uninstall cidrly
brew install cidrly
cidrly
```

**GitHub:**

- [ ] Code visible at https://github.com/chuckycastle/cidrly
- [ ] Release visible at https://github.com/chuckycastle/cidrly/releases
- [ ] CI/CD workflows passing
- [ ] README renders correctly

## 🎉 Success Criteria

You've successfully released when:

- [ ] NPM shows cidrly@1.0.0-beta.1 with @beta tag
- [ ] Homebrew installs cidrly successfully
- [ ] `cidrly` command works from both installations
- [ ] GitHub Release is published and marked as pre-release
- [ ] All CI/CD workflows show green checkmarks

## 📝 Post-Release Tasks

### Update BETA_README.md with Feedback Channel

```bash
cd /Users/chuckycastle/git/cidrly

# Edit BETA_README.md and replace placeholders:
# - [Your Private Channel Here] → Your actual channel
# - [Your Contact Method] → Your contact method
# - [Emergency Contact] → Your emergency contact

# Commit and push the update
git add BETA_README.md
git commit -m "docs: add beta feedback contact information"
git push origin main
```

### Share with Beta Testers

Send them:

1. Installation instructions (Homebrew or NPM)
2. Link to BETA_README.md
3. Link to examples/
4. Expected timeline and feedback process

### Monitor

- **npm stats**: https://www.npmjs.com/package/cidrly
- **GitHub traffic**: https://github.com/chuckycastle/cidrly/graphs/traffic
- **GitHub issues**: https://github.com/chuckycastle/cidrly/issues

## ⚠️ Troubleshooting

### NPM publish fails

- Check NPM_TOKEN is correct in GitHub secrets
- Verify you're logged in to npm: `npm whoami`
- Check package.json version is unique

### Homebrew install fails

- Verify SHA256 matches the tarball
- Check formula syntax: `brew audit --strict Formula/cidrly.rb`
- Test local install: `brew install --build-from-source Formula/cidrly.rb`

### CI/CD workflow fails

- Check GitHub Actions logs
- Verify all tests pass locally: `npm run verify`
- Check Node.js version matches CI (20.x)

## 📞 Need Help?

- GitHub Actions: https://github.com/chuckycastle/cidrly/actions
- NPM Package: https://www.npmjs.com/package/cidrly
- Homebrew Issues: Check formula with `brew doctor`

---

**Ready to release!** Start with Step 1 above. 🚀
