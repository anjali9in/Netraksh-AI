# Operational Provisioning

This project now enforces bearer-token, tenant, and device authorization before
the backend accepts synced auth logs. Treat the sync bearer token as a device
credential; do not place it in mobile build config or checked-in files.

## Issue A Sync Token

Generate a long random token from the repo root:

```sh
npm run backend:generate-sync-token
```

For an env-file line:

```sh
npm run backend:generate-sync-token -- --env
```

Add the token to the environment-specific secret that populates
`SYNC_AUTH_TOKENS`. Multiple active tokens are comma-separated during rotation.

## Register A Tablet

1. Install the staging or production build on the tablet.
2. Open `Settings`.
3. Copy the `Device ID` from the `Device` section.
4. Add that ID to the environment-specific `ALLOWED_DEVICE_IDS` allowlist.
5. Confirm the build's `Tenant` and `Site` match the backend allowlists.
6. Paste the issued bearer token in `Settings > Sync Provisioning`.
7. Save the token and run a manual sync from `Offline Logs`.

The backend rejects a batch when `X-Device-Id` is unknown, when `X-Tenant-Id`
is unknown, or when any log row contains a `deviceId` different from the
authorized header.

## Staging And Production Values

Actual secrets and device lists belong in the deployment secret store or CI/CD
environment, not in this repository.

| Setting | Staging value source | Production value source |
| --- | --- | --- |
| `SYNC_AUTH_TOKENS` | `NETRAKSH_STAGING_SYNC_AUTH_TOKENS` secret, comma-separated generated tokens | `NETRAKSH_PROD_SYNC_AUTH_TOKENS` secret, comma-separated generated tokens |
| `ALLOWED_TENANT_IDS` | `staging` or the staging tenant IDs approved for test devices | Production tenant IDs approved for field devices |
| `ALLOWED_DEVICE_IDS` | Registered staging tablet IDs from `Settings > Device ID` | Registered production tablet IDs from the asset/device inventory |

Provision SSM Parameter Store values from CI/local secret environment:

```sh
export NETRAKSH_STAGING_SYNC_AUTH_TOKENS="<generated-staging-token>"
export NETRAKSH_STAGING_ALLOWED_TENANT_IDS="staging"
export NETRAKSH_STAGING_ALLOWED_DEVICE_IDS="<comma-separated-staging-device-ids>"
npm run backend:provision-sync-secrets -- --stage staging

export NETRAKSH_PROD_SYNC_AUTH_TOKENS="<generated-production-token>"
export NETRAKSH_PROD_ALLOWED_TENANT_IDS="<production-tenant-id>"
export NETRAKSH_PROD_ALLOWED_DEVICE_IDS="<comma-separated-production-device-ids>"
npm run backend:provision-sync-secrets -- --stage production
```

The script stores:

```text
/netraksh-ai/staging/SYNC_AUTH_TOKENS       SecureString
/netraksh-ai/staging/ALLOWED_TENANT_IDS     String
/netraksh-ai/staging/ALLOWED_DEVICE_IDS     String
/netraksh-ai/prod/SYNC_AUTH_TOKENS          SecureString
/netraksh-ai/prod/ALLOWED_TENANT_IDS        String
/netraksh-ai/prod/ALLOWED_DEVICE_IDS        String
```

Deploy from the SSM values:

```sh
npm run backend:deploy-sync -- --stage staging --source ssm
npm run backend:deploy-sync -- --stage production --source ssm
```

Or deploy directly from CI environment variables:

```sh
npm run backend:deploy-sync -- --stage staging --source env
npm run backend:deploy-sync -- --stage production --source env
```

Both scripts reject missing values, bearer tokens shorter than 32 characters,
and wildcard allowlists unless `--allow-wildcards` is explicitly supplied.
Production deployments always reject wildcard allowlists.

## Rotation And Decommissioning

For token rotation:

1. Generate a replacement token.
2. Deploy with both old and new tokens in `SYNC_AUTH_TOKENS`.
3. Provision the new token on each active tablet.
4. Verify sync succeeds on each tablet.
5. Remove the old token from `SYNC_AUTH_TOKENS` and redeploy.

For reassigned or decommissioned tablets:

1. Clear the sync token in `Settings > Sync Provisioning`.
2. Remove the tablet's `Device ID` from `ALLOWED_DEVICE_IDS`.
3. Remove any token dedicated to that tablet from `SYNC_AUTH_TOKENS`.
4. Wipe/re-enroll local templates according to the site handover policy.
5. Keep an audit entry with the tablet asset tag, old device ID, removed token
   identifier, approver, and removal date.

After editing allowlists, rerun:

```sh
npm run backend:provision-sync-secrets -- --stage staging
npm run backend:deploy-sync -- --stage staging --source ssm
```

Use `--stage production` for production rotation or decommissioning.
