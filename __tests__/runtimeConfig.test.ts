describe('runtimeConfig', () => {
  afterEach(() => {
    const {NativeModules} = require('react-native');
    delete NativeModules.NetrakshConfig;
    jest.resetModules();
    delete global.__NETRAKSH_RUNTIME_CONFIG__;
  });

  it('uses checked-in defaults when no runtime override is provided', () => {
    const {runtimeConfig} = require('../src/config/runtimeConfig');

    expect(runtimeConfig.apiBaseUrl).toContain('execute-api.ap-south-1');
    expect(runtimeConfig.apiTenantId).toBe('default');
    expect(runtimeConfig.apiSiteId).toBe('primary-site');
    expect(runtimeConfig.demoMode).toBe(false);
  });

  it('allows runtime overrides for API URL, demo mode, tenant, and site', () => {
    global.__NETRAKSH_RUNTIME_CONFIG__ = {
      apiBaseUrl: 'https://api.example.test',
      apiTenantId: 'tenant-a',
      apiSiteId: 'site-42',
      demoMode: true,
    };

    const {runtimeConfig} = require('../src/config/runtimeConfig');

    expect(runtimeConfig.apiBaseUrl).toBe('https://api.example.test');
    expect(runtimeConfig.apiTenantId).toBe('tenant-a');
    expect(runtimeConfig.apiSiteId).toBe('site-42');
    expect(runtimeConfig.demoMode).toBe(true);
  });

  it('uses native build config before global overrides', () => {
    const {NativeModules} = require('react-native');
    NativeModules.NetrakshConfig = {
      runtimeConfig: {
        apiBaseUrl: 'https://native.example.test',
        apiTenantId: 'native-tenant',
        apiSiteId: 'native-site',
        demoMode: false,
      },
    };
    global.__NETRAKSH_RUNTIME_CONFIG__ = {
      apiSiteId: 'global-site',
    };

    const {runtimeConfig} = require('../src/config/runtimeConfig');

    expect(runtimeConfig.apiBaseUrl).toBe('https://native.example.test');
    expect(runtimeConfig.apiTenantId).toBe('native-tenant');
    expect(runtimeConfig.apiSiteId).toBe('global-site');
    expect(runtimeConfig.demoMode).toBe(false);
  });
});
