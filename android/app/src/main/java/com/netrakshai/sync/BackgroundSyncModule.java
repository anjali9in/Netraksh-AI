package com.netrakshai.sync;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

@ReactModule(name = BackgroundSyncModule.NAME)
public class BackgroundSyncModule extends ReactContextBaseJavaModule {
  public static final String NAME = "BackgroundSyncModule";

  private @Nullable ConnectivityManager.NetworkCallback networkCallback;

  public BackgroundSyncModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void scheduleBackgroundSync(double intervalMs, Promise promise) {
    try {
      Context context = getReactApplicationContext().getApplicationContext();
      AuthLogSyncWorker.schedulePeriodicSync(context);
      registerNetworkMonitor(context);
      promise.resolve(null);
    } catch (Exception error) {
      promise.reject("SCHEDULE_FAILED", error);
    }
  }

  @ReactMethod
  public void cancelBackgroundSync(Promise promise) {
    try {
      Context context = getReactApplicationContext().getApplicationContext();
      unregisterNetworkMonitor(context);
      AuthLogSyncWorker.cancelAll(context);
      promise.resolve(null);
    } catch (Exception error) {
      promise.reject("CANCEL_FAILED", error);
    }
  }

  @ReactMethod
  public void consumePendingLaunchSync(Promise promise) {
    promise.resolve(false);
  }

  @ReactMethod
  public void updatePendingSyncNotification(int pendingCount, Promise promise) {
    try {
      Context context = getReactApplicationContext().getApplicationContext();
      PendingSyncPrefs.setPendingCount(context, pendingCount);

      if (pendingCount > 0) {
        PendingSyncNotificationHelper.showStatusNotification(context, pendingCount);
        PendingSyncForegroundService.start(context, pendingCount);
      } else {
        PendingSyncForegroundService.stop(context);
        PendingSyncNotificationHelper.cancelStatusNotification(context);
      }

      promise.resolve(null);
    } catch (Exception error) {
      promise.reject("NOTIFICATION_UPDATE_FAILED", error);
    }
  }

  @ReactMethod
  public void clearPendingSyncNotification(Promise promise) {
    try {
      Context context = getReactApplicationContext().getApplicationContext();
      PendingSyncPrefs.setPendingCount(context, 0);
      PendingSyncForegroundService.stop(context);
      PendingSyncNotificationHelper.cancelStatusNotification(context);
      promise.resolve(null);
    } catch (Exception error) {
      promise.reject("NOTIFICATION_CLEAR_FAILED", error);
    }
  }

  private void registerNetworkMonitor(@NonNull Context context) {
    ConnectivityManager connectivityManager =
        (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);

    if (connectivityManager == null || networkCallback != null) {
      return;
    }

    networkCallback =
        new ConnectivityManager.NetworkCallback() {
          @Override
          public void onAvailable(@NonNull Network network) {
            AuthLogSyncWorker.enqueueNetworkSync(context.getApplicationContext());
          }
        };

    NetworkRequest request =
        new NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build();
    connectivityManager.registerNetworkCallback(request, networkCallback);

    if (isOnline(connectivityManager)) {
      AuthLogSyncWorker.enqueueNetworkSync(context.getApplicationContext());
    }
  }

  private void unregisterNetworkMonitor(@NonNull Context context) {
    ConnectivityManager connectivityManager =
        (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);

    if (connectivityManager == null || networkCallback == null) {
      return;
    }

    connectivityManager.unregisterNetworkCallback(networkCallback);
    networkCallback = null;
  }

  private boolean isOnline(@NonNull ConnectivityManager connectivityManager) {
    Network network = connectivityManager.getActiveNetwork();
    if (network == null) {
      return false;
    }

    NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(network);
    return capabilities != null
        && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
  }
}
