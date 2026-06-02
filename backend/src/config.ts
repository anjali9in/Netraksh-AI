export const CONFIG = {
  awsRegion: process.env.AWS_REGION ?? 'ap-south-1',
  authLogsTableName:
    process.env.AUTH_LOGS_TABLE_NAME ?? 'netraksh-ai-auth-logs',
} as const;
