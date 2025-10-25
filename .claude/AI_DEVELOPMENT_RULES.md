# AI Development Rules for cidrly

## Purpose

This document establishes **mandatory rules** for AI assistants (like Claude Code) working on this project. These rules are **non-negotiable** and must be followed in every development session.

## 🚨 CRITICAL: Pre-Push Verification is MANDATORY

### Rule #1: Always Install the Pre-Push Hook First

When starting a new development session, **IMMEDIATELY check if the pre-push hook is installed:**

```bash
# Check if hook exists
test -f .git/hooks/pre-push && echo "✓ Hook installed" || echo "✗ Hook missing"

# If missing, install it
./scripts/setup-git-hooks.sh
```

**Why:** The hook prevents CI failures by catching issues locally. Without it, you WILL break the build.

### Rule #2: Never Push Without Verification

Before **EVERY** `git push`, the verification script MUST run. The pre-push hook does this automatically, but if you need to verify manually:

```bash
./scripts/verify-pre-push.sh
```

**If this script fails, you MUST fix the issues before pushing. No exceptions.**

### Rule #3: Never Use `git push --no-verify`

Using `--no-verify` is **FORBIDDEN** except in documented emergencies.

**Valid emergencies only:**

- Production is down and hotfix is critical
- CI infrastructure itself is broken (not your code)

**ALWAYS document in commit message if you bypass the hook.**

### Rule #4: Fix Failures Locally, Not in CI

If verification fails:

1. ❌ **WRONG:** "I'll push and fix it when CI fails"
2. ✅ **RIGHT:** "I'll fix it now and verify locally"

**Remember:** Local feedback is instant. CI feedback takes minutes and wastes resources.

## Mandatory Verification Checklist

Before pushing ANY code, ensure these pass:

- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formatting correct (`npm run format:check`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Security scan passes (`npm run security`)
- [ ] Production build works (`npm run build:prod`)

**The pre-push hook checks all of these automatically.**

## Code Quality Rules

### Rule #5: Always Run Format Before Committing

```bash
# Auto-fix formatting issues
npm run format

# Auto-fix lint issues
npm run lint:fix

# Then commit
git add .
git commit -m "your message"
```

**Never commit code that fails `npm run format:check`.**

### Rule #6: Never Modify package.json Without Testing

If you modify `package.json`, `package-lock.json`, or dependencies:

1. Run `npm install` to update lockfile
2. Run `npm test` to verify tests still pass
3. Run `./scripts/verify-pre-push.sh` before committing

### Rule #7: Test Coverage Must Not Decrease

Current coverage thresholds (in `jest.config.mjs`):

- Branches: 69%
- Functions: 64%
- Lines: 71%
- Statements: 71%

**Never lower these thresholds without explicit approval.**

If you add new code that lowers coverage, **add tests** to maintain thresholds.

## Development Workflow Rules

### Rule #8: Follow the Correct Git Workflow

**For regular changes:**

```bash
# 1. Make changes
# 2. Format and lint
npm run format
npm run lint:fix

# 3. Test
npm test

# 4. Commit
git add .
git commit -m "feat: your changes"

# 5. Push (hook runs automatically)
git push origin main
```

**For version releases:**

```bash
# 1. Verify everything passes
./scripts/verify-pre-push.sh

# 2. Push changes first
git push origin main

# 3. Bump version
npm version patch  # or minor

# 4. Push tag (hook runs again)
git push origin main --follow-tags
```

### Rule #9: Never Skip Steps in the Publishing Workflow

See CLAUDE.md "Publishing Updates to NPM" section. Follow it **exactly**.

**Never:**

- Run `npm publish` locally (use GitHub Actions)
- Skip version bumping
- Push without tags
- Forget to update CHANGELOG.md

### Rule #10: Always Update Documentation

When adding features or changing behavior:

- [ ] Update README.md if user-facing
- [ ] Update CLAUDE.md if development process changes
- [ ] Update CHANGELOG.md with changes
- [ ] Update ARCHITECTURE.md if architecture changes
- [ ] Update type definitions if TypeScript changes

**Documentation is part of the feature. Not optional.**

## Code Style Rules

### Rule #11: Follow TypeScript Strict Mode

- All code must compile with `strict: true`
- No `any` types without justification (use `unknown` instead)
- No `@ts-ignore` without documented reason
- All functions must have return types (ESLint enforces this)

### Rule #12: Follow Existing Patterns

- UI components: Use Ink patterns from existing components
- State management: Use Zustand with Immer (see `src/store/`)
- Validation: Use Zod schemas (see `src/schemas/`)
- File operations: Use FileService (see `src/services/`)

**Don't introduce new patterns without discussion.**

### Rule #13: Security First

- Always validate user input with Zod
- Always sanitize file paths (use `security-utils.ts`)
- Never trust external data
- Never bypass security checks

**Security utils are mandatory for:**

- File path handling (`sanitizeFilePath`, `resolveUserPath`)
- Filename validation (`validateFilename`)
- Path safety checks (`isPathSafe`)

## Testing Rules

### Rule #14: Write Tests for New Code

- New features require tests
- Bug fixes require regression tests
- Tests must pass before committing

**Test file location:** `tests/` directory or next to source file with `.test.ts` extension

### Rule #15: Use Correct Test Patterns

```typescript
import { describe, expect, it } from 'vitest';

describe('ComponentName', () => {
  it('should do expected behavior', () => {
    const result = functionUnderTest();
    expect(result).toBe(expected);
  });

  it('should handle edge cases', () => {
    expect(() => functionUnderTest(invalidInput)).toThrow();
  });
});
```

## Problem-Solving Rules

### Rule #16: Simple Solutions First

**Always** read `.claude/PROBLEM_SOLVING_PRINCIPLES.md` before starting complex work.

**Key principle:**

- Ask "Can we just not do X?" before "How can we work around X?"
- Prefer removing problems over solving them
- Choose solution that touches fewest files
- Value maintainability over technical elegance

**If you're modifying >5 files for a UI issue, you're probably over-engineering.**

### Rule #17: No Clever Code

- Write obvious code
- Use clear variable names
- Prefer verbosity over brevity
- Comment "why," not "what"

**Bad:** `const x = a.reduce((p,c) => p + c.v, 0)`

**Good:**

```typescript
// Calculate total value from all items
const totalValue = items.reduce((sum, item) => sum + item.value, 0);
```

## Communication Rules

### Rule #18: Be Explicit About Changes

When making changes, clearly state:

1. What files are being modified
2. Why the change is necessary
3. What the expected outcome is
4. Any risks or tradeoffs

**Don't make silent changes. Always explain your reasoning.**

### Rule #19: Warn About Breaking Changes

If a change might break existing functionality:

1. **STOP** and explain the risk
2. Ask for confirmation
3. Document the breaking change in CHANGELOG.md
4. Update version appropriately (minor bump in 0.x.x)

## Emergency Procedures

### Rule #20: What to Do If CI Fails

If you push and CI fails:

1. **Don't panic** - Check the CI logs
2. **Reproduce locally** - Run the failing check
3. **Fix locally** - Don't try to fix in CI
4. **Verify** - Run `./scripts/verify-pre-push.sh`
5. **Push fix** - Commit and push (hook will verify)

**Common CI failures:**

- Formatting: Run `npm run format`
- Lint: Run `npm run lint:fix`
- Tests: Run `npm test` and fix failing tests
- Build: Run `npm run build:prod` and fix TypeScript errors

### Rule #21: What to Do If Hook is Blocking You

If the pre-push hook blocks your push:

1. **Read the error message** - It tells you exactly what failed
2. **Fix the issue** - Don't bypass, fix it
3. **Verify manually** - Run `./scripts/verify-pre-push.sh`
4. **Push again** - Hook will allow it if checks pass

**Never use `--no-verify` to "fix" this. Fix the actual issue.**

## AI Assistant Specific Rules

### Rule #22: Always Verify Your Own Changes

Before telling the user "done," you must:

1. Run verification script
2. Check that all tests pass
3. Verify build succeeds
4. Confirm formatting is correct

**Don't assume. Verify.**

### Rule #23: Read Existing Documentation First

Before answering questions or making changes:

1. Read CLAUDE.md
2. Read .claude/PROBLEM_SOLVING_PRINCIPLES.md
3. Check ARCHITECTURE.md if relevant
4. Review existing code patterns

**Don't guess. Read and understand first.**

### Rule #24: When in Doubt, Ask

If you're unsure about:

- Architectural decisions
- Breaking changes
- Version bumping strategy
- Security implications

**Ask the user first. Don't make assumptions.**

### Rule #25: Track Your Work

Use the TodoWrite tool to:

- Plan multi-step tasks
- Track progress
- Show completion status

**Users appreciate knowing what you're doing and what's left.**

## Summary: The Non-Negotiable Rules

1. ✅ Install pre-push hook first thing
2. ✅ Never bypass the hook (no `--no-verify`)
3. ✅ Fix failures locally, not in CI
4. ✅ Run format/lint before committing
5. ✅ Run full verification before pushing
6. ✅ Test all changes
7. ✅ Update documentation
8. ✅ Follow TypeScript strict mode
9. ✅ Use existing patterns
10. ✅ Security first, always

**Break these rules, break the build. Follow them, ship quality code.**

## Consequences of Breaking Rules

### If You Push Without Verification:

- ❌ CI will fail
- ❌ Build status becomes red
- ❌ Wastes CI minutes
- ❌ Delays development
- ❌ Frustrates team

### If You Follow All Rules:

- ✅ CI always passes
- ✅ Code quality stays high
- ✅ Development moves fast
- ✅ No surprises
- ✅ Happy team

## Remember

**These rules exist because they've been broken before, and it caused problems.**

**Every rule in this document is based on a real mistake that wasted real time.**

**Follow the rules. Ship quality code. Make users happy.**

---

**Last Updated:** 2025-10-25
**Trigger for Review:** Any CI failure or verification process change
