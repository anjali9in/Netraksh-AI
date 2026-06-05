#!/usr/bin/env node

const STAGES = {
  staging: {
    prefixes: ['NETRAKSH_STAGING'],
    requireDemoDisabled: false,
  },
  production: {
    prefixes: ['NETRAKSH_PROD', 'NETRAKSH_PRODUCTION'],
    requireDemoDisabled: true,
  },
};

const REQUIRED_KEYS = [
  'API_BASE_URL',
  'API_TENANT_ID',
  'API_SITE_ID',
  'DEMO_MODE',
];

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value.startsWith('--')) {
      args[value.slice(2)] = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

function valueFor(stageConfig, key) {
  for (const prefix of stageConfig.prefixes) {
    const envName = `${prefix}_${key}`;
    const value = process.env[envName];
    if (value && value.trim()) {
      return {
        envName,
        value: value.trim(),
      };
    }
  }
  return undefined;
}

function csvValues(value) {
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function validateHttpsUrl(envName, value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${envName} must be a valid URL.`);
  }

  if (url.protocol !== 'https:') {
    throw new Error(`${envName} must use https.`);
  }
}

function validateBoolean(envName, value) {
  const normalized = value.toLowerCase();
  if (!['true', 'false', '1', '0', 'yes', 'no'].includes(normalized)) {
    throw new Error(`${envName} must be a boolean value.`);
  }
  return ['true', '1', 'yes'].includes(normalized);
}

function validateTenantAllowlist(stageConfig, runtimeTenant) {
  const allowedTenants = valueFor(stageConfig, 'ALLOWED_TENANT_IDS');
  if (!allowedTenants) {
    return;
  }

  const tenants = csvValues(allowedTenants.value);
  if (!tenants.includes('*') && !tenants.includes(runtimeTenant.value)) {
    throw new Error(
      `${runtimeTenant.envName} must be listed in ${allowedTenants.envName}.`,
    );
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const stage = args.stage;
  const stageConfig = STAGES[stage];

  if (!stageConfig) {
    throw new Error('Usage: npm run release:validate-config -- --stage staging|production');
  }

  const loaded = {};
  for (const key of REQUIRED_KEYS) {
    const resolved = valueFor(stageConfig, key);
    if (!resolved) {
      throw new Error(
        `Missing ${stageConfig.prefixes
          .map(prefix => `${prefix}_${key}`)
          .join(' or ')}.`,
      );
    }
    loaded[key] = resolved;
  }

  validateHttpsUrl(loaded.API_BASE_URL.envName, loaded.API_BASE_URL.value);

  if (loaded.API_TENANT_ID.value === '*') {
    throw new Error(`${loaded.API_TENANT_ID.envName} cannot be "*".`);
  }

  if (loaded.API_SITE_ID.value === '*') {
    throw new Error(`${loaded.API_SITE_ID.envName} cannot be "*".`);
  }

  const demoMode = validateBoolean(
    loaded.DEMO_MODE.envName,
    loaded.DEMO_MODE.value,
  );
  if (stageConfig.requireDemoDisabled && demoMode) {
    throw new Error(`${loaded.DEMO_MODE.envName} must be false for production.`);
  }

  validateTenantAllowlist(stageConfig, loaded.API_TENANT_ID);

  console.log(`Validated ${stage} release runtime config.`);
  console.log(`Checked: ${REQUIRED_KEYS.map(key => loaded[key].envName).join(', ')}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
