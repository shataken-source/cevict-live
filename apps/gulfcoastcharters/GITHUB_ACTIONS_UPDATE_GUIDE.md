# GitHub Actions Update Guide

## Recent Updates

### Security Testing Workflow Fixed

**Issue**: The security testing workflow was failing due to deprecated GitHub Actions versions.

**Error Message**:
```
This request has been automatically failed because it uses a deprecated version of `actions/upload-artifact: v3`
```

### Actions Updated

All deprecated v3 actions have been updated to v4 in `.github/workflows/security-testing.yml`:

1. ✅ `actions/checkout@v3` → `actions/checkout@v4`
2. ✅ `actions/setup-node@v3` → `actions/setup-node@v4`
3. ✅ `actions/upload-artifact@v3` → `actions/upload-artifact@v4`

## Breaking Changes in v4

### actions/upload-artifact@v4

**Key Changes**:
- Artifacts are now immutable (cannot be overwritten)
- Each artifact must have a unique name within a workflow run
- Improved performance and reliability
- Better handling of large files

**Migration Tips**:
- Ensure artifact names are unique
- Remove any logic that relies on overwriting artifacts
- Update download-artifact to v4 if used elsewhere

### actions/checkout@v4

**Key Changes**:
- Updated to Node.js 20
- Improved performance
- Better handling of submodules

### actions/setup-node@v4

**Key Changes**:
- Updated to Node.js 20
- Improved caching mechanism
- Better handling of package managers

## Best Practices

### 1. Regular Updates

Check for action updates quarterly:
```bash
# Search for outdated actions
grep -r "uses: actions/" .github/workflows/
```

### 2. Version Pinning

Use specific versions for production workflows:
```yaml
# Good - specific version
uses: actions/checkout@v4.1.1

# Better - SHA for security
uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11

# Acceptable - major version
uses: actions/checkout@v4
```

### 3. Dependabot Configuration

Add `.github/dependabot.yml` to auto-update actions:
```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### 4. Testing Workflow Changes

Before merging workflow updates:
1. Test in a feature branch
2. Review workflow run logs
3. Verify all steps complete successfully
4. Check artifact uploads/downloads work

## Monitoring Deprecations

### GitHub Changelog

Subscribe to GitHub's changelog for action deprecations:
- https://github.blog/changelog/

### Workflow Warnings

GitHub shows deprecation warnings in workflow runs:
1. Go to Actions tab
2. Select a workflow run
3. Look for yellow warning banners

### Email Notifications

GitHub sends emails about upcoming deprecations to repository admins.

## Common Deprecated Actions

| Action | Deprecated | Current | Deadline |
|--------|-----------|---------|----------|
| upload-artifact@v3 | ✅ | v4 | June 2024 |
| download-artifact@v3 | ✅ | v4 | June 2024 |
| checkout@v3 | ⚠️ | v4 | TBD |
| setup-node@v3 | ⚠️ | v4 | TBD |
| cache@v3 | ⚠️ | v4 | TBD |

## Troubleshooting

### Workflow Still Failing?

1. **Clear workflow cache**:
   - Go to Actions → Caches
   - Delete old caches
   - Re-run workflow

2. **Check secrets**:
   - Verify all required secrets are set
   - Check secret names match workflow

3. **Review logs**:
   - Expand each step in workflow run
   - Look for specific error messages

4. **Test locally**:
   - Use `act` to test workflows locally
   - Install: `brew install act`
   - Run: `act -j security-tests`

### Getting Help

- Check GitHub Actions documentation
- Review GitHub Community forums
- Open an issue in the repository

## Next Steps

1. ✅ Security testing workflow updated
2. 🔄 Monitor other workflows for deprecation warnings
3. 📅 Schedule quarterly action version reviews
4. 🤖 Consider adding Dependabot for automatic updates

---

**Last Updated**: November 2024
**Status**: All workflows using latest action versions ✅
