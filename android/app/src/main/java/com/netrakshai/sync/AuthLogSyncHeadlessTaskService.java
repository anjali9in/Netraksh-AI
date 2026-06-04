package com.netrakshai.sync;

import android.content.Intent;
import com.facebook.react.HeadlessJsTaskService;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.jstasks.HeadlessJsTaskConfig;
import javax.annotation.Nullable;

/** Runs {@code NetrakshAuthLogSync} in JS when WorkManager or network events fire. */
public class AuthLogSyncHeadlessTaskService extends HeadlessJsTaskService {
  public static final String TASK_NAME = "NetrakshAuthLogSync";
  private static final long TASK_TIMEOUT_MS = 60_000L;

  @Override
  protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
    return new HeadlessJsTaskConfig(
        TASK_NAME,
        Arguments.createMap(),
        TASK_TIMEOUT_MS,
        true);
  }
}
