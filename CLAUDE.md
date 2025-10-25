# Claude Code Development Guide

## CRITICAL: Publishing Workflow

**⚠️ NEVER use `npm publish` locally!**

All publishing is handled automatically via GitHub Actions. Always follow this workflow:

### Publishing Updates to NPM

```bash
# 1. Make your code changes and commit them
git add .
git commit -m "fix: your changes here"
git push origin main

# 2. Bump version and create tag
npm version prerelease --preid=beta -m "chore: bump version to %s"

# 3. Push commit and tag to GitHub
git push origin main --follow-tags

# 4. GitHub Actions automatically:
#    ✅ Runs tests, linting, security scans
#    ✅ Builds production code
#    ✅ Publishes to npm with beta tag (using NPM_TOKEN secret)
#    ✅ Creates GitHub Release
```

**Why this workflow?**
- NPM_TOKEN is stored as GitHub secret (not available locally)
- Automated CI/CD ensures quality checks before publishing
- Consistent release process with GitHub Releases
- Prevents accidental local publishes with wrong credentials

**To verify successful publish:**
```bash
npm view cidrly@beta version  # Check latest version on npm
gh run list --workflow=release.yml --limit 1  # Check workflow status
gh release view v1.0.0-beta.X  # View GitHub Release
```

## Project Overview

cidrly is a type-safe CLI tool for network architecture planning built with:
- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **UI Framework**: Ink v6 (React for CLI)
- **State Management**: Zustand with Immer
- **Validation**: Zod schemas

## Development Commands

```bash
npm run dev          # Run in development mode (tsx)
npm run build        # Build TypeScript
npm run build:prod   # Clean + production build
npm test             # Run tests
npm run lint         # Lint code
npm run security     # Security scan
npm run verify       # Format + lint + test + security
```

## Architecture Principles

- **Type Safety First**: Full TypeScript with strict mode
- **Component-Driven**: React components for all UI
- **Immutable State**: Zustand with Immer for safe updates
- **Validation Everywhere**: Zod schemas for all data
- **Security by Default**: Multi-layer path protection

## Common Tasks

### Adding New Features
1. Create feature in appropriate directory (src/components/, src/core/, etc.)
2. Add tests
3. Update types if needed
4. Build and test locally
5. Follow publishing workflow above

### Fixing Bugs
1. Write failing test first
2. Implement fix
3. Verify test passes
4. Follow publishing workflow above

### Terminal UI Considerations
- No true transparency in Ink - use conditional rendering
- No z-index layering - content renders sequentially
- Hide conflicting content instead of trying to layer it
- Clear screen on launch for professional appearance

## Documentation

- **README.md**: User-facing documentation
- **ARCHITECTURE.md**: Technical architecture details
- **BETA_README.md**: Beta testing guide
- **CHANGELOG.md**: Version history (update with each release)

## Important Patterns

### Screen Clearing
Always clear terminal on app launch:
```tsx
import { useEffect } from 'react';

export default function Component() {
  useEffect(() => {
    process.stdout.write('\x1Bc'); // Full terminal reset
  }, []);
  // ...
}
```

### Global Installation
Package is a CLI tool with `"preferGlobal": true` to warn users who install locally.

Users should install globally:
```bash
npm install -g cidrly@beta
```

## Distribution Channels

1. **npm**: `cidrly@beta` tag for beta releases
2. **GitHub Releases**: Automated with each version tag
3. **Homebrew**: `chuckycastle/cidrly` tap (manual updates)

## Support

For issues or questions, see GitHub Issues: https://github.com/chuckycastle/cidrly/issues
