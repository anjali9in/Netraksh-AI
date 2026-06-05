# Next Steps

This file reflects the current repository state after reviewing the mobile app, backend scaffold, tests, and documentation.

## Completed Since Initial Review

- Replaced insecure biometric crypto randomness with `react-native-get-random-values` and added crypto tests that fail if `Math.random()` is used for template encryption.
- Upgraded stored biometric template encryption to a versioned `v2` encrypt-then-MAC format with tamper detection, while retaining legacy AES-CBC decrypt support for migration or re-enrollment.
- Removed the old simulated liveness interval from authentication; `LiveScannerPanel` now advances challenges only from ML Kit frame metrics.
- Added backend sync authentication and authorization with bearer-token validation, tenant allowlists, device allowlists, and device/header mismatch rejection.
- Added end-to-end unenrolled authentication regression coverage so missing local templates fail instead of auto-registering.
- Centralized API URL, tenant/site IDs, demo mode, database settings, and sync interval in `runtimeConfig`, with native/global override support.
- Added native runtime config bridges: Android reads `NETRAKSH_*` Gradle properties/environment values into `BuildConfig`, and iOS reads `NETRAKSH_*` Info.plist build settings through `NativeModules.NetrakshConfig`.
- Added an operational sync provisioning flow in Settings so an issued bearer token can be saved to or cleared from Keychain.
- Added a sync token generator and provisioning runbook for tenant/device allowlists, token rotation, and tablet decommissioning.
- Replaced simulated enrollment brightness/sharpness checks with pixel-derived brightness, blur, exposure, and overall quality metrics.
- Replaced the remaining simulated authentication threshold inputs with real capture brightness/sharpness analysis and a conservative fallback if pixel analysis fails.
- Replaced hardcoded enrollment/authentication device IDs with the persisted install device ID.
- Aligned the lightweight offline model stack around MobileFaceNet 128-dim recognition, blink/head-turn liveness, MiniFASNet anti-spoofing, TFLite inference, and SQLite storage.
- Removed permissive MobileFaceNet and MiniFASNet production fallbacks; mock embeddings and permissive anti-spoof results are limited to explicit demo/mock paths.
- Defined the local template migration policy: legacy AES-CBC templates migrate to `v2` only after successful verification; unknown legacy formats require controlled re-enrollment.
- Added template encryption audit fields on local template rows and regression tests for migration/re-enrollment behavior.
- Added an in-app physical-device ML validation harness in the Benchmark screen and a validation runbook in `docs/ML_DEVICE_VALIDATION.md`.
- Added guarded staging/production runtime-config validation and sync-secret dry-run provisioning checks; production wildcard allowlists are rejected even with the wildcard override flag.
- Added sync retry metadata, retry backoff, failed-log reset handling, stricter backend payload validation, and sync status visibility in Offline Logs.
- Added idempotent additive migration helpers and sync retry metadata columns on auth log rows.
- Added temporary capture deletion after enrollment/authentication pipelines and startup retention cleanup for stale known capture artifacts.
- Built, installed, and launched an iOS Release app on the connected physical iPhone with staging `NETRAKSH_*` values; the app bundle contains both MobileFaceNet and MiniFASNet TFLite assets.
- Added regression tests for crypto, runtime config, unenrolled authentication, simulated-liveness removal, model-stack configuration, template migration, sync retry handling, backend sync validation, temporary image cleanup, and the physical ML validation harness.

## Current State

- React Native 0.72 TypeScript app is in place with Android/iOS projects, React Navigation, Metro, Jest, linting, and reusable app UI.
- Main app routes are implemented: Home, Enrollment, Authentication, Offline Logs, Benchmark, Profile, and Settings.
- Camera capture uses VisionCamera with permission handling, front/back camera fallback, EXIF/orientation normalization, retake support, and development mock capture.
- Enrollment collects employee details, gates capture with ML Kit face alignment, runs pixel-derived brightness/blur/exposure quality checks, generates a face embedding, encrypts the embedding with versioned authenticated encryption, and stores it locally.
- Authentication runs ML Kit face alignment, ML Kit landmark/contour-driven blink/head-turn liveness metrics, MiniFASNet anti-spoof verification, dynamic threshold selection, face matching, and local authentication logging.
- `LiveScannerPanel` advances liveness challenges only from ML Kit frame metrics; the legacy simulated liveness interval has been removed.
- The selected lightweight offline stack is ML Kit detection/alignment now, MobileFaceNet recognition, blink/head-turn liveness, MiniFASNet silent anti-spoofing, TensorFlow Lite inference, and SQLite storage. BlazeFace remains a future detector swap because no BlazeFace TFLite asset is currently bundled.
- Face embedding is configured for MobileFaceNet with 128-dimensional normalized vectors and `react-native-fast-tflite` integration; mock embeddings are limited to explicit demo mode.
- Anti-spoofing supports bundled MiniFASNet v1 TFLite inference; permissive anti-spoof fallback is limited to explicit demo/mock paths.
- Offline SQLite schema and migrations exist for face templates, auth logs, users, schema migrations, and device/location context.
- Biometric template encryption now uses secure randomness from `react-native-get-random-values` and a `v2:IV_HEX:CIPHERTEXT_HEX:HMAC_HEX` encrypt-then-MAC format. Legacy unversioned AES-CBC templates can still be decrypted for migration or re-enrollment.
- Template rows include encryption audit metadata so migrated templates record the current encryption version, previous legacy version, and migration timestamp.
- Auth logs include tamper-evident hashes, sync status, sync attempt metadata, device metadata, GPS/IP context, and local integrity verification.
- Offline Logs screen now calls `offlineSyncService.syncPendingLogs({force: true})` for manual sync, displays pending/failed/scheduled retry status, exposes per-log sync errors, supports resetting failed uploads back to pending, and purges only synchronized logs.
- Automatic online sync is wired at app startup through `connectivitySyncService.startConnectivitySync()`, including startup sync, network-restore sync, and a configured periodic interval.
- AWS backend scaffold exists with SAM, API Gateway/Lambda handler, strict request validation, bearer-token authentication, tenant/device allowlists, DynamoDB repository, and CORS responses.
- Runtime config now centralizes API URL, tenant/site IDs, demo mode, database settings, and sync interval, with Android/iOS native release overrides and test/global overrides.
- Settings displays the generated device ID, tenant/site identity, and sync-token provisioning status; admins can save or clear the issued sync bearer token without storing it in build config.
- API client adds bearer token, tenant/site headers, device headers, cached location headers, offline detection, timeout handling, and normalized API errors.
- Enrollment and authentication logs now use the persisted install device ID instead of the old hardcoded `device-tablet-01` value.
- `react-native-get-random-values` is imported first in `index.js`, so app startup can provide `global.crypto.getRandomValues`.
- Automated tests currently cover validation, routes, device info, crypto encryption/decryption and tamper detection, unenrolled-employee authentication failure, camera orientation, ML Kit alignment/metric adapters, AI model-stack configuration, physical ML validation harness behavior, liveness, sync retry/failure handling, temporary image cleanup, sync helpers, notifications, backend sync payload validation, and offline database behavior.

## Immediate Next Steps

1. Provision real staging and production values.
   - The repo now has guarded scripts to store `SYNC_AUTH_TOKENS`, `ALLOWED_TENANT_IDS`, and `ALLOWED_DEVICE_IDS` in SSM Parameter Store and deploy SAM stacks from those values.
   - Provide the real staging/production tenant IDs and registered tablet device IDs, then run `npm run backend:provision-sync-secrets -- --stage staging|production`.
   - Deploy with `npm run backend:deploy-sync -- --stage staging|production --source ssm`.
   - Register each field tablet from the Settings `Device ID` and save the issued token through `Settings > Sync Provisioning`.

2. Feed release runtime config from CI.
   - Pass `NETRAKSH_API_BASE_URL`, `NETRAKSH_API_TENANT_ID`, `NETRAKSH_API_SITE_ID`, and `NETRAKSH_DEMO_MODE=false` into Android Gradle and iOS Xcode release builds.
   - Keep sync bearer tokens out of native build settings.
   - Verify staging and production builds show the expected tenant/site values in Settings.

3. Run the physical-device ML validation plan and record measured results.
   - iOS Release build now installs and launches on the connected iPhone; use the Benchmark screen validation harness there first.
   - Configure Android SDK/`adb`, then repeat on a physical Android release build.
   - Confirm `react-native-fast-tflite` loads `mobilefacenet.tflite` and `minifasnet_v1_80x80.tflite`.
   - Record latency, accuracy observations, and threshold candidates from real neutral/blink/head-turn captures.
   - Update liveness thresholds only after multiple real devices and lighting conditions show stable separation.

## Production Hardening

1. Tune lightweight detection/liveness from real captures.
   - Alignment and liveness now use `@react-native-ml-kit/face-detection`.
   - Verify blink and head-turn thresholds across lighting, skin tones, eyewear, masks, camera positions, and Android/iOS devices.
   - Add a bundled BlazeFace TFLite detector only if ML Kit does not meet offline footprint or accuracy goals.
   - Require exactly one centered face before enrollment/authentication; current code uses the first detected face.
   - Add handling for missing contours/probabilities instead of falling back to permissive metric defaults.

2. Validate TFLite inference on physical devices.
   - Confirm `react-native-fast-tflite` is linked in Android and iOS release builds.
   - Validate bundled model loading from `src/assets/models/mobilefacenet.tflite`.
   - Validate bundled MiniFASNet loading from `src/assets/models/minifasnet_v1_80x80.tflite`.
   - Verify resize, JPEG decode, RGBA/BGRA-to-RGB/BGR conversion, normalization, output shape, label mapping, thresholds, and latency on real devices.
   - Confirm release builds fail closed when model loading fails and demo mode is disabled.

3. Reconcile legacy service layers.
   - `OfflineDatabaseService` wraps newer repositories but also keeps older raw SQL methods.
   - Prefer repository methods for face templates, auth logs, and users.
   - Remove duplicate paths once screen code is migrated.

4. Expand backend observability.
   - Store request/device metadata needed for audit.
   - Add structured logs and alarms for failed sync batches.
   - Add backend tests for valid batches, partial failures, malformed payloads, CORS, and auth failures.

5. Tighten local security posture.
   - `DATABASE_ENCRYPTION_ENABLED` is currently false.
   - Decide whether SQLite itself should be encrypted in addition to encrypted biometric templates.
   - Define retention limits for auth logs, device context, IP address, and GPS coordinates.
   - Add secure wipe/reset behavior for app uninstall, device reassignment, or employee offboarding.

## Testing Gaps

- Add tests for MiniFASNet input crop/preprocessing and spoof result handling.
- Add tests for `offlineSyncService` full-success batches and forced retry of scheduled pending logs.
- Add tests for `connectivitySyncService` startup sync, offline-to-online sync, scheduled sync, and in-flight sync suppression.
- Add screen-level tests for temporary image cleanup after enrollment/authentication.
- Add backend unit tests around sync authentication/authorization and `syncAuthLogs` handler behavior.
- Add an end-to-end physical-device test script for enrollment, authentication, offline logging, network restore sync, and log purge.

## Documentation Updates

- Update `docs/ARCHITECTURE.md` to distinguish implemented behavior from planned production behavior.
- Update `docs/MODEL_EXPLANATION.md` to reflect the implemented ML Kit alignment/liveness adapters and MiniFASNet anti-spoof model.
- Update `docs/README_SETUP.md`; it still describes an early placeholder state and mentions React Native 0.84.x while the project uses RN 0.72.7.
- Update `docs/BENCHMARKS.md` with real-device measurements, not only Jest/demo benchmarks.
- Update `docs/TESTING_REPORT.md` after adding crypto, sync, backend, and screen-flow tests.
- Keep README aligned as implementation changes; it has already been updated for secure randomness, authenticated encryption, backend auth, and the MobileFaceNet stack.

## Recommended Priority Order

1. Provision real staging/production sync secrets and deploy the backend stacks.
2. Run the Benchmark screen on the installed iPhone Release build and record real MobileFaceNet/MiniFASNet/liveness metrics.
3. Configure Android SDK/`adb`, build/install a physical Android release, and repeat the Benchmark screen validation.
4. Feed real staging/production runtime config from CI/release build settings instead of dummy local values.
5. Reduce remaining legacy raw SQL service duplication.
6. Update architecture/model/setup/benchmark/testing docs with implemented behavior and real-device evidence.
