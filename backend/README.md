# Netraksh AI DynamoDB Backend

This backend receives offline auth logs from the React Native app and stores
them in DynamoDB. Keep AWS credentials on the backend only; the mobile app
should call this API through `API_BASE_URL`.

## Local Setup

```sh
cd backend
npm install
npm run typecheck
npm run build
```

From the project root, the same checks are available as:

```sh
npm run backend:typecheck
npm run backend:build
```

## DynamoDB Table

The table is defined in `template.yaml`:

- Table: `netraksh-ai-auth-logs`
- Partition key: `logId`
- GSI: `employeeIdCreatedAtIndex`
- Billing: on-demand

## API

`POST /sync/auth-logs`

Required headers:

```http
Authorization: Bearer <sync-token>
X-Tenant-Id: default
X-Site-Id: primary-site
X-Device-Id: netraksh-ios-example
```

The backend validates the bearer token against `SYNC_AUTH_TOKENS`, the tenant
against `ALLOWED_TENANT_IDS`, and the device against `ALLOWED_DEVICE_IDS`.
Every log in the batch must have a `deviceId` matching the authorized
`X-Device-Id` header.

Body:

```json
{
  "logs": [
    {
      "id": 1,
      "employeeId": "EMP001",
      "authStatus": "SUCCESS",
      "similarityScore": 0.97,
      "livenessStatus": "PASSED",
      "challengeType": "BLINK",
      "deviceId": "iphone-16-field-01",
      "modelVersion": "face-model-v1",
      "createdAt": "2026-06-02T12:00:00.000Z",
      "syncStatus": "PENDING",
      "logHash": "optional-integrity-hash"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "syncedCount": 1,
    "failedLogIds": []
  }
}
```

## Deploy With AWS SAM

```sh
cd backend
npm install
npm run build
sam build
sam deploy --guided
```

During guided deploy, provide:

- `SyncAuthTokens`: one or more long random bearer tokens, comma-separated.
- `AllowedTenantIds`: allowed tenant IDs, comma-separated, or `*`.
- `AllowedDeviceIds`: allowed device IDs, comma-separated, or `*`.

Generate a sync token from the repo root with:

```sh
npm run backend:generate-sync-token
```

After deploy, copy the `ApiEndpoint` output into the mobile app's
runtime config `apiBaseUrl`, set `apiTenantId` to one of the allowed tenants,
set `apiSiteId` to the deployment site, and provision a matching bearer token
through `Settings > Sync Provisioning` before syncing.

See `docs/OPERATIONS_PROVISIONING.md` for the full token/device lifecycle and
`docs/RELEASE_RUNTIME_CONFIG.md` for staging/production build injection.

Operational deploy helpers are available from the repo root:

```sh
npm run backend:provision-sync-secrets -- --stage staging
npm run backend:deploy-sync -- --stage staging --source ssm
npm run backend:provision-sync-secrets -- --stage production
npm run backend:deploy-sync -- --stage production --source ssm
```
