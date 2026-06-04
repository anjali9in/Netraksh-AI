import BackgroundTasks
import Foundation
import React
import UIKit

@objc(BackgroundSyncModule)
class BackgroundSyncModule: RCTEventEmitter {
  static weak var shared: BackgroundSyncModule?

  private let syncEventName = "BackgroundSyncRequested"

  override init() {
    super.init()
    BackgroundSyncModule.shared = self
  }

  @objc
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    [syncEventName]
  }

  @objc(scheduleBackgroundSync:resolver:rejecter:)
  func scheduleBackgroundSync(
    _ intervalMs: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    BackgroundSyncScheduler.scheduleRefresh(afterMs: intervalMs.intValue)
    resolve(nil)
  }

  @objc(cancelBackgroundSync:rejecter:)
  func cancelBackgroundSync(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 13.0, *) {
      BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: BackgroundSyncScheduler.taskIdentifier)
    }
    resolve(nil)
  }

  @objc(consumePendingLaunchSync:rejecter:)
  func consumePendingLaunchSync(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(BackgroundSyncScheduler.consumePendingLaunchSync())
  }

  @objc(updatePendingSyncNotification:resolver:rejecter:)
  func updatePendingSyncNotification(
    _ pendingCount: NSNumber,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    PendingSyncNotificationHelper.update(pendingCount: pendingCount.intValue)
    resolve(nil)
  }

  @objc(clearPendingSyncNotification:rejecter:)
  func clearPendingSyncNotification(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    PendingSyncNotificationHelper.clear()
    resolve(nil)
  }

  func requestSyncFromNative(completion: @escaping (Bool) -> Void) {
    DispatchQueue.main.async {
      if self.bridge != nil {
        self.sendEvent(withName: self.syncEventName, body: nil)
        completion(true)
      } else {
        BackgroundSyncScheduler.markPendingLaunchSync()
        completion(false)
      }
    }
  }
}
