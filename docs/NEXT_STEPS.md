# Next Steps

This file reflects the current repository state after reviewing the mobile app, backend scaffold, tests, and documentation.

## Current State

- React Native 0.72 TypeScript app is in place with Android/iOS projects, React Navigation, Metro, Jest, linting, and reusable app UI.
- Main app routes are implemented: Home, Enrollment, Authentication, Offline Logs, Benchmark, Profile, and Settings.
- Camera capture uses VisionCamera with permission handling, front/back camera fallback, EXIF/orientation normalization, retake support, and development mock capture.
- Enrollment collects employee details, gates capture with ML Kit face alignment, runs simulated brightness/sharpness quality checks, generates a face embedding, encrypts the embedding, and stores it locally.
- Authentication runs ML Kit face alignment, ML Kit landmark/contour-driven liveness metrics, MiniFASNet anti-spoof verification, dynamic threshold selection, face matching, and local authentication logging.
- Face embedding supports ArcFace-MobileNetV2 with 512-dimensional normalized vectors and `react-native-fast-tflite` integration, with fallback mock embeddings when native inference fails.
- Anti-spoofing supports bundled MiniFASNet v1 TFLite inference, with permissive fallback when demo mode is enabled or native inference is unavailable.
- Offline SQLite schema and migrations exist for face templates, auth logs, users, schema migrations, and device/location context.
- Auth logs include tamper-evident hashes, sync status, device metadata, GPS/IP context, and local integrity verification.
- Offline Logs screen now calls `offlineSyncService.syncPendingLogs()` for manual sync and purges only synchronized logs.
- Automatic online sync is wired at app startup through `connectivitySyncService.startConnectivitySync()`, including startup sync, network-restore sync, and a configured periodic interval.
- AWS backend scaffold exists with SAM, API Gateway/Lambda handler, request validation, DynamoDB repository, and CORS responses.
- API client adds bearer token, device headers, cached location headers, offline detection, timeout handling, and normalized API errors.
- `react-native-get-random-values` is imported first in `index.js`, so app startup can provide `global.crypto.getRandomValues`.
- Automated tests currently cover validation, routes, device info, camera orientation, ML Kit alignment/metric adapters, AI utilities, liveness, sync helpers, notifications, and offline database behavior.

## Critical Fixes

1. Fix secure random generation in `src/utils/crypto.ts`.
   - Remove the current `CryptoJS.lib.WordArray.random` override that uses `Math.random()`.
   - Rely on `react-native-get-random-values` loaded from `index.js`.
   - Add a crypto unit/integration test that verifies encrypt/decrypt works without replacing secure randomness.
   - Rebuild native apps after dependency installation; run `pod install` for iOS.

2. Upgrade biometric encryption from AES-CBC to authenticated encryption.
   - Current embedding encryption uses AES-256-CBC with a random IV but no authentication tag.
   - Move to AES-GCM or encrypt-then-MAC so template tampering is detected.
   - Version the ciphertext format so existing local templates can be migrated or re-enrolled safely.

3. Remove the legacy simulated liveness timer from `LiveScannerPanel`.
   - The frame loop now feeds real ML Kit metrics into `livenessService`.
   - A second interval still calls `getSimulatedMetrics()` during authentication after face detection.
   - This can advance challenges from simulated values and must be removed or guarded behind explicit demo mode.

4. Add backend authentication and tenant/device authorization.
   - Backend sync currently validates payload shape but does not authenticate callers.
   - Require bearer-token validation or signed device credentials before accepting logs.
   - Reject logs from unknown devices/sites where applicable.

5. Replace hardcoded production values with environment-specific config.
   - `API_BASE_URL` is hardcoded in `src/config/env.ts`.
   - `device-tablet-01` is still used in enrollment/authentication flows.
   - Move API URL, demo mode, and device/site IDs into native build config or a runtime environment layer.

6. Validate authentication failure for unenrolled employees end to end.
   - The current matching layer returns failure when no local template exists.
   - Add screen/service tests so this behavior does not regress back to demo auto-registration.

## Production Hardening

1. Tune and validate ML Kit liveness on real devices.
   - Alignment and liveness now use `@react-native-ml-kit/face-detection`.
   - Verify blink, smile, and head-turn thresholds across lighting, skin tones, eyewear, masks, camera positions, and Android/iOS devices.
   - Require exactly one centered face before enrollment/authentication; current code uses the first detected face.
   - Add handling for missing contours/probabilities instead of falling back to permissive metric defaults.

2. Validate TFLite inference on physical devices.
   - Confirm `react-native-fast-tflite` is linked in Android and iOS release builds.
   - Validate bundled model loading from `src/assets/models/arcface_mobilenet_v2.tflite`.
   - Validate bundled MiniFASNet loading from `src/assets/models/minifasnet_v1_80x80.tflite`.
   - Verify resize, JPEG decode, RGBA/BGRA-to-RGB/BGR conversion, normalization, output shape, label mapping, thresholds, and latency on real devices.
   - Keep mock embedding fallback available only in explicit demo/development mode.

3. Replace simulated enrollment quality scoring.
   - Enrollment face alignment is real, but brightness and sharpness are still generated with `Math.random()`.
   - Calculate brightness/exposure/blur from captured pixels or image metadata.
   - Block enrollment on real quality metrics and show actionable retry reasons.

4. Finish temporary image cleanup.
   - `imagePixelLoader` deletes resized intermediate files.
   - `normalizeCapturedPhoto` deletes the original only when it creates a rotated replacement.
   - Delete enrollment/authentication capture files after the embedding or matching pipeline completes.
   - Keep only encrypted embeddings and minimal audit metadata.

5. Strengthen database migration safety.
   - Migration 3 uses plain `ALTER TABLE ... ADD COLUMN`; reruns can fail if columns already exist but migration state is inconsistent.
   - Add column-existence checks or a safer migration helper.
   - Add tests for partially migrated database repair.

6. Reconcile legacy service layers.
   - `OfflineDatabaseService` wraps newer repositories but also keeps older raw SQL methods.
   - Prefer repository methods for face templates, auth logs, and users.
   - Remove duplicate paths once screen code is migrated.

7. Improve sync robustness.
   - Add retry/backoff policy for failed sync attempts.
   - Distinguish backend validation failures from transient network failures.
   - Decide whether `FAILED` sync logs should be retried, reviewed manually, or moved to a dead-letter queue.
   - Persist and display last sync time, failed sync count, and last sync error.

8. Expand backend validation and observability.
   - Validate ISO timestamps, coordinate ranges, string lengths, and hash format.
   - Store request/device metadata needed for audit.
   - Add structured logs and alarms for failed sync batches.
   - Add backend tests for valid batches, partial failures, malformed payloads, CORS, and auth failures.

9. Tighten local security posture.
   - `DATABASE_ENCRYPTION_ENABLED` is currently false.
   - Decide whether SQLite itself should be encrypted in addition to encrypted biometric templates.
   - Define retention limits for auth logs, device context, IP address, and GPS coordinates.
   - Add secure wipe/reset behavior for app uninstall, device reassignment, or employee offboarding.

## Testing Gaps

- Add tests for `encryptData`/`decryptData`, including invalid ciphertext and tamper detection after authenticated encryption is added.
- Add tests proving `LiveScannerPanel` does not complete liveness from simulated metrics unless explicit demo mode is enabled.
- Add tests for MiniFASNet input crop/preprocessing and spoof result handling.
- Add tests for `offlineSyncService` success, partial failure, network failure, and retry behavior.
- Add tests for `connectivitySyncService` triggering sync only on offline-to-online transitions.
- Add tests for `AuthenticationScreen` behavior when an employee is not enrolled.
- Add tests for real enrollment quality scoring after simulated brightness/sharpness is replaced.
- Add tests for temporary image cleanup after enrollment/authentication.
- Add backend unit tests around `parseSyncAuthLogsRequest` and `syncAuthLogs` handler behavior.
- Add an end-to-end physical-device test script for enrollment, authentication, offline logging, network restore sync, and log purge.

## Documentation Updates

- Update `docs/ARCHITECTURE.md` to distinguish implemented behavior from planned production behavior.
- Update `docs/MODEL_EXPLANATION.md` to reflect the implemented ML Kit alignment/liveness adapters and MiniFASNet anti-spoof model.
- Update `docs/README_SETUP.md`; it still describes an early placeholder state and mentions React Native 0.84.x while the project uses RN 0.72.7.
- Update `docs/BENCHMARKS.md` with real-device measurements, not only Jest/demo benchmarks.
- Update `docs/TESTING_REPORT.md` after adding crypto, sync, backend, and screen-flow tests.
- Update README claims after secure-random and authenticated-encryption fixes are complete.

## Recommended Priority Order

1. Remove insecure `Math.random()` crypto override and verify native secure randomness.
2. Remove or demo-gate the legacy simulated liveness interval.
3. Add authenticated encryption for stored face templates.
4. Validate ML Kit liveness and MiniFASNet/ArcFace TFLite inference on Android/iOS physical devices.
5. Replace simulated enrollment quality checks with real image metrics.
6. Add backend auth and environment-specific API/device configuration.
7. Harden sync retries, failed-log handling, and sync status visibility.
8. Enforce temporary image cleanup and retention limits.
9. Strengthen migrations and repository consistency.
10. Expand automated tests and update docs with real-device evidence.
