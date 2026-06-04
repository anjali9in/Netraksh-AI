import UIKit
import React

@main
class AppDelegate: UIResponder, UIApplicationDelegate, RCTBridgeDelegate {
  var window: UIWindow?

  private var bridge: RCTBridge?
  private let moduleName = "NetrakshAI"

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    BackgroundSyncScheduler.register()
    PendingSyncNotificationHelper.requestAuthorizationIfNeeded()
    PendingSyncNotificationHelper.refreshFromStoredCount()

    if #unavailable(iOS 13.0) {
      window = UIWindow(frame: UIScreen.main.bounds)

      if let window {
        startReactNative(in: window, launchOptions: launchOptions)
      }
    }

    return true
  }

  func application(
    _ application: UIApplication,
    performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    BackgroundSyncScheduler.handleBackgroundFetch(completionHandler: completionHandler)
  }

  func startReactNative(
    in window: UIWindow,
    launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) {
    guard let bridge = RCTBridge(delegate: self, launchOptions: launchOptions) else {
      return
    }

    let rootView = RCTRootView(
      bridge: bridge,
      moduleName: moduleName,
      initialProperties: nil
    )
    rootView.backgroundColor = UIColor.white

    let rootViewController = UIViewController()
    rootViewController.view = rootView

    self.bridge = bridge
    self.window = window
    window.rootViewController = rootViewController
    window.makeKeyAndVisible()
  }

  func sourceURL(for bridge: RCTBridge!) -> URL! {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
