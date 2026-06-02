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

After deploy, copy the `ApiEndpoint` output into the mobile app's
`API_BASE_URL` value in `src/config/env.ts`.
