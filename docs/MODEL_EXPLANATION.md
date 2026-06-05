# MODEL_EXPLANATION.md

## Overview

Netraksh AI uses on-device machine learning to perform face recognition and liveness verification without requiring an active internet connection.

The system is designed for field environments where connectivity may be unreliable. All biometric processing takes place locally on the device, helping improve response times, reduce network dependency, and protect user privacy.

The AI pipeline consists of four major components:

- Face Detection
- Face Recognition
- Liveness Verification
- Adaptive Thresholding

Together, these components verify both a user's identity and physical presence before granting authentication.

---

## Face Recognition Model

### ArcFace-MobileNetV2

The face recognition engine is built using **ArcFace-MobileNetV2**.

This model was selected because it offers a strong balance between recognition accuracy, inference speed, and mobile-device compatibility.

### Model Specifications

| Feature                | Value               |
| ---------------------- | ------------------- |
| Model Architecture     | MobileFaceNet       |
| Model Size             | ~8 MB               |
| Embedding Length       | 512 Dimensions      |
| Deployment Format      | TFLite / ONNX       |
| Processing Location    | On-Device           |
| Average Inference Time | < 300 ms            |

### Why MobileFaceNet?

MobileFaceNet is a lightweight face recognition model that provides a good balance between accuracy and efficiency, making it suitable for mobile and edge devices.
Key advantages include:

- Fast execution on smartphones
- Small storage footprint
- Offline operation
- Efficient memory usage
- Suitable for real-time authentication

---

## Face Recognition Workflow

The face recognition process follows a simple pipeline:

```text
Camera Frame
      ↓
Face Detection
      ↓
Face Crop & Resize
      ↓
Embedding Generation
      ↓
Similarity Matching
      ↓
Authentication Result
```

### Step 1: Face Detection

The camera captures a frame and detects the user's face using Google ML Kit.

The detected face region is isolated from the background and prepared for further processing.

### Step 2: Face Preprocessing

To ensure consistency across different devices and lighting conditions, the detected face is:

- Cropped from the image
- Resized to 112 × 112 pixels
- Normalized before model inference

### Step 3: Embedding Generation

The processed image is passed through the ArcFace model.

The model generates a **512-dimensional face embedding**, which is a numerical representation of the user's facial features.

Rather than storing a photograph, the system stores this embedding for future comparisons.

### Step 4: Similarity Matching

During authentication, the newly generated embedding is compared with previously enrolled embeddings stored securely on the device.

A similarity score is calculated to determine whether the two embeddings belong to the same person.

---

## Similarity Calculation

Netraksh AI uses **Cosine Similarity** to compare facial embeddings.

\text{Cosine Similarity}=\frac{A\cdot B}{|A||B|}

Where:

- **A** = Current face embedding
- **B** = Stored face embedding

### Interpretation

| Similarity Score | Result                  |
| ---------------- | ----------------------- |
| High Score       | Likely Match            |
| Low Score        | Likely Different Person |

The application uses configurable thresholds to determine whether authentication should be accepted or rejected.

---

## Liveness Verification

Face recognition alone cannot prevent spoofing attempts using photographs, screenshots, or recorded videos.

To address this, Netraksh AI performs liveness verification before authentication.

### Supported Liveness Challenges

- Blink Detection
- Smile Detection
- Head Turn Verification

### Authentication Flow

```text
Face Detected
      ↓
Random Challenge Generated
      ↓
User Performs Action
      ↓
Challenge Validated
      ↓
Face Recognition
      ↓
Authentication Result
```

### How It Works

The system tracks facial landmarks in real time and verifies whether the requested action was completed naturally.

Only after successful liveness verification does the application proceed to face matching.

This additional layer helps reduce the risk of presentation attacks using static images or recorded media.

---

## Adaptive Thresholding

Environmental conditions can affect recognition quality.

Examples include:

- Poor lighting
- Motion blur
- Camera noise
- Partial shadows

To improve reliability, Netraksh AI dynamically adjusts verification thresholds based on image quality.

| Condition     | System Response                   |
| ------------- | --------------------------------- |
| Good Lighting | Standard Threshold                |
| Low Light     | Increased Verification Strictness |
| Motion Blur   | Higher Confidence Required        |
| Overexposure  | Additional Validation Applied     |

This helps maintain a balance between usability and security.

---

## Privacy & Security

Protecting biometric data is a core design principle of Netraksh AI.

### On-Device Processing

Face recognition and liveness verification are performed locally whenever possible.

### Encrypted Storage

Face embeddings are encrypted before being stored in the local SQLite database.

### No Raw Image Storage

Temporary images used during processing are discarded after authentication.

### Offline Operation

The system remains fully functional even when internet connectivity is unavailable.

---

## Testing & Validation

The AI pipeline is supported by automated testing to ensure reliability and consistent behavior.

### Current Testing Status

| Metric           | Result    |
| ---------------- | --------- |
| Test Suites      | 6 Passed  |
| Individual Tests | 37 Passed |
| Failed Tests     | 0         |

### Tested Components

- Face Recognition Logic
- Liveness Detection
- Database Operations
- Input Validation
- Device Services
- Routing Logic

Automated testing helps ensure that new changes do not affect core authentication functionality.

---

## Future Improvements

Planned enhancements include:

- Passive liveness detection
- Multi-face recognition support
- Hardware acceleration using NNAPI and CoreML
- Faster inference on low-end devices
- Enhanced anti-spoofing techniques
- Expanded test coverage

---

## Conclusion

Netraksh AI combines face recognition, liveness verification, encrypted local storage, and offline-first operation into a single mobile authentication platform.

By processing biometric information directly on the device, the system provides a practical solution for identity verification in environments where reliability, privacy, and connectivity are critical considerations.
