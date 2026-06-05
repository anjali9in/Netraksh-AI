import Foundation
import React

@objc(NetrakshConfig)
class NetrakshConfig: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  func constantsToExport() -> [AnyHashable: Any]! {
    ["runtimeConfig": runtimeConfig()]
  }

  private func runtimeConfig() -> [String: Any] {
    var config: [String: Any] = [:]

    putString(&config, "apiBaseUrl", plistString("NETRAKSH_API_BASE_URL"))
    putString(&config, "apiTenantId", plistString("NETRAKSH_API_TENANT_ID"))
    putString(&config, "apiSiteId", plistString("NETRAKSH_API_SITE_ID"))
    putInt(&config, "apiTimeoutMs", plistInt("NETRAKSH_API_TIMEOUT_MS"))
    putInt(
      &config,
      "authLogSyncIntervalMs",
      plistInt("NETRAKSH_AUTH_LOG_SYNC_INTERVAL_MS")
    )
    putBool(
      &config,
      "databaseEncryptionEnabled",
      plistBool("NETRAKSH_DATABASE_ENCRYPTION_ENABLED")
    )
    putString(
      &config,
      "databaseLocation",
      plistString("NETRAKSH_DATABASE_LOCATION")
    )
    putString(&config, "databaseName", plistString("NETRAKSH_DATABASE_NAME"))
    putString(
      &config,
      "databaseProvider",
      plistString("NETRAKSH_DATABASE_PROVIDER")
    )
    putInt(
      &config,
      "databaseSchemaVersion",
      plistInt("NETRAKSH_DATABASE_SCHEMA_VERSION")
    )
    putBool(&config, "demoMode", plistBool("NETRAKSH_DEMO_MODE"))

    return config
  }

  private func plistString(_ key: String) -> String? {
    guard let value = Bundle.main.object(forInfoDictionaryKey: key) as? String else {
      return nil
    }

    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.isEmpty || (trimmed.hasPrefix("$(") && trimmed.hasSuffix(")")) {
      return nil
    }

    return trimmed
  }

  private func plistInt(_ key: String) -> Int? {
    guard let value = plistString(key) else {
      return nil
    }

    return Int(value)
  }

  private func plistBool(_ key: String) -> Bool? {
    guard let value = plistString(key)?.lowercased() else {
      return nil
    }

    if ["true", "1", "yes"].contains(value) {
      return true
    }

    if ["false", "0", "no"].contains(value) {
      return false
    }

    return nil
  }

  private func putString(_ config: inout [String: Any], _ key: String, _ value: String?) {
    if let value {
      config[key] = value
    }
  }

  private func putInt(_ config: inout [String: Any], _ key: String, _ value: Int?) {
    if let value {
      config[key] = value
    }
  }

  private func putBool(_ config: inout [String: Any], _ key: String, _ value: Bool?) {
    if let value {
      config[key] = value
    }
  }
}
