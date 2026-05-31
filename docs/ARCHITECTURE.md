# Architecture

The project uses a layered React Native structure so future offline biometric features can be added without placing business logic inside UI components.

## UI Screens

Screens in `src/screens` own screen-level layout and navigation actions. They should call services or hooks when real behavior is added.

## Components

Components in `src/components` are reusable UI building blocks. They should remain generic and avoid domain-specific side effects.

## Services

Services in `src/services` define the boundaries for facial detection, embedding generation, liveness verification, matching, secure storage, offline database access, and sync. Most service methods are placeholders in this step.

## Config

Configuration in `src/config` centralizes app constants, model version placeholders, demo flags, and authentication thresholds.

## Types

Types in `src/types` define the shared domain contracts used across services and future screens.

## Utils

Utilities in `src/utils` provide small pure helpers such as validation and timestamp generation.
