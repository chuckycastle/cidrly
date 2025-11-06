# Contributing to cidrly

Guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Reporting Issues](#reporting-issues)
- [Contributing Code](#contributing-code)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)

## Code of Conduct

By participating in this project, you agree to:

- Communicate respectfully
- Provide constructive feedback
- Focus on technical merits
- Welcome new contributors

## Getting Started

### Prerequisites

- Node.js >= 24.0.0
- npm >= 10.0.0
- Git

### Development Setup

1. **Fork the repository**

   Fork the project on GitHub to your own account.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/cidrly.git
   cd cidrly
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Run in development mode**

   ```bash
   npm run dev
   ```

5. **Build the project**

   ```bash
   npm run build
   ```

6. **Run tests**

   ```bash
   npm test
   ```

## Reporting Issues

Use GitHub Issues for bugs, feature requests, questions, and documentation improvements.

### Bug Reports

Use the [Bug Report template](https://github.com/chuckycastle/cidrly/issues/new?template=bug_report.yml) and include:

- Clear description of the bug
- Steps to reproduce the issue
- Expected vs actual behavior
- Environment details (cidrly version, Node.js version, OS)
- Error logs or terminal output
- Network plan details if relevant (sanitized)

### Feature Requests

Use the [Feature Request template](https://github.com/chuckycastle/cidrly/issues/new?template=feature_request.yml) and describe:

- The feature you'd like to see
- The problem it solves or use case
- Your proposed solution
- Alternative approaches considered

### Questions

Use the [Question template](https://github.com/chuckycastle/cidrly/issues/new?template=question.yml) for:

- Usage questions
- Clarification on features
- Help with configuration

### Documentation

Use the [Documentation template](https://github.com/chuckycastle/cidrly/issues/new?template=documentation.yml) to suggest:

- Missing documentation
- Unclear explanations
- Examples that would be helpful
- Corrections to existing docs

## Contributing Code

### Finding Work

Look for issues labeled:

- `good first issue` - Great for newcomers
- `help wanted` - Maintainers need help with these
- `bug` - Bug fixes are always welcome
- `enhancement` - New features or improvements

Check the [GitHub Issues](https://github.com/chuckycastle/cidrly/issues) page to see all open issues, and view [Milestones](https://github.com/chuckycastle/cidrly/milestones) to see the project roadmap.

Priority labels indicate urgency:

- `priority: high` - Critical features and improvements
- `priority: medium` - Important but not urgent
- `priority: low` - Nice-to-have enhancements

### Before You Start

1. **Check existing issues** - Someone might already be working on it
2. **Comment on the issue** - Let others know you're working on it
3. **Discuss major changes** - Open an issue first for significant changes

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feature/subnet-pool-management` - New features
- `fix/cidr-validation-bug` - Bug fixes
- `docs/api-examples` - Documentation updates
- `refactor/subnet-calculator` - Code refactoring

### Making Changes

1. **Create a branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, self-documenting code
   - Add comments for complex logic
   - Update documentation as needed

3. **Add tests**
   - Write unit tests for new functionality
   - Update existing tests if behavior changes
   - Ensure all tests pass

4. **Run the linter**

   ```bash
   npm run lint
   ```

5. **Format your code**

   ```bash
   npm run format
   ```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Place tests in `__tests__/` directories
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies
- Aim for high code coverage

Example test structure:

```typescript
describe('SubnetCalculator', () => {
  it('should calculate correct subnet mask for /24 network', () => {
    // Arrange
    const calculator = new SubnetCalculator();

    // Act
    const result = calculator.calculateSubnetMask('192.168.1.0/24');

    // Assert
    expect(result).toBe('255.255.255.0');
  });
});
```

## Code Style

We use ESLint and Prettier to maintain consistent code style.

### Key Guidelines

- **TypeScript**: Use strict type checking
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Line length**: 100 characters maximum
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and types
  - `UPPER_CASE` for constants

### Running Formatters

```bash
# Check formatting
npm run format:check

# Auto-fix formatting
npm run format
```

## Commit Messages

Write clear, descriptive commit messages following these guidelines:

### Format

```
type(scope): brief description

Detailed explanation of the change (optional).

Fixes #123
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

### Examples

```
feat(calculator): add support for IPv6 subnet calculations

Implements IPv6 CIDR notation parsing and subnet calculations.
Includes validation for IPv6 address formats.

Fixes #42
```

```
fix(dashboard): correct subnet allocation ordering

Subnets now properly sort by VLAN ID instead of name.

Fixes #58
```

## Pull Requests

### Before Submitting

- [ ] Code follows the project's style guidelines
- [ ] Tests pass locally (`npm test`)
- [ ] New tests added for new functionality
- [ ] Documentation updated if needed
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with main

### Submitting

1. **Push your changes**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**
   - Go to the repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

3. **PR Description**

   Include:
   - What the PR does
   - Why the change is needed
   - How to test the changes
   - Screenshots (for UI changes)
   - Related issues (use "Fixes #123")

### Review Process

- Maintainers will review your PR
- Address any feedback or requested changes
- Once approved, a maintainer will merge your PR
- Your contribution will be included in the next release

### CI/CD

All PRs run through automated checks:

- TypeScript compilation
- ESLint checking
- Prettier formatting
- Unit tests
- Security scanning (Semgrep)

Ensure all checks pass before requesting review.

## Questions?

If you have questions about contributing:

- Check existing [Issues](https://github.com/chuckycastle/cidrly/issues)
- Ask in a [new Question issue](https://github.com/chuckycastle/cidrly/issues/new?template=question.yml)
- Review closed PRs for examples
