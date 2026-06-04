package com.netrakshai.sync;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import com.netrakshai.MainActivity;
import com.netrakshai.R;

public final class PendingSyncNotificationHelper {
  public static final String CHANNEL_ID = "pending_auth_log_sync";
  public static final int NOTIFICATION_ID = 41001;

  private PendingSyncNotificationHelper() {}

  public static void ensureChannel(@NonNull Context context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return;
    }

    NotificationManager manager = manager(context);
    if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) {
      return;
    }

    NotificationChannel channel =
        new NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.pending_sync_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT);
    channel.setDescription(context.getString(R.string.pending_sync_channel_desc));
    channel.setShowBadge(true);
    manager.createNotificationChannel(channel);
  }

  public static Notification buildNotification(@NonNull Context context, int pendingCount) {
    ensureChannel(context);

    Intent launchIntent = new Intent(context, MainActivity.class);
    launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent contentIntent =
        PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    String body =
        context.getString(R.string.pending_sync_notification_text, pendingCount);

    return new NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_launcher)
        .setContentTitle(context.getString(R.string.pending_sync_notification_title))
        .setContentText(body)
        .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
        .setContentIntent(contentIntent)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setNumber(pendingCount)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setCategory(NotificationCompat.CATEGORY_STATUS)
        .build();
  }

  public static void showStatusNotification(@NonNull Context context, int pendingCount) {
    NotificationManager manager = manager(context);
    if (manager == null) {
      return;
    }

    manager.notify(NOTIFICATION_ID, buildNotification(context, pendingCount));
  }

  public static void cancelStatusNotification(@NonNull Context context) {
    NotificationManager manager = manager(context);
    if (manager != null) {
      manager.cancel(NOTIFICATION_ID);
    }
  }

  private static NotificationManager manager(@NonNull Context context) {
    return (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
  }
}
