import Foundation
import UserNotifications
import UIKit

enum PendingSyncNotificationHelper {
  static let notificationId = "pending-auth-log-sync"
  private static let pendingCountKey = "pendingSyncLogCount"

  static func storePendingCount(_ count: Int) {
    UserDefaults.standard.set(max(0, count), forKey: pendingCountKey)
  }

  static func storedPendingCount() -> Int {
    UserDefaults.standard.integer(forKey: pendingCountKey)
  }

  static func requestAuthorizationIfNeeded() {
    let center = UNUserNotificationCenter.current()
    center.getNotificationSettings { settings in
      guard settings.authorizationStatus == .notDetermined else {
        return
      }

      center.requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
    }
  }

  static func update(pendingCount: Int) {
    storePendingCount(pendingCount)
    requestAuthorizationIfNeeded()
    applyBadge(count: pendingCount)

    let center = UNUserNotificationCenter.current()

    if pendingCount <= 0 {
      center.removeDeliveredNotifications(withIdentifiers: [notificationId])
      center.removePendingNotificationRequests(withIdentifiers: [notificationId])
      return
    }

    let content = UNMutableNotificationContent()
    content.title = "Logs waiting to sync"
    content.body =
      "\(pendingCount) offline authentication log\(pendingCount == 1 ? "" : "s") not synced yet."
    content.sound = .default
    content.badge = NSNumber(value: pendingCount)
    content.categoryIdentifier = "PENDING_SYNC"

    let request = UNNotificationRequest(
      identifier: notificationId,
      content: content,
      trigger: nil
    )

    center.add(request)
  }

  static func clear() {
    storePendingCount(0)
    applyBadge(count: 0)

    let center = UNUserNotificationCenter.current()
    center.removeDeliveredNotifications(withIdentifiers: [notificationId])
    center.removePendingNotificationRequests(withIdentifiers: [notificationId])
  }

  static func applyBadge(count: Int) {
    DispatchQueue.main.async {
      UIApplication.shared.applicationIconBadgeNumber = count
    }
  }

  static func refreshFromStoredCount() {
    let count = storedPendingCount()
    if count > 0 {
      update(pendingCount: count)
    } else {
      clear()
    }
  }
}
