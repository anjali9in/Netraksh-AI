#!/usr/bin/env node

const {mkdtempSync, rmSync, writeFileSync} = require('fs');
const {tmpdir} = require('os');
const {join, resolve} = require('path');
const {spawnSync} = require('child_process');

const PARAMETER_KEYS = [
  'SYNC_AUTH_TOKENS',
  'ALLOWED_TENANT_IDS',
  'ALLOWED_DEVICE_IDS',
];

const STAGES = {
  staging: {
    envPrefixes: ['NETRAKSH_STAGING'],
    parameterPrefix: '/netraksh-ai/staging',
    stackName: 'netraksh-ai-backend-staging',
    tableName: 'netraksh-ai-auth-logs-staging',
  },
  production: {
    envPrefixes: ['NETRAKSH_PROD', 'NETRAKSH_PRODUCTION'],
    parameterPrefix: '/netraksh-ai/prod',
    stackName: 'netraksh-ai-backend-prod',
    tableName: 'netraksh-ai-auth-logs-prod',
  },
};

function parseArgs(argv) {
  const [action, ...rest] = argv;
  const args = {
    action,
    allowWildcards: false,
    dryRun: false,
    region: process.env.AWS_REGION || 'ap-south-1',
    source: 'ssm',
  };

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === '--allow-wildcards') {
      args.allowWildcards = true;
    } else if (value === '--dry-run') {
      args.dryRun = true;
    } else if (value.startsWith('--')) {
      const key = value.slice(2).replace(/-([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );
      args[key] = rest[index + 1];
      index += 1;
    }
  }

  return args;
}

function usage() {
  console.error(
    [
      'Usage:',
      '  node scripts/sync-deployment.js provision --stage staging|production [--region ap-south-1] [--profile name] [--dry-run]',
      '  node scripts/sync-deployment.js deploy --stage staging|production [--source ssm|env] [--region ap-south-1] [--profile name] [--dry-run]',
      '',
      'Required env for staging:',
      '  NETRAKSH_STAGING_SYNC_AUTH_TOKENS',
      '  NETRAKSH_STAGING_ALLOWED_TENANT_IDS',
      '  NETRAKSH_STAGING_ALLOWED_DEVICE_IDS',
      '',
      'Required env for production:',
      '  NETRAKSH_PROD_SYNC_AUTH_TOKENS',
      '  NETRAKSH_PROD_ALLOWED_TENANT_IDS',
      '  NETRAKSH_PROD_ALLOWED_DEVICE_IDS',
    ].join('\n'),
  );
}

function stageConfig(stage) {
  const config = STAGES[stage];
  if (!config) {
    throw new Error('Stage must be "staging" or "production".');
  }
  return config;
}

function splitCsv(value) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function valueFromEnv(config, key) {
  for (const prefix of config.envPrefixes) {
    const envName = `${prefix}_${key}`;
    if (process.env[envName]) {
      return {
        name: envName,
        value: process.env[envName],
      };
    }
  }
  return undefined;
}

function validateValue(key, value, args) {
  if (!value || !value.trim()) {
    throw new Error(`${key} is required.`);
  }

  const values = splitCsv(value);
  if (values.length === 0) {
    throw new Error(`${key} must contain at least one value.`);
  }

  if (args.stage === 'production' && values.includes('*')) {
    throw new Error(`${key} cannot use "*" for production deployments.`);
  }

  if (!args.allowWildcards && values.includes('*')) {
    throw new Error(`${key} cannot use "*" unless --allow-wildcards is set.`);
  }

  if (key === 'SYNC_AUTH_TOKENS') {
    const weakToken = values.find(token => token.length < 32);
    if (weakToken) {
      throw new Error('Each sync bearer token must be at least 32 characters.');
    }
  }
}

function loadEnvValues(config, args) {
  const loaded = {};
  const sources = {};

  for (const key of PARAMETER_KEYS) {
    const envValue = valueFromEnv(config, key);
    if (!envValue) {
      throw new Error(
        `Missing ${config.envPrefixes.map(prefix => `${prefix}_${key}`).join(' or ')}.`,
      );
    }
    validateValue(key, envValue.value, args);
    loaded[key] = envValue.value;
    sources[key] = envValue.name;
  }

  return {loaded, sources};
}

function awsArgs(args, commandArgs) {
  const fullArgs = [...commandArgs, '--region', args.region];
  if (args.profile) {
    fullArgs.push('--profile', args.profile);
  }
  return fullArgs;
}

function run(command, commandArgs, options = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr.trim()}` : '';
    throw new Error(`${command} ${commandArgs.join(' ')} failed.${stderr}`);
  }

  return result.stdout ? result.stdout.trim() : '';
}

function putParameter(args, name, type, value) {
  const directory = mkdtempSync(join(tmpdir(), 'netraksh-sync-'));
  const inputFile = join(directory, 'put-parameter.json');

  try {
    writeFileSync(
      inputFile,
      JSON.stringify({
        Name: name,
        Type: type,
        Value: value,
        Overwrite: true,
      }),
      {mode: 0o600},
    );

    run(
      'aws',
      awsArgs(args, [
        'ssm',
        'put-parameter',
        '--cli-input-json',
        `file://${inputFile}`,
      ]),
      {capture: true},
    );
  } finally {
    rmSync(directory, {force: true, recursive: true});
  }
}

function getParameter(args, name) {
  return run(
    'aws',
    awsArgs(args, [
      'ssm',
      'get-parameter',
      '--name',
      name,
      '--with-decryption',
      '--query',
      'Parameter.Value',
      '--output',
      'text',
    ]),
    {capture: true},
  );
}

function parameterName(config, key) {
  return `${config.parameterPrefix}/${key}`;
}

function provision(args, config) {
  const {loaded, sources} = loadEnvValues(config, args);

  console.log(`Provisioning ${args.stage} sync settings in SSM Parameter Store.`);
  console.log(`Region: ${args.region}`);
  console.log(`Sources: ${Object.values(sources).join(', ')}`);
  console.log(`Parameters: ${PARAMETER_KEYS.map(key => parameterName(config, key)).join(', ')}`);

  if (args.dryRun) {
    console.log('Dry run: no parameters written.');
    return;
  }

  putParameter(
    args,
    parameterName(config, 'SYNC_AUTH_TOKENS'),
    'SecureString',
    loaded.SYNC_AUTH_TOKENS,
  );
  putParameter(
    args,
    parameterName(config, 'ALLOWED_TENANT_IDS'),
    'String',
    loaded.ALLOWED_TENANT_IDS,
  );
  putParameter(
    args,
    parameterName(config, 'ALLOWED_DEVICE_IDS'),
    'String',
    loaded.ALLOWED_DEVICE_IDS,
  );

  console.log('Provisioned SSM parameters.');
}

function loadDeployValues(args, config) {
  if (args.source === 'env') {
    return loadEnvValues(config, args).loaded;
  }

  if (args.source !== 'ssm') {
    throw new Error('--source must be "ssm" or "env".');
  }

  const loaded = {};
  for (const key of PARAMETER_KEYS) {
    loaded[key] = getParameter(args, parameterName(config, key));
    validateValue(key, loaded[key], args);
  }
  return loaded;
}

function deploy(args, config) {
  const values = loadDeployValues(args, config);
  const backendRoot = resolve(__dirname, '..');
  const stackName =
    process.env[`${config.envPrefixes[0]}_STACK_NAME`] || config.stackName;
  const tableName =
    process.env[`${config.envPrefixes[0]}_AUTH_LOGS_TABLE_NAME`] ||
    config.tableName;

  console.log(`Deploying ${args.stage} backend stack.`);
  console.log(`Stack: ${stackName}`);
  console.log(`Table: ${tableName}`);
  console.log(`Region: ${args.region}`);
  console.log(`Source: ${args.source}`);

  if (args.dryRun) {
    console.log('Dry run: build and deploy skipped.');
    return;
  }

  run('npm', ['run', 'build'], {cwd: backendRoot});
  run('sam', ['build'], {cwd: backendRoot});
  run(
    'sam',
    [
      'deploy',
      '--stack-name',
      stackName,
      '--resolve-s3',
      '--s3-prefix',
      stackName,
      '--region',
      args.region,
      '--capabilities',
      'CAPABILITY_IAM',
      '--no-confirm-changeset',
      '--no-fail-on-empty-changeset',
      '--parameter-overrides',
      `AuthLogsTableName=${tableName}`,
      `SyncAuthTokens=${values.SYNC_AUTH_TOKENS}`,
      `AllowedTenantIds=${values.ALLOWED_TENANT_IDS}`,
      `AllowedDeviceIds=${values.ALLOWED_DEVICE_IDS}`,
      ...(args.profile ? ['--profile', args.profile] : []),
    ],
    {cwd: backendRoot},
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!['provision', 'deploy'].includes(args.action) || !args.stage) {
    usage();
    process.exit(2);
  }

  args.stage = args.stage.toLowerCase();
  const config = stageConfig(args.stage);

  if (args.action === 'provision') {
    provision(args, config);
  } else {
    deploy(args, config);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
