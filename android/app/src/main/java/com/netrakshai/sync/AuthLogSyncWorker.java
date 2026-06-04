package com.netrakshai.sync;

import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.util.concurrent.TimeUnit;

/** Triggers the headless JS auth-log sync task. */
public class AuthLogSyncWorker extends Worker {
  public static final String UNIQUE_NETWORK_WORK = "auth_log_network_sync";
  public static final String UNIQUE_PERIODIC_WORK = "auth_log_periodic_sync";

  public AuthLogSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
    super(context, params);
  }

  @NonNull
  @Override
  public Result doWork() {
    Context context = getApplicationContext();
    int pendingCount = PendingSyncPrefs.getPendingCount(context);

    if (pendingCount > 0) {
      PendingSyncNotificationHelper.showStatusNotification(context, pendingCount);
      PendingSyncForegroundService.start(context, pendingCount);
    }

    Intent service = new Intent(context, AuthLogSyncHeadlessTaskService.class);
    context.startService(service);
    return Result.success();
  }

  public static void enqueueNetworkSync(@NonNull Context context) {
    Constraints constraints =
        new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();

    OneTimeWorkRequest request =
        new OneTimeWorkRequest.Builder(AuthLogSyncWorker.class)
            .setConstraints(constraints)
            .addTag(UNIQUE_NETWORK_WORK)
            .build();

    WorkManager.getInstance(context)
        .enqueueUniqueWork(UNIQUE_NETWORK_WORK, androidx.work.ExistingWorkPolicy.KEEP, request);
  }

  public static void schedulePeriodicSync(@NonNull Context context) {
    Constraints constraints =
        new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();

    androidx.work.PeriodicWorkRequest request =
        new androidx.work.PeriodicWorkRequest.Builder(
                AuthLogSyncWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .addTag(UNIQUE_PERIODIC_WORK)
            .build();

    WorkManager.getInstance(context)
        .enqueueUniquePeriodicWork(
            UNIQUE_PERIODIC_WORK,
            androidx.work.ExistingPeriodicWorkPolicy.UPDATE,
            request);
  }

  public static void cancelAll(@NonNull Context context) {
    WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_NETWORK_WORK);
    WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_PERIODIC_WORK);
  }
}
