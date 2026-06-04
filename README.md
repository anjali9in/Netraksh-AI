# 🛡️ Netraksh AI

**Offline Facial Recognition & Liveness Detection System for Remote Locations**

Netraksh AI is a robust, offline-first facial authentication and anti-spoofing solution built with **React Native (0.72.x)**, **TypeScript**, and **SQLite**. Designed specifically for remote environments with limited or no internet connectivity, it performs high-speed face embedding generation, matching, and liveness challenge flows completely on-device.

---

## ✨ Features

- **📷 Real-Time Camera Feed**: Powered by `react-native-vision-camera` with automated quality and alignment feedback.
- **⚡ On-Device AI Embedding**: Upgraded to **ArcFace-MobileNetV2** (512-dimensional normalized embeddings) achieving high accuracy (>99.7% LFW target).
- **🎭 Multi-Factor Liveness Verification**: Randomly generated challenge flows (Blink, Smile, Head Turn) to reject photo/screen-based spoofing attempts.
- **🔒 AES-256-CBC Biometric Security**: Secure storage of face templates inside SQLite. Templates are encrypted on-device using a 256-bit key derived and secured within the hardware-backed **Keychain** (`react-native-keychain`).
- **🔄 Auto-Registration Fallback**: Automatically registers new users on-the-spot during authentication if they do not yet have an enrolled template.
- **📡 Automatic TFLite Fallback**: Includes a native module boundary. If the native TFLite module is missing or not linked (e.g. developing on Metro without rebuilding native code), the app **gracefully falls back** to simulated mock embedding mode instead of crashing.
- **📝 Tamper-Proof SQLite Logs**: Comprehensive offline log storage protected by localized integrity hashes. Includes a live log viewer with instant focus updates and date-based filtering.

---

## 🚀 Setup & Installation

### Prerequisites

* **Node.js**: `v18.0.0` or higher (Node `v24.16.0` recommended)
* **Java SDK**: **JDK 21**
* **Android**: Android Studio with SDK Platform 36 and Command-line Tools
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

## 📱 Running the App

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

## 🛠️ Developer Commands

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
* `__tests__`: Comprehensive suite of Jest tests covering databases, cryptography, liveness detection, and AI modules.
