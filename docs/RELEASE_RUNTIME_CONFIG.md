# Release Runtime Config

`src/config/runtimeConfig.ts` resolves values in this order:

1. Checked-in JS defaults.
2. Native `NetrakshConfig.runtimeConfig`.
3. `global.__NETRAKSH_RUNTIME_CONFIG__` for tests or managed shells.

Release builds should provide environment identity through native config. Sync
bearer tokens are not release config; provision them into Keychain from
`Settings > Sync Provisioning`.

## Required Release Values

| Runtime key | Native variable |
| --- | --- |
| `apiBaseUrl` | `NETRAKSH_API_BASE_URL` |
| `apiTenantId` | `NETRAKSH_API_TENANT_ID` |
| `apiSiteId` | `NETRAKSH_API_SITE_ID` |
| `demoMode` | `NETRAKSH_DEMO_MODE` |
| `apiTimeoutMs` | `NETRAKSH_API_TIMEOUT_MS` |
| `authLogSyncIntervalMs` | `NETRAKSH_AUTH_LOG_SYNC_INTERVAL_MS` |
| `databaseEncryptionEnabled` | `NETRAKSH_DATABASE_ENCRYPTION_ENABLED` |
| `databaseLocation` | `NETRAKSH_DATABASE_LOCATION` |
| `databaseName` | `NETRAKSH_DATABASE_NAME` |
| `databaseProvider` | `NETRAKSH_DATABASE_PROVIDER` |
| `databaseSchemaVersion` | `NETRAKSH_DATABASE_SCHEMA_VERSION` |

Production policy: `NETRAKSH_DEMO_MODE=false`. Demo mode should only be true
for explicit demo or QA builds.

## Android

Gradle reads each `NETRAKSH_*` value first from `-P` project properties, then
from environment variables, and exposes non-empty values through
`BuildConfig` to the React Native `NetrakshConfig` module.

Example staging release:

```sh
cd android
./gradlew assembleRelease \
  -PNETRAKSH_API_BASE_URL="$NETRAKSH_STAGING_API_BASE_URL" \
  -PNETRAKSH_API_TENANT_ID="staging" \
  -PNETRAKSH_API_SITE_ID="staging-site-01" \
  -PNETRAKSH_DEMO_MODE=false
```

## iOS

The iOS bridge reads `NETRAKSH_*` keys from `Info.plist`. Xcode substitutes
the values when CI or `xcodebuild` passes them as build settings.

Example staging archive:

```sh
xcodebuild \
  -workspace ios/NetrakshAI.xcworkspace \
  -scheme NetrakshAI \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  NETRAKSH_API_BASE_URL="$NETRAKSH_STAGING_API_BASE_URL" \
  NETRAKSH_API_TENANT_ID="staging" \
  NETRAKSH_API_SITE_ID="staging-site-01" \
  NETRAKSH_DEMO_MODE=false \
  archive
```

Use production CI variables for production archives:

```sh
NETRAKSH_API_BASE_URL="$NETRAKSH_PROD_API_BASE_URL"
NETRAKSH_API_TENANT_ID="$NETRAKSH_PROD_TENANT_ID"
NETRAKSH_API_SITE_ID="$NETRAKSH_PROD_SITE_ID"
NETRAKSH_DEMO_MODE=false
```
