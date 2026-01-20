# Husky Pre-Commit Hook Setup Guide

This project now includes automated ESLint fixing before commits using Husky and lint-staged.

## What's Configured

### 1. NPM Scripts
- `npm run lint:fix` - Runs ESLint with --fix flag across entire codebase
- `npm run prepare` - Automatically sets up Husky hooks after npm install

### 2. Husky Pre-Commit Hook
A pre-commit hook that automatically runs `eslint --fix` on staged files before each commit.

### 3. Lint-Staged Configuration
Configured to run ESLint with auto-fix on all staged `.js`, `.jsx`, `.ts`, and `.tsx` files.

## Installation

After cloning the repository, run:

```bash
npm install
```

This will automatically:
1. Install husky and lint-staged
2. Set up the Git hooks via the `prepare` script
3. Configure the pre-commit hook

## Usage

### Automatic Linting on Commit
When you commit code, the pre-commit hook will:
1. Run ESLint with --fix on all staged files
2. Automatically fix any auto-fixable issues
3. Stage the fixed files
4. Proceed with the commit if no unfixable errors remain

### Manual Linting
To manually lint and fix the entire codebase:

```bash
npm run lint:fix
```

To just check for lint errors without fixing:

```bash
npm run lint
```

## How It Works

1. **Pre-Commit Hook** (`.husky/pre-commit`): Triggers before each commit
2. **Lint-Staged**: Runs ESLint only on staged files for performance
3. **ESLint --fix**: Automatically fixes formatting and simple issues
4. **Commit Proceeds**: If all errors are fixed or no errors exist

## Benefits

- ✅ Prevents ESLint errors from being committed
- ✅ Automatically fixes formatting issues
- ✅ Ensures code quality standards
- ✅ Faster CI/CD pipeline (fewer lint failures)
- ✅ Only lints changed files (fast performance)

## Troubleshooting

### Hook Not Running
If the pre-commit hook isn't running:

```bash
# Reinstall husky
npm run prepare

# Make sure the hook is executable
chmod +x .husky/pre-commit
```

### Skipping Hooks (Not Recommended)
To skip the pre-commit hook in emergencies:

```bash
git commit --no-verify -m "your message"
```

**Note**: This bypasses quality checks and should only be used in exceptional cases.

## Configuration Files

- `package.json` - Contains scripts and lint-staged configuration
- `.husky/pre-commit` - Pre-commit hook script
- `eslint.config.js` - ESLint rules and configuration
