package com.netrakshai.config;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.netrakshai.BuildConfig;
import java.util.HashMap;
import java.util.Map;

public class NetrakshConfigModule extends ReactContextBaseJavaModule {
  public static final String NAME = "NetrakshConfig";

  public NetrakshConfigModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @Override
  public Map<String, Object> getConstants() {
    Map<String, Object> runtimeConfig = new HashMap<>();

    putString(runtimeConfig, "apiBaseUrl", BuildConfig.NETRAKSH_API_BASE_URL);
    putString(runtimeConfig, "apiTenantId", BuildConfig.NETRAKSH_API_TENANT_ID);
    putString(runtimeConfig, "apiSiteId", BuildConfig.NETRAKSH_API_SITE_ID);
    putInteger(runtimeConfig, "apiTimeoutMs", BuildConfig.NETRAKSH_API_TIMEOUT_MS);
    putInteger(
        runtimeConfig,
        "authLogSyncIntervalMs",
        BuildConfig.NETRAKSH_AUTH_LOG_SYNC_INTERVAL_MS);
    putBoolean(
        runtimeConfig,
        "databaseEncryptionEnabled",
        BuildConfig.NETRAKSH_DATABASE_ENCRYPTION_ENABLED);
    putString(
        runtimeConfig,
        "databaseLocation",
        BuildConfig.NETRAKSH_DATABASE_LOCATION);
    putString(runtimeConfig, "databaseName", BuildConfig.NETRAKSH_DATABASE_NAME);
    putString(
        runtimeConfig,
        "databaseProvider",
        BuildConfig.NETRAKSH_DATABASE_PROVIDER);
    putInteger(
        runtimeConfig,
        "databaseSchemaVersion",
        BuildConfig.NETRAKSH_DATABASE_SCHEMA_VERSION);
    putBoolean(runtimeConfig, "demoMode", BuildConfig.NETRAKSH_DEMO_MODE);

    Map<String, Object> constants = new HashMap<>();
    constants.put("runtimeConfig", runtimeConfig);
    return constants;
  }

  private static void putString(
      Map<String, Object> config,
      String key,
      String value) {
    if (value != null && !value.trim().isEmpty()) {
      config.put(key, value.trim());
    }
  }

  private static void putInteger(
      Map<String, Object> config,
      String key,
      String value) {
    if (value == null || value.trim().isEmpty()) {
      return;
    }

    try {
      config.put(key, Integer.parseInt(value.trim()));
    } catch (NumberFormatException ignored) {
      // Invalid optional runtime values are ignored so JS defaults stay active.
    }
  }

  private static void putBoolean(
      Map<String, Object> config,
      String key,
      String value) {
    if (value == null || value.trim().isEmpty()) {
      return;
    }

    String normalized = value.trim().toLowerCase();
    if ("true".equals(normalized) || "1".equals(normalized) || "yes".equals(normalized)) {
      config.put(key, true);
    } else if (
        "false".equals(normalized) ||
        "0".equals(normalized) ||
        "no".equals(normalized)) {
      config.put(key, false);
    }
  }
}
