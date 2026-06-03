# PROJECT_OVERVIEW.md

# Project Overview: Netraksh AI

Netraksh AI is an offline-first mobile application designed for secure face-based authentication and attendance tracking in remote environments.

The project was created to address a common challenge in field operations: verifying personnel identity in areas where internet connectivity is unreliable or unavailable. Instead of relying on cloud-based services, Netraksh AI performs face recognition and liveness verification directly on the device.

This allows authentication to continue even when the device is completely offline. Attendance records are stored locally and automatically synchronized once internet connectivity becomes available.

**Project Status:** Active Development

---

## Problem Statement

Field personnel working on highways, construction sites, and remote infrastructure projects often operate in locations with poor network coverage.

Traditional attendance systems depend on continuous internet access, making them unreliable in these environments.

Netraksh AI addresses this problem by providing:

- Offline face-based authentication
- Liveness verification to prevent spoofing
- Secure local storage
- Automatic cloud synchronization when connectivity is restored

---

## Technology Stack

The project is built entirely using open-source technologies.

| Component          | Technology                 |
| ------------------ | -------------------------- |
| Mobile Application | React Native (TypeScript)  |
| Face Recognition   | ArcFace-MobileNetV2        |
| Face Detection     | Google ML Kit              |
| Camera Framework   | React Native Vision Camera |
| Liveness Detection | MediaPipe Face Mesh        |
| Local Database     | SQLite                     |
| Encryption         | AES-256                    |
| Cloud Sync         | AWS API Gateway + DynamoDB |

---

## Key Features

### Offline-First Operation

The application continues to function without internet connectivity. Records are stored locally and synchronized later when a connection becomes available.

### On-Device Face Recognition

Face recognition is performed entirely on the device without sending biometric data to external servers.

### Liveness Detection

The system verifies that a real person is present by asking the user to perform a random action such as:

- Blink
- Smile
- Turn their head

This helps prevent authentication using photographs, screenshots, or recorded videos.

### Secure Storage

Sensitive biometric information is encrypted before being stored locally.

### Cross-Platform Support

- Android 7.0+
- iOS 11.0+
- Minimum 3 GB RAM

---

## How Authentication Works

```text
Camera → Face Detection → Liveness Check → Face Recognition → Authentication Result
```

### Step 1: Face Detection

The camera identifies and tracks the user's face.

### Step 2: Liveness Verification

A random challenge is generated.

Examples:

- Blink
- Smile
- Turn Left
- Turn Right

The system tracks facial landmarks in real time to verify the action.

### Step 3: Face Recognition

Once liveness verification succeeds, the application generates a facial embedding and compares it with previously enrolled records stored locally.

### Step 4: Authentication

If the similarity score exceeds the configured threshold, the user is successfully authenticated.

---

## Why Netraksh AI?

Netraksh AI was designed with three goals in mind:

### Reliability

Works even in areas with little or no internet connectivity.

### Privacy

Biometric processing remains on the device.

### Accessibility

Runs on standard Android and iOS devices without requiring specialized hardware.

---

## Current Progress

### Completed

- Face Detection
- Face Recognition Pipeline
- Liveness Detection
- Offline Storage
- Cloud Synchronization Framework
- Automated Unit Testing

### Testing Status

- 6 Test Suites Passed
- 37 Tests Passed
- 0 Failures

---

## Future Roadmap

- Passive liveness detection
- Multi-face support
- Hardware acceleration using NNAPI and CoreML
- Administrative analytics dashboard
- Performance optimization for lower-end devices

---

## Summary

Netraksh AI is a lightweight, offline-first authentication solution designed for real-world field operations. By combining on-device face recognition, liveness verification, secure storage, and cloud synchronization, the system provides a practical and reliable method for identity verification in environments where connectivity cannot be guaranteed.
