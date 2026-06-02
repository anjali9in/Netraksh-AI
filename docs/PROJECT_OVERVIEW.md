# Project Overview: Netraksh AI

Netraksh AI is an offline-first mobile app for facial recognition and liveness verification. We're building this to securely authenticate field personnel in remote areas where internet connectivity drops to zero. 

**Current Status:** Active Development 

## How We're Building It (The Tech Stack)
We kept the stack 100% open-source and optimized it to run smoothly on standard, mid-range phones. 

* **Frontend:** React Native (TypeScript)
* **AI & Offline Inference:** TensorFlow Lite / ONNX. We are using **MobileFaceNet** for the face embeddings because it is incredibly lightweight.
* **Vision & Tracking:** React Native Vision Camera combined with MediaPipe Face Mesh.
* **Offline Storage:** SQLite (for attendance logs) and Encrypted Storage (to lock down local biometric data).
* **The Big Constraint:** The entire AI model fits under **20 MB** and processes the face match in under **1 second**.

## The "Liveness" Anti-Spoofing Flow
We can't just let someone hold up a photo or an iPad to trick the system. To prevent attendance fraud, we built a randomized, completely offline anti-spoofing mechanism.

Here is the exact flow when a user tries to authenticate:

1. **Frame Check:** The camera opens and ensures the face is centered, at the right distance, and clearly visible.
2. **The Challenge:** The system randomly asks the user to do one of three things: **Blink**, **Smile**, or **Turn their head**.
3. **Validation:** We use MediaPipe to track facial landmarks (like calculating the Eye Aspect Ratio for a blink) to verify the user actually completed the challenge in real-time.
4. **The Match:** Once we verify it's a real, living person, the app proceeds to authenticate their face against the encrypted local database.

All of this happens directly on the device—no cloud required.