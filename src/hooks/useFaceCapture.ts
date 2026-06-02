import {useCallback, useEffect, useRef, useState} from 'react';
import {Linking} from 'react-native';
import {
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
} from 'react-native-vision-camera';

import type {CapturedFaceImage} from '../types/CameraTypes';
import {toFileUri} from '../utils/fileUtils';

type UseFaceCaptureParams = {
  onPhotoCaptured?: (image: CapturedFaceImage) => void;
  onPhotoCleared?: () => void;
};

export function useFaceCapture({
  onPhotoCaptured,
  onPhotoCleared,
}: UseFaceCaptureParams = {}) {
  const frontDevice = useCameraDevice('front');
  const backDevice = useCameraDevice('back');
  const device = frontDevice ?? backDevice;
  const photoOutput = usePhotoOutput({
    quality: 0.9,
    qualityPrioritization: 'balanced',
  });
  const {canRequestPermission, hasPermission, requestPermission, status} =
    useCameraPermission();
  const [capturedImage, setCapturedImage] = useState<CapturedFaceImage | null>(
    null,
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasRequestedPermission = useRef(false);

  const requestCameraPermission = useCallback(async () => {
    setErrorMessage(null);

    if (!canRequestPermission) {
      setErrorMessage('Camera permission must be enabled from Settings.');
      return false;
    }

    const granted = await requestPermission();

    if (!granted) {
      setErrorMessage('Camera permission is required to capture a face image.');
    }

    return granted;
  }, [canRequestPermission, requestPermission]);

  const openCameraSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  const captureFaceImage = useCallback(async () => {
    setErrorMessage(null);

    if (!hasPermission) {
      const granted = await requestCameraPermission();

      if (!granted) {
        return;
      }
    }

    if (!device) {
      setErrorMessage('No camera found on this device.');
      return;
    }

    setIsCapturing(true);

    try {
      const photoFile = await photoOutput.capturePhotoToFile(
        {
          enableShutterSound: false,
          flashMode: 'off',
        },
        {},
      );

      const image: CapturedFaceImage = {
        path: photoFile.filePath,
        uri: toFileUri(photoFile.filePath),
        capturedAt: new Date().toISOString(),
        source: 'camera',
      };

      setCapturedImage(image);
      onPhotoCaptured?.(image);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to capture face image.',
      );
    } finally {
      setIsCapturing(false);
    }
  }, [
    device,
    hasPermission,
    onPhotoCaptured,
    photoOutput,
    requestCameraPermission,
  ]);

  const useMockCapture = useCallback(() => {
    const capturedAt = new Date().toISOString();
    const image: CapturedFaceImage = {
      path: `mock://face-capture/${capturedAt}`,
      uri: `mock://face-capture/${capturedAt}`,
      capturedAt,
      source: 'mock',
    };

    setErrorMessage(null);
    setCapturedImage(image);
    onPhotoCaptured?.(image);
  }, [onPhotoCaptured]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setErrorMessage(null);
    onPhotoCleared?.();
  }, [onPhotoCleared]);

  useEffect(() => {
    if (
      hasPermission ||
      !canRequestPermission ||
      hasRequestedPermission.current
    ) {
      return;
    }

    hasRequestedPermission.current = true;
    requestCameraPermission();
  }, [canRequestPermission, hasPermission, requestCameraPermission]);

  return {
    canRequestPermission,
    capturedImage,
    captureFaceImage,
    canUseMockCapture: __DEV__ && hasPermission && !device,
    device,
    errorMessage,
    hasPermission,
    isCameraReady: hasPermission && Boolean(device),
    isCapturing,
    openCameraSettings,
    permissionStatus: status,
    photoOutput,
    requestCameraPermission,
    retake,
    useMockCapture,
  };
}
