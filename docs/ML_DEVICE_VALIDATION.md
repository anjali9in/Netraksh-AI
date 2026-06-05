# Physical ML Device Validation

Use this runbook on physical Android and iOS release builds. Jest and simulator results are useful for regressions, but production thresholds must come from real camera captures.
Record measured runs in `docs/ML_DEVICE_RESULTS.md`.

## Build Targets

### iOS

1. Connect the iPhone.
2. Install pods:
   ```sh
   npm run ios:pods
   ```
3. Build and install release:
   ```sh
   npx react-native run-ios --mode Release --device "Anjali21iPhone"
   ```

### Android

1. Install Android platform tools so `adb` is available.
2. Connect the Android device and verify:
   ```sh
   adb devices -l
   ```
3. Build and install release:
   ```sh
   npx react-native run-android --mode release
   ```

## In-App Validation

Open `Benchmark` in the app.

1. Run `Check TFLite Models`.
   - `MobileFaceNet` must pass.
   - `MiniFASNet-V1-80x80` must pass.
   - Any release build failure is a release blocker because production paths fail closed when models do not load.
2. Capture real samples for each scenario:
   - `Neutral`
   - `Blink`
   - `Head turn`
3. Tap `Analyze Capture` after each sample.
4. Record:
   - Detection latency and face count.
   - MobileFaceNet embedding latency and dimension count.
   - MiniFASNet live score and latency.
   - Matching score and latency.
   - EAR, eye-open probability, yaw ratio, and rotationY.
5. Use the `Threshold Candidates` card as candidate values only. Apply threshold changes only after multiple users/devices/lighting conditions show stable separation between neutral, blink, and head-turn samples.

## Minimum Sample Matrix

- 3 Android devices and 3 iOS devices if available.
- At least 10 employees or test users.
- Indoor, outdoor shade, harsh light, and low light.
- With and without eyewear.
- Front camera at normal tablet/phone holding distance.

## Pass Criteria

- Exactly one face is detected for each valid sample.
- MobileFaceNet outputs 128 dimensions.
- MiniFASNet classifies live captures as live.
- Average embedding latency stays below 1 second.
- Blink samples separate clearly from neutral samples on eye-open probability and EAR.
- Head-turn samples exceed neutral samples on `rotationY` or yaw-ratio movement.
