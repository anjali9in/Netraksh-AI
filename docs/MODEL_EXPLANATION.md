# AI Model Explanation

## Overview

This document describes the AI models used for:

- Face Detection
- Face Recognition
- Liveness Detection

## Status

Phase 1 of the offline face recognition module has been tested and verified (15/15 unit tests passed). Integration with the React Native UI is pending.

---

## Face Detection

- **Framework:** MediaPipe Face Detection
- **Purpose:** Fast, offline facial landmark tracking to locate the face within the camera feed.
- **Validation:** Includes Face Frame Validation to ensure the face is centered, at the proper distance, and that the eyes and mouth are clearly visible before passing the frame to the recognition model.

## Face Recognition

- **Framework:** TensorFlow Lite / ONNX Runtime
- **Model Architecture:** MobileFaceNet (MobileNet-based lightweight model)
- **Embedding Details:** Generates 128D, L2 Normalized face embeddings.
- **Matching Logic:** Uses Cosine Similarity for the matching pipeline.
- **Adaptability:** Implements Dynamic Thresholding to handle diverse lighting conditions (Low Light / Harsh Sun / Shadow).
- **Constraints:** Completely on-device inference (no internet required), strictly keeping the model footprint under 20 MB and processing under 1 second[cite: 1].

## Liveness Detection

- **Camera Integration:** React Native Vision Camera for high-performance, real-time camera capture.
- **Tracking Tool:** MediaPipe Face Mesh for granular offline facial landmark tracking and pose estimation.
- **Anti-Spoofing Mechanism:** A Random Challenge Flow is utilized to prevent spoofing via photographs or screens[cite: 1]. The challenges include:
  - **Blink Detection:** Measured using the Eye Aspect Ratio (EAR).
  - **Smile Detection:** Measured using facial landmark movement around the mouth[cite: 1].
  - **Head Turn Detection (Left/Right):** Measured using face pose estimation[cite: 1].