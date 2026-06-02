# Architecture

The project uses a layered React Native structure so future offline biometric features can be added without placing business logic inside UI components.

## Project Structure

Based on the repository, the root directories and configuration files are organized as follows:

*   **`.bundle/`**:
    *   `config`
*   **`android/`**: 
    *   `app`, `gradle`, `build.gradle`, `gradle.properties`, `gradlew`, `gradlew.bat`, `settings.gradle`
*   **`docs/`**: 
    *   `ARCHITECTURE.md`, `BENCHMARKS.md`, `MODEL_EXPLANATION.md`, `NEXT_STEPS.md`, `PRESENTATION_OUTLINE.md`, `PROJECT_OVERVIEW.md`, `README_SETUP.md`, `TESTING_REPORT.md`
*   **`ios/`**: 
    *   `NetrakshAI`, `NetrakshAI.xcodeproj`, `NetrakshAI.xcworkspace`, `.xcode.env`, `Podfile`, `Podfile.lock`
*   **`resources/images/`**: 
    *   `logo_with_name.png`, `logo.png`
*   **Root Configuration Files**: 
    *   `.eslintrc.js`, `.gitignore`, `.nvmrc`, `.prettierrc`, `.watchmanconfig`, `app.json`, `babel.config.js`, `Gemfile`, `index.js`, `jest.setup.ts`, `metro.config.js`, `package-lock.json`, `package.json`, `tsconfig.json`

## `src` Directory Breakdown

*   **`src/screens`**: Own screen-level layout and navigation actions. They should call services or hooks when real behavior is added.
*   **`src/components`**: Reusable UI building blocks. They should remain generic and avoid domain-specific side effects.
*   **`src/services`**: Define the boundaries for facial detection, embedding generation, liveness verification, matching, secure storage, offline database access, and sync. Most service methods are placeholders in this step.
*   **`src/config`**: Centralizes app constants, model version placeholders, demo flags, and authentication thresholds.
*   **`src/types`**: Define the shared domain contracts used across services and future screens.
*   **`src/utils`**: Provide small pure helpers such as validation and timestamp generation.