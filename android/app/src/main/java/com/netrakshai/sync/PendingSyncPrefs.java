package com.netrakshai.sync;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;

public final class PendingSyncPrefs {
  private static final String PREFS_NAME = "netraksh_pending_sync";
  private static final String KEY_PENDING_COUNT = "pending_count";

  private PendingSyncPrefs() {}

  public static void setPendingCount(@NonNull Context context, int count) {
    prefs(context).edit().putInt(KEY_PENDING_COUNT, Math.max(0, count)).apply();
  }

  public static int getPendingCount(@NonNull Context context) {
    return prefs(context).getInt(KEY_PENDING_COUNT, 0);
  }

  private static SharedPreferences prefs(@NonNull Context context) {
    return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
  }
}
