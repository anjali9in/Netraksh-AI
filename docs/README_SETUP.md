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
