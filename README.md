# Netraksh AI

**Offline Facial Recognition & Liveness Detection System for Remote Locations**

Netraksh AI is an offline-first facial authentication and liveness workflow built with **React Native 0.72.7**, **TypeScript**, and **SQLite**. It is designed for remote environments where connectivity is unreliable, keeping enrollment, face matching, liveness challenge state, and local audit logging available on device.

---

## Features

- **Camera Capture**: Uses `react-native-vision-camera` for enrollment capture, authentication capture, permission handling, retake flow, and development mock capture.
- **Face Embeddings**: Uses lightweight MobileFaceNet-style 128-dimensional normalized embeddings with `react-native-fast-tflite` integration and deterministic mock generation only in explicit demo mode.
- **Liveness Challenge Flow**: Uses ML Kit face metrics to drive blink and head-turn challenges, followed by MiniFASNet silent anti-spoof verification in production paths.
- **Encrypted Face Templates**: Stores encrypted embeddings in SQLite using secure random IVs and versioned encrypt-then-MAC authenticated encryption.
- **Offline Audit Logs**: Stores authentication attempts locally with sync status, device/location context, and SHA-256 integrity hashes for tamper evidence.
- **Offline-to-Online Sync**: Provides manual sync from the Offline Logs screen, automatic sync on network restore, and periodic scheduled sync using `AUTH_LOG_SYNC_INTERVAL_MS`.
- **AWS Backend Scaffold**: Includes a SAM/API Gateway/Lambda/DynamoDB sync backend with request validation, bearer-token authentication, and tenant/device authorization.

---

## Setup & Installation

### Prerequisites

* **Node.js**: `v18.0.0` or higher
* **Java SDK**: **JDK 21**
* **Android**: Android Studio with Android SDK and command-line tools
* **iOS**: macOS with Xcode and CocoaPods installed

### Installation

1. **Clone the repository**:
   ```sh
   git clone https://github.com/anjali9in/Netraksh-AI.git
   cd Netraksh-AI
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Install Pods (iOS only)**:
   ```sh
   npm run ios:pods
   ```

---

## Running the App

### Running on Android

Ensure an emulator is running or a physical device is connected via USB with USB debugging enabled.

```sh
# Start Metro bundler
npm start

# Run on Android
npm run android
```

### Running on iOS

```sh
# Run on iOS Simulator
npm run ios
```

---

## Developer Commands

```sh
# Run Jest Unit Tests
npm test

# Run TypeScript Type-Checker
npm run typecheck

# Run ESLint Code Linter
npm run lint
```

---

## 📁 Project Architecture

* `src/app`: Navigation routes, navigator screens, and shell framework.
* `src/screens`: Views for enrollment, authentication, logs history, benchmarks, and settings.
* `src/components`: Reusable UI elements (CameraCaptureCard, LiveScannerPanel, Navigation bars).
* `src/services`: Database repositories, liveness state machines, geolocation, and network services.
* `src/ai`: TFLite generator, preprocessing, similarity metrics, and benchmark scripts.
* `src/utils`: Encryption helper, hash validation, and date functions.
* `backend`: AWS SAM sync API scaffold.
* `docs`: Architecture, setup, benchmark, testing, and next-step notes.
* `__tests__`: Jest tests covering validation, routes, device info, camera orientation, liveness, offline database behavior, and AI utilities.

Key operational docs:

* `docs/OPERATIONS_PROVISIONING.md`: sync token issuance, tablet registration, rotation, and decommissioning.
* `docs/RELEASE_RUNTIME_CONFIG.md`: staging/production native build config injection.
* `docs/ML_DEVICE_RESULTS.md`: physical-device ML validation result log.
