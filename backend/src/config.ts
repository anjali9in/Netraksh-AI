export const CONFIG = {
  awsRegion: process.env.AWS_REGION ?? 'ap-south-1',
  authLogsTableName:
    process.env.AUTH_LOGS_TABLE_NAME ?? 'netraksh-ai-auth-logs',
  syncAuthTokens: parseCsv(process.env.SYNC_AUTH_TOKENS),
  allowedTenantIds: parseCsv(process.env.ALLOWED_TENANT_IDS),
  allowedDeviceIds: parseCsv(process.env.ALLOWED_DEVICE_IDS),
} as const;

function parseCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}
