# Physical ML Device Results

Last updated: 2026-06-05

## Current Validation Status

The Benchmark screen has the release-device validation harness, but production
thresholds have not been changed yet because real capture measurements have not
been collected across the required device and lighting matrix.

| Platform | Release build status | Model load confirmation | Real capture metrics |
| --- | --- | --- | --- |
| Android | Pending. `adb` is not available in the current shell. With JDK 17 selected, `./gradlew :app:compileDebugJavaWithJavac` is blocked because no Android SDK path is configured through `ANDROID_HOME` or `android/local.properties`. | Pending on physical Android release build. | Pending. |
| iOS | Release build for connected iPhone succeeded with staging `NETRAKSH_*` values. The app installed and launched on `Anjali21iPhone (26.5)`. | Bundle contains `assets/src/assets/models/mobilefacenet.tflite` and `assets/src/assets/models/minifasnet_v1_80x80.tflite`; JS bundle references both Metro assets. In-app Benchmark screen model-load confirmation is still pending. | Pending real captures from the Benchmark screen. |

## Local Checks Run On 2026-06-05

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm run backend:typecheck` | Pass |
| `npm test -- --runInBand` | Pass, 26 suites / 97 tests |
| `npm run lint` | Pass with existing warning-level lint debt |
| `git diff --check` | Pass |
| `npm run release:validate-config -- --stage staging` with dummy HTTPS runtime env | Pass |
| `npm run release:validate-config -- --stage production` with dummy HTTPS runtime env | Pass |
| `npm run backend:provision-sync-secrets -- --stage staging --dry-run` with dummy values | Pass |
| Production provisioning with wildcard `ALLOWED_DEVICE_IDS` and `--allow-wildcards` | Rejected as expected |
| `npm run backend:generate-sync-token -- --env` | Pass |
| `plutil -lint ios/NetrakshAI/Info.plist` | Pass |
| `xcodebuild -list -workspace ios/NetrakshAI.xcworkspace` | Pass |
| `xcrun xctrace list devices` | Physical iPhone detected: `Anjali21iPhone (26.5)` |
| `adb devices -l` | Blocked: `adb` command not found |
| `./gradlew :app:compileDebugJavaWithJavac` | First blocked by Java 21 / Gradle 8.0.1 mismatch; retry with JDK 17 is blocked by missing Android SDK location |
| iOS simulator Debug build with `NETRAKSH_*` values | Blocked at link: `MLImage.framework` device binary cannot link into iOS Simulator arm64 |
| iOS physical Release build with staging `NETRAKSH_*` values | Pass |
| `devicectl device install app` to `Anjali21iPhone` | Pass |
| `devicectl device process launch com.netrakshai` | Pass |
| iOS Release app bundle asset check | Pass: MobileFaceNet and MiniFASNet TFLite assets present |

## Results To Record Per Device

| Device | OS | Build | MobileFaceNet load | MiniFASNet load | Neutral samples | Blink samples | Head-turn samples | Threshold notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | Release | TBD | TBD | TBD | TBD | TBD | TBD |

## Threshold Policy

Do not update blink/head-turn thresholds from Jest or one-device captures.
Record neutral, blink, and head-turn samples from multiple Android/iOS devices,
lighting conditions, and users first. Update thresholds only after the captured
metrics show stable separation.
