# Netraksh AI Setup

## Project Overview

Netraksh AI is a React Native 0.84.x and TypeScript hackathon project for an offline facial recognition and liveness detection workflow in remote locations.

This first step includes only the base project structure, navigation, placeholder screens, reusable components, service interfaces, configuration, tests, and documentation skeleton. Camera integration, AI models, encryption, local database storage, and cloud sync are intentionally left for later steps.

## Setup Commands

Use Node 24.16.0:

```sh
nvm use
```

Then install dependencies:

```sh
npm install
```

## Run Android

Install Android Studio first, then install these SDK packages from Android Studio:

- Android SDK Platform 36
- Android SDK Build-Tools 36.0.0
- Android SDK Platform-Tools
- Android Emulator
- Android SDK Command-line Tools

For zsh on macOS, add Android SDK tools to `~/.zshrc`:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
```

Reload the shell:

```sh
source ~/.zshrc
```

Create `android/local.properties` if Gradle cannot find the SDK:

```sh
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

Start an Android emulator from Android Studio or run:

```sh
emulator -list-avds
emulator -avd <AVD_NAME>
```

Then run:

```sh
npm run android
```

## Run iOS

Install full Xcode from the App Store, then select it as the active developer directory:

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcodebuild -version
xcrun --sdk iphoneos --show-sdk-path
```

Then install pods:

```sh
bundle install
cd ios
rm -rf Pods Podfile.lock build
bundle exec pod install
cd ..
```

```sh
npm run ios
```

## Useful Commands

```sh
npm start
npm test
npm run lint
npm run typecheck
```

## API Setup

Install command used for the API layer:

```sh
npm install axios @react-native-community/netinfo react-native-keychain
```

Axios is configured in `src/services/api/axiosClient.ts`. Set your backend URL
in `src/config/env.ts`:

```ts
export const API_BASE_URL = 'https://api.example.com';
```

API calls should stay in `src/services/api` and business workflows should stay
in feature services. Screens should call feature methods like `loginUser()`
instead of calling Axios directly.

```ts
import {loginUser} from '../features/auth/authService';

const user = await loginUser(username, password);
```

Request interceptors work like middleware before a request leaves the app:
network status is checked, the access token is loaded from Keychain, and the
Authorization header is attached when a token exists. Response interceptors
unwrap `response.data`, normalize errors, and clear stored tokens on 401 until
the refresh-token flow is added.

## Camera Capture Setup

Face image capture uses React Native Vision Camera:

```sh
npm install react-native-vision-camera
```

Native permissions are configured in:

- `android/app/src/main/AndroidManifest.xml`
- `ios/NetrakshAI/Info.plist`

For iOS, run pods after installing native camera dependencies:

```sh
cd ios
bundle exec pod install
cd ..
```

The reusable capture UI lives in `src/components/FaceCapturePanel.tsx`, with
capture logic in `src/hooks/useFaceCapture.ts`. Screens receive the temporary
image path through `onPhotoCaptured`.

## Local Database Setup

Offline storage uses SQLite through `@op-engineering/op-sqlite`:

```sh
npm install @op-engineering/op-sqlite
```

Database environment values live in `src/config/env.ts`, and the typed database
config lives in `src/config/databaseConfig.ts`.

Current local DB defaults:

```ts
export const DATABASE_PROVIDER = 'sqlite';
export const DATABASE_NAME = 'netraksh_ai.sqlite';
export const DATABASE_SCHEMA_VERSION = 1;
```

The scalable DB boundary is:

- `src/services/database/localDatabase.ts`: creates and initializes the DB.
- `src/services/database/sqliteDatabase.ts`: SQLite adapter implementation.
- `src/services/database/migrations.ts`: versioned schema migrations.
- `src/services/database/repositories`: table-specific query modules.
- `src/services/OfflineDatabaseService.ts`: app-facing auth log methods.
- `src/services/SecureStorageService.ts`: app-facing face template methods.

If the app moves to another DB later, add a new adapter that implements
`LocalDatabase` and switch `DATABASE_PROVIDER`.

## Folder Structure

- `src/app`: App entry point and navigation setup.
- `src/screens`: Placeholder UI screens for enrollment, authentication, logs, benchmarks, and home.
- `src/components`: Shared presentational components.
- `src/services`: Feature service boundaries for future implementation.
- `src/types`: Shared TypeScript domain types.
- `src/config`: App constants and threshold values.
- `src/utils`: Small reusable utilities.
- `docs`: Project documentation.
- `__tests__`: Jest tests for utilities and route definitions.

API layer files:

- `src/config/env.ts`: API base URL and timeout.
- `src/services/api/axiosClient.ts`: Axios instance and interceptors.
- `src/services/api/apiTypes.ts`: Shared API response types.
- `src/services/api/apiError.ts`: Normalized API errors.
- `src/services/api/authApi.ts`: Login API call.
- `src/services/api/syncApi.ts`: Offline auth log sync API call.
- `src/services/storage/secureStorage.ts`: Keychain token storage.
- `src/services/network/networkService.ts`: NetInfo online/offline helpers.
- `src/features/auth/authService.ts`: Login business logic.
- `src/features/auth/loginUsageExample.ts`: Sample screen-handler usage.

npm start -- --port 8082
npm run android -- --port 8082

For iOS -
cd "/Users/anjali21i/Documents/Project/Netraksh AI"
nvm use
npm install
bundle install
cd ios
bundle exec pod install
cd ..
npm run ios

React Native + TypeScript

•⁠ ⁠React Native Vision Camera for real-time camera feed
•⁠ ⁠MediaPipe Face Mesh / Face Detection for offline facial landmark tracking
•⁠ ⁠Blink Detection using Eye Aspect Ratio (EAR)
•⁠ ⁠Smile Detection using facial landmark movement
•⁠ ⁠Head Turn Detection (Left/Right) using face pose estimation
•⁠ ⁠Random Challenge Flow (Blink / Smile / Turn Head) to prevent spoofing
•⁠ ⁠Face Frame Validation (face centered, proper distance, eyes & mouth visible)
•⁠ ⁠Basic Anti-Spoofing checks to detect photo/screen attacks
•⁠ ⁠Fully Offline Processing with lightweight on-device model (<20 MB target)
Flow:
Open Camera → Detect Face → Random Liveness Challenge → Validate Blink/Smile/Head Turn → Liveness Pass/Fail → Continue to Face Authentication Flow
