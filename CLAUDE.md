# Claude Code Development Guide

## Overview

This document provides guidance for Claude Code when working on this project. It supplements the technical documentation with development principles and best practices specific to this codebase.

## Required Reading

### 🎯 Problem-Solving Principles

**READ THIS FIRST**: [.claude/PROBLEM_SOLVING_PRINCIPLES.md](.claude/PROBLEM_SOLVING_PRINCIPLES.md)

This document contains critical lessons learned from real development challenges in this project. It will help you:

- Avoid over-engineering solutions
- Prioritize simple, direct approaches
- Recognize when you're going down the wrong path
- Make better architectural decisions

**Key takeaway**: Always ask "Can I just not do X?" before "How can I work around X?"

## Project Context

### Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **UI Framework**: Ink v6 (React for CLI)
- **State Management**: Zustand with Immer
- **Validation**: Zod schemas
- **Testing**: Vitest
- **Build**: TypeScript compiler

### Architecture Philosophy

- **Type Safety First**: Full TypeScript with strict mode enabled
- **Component-Driven**: React components for all UI elements
- **Immutable State**: Zustand with Immer for safe state updates
- **Validation Everywhere**: Zod schemas for all data structures
- **Security by Default**: Multi-layer path protection and input validation

## Development Patterns

### UI Development (Ink)

- **No True Transparency**: Ink doesn't support CSS-like transparency
- **No Z-Index Layering**: Content renders sequentially, not in layers
- **Conditional Rendering**: Hide conflicting content instead of trying to layer it
- **Example**: Hide table when dialog is open rather than trying to make dialog opaque

### State Management

- **Zustand Stores**: Use hooks for accessing state
- **Immer for Updates**: All state updates go through Immer for safety
- **Store Organization**: Separate stores for Plan, UI, and Notifications

### File Operations

- **Security First**: Always validate paths to prevent directory traversal
- **Use Service Layer**: FileService for all file operations
- **Error Handling**: Use custom FileOperationError for user-friendly messages

### Component Structure

```
src/
├── components/
│   ├── dialogs/    # Modal dialogs (input, confirm, select, etc.)
│   ├── layout/     # Header, Footer, layout components
│   ├── views/      # Full-screen views (Dashboard, Welcome)
│   └── widgets/    # Reusable UI components (tables, pickers)
├── core/           # Business logic (calculators, models, validators)
├── hooks/          # React hooks for shared logic
├── store/          # Zustand stores
└── themes/         # Colors and styling
```

## Common Pitfalls to Avoid

### ❌ Don't: Over-Engineer UI Solutions

- Trying to detect terminal background colors
- Complex layering or z-index workarounds
- Custom rendering engines or buffer manipulation

### ✅ Do: Use Simple Conditional Rendering

```tsx
// Good: Hide content that would conflict
{!isDialogOpen && <BackgroundContent />}
{isDialogOpen && <Dialog />}

// Bad: Try to layer or make transparent
<BackgroundContent opacity={0.5} /> // Doesn't work in terminals
<Dialog zIndex={999} />              // Doesn't work in Ink
```

### ❌ Don't: Modify Core Calculations Without Testing

- Subnet calculations are validated and correct
- Changes can break the 50% planning rule
- Always run tests after changes: `npm test`

### ✅ Do: Use Existing Validation

```tsx
import { validateSubnetName, validateVlanId } from '../core/validators/validators.js';

// Validation is already implemented for:
// - Subnet names
// - VLAN IDs (1-4094)
// - Device counts
// - IP addresses
// - File names
```

## Testing Guidelines

### Run Tests Before Committing

```bash
npm test              # Run all tests
npm run build         # Verify TypeScript compilation
```

### Test Coverage

- All business logic in `core/` should have tests
- UI components can have snapshot tests
- File operations need security tests

## Documentation Standards

### When to Update Documentation

- New features → Update README.md
- Architecture changes → Update ARCHITECTURE.md
- Breaking changes → Update CHANGELOG.md
- Lessons learned → Update .claude/PROBLEM_SOLVING_PRINCIPLES.md

### Code Comments

- **Do**: Explain why, not what
- **Do**: Document non-obvious business rules
- **Don't**: Comment obvious code
- **Don't**: Leave TODO comments (use issues instead)

## Security Considerations

### Path Validation

```tsx
// Always validate file paths
import { validateSafePath } from '../infrastructure/security/path-validator.js';

// Checks for:
// - Directory traversal attacks (../)
// - Absolute paths outside project
// - Null bytes and special characters
```

### Input Validation

- Use Zod schemas for all external data
- Validate user input before using it
- Sanitize data before displaying

## Performance Notes

### Rendering Performance

- Ink re-renders on every state change
- Use React.memo for expensive components
- Avoid unnecessary re-renders with proper hook dependencies

### File Operations

- Plans are cached in memory after loading
- Debounce frequent save operations
- Use async operations for file I/O

## Common Tasks

### Adding a New Dialog

1. Create component in `src/components/dialogs/`
2. Add dialog type to `DialogType` union in DashboardView
3. Add handler in DashboardView
4. Add keyboard shortcut if needed
5. Hide table when dialog is open: `{dialog.type === 'none' && <Table />}`

### Adding a New Calculation

1. Create function in `src/core/calculators/`
2. Add unit tests
3. Add Zod schema if needed
4. Document the algorithm and edge cases

### Adding a New Color/Theme Element

1. Add to `src/themes/colors.ts`
2. Use Chalk for coloring
3. Test with both light and dark terminal backgrounds
4. Don't try to detect terminal colors - let them show through

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### Terminal Rendering Issues

- Don't try to detect terminal capabilities
- Use standard ANSI colors
- Test with vanilla terminal settings

### State Not Updating

- Check if you're using Immer correctly in Zustand
- Verify hook dependencies are correct
- Use React DevTools (Ink supports it)

## Getting Help

1. **Check existing docs**: README.md, ARCHITECTURE.md, this file
2. **Review problem-solving principles**: .claude/PROBLEM_SOLVING_PRINCIPLES.md
3. **Look at existing code**: Find similar patterns in the codebase
4. **Check test files**: Tests show expected behavior

## Summary

- **Read PROBLEM_SOLVING_PRINCIPLES.md first**
- **Choose simple solutions over clever ones**
- **Validate everything**
- **Test before committing**
- **When in doubt, hide content rather than layer it**

Remember: The best code is the code you don't write.
