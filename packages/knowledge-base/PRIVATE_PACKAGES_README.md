# Private Package Configuration

The `private-packages.json` file allows the upgrade agent to work with private npm registries and scoped packages.

## Configuration Structure

### Private Packages
Define specific packages from private registries:
```json
{
  "privatePackages": {
    "@mycompany/core": {
      "registry": "https://npm.mycompany.com",
      "scope": "@mycompany",
      "authToken": "${NPM_MYCOMPANY_TOKEN}",
      "versionStrategy": "latest"
    }
  }
}
```

### Registries
Configure registry-level settings:
```json
{
  "registries": {
    "@mycompany": {
      "url": "https://npm.mycompany.com",
      "authRequired": true,
      "envVar": "NPM_MYCOMPANY_TOKEN"
    }
  }
}
```

### Resolution Strategy
Control how conflicts are resolved:
```json
{
  "resolutionStrategy": {
    "preferLatest": false,
    "allowPrereleases": false,
    "strictPeerDependencies": true,
    "deduplication": true
  }
}
```

## Environment Variables

Set authentication tokens as environment variables:
```bash
export NPM_MYCOMPANY_TOKEN=your_token_here
export NPM_INTERNAL_TOKEN=another_token
```

The agent will automatically configure `.npmrc` during dependency resolution.

## Recursive Dependency Resolution

The DependencyAgent now:
1. Fetches all dependencies recursively
2. Validates peer dependencies across the entire tree
3. Detects conflicts between package versions
4. Suggests resolutions for conflicts
5. Supports both public and private registries

Conflicts are reported with severity levels:
- **ERROR**: Critical conflicts that must be resolved
- **WARNING**: Non-critical issues that should be reviewed
