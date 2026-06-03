# Next Steps

This list is updated against the current React Native, backend, development-flow, and architecture docs state.

## Completed

- React Native project foundation is in place with TypeScript, React Navigation, Android/iOS native projects, Jest, linting, and Metro config.
- Core navigation routes are implemented: Home, Enrollment, Authentication, Offline Logs, and Benchmark.
- Modern enterprise UI refresh is implemented with reusable theme and components:
  - `AppHeader`
  - `PrimaryButton`
  - `StatusBadge`
  - `InfoCard`
  - `ProfileDrawer`
  - `CameraCaptureCard`
  - `AttendanceCalendar`
  - `EmployeeInput`
- Native stack header is disabled and custom in-app back navigation exists for non-home screens.
- Camera capture flow is connected with VisionCamera permission handling, live preview, capture, retake, and simulator mock capture fallback.
- Offline SQLite foundation is implemented with migrations for:
  - `employee_face_templates`
  - `auth_logs`
  - `users`
  - `schema_migrations`
- Repository layer is implemented for users, face templates, and authentication logs.
- Offline authentication logs include sync status and SHA-256 integrity hash verification.
- Enrollment screen connects Employee ID input, camera capture, quality check simulation, embedding generation, and local template save.
- Authentication screen connects Employee ID input, capture, liveness challenge state machine, face match, result display, and local auth logging.
- ArcFace-MobileNetV2 model asset is present at `src/assets/models/arcface_mobilenet_v2.tflite`.
- Face embedding and matching modules exist with 512-dimensional embedding support, cosine similarity, dynamic thresholds, and benchmark hooks.
- Active liveness challenge service is implemented for blink, smile, and head-turn metrics.
- Offline Logs screen is implemented with metrics, filters, search, sync status badges, purge action, and integrity checks.
- Benchmark screen and benchmark docs exist for model speed and pipeline reporting.
- AWS sync backend scaffold is implemented with SAM, API Gateway, Lambda handler, validation, and DynamoDB repository.
- Mobile sync service exists for pending auth logs through `syncApi.syncOfflineAuthLogs`.
- Network status helper exists through `@react-native-community/netinfo`.
- Automated tests are passing for validation, routes, device info, AI module, liveness, and offline database behavior.

## Partially Done / Needs Hardening

- Face template "encryption" is currently serialized/base64 encoded in `faceMatcher.ts`; replace this with real authenticated encryption for production biometric data.
- Keychain secure storage is available for auth tokens, but biometric template encryption keys are not yet managed through Keychain/Keystore.
- Camera quality checks are currently simulated in the enrollment UI; replace with real image/face quality signals.
- Liveness UI uses simulated EAR/MAR/yaw values during authentication; connect it to real face landmarks from an on-device face detector.
- The architecture docs mention Google ML Kit face detection, but the current package list does not include a face detection/landmark dependency.
- `faceEmbedding.ts` references `react-native-nitro-image`, but that dependency is not currently listed in `package.json`; either add/link the dependency or replace image preprocessing with an installed image pipeline.
- Sync service exists, but automatic network-restore sync is not yet wired into the app lifecycle.
- Offline Logs screen has manual sync/purge simulation paths; connect it fully to `OfflineSyncService` and production backend responses.
- Backend sync API is scaffolded, but deployment, environment configuration, auth, and real API URL wiring still need final validation.
- Raw temporary camera image purge is documented as a requirement; enforce cleanup after enrollment/authentication success/failure.

## Immediate Next Steps

1. Replace base64 embedding storage with authenticated encryption.
   - Generate/store an encryption key through iOS Keychain and Android Keystore.
   - Encrypt embeddings before SQLite write.
   - Decrypt only in memory during matching.

2. Add real on-device face detection and landmark extraction.
   - Choose and install the face detector dependency.
   - Detect one centered face before capture acceptance.
   - Feed real landmarks into liveness EAR/MAR/yaw calculations.
   - Show real validation states: face not centered, low light, multiple faces, no face, blink detected.

3. Fix or finalize image preprocessing for TFLite inference.
   - Add the missing image preprocessing dependency referenced by `faceEmbedding.ts`, or replace it with a supported React Native image processing path.
   - Validate 112x112 RGB normalization on Android and iOS physical devices.
   - Confirm the bundled TFLite model loads correctly with `react-native-fast-tflite`.

4. Wire automatic offline-to-online sync.
   - Subscribe to `networkService.subscribeToNetworkChanges` from app startup.
   - On network restore, call `offlineSyncService.syncPendingLogs()`.
   - Update local log statuses to `SYNCED` or `FAILED`.
   - Surface last sync time and failed sync count in Home/Profile/Offline Logs.

5. Replace manual sync simulation in Offline Logs with the real sync service.
   - Use `offlineSyncService.syncPendingLogs()` for the Sync Pending Logs action.
   - Keep purge restricted to synced logs.
   - Show API errors in a user-friendly status card.

6. Complete AWS backend deployment validation.
   - Build backend with `npm run backend:build`.
   - Deploy SAM stack.
   - Put the API Gateway URL in the mobile app environment config.
   - Test auth log upload from a physical device.
   - Add backend auth before production use.

7. Enforce temporary image purge.
   - Delete local captured images after enrollment/authentication pipeline completion.
   - Keep only encrypted embeddings and minimal audit metadata.
   - Add tests for purge behavior where practical.

8. Run native device QA.
   - Android 8+ mid-range device.
   - iOS device with notch/dynamic island.
   - Camera permission denied/retry/settings flow.
   - Small Android screen layout.
   - Offline enrollment/authentication.
   - Network restore sync.

9. Update benchmark evidence after real-device testing.
   - Record model load time, embedding time, liveness duration, SQLite lookup time, and full auth latency.
   - Update `docs/BENCHMARKS.md` with measured device names and dates.
   - Keep simulated/Jest benchmark numbers separate from physical-device results.

10. Final demo polish.
   - Add final app icon and splash assets.
   - Seed realistic demo employee/profile data.
   - Prepare a clean demo script covering enrollment, offline auth, logs, sync, profile drawer, and benchmark report.
   - Capture final screenshots for docs and presentation.

## Documentation Updates Still Needed

- Update `docs/ARCHITECTURE.md` to distinguish implemented modules from planned production hardening.
- Update `docs/DEVELOPMENT_FLOW.md` suggested build order so completed phases are marked done.
- Update `docs/BENCHMARKS.md` after physical device measurements.
- Update `docs/README_SETUP.md` with final native setup, backend deployment, and app icon steps.

## Current Priority Order

1. Real encryption for face templates.
2. Real face detection and landmark-driven liveness.
3. TFLite image preprocessing dependency/runtime validation.
4. Automatic network-restore sync.
5. Backend deployment and end-to-end sync test.
6. Temporary image purge enforcement.
7. Physical device QA and final demo assets.
