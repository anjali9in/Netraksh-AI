import {useCallback, useEffect, useRef, useState} from 'react';
import {Linking} from 'react-native';
import {
  Camera,
  CameraRef,
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
  const device = useCameraDevice('front') ?? useCameraDevice('back');
  const {hasPermission, requestPermission, canRequestPermission, status} =
    useCameraPermission();
  const photoOutput = usePhotoOutput();

  const [capturedImage, setCapturedImage] = useState<CapturedFaceImage | null>(
    null,
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cameraRef = useRef<CameraRef>(null);
  const hasRequestedPermission = useRef(false);

  const requestCameraPermission = useCallback(async () => {
    setErrorMessage(null);
    const granted = await requestPermission();
    if (!granted) {
      setErrorMessage('Camera permission is required to capture a face image.');
    }
    return granted;
  }, [requestPermission]);

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
      const photo = await photoOutput.capturePhoto(
        {
          flashMode: 'off',
        },
        {},
      );

      const tempPath = await photo.saveToTemporaryFileAsync();
      photo.dispose();

      const image: CapturedFaceImage = {
        path: tempPath,
        uri: toFileUri(tempPath),
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
    requestCameraPermission,
    photoOutput,
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
    if (hasPermission || hasRequestedPermission.current) {
      return;
    }

    hasRequestedPermission.current = true;
    requestCameraPermission();
  }, [hasPermission, requestCameraPermission]);

  return {
    cameraRef,
    photoOutput,
    capturedImage,
    captureFaceImage,
    canUseMockCapture: __DEV__ && hasPermission && !device,
    device,
    errorMessage,
    hasPermission,
    canRequestPermission,
    permissionStatus: status,
    isCameraReady: hasPermission && Boolean(device),
    isCapturing,
    openCameraSettings,
    requestCameraPermission,
    retake,
    useMockCapture,
  };
}
