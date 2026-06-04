package com.netrakshai.sync;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

/** Foreground service so pending-sync status stays visible (Android 8+). */
public class PendingSyncForegroundService extends Service {
  public static final String ACTION_START = "com.netrakshai.sync.action.START_FOREGROUND";
  public static final String ACTION_STOP = "com.netrakshai.sync.action.STOP_FOREGROUND";
  public static final String EXTRA_PENDING_COUNT = "pending_count";

  public static void start(@NonNull Context context, int pendingCount) {
    Intent intent = new Intent(context, PendingSyncForegroundService.class);
    intent.setAction(ACTION_START);
    intent.putExtra(EXTRA_PENDING_COUNT, pendingCount);
    ContextCompat.startForegroundService(context, intent);
  }

  public static void stop(@NonNull Context context) {
    Intent intent = new Intent(context, PendingSyncForegroundService.class);
    intent.setAction(ACTION_STOP);
    context.startService(intent);
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null) {
      stopSelf();
      return START_NOT_STICKY;
    }

    String action = intent.getAction();
    if (ACTION_STOP.equals(action)) {
      stopForeground(true);
      stopSelf();
      PendingSyncNotificationHelper.cancelStatusNotification(this);
      return START_NOT_STICKY;
    }

    int pendingCount = intent.getIntExtra(EXTRA_PENDING_COUNT, 0);
    if (pendingCount <= 0) {
      pendingCount = PendingSyncPrefs.getPendingCount(this);
    }

    if (pendingCount <= 0) {
      stopForeground(true);
      stopSelf();
      PendingSyncNotificationHelper.cancelStatusNotification(this);
      return START_NOT_STICKY;
    }

    PendingSyncNotificationHelper.ensureChannel(this);
    android.app.Notification notification =
        PendingSyncNotificationHelper.buildNotification(this, pendingCount);

    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(
          PendingSyncNotificationHelper.NOTIFICATION_ID,
          notification,
          android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
    } else {
      startForeground(PendingSyncNotificationHelper.NOTIFICATION_ID, notification);
    }

    return START_STICKY;
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }
}
