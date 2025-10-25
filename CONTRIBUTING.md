# Contributing to cidrly

Thank you for your interest in contributing to cidrly! This guide will help you get started with development and ensure your contributions meet our quality standards.

## Development Setup

### Prerequisites

- Node.js 20.x or 22.x
- npm 10.0.0 or higher
- Git
- (Optional) Semgrep for security scanning

### Initial Setup

1. **Fork and clone the repository:**

   ```bash
   git clone https://github.com/your-username/cidrly.git
   cd cidrly
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up Git hooks (IMPORTANT):**

   ```bash
   ./scripts/setup-git-hooks.sh
   ```

   This installs a pre-push hook that runs all CI checks locally before pushing.

4. **Verify your setup:**
   ```bash
   npm run build
   npm test
   ```

## Development Workflow

### Making Changes

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

3. **Run checks locally:**

   ```bash
   # Individual checks
   npm run lint              # Code quality
   npm run format:check      # Formatting
   npm test                  # Tests
   npm run build             # TypeScript compilation

   # Or run all checks at once
   ./scripts/verify-pre-push.sh
   ```

4. **Fix any issues:**

   ```bash
   npm run lint:fix          # Auto-fix ESLint issues
   npm run format            # Auto-fix formatting
   ```

5. **Commit your changes:**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

6. **Push your changes:**
   ```bash
   git push origin feature/your-feature-name
   ```
   The pre-push hook will automatically run all checks. If they fail, fix the issues and try again.

### Commit Message Format

We follow conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build process, dependencies, etc.

Examples:

```
feat: add support for IPv6 subnet calculations
fix: resolve duplicate header rendering issue
docs: update README with installation instructions
```

## Code Quality Standards

### Required Checks

All pull requests must pass these checks:

1. **ESLint** - No linting errors
2. **Prettier** - Code must be formatted
3. **TypeScript** - No compilation errors (strict mode)
4. **Tests** - All tests must pass, maintain coverage
5. **Security** - Semgrep scan (warnings reviewed)
6. **Build** - Production build must succeed

### Running Checks Locally

**Before every push:**

```bash
./scripts/verify-pre-push.sh
```

This runs the exact same checks as CI, catching issues before they reach GitHub.

**Individual checks:**

```bash
npm run lint              # Check code quality
npm run lint:fix          # Auto-fix linting issues

npm run format:check      # Check formatting
npm run format            # Auto-fix formatting

npm test                  # Run tests
npm run test:coverage     # Run tests with coverage

npm run security          # Security scan
npm run build:prod        # Production build
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Line length**: 100 characters max
- **Trailing commas**: Always (except JSON)
- **Semicolons**: Always

Prettier and ESLint are configured to enforce these automatically.

## Testing

### Writing Tests

- Place tests next to the code they test: `file.ts` → `file.test.ts`
- Use Vitest for all tests
- Aim for 80%+ code coverage
- Test business logic thoroughly
- UI tests can use snapshots for layout validation

### Running Tests

```bash
npm test                  # Run all tests
npm run test:coverage     # Run with coverage report
npm test -- --watch       # Watch mode
npm test -- file.test.ts  # Run specific test
```

### Example Test

```typescript
import { describe, expect, it } from 'vitest';
import { calculateSubnetMask } from './subnet-calculator';

describe('calculateSubnetMask', () => {
  it('should calculate correct mask for /24 network', () => {
    const result = calculateSubnetMask(24);
    expect(result).toBe('255.255.255.0');
  });

  it('should handle edge cases', () => {
    expect(() => calculateSubnetMask(0)).toThrow();
    expect(() => calculateSubnetMask(33)).toThrow();
  });
});
```

## Security

### Security Scanning

We use Semgrep for static security analysis:

```bash
npm run security          # Run security scan
npm run security:verbose  # Detailed output
```

### Security Guidelines

- **Always validate user input** using Zod schemas
- **Prevent path traversal** using security utilities
- **No hardcoded secrets** - use environment variables
- **Sanitize file paths** before file operations
- **Check for null bytes** in user input
- **Block parent directory references** (`..`) in paths

### Reporting Security Issues

Please report security vulnerabilities privately via GitHub Security Advisories, not as public issues.

## Pull Request Process

1. **Ensure all checks pass locally:**

   ```bash
   ./scripts/verify-pre-push.sh
   ```

2. **Update documentation** if needed (README, ARCHITECTURE, etc.)

3. **Add tests** for new features

4. **Update CHANGELOG.md** following Keep a Changelog format

5. **Create pull request** with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots for UI changes

## CI/CD Pipeline

### GitHub Actions

Every push triggers three CI jobs:

**Test Job** (runs on Node 20.x and 22.x):

- ESLint
- Prettier check
- Vitest tests with coverage
- Coverage upload to Codecov

**Security Job**:

- Semgrep security scan
- npm audit (high severity)

**Build Job**:

- Production build
- Build artifact verification
- Artifact upload

### Avoiding CI Failures

**The pre-push hook prevents most CI failures!**

To ensure your push passes CI:

1. Install Git hooks: `./scripts/setup-git-hooks.sh`
2. The hook runs automatically on `git push`
3. Fix any issues before they reach GitHub

**Manual verification:**

```bash
./scripts/verify-pre-push.sh
```

**Bypass hook** (not recommended):

```bash
git push --no-verify
```

## Release Process

(For maintainers only)

1. **Update version:**

   ```bash
   npm version patch    # 0.1.0 → 0.1.1 (bug fixes)
   npm version minor    # 0.1.0 → 0.2.0 (new features)
   ```

2. **Push with tags:**

   ```bash
   git push origin main --follow-tags
   ```

3. **GitHub Actions automatically:**
   - Runs all tests
   - Builds production artifacts
   - Publishes to npm

## Getting Help

- **Questions?** Open a discussion on GitHub
- **Bugs?** Open an issue with reproduction steps
- **Feature ideas?** Open an issue for discussion first
- **Security?** Use GitHub Security Advisories

## Code of Conduct

- Be respectful and constructive
- Focus on what's best for the project
- Welcome newcomers and help them contribute
- Follow our coding standards

## Thank You!

Your contributions make cidrly better for everyone. We appreciate your time and effort!
