import BackgroundTasks
import Foundation
import UIKit

enum BackgroundSyncScheduler {
  static let taskIdentifier = "com.netrakshai.authlog.sync"
  static let pendingLaunchKey = "pendingBackgroundSync"
  private static var hasRegistered = false

  static func register() {
    guard !hasRegistered else { return }
    hasRegistered = true

    if #available(iOS 13.0, *) {
      BGTaskScheduler.shared.register(
        forTaskWithIdentifier: taskIdentifier,
        using: nil
      ) { task in
        guard let refreshTask = task as? BGAppRefreshTask else {
          task.setTaskCompleted(success: false)
          return
        }
        if #available(iOS 13.0, *) {
          handleAppRefresh(task: refreshTask)
        }
      }
    }
  }

  static func scheduleRefresh(afterMs intervalMs: Int) {
    let seconds = max(TimeInterval(intervalMs) / 1000.0, 15 * 60)

    if #available(iOS 13.0, *) {
      let request = BGAppRefreshTaskRequest(identifier: taskIdentifier)
      request.earliestBeginDate = Date(timeIntervalSinceNow: seconds)
      try? BGTaskScheduler.shared.submit(request)
    }

    DispatchQueue.main.async {
      UIApplication.shared.setMinimumBackgroundFetchInterval(seconds)
    }
  }

  @available(iOS 13.0, *)
  static func handleAppRefresh(task: BGAppRefreshTask) {
    scheduleRefresh(afterMs: 15 * 60 * 1000)

    var completed = false
    let finish: (Bool) -> Void = { success in
      guard !completed else {
        return
      }
      completed = true
      task.setTaskCompleted(success: success)
    }

    task.expirationHandler = {
      markPendingLaunchSync()
      finish(false)
    }

    PendingSyncNotificationHelper.refreshFromStoredCount()

    BackgroundSyncModule.shared?.requestSyncFromNative { success in
      finish(success)
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 25) {
      finish(true)
    }
  }

  static func handleBackgroundFetch(
    completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    var completed = false
    let finish: (UIBackgroundFetchResult) -> Void = { result in
      guard !completed else {
        return
      }
      completed = true
      completionHandler(result)
    }

    BackgroundSyncModule.shared?.requestSyncFromNative { success in
      finish(success ? .newData : .failed)
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 25) {
      finish(.newData)
    }
  }

  static func markPendingLaunchSync() {
    UserDefaults.standard.set(true, forKey: pendingLaunchKey)
  }

  static func consumePendingLaunchSync() -> Bool {
    let pending = UserDefaults.standard.bool(forKey: pendingLaunchKey)
    if pending {
      UserDefaults.standard.set(false, forKey: pendingLaunchKey)
    }
    return pending
  }
}
