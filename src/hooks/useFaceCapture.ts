import {useCallback, useEffect, useRef, useState} from 'react';
import {Linking} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';

import type {CapturedFaceImage} from '../types/CameraTypes';
import {normalizeCapturedPhoto} from '../utils/normalizeCapturedPhoto';

type CameraPermissionStatus =
  | 'not-determined'
  | 'denied'
  | 'restricted'
  | 'granted';

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

  const [status, setStatus] =
    useState<CameraPermissionStatus>('not-determined');
  const hasPermission = status === 'granted';
  const canRequestPermission = status === 'not-determined';

  const [capturedImage, setCapturedImage] = useState<CapturedFaceImage | null>(
    null,
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cameraRef = useRef<Camera>(null);
  const hasRequestedPermission = useRef(false);

  useEffect(() => {
    setStatus(Camera.getCameraPermissionStatus() as CameraPermissionStatus);
  }, []);

  const requestCameraPermission = useCallback(async () => {
    setErrorMessage(null);

    if (!canRequestPermission) {
      setErrorMessage('Camera permission must be enabled from Settings.');
      return false;
    }

    const result = await Camera.requestCameraPermission();
    const granted = result === 'granted';
    setStatus(result as CameraPermissionStatus);

    if (!granted) {
      setErrorMessage('Camera permission is required to capture a face image.');
    }

    return granted;
  }, [canRequestPermission]);

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

    if (!cameraRef.current) {
      setErrorMessage('Camera is not ready.');
      return;
    }

    setIsCapturing(true);

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        qualityPrioritization: 'quality',
        enableAutoStabilization: true,
        enablePrecapture: true,
      });

      const upright = await normalizeCapturedPhoto(
        photo.path,
        photo.width,
        photo.height,
        photo.orientation,
        {isFrontCamera: device.position === 'front'},
      );

      const image: CapturedFaceImage = {
        path: upright.path,
        uri: upright.uri,
        capturedAt: new Date().toISOString(),
        source: 'camera',
        width: upright.width,
        height: upright.height,
        orientation: 'portrait',
        isMirrored: photo.isMirrored,
        metadata: {
          brightnessValue: photo.metadata?.['{Exif}']?.BrightnessValue,
          exposureTime: photo.metadata?.['{Exif}']?.ExposureTime,
          isoSpeedRatings: photo.metadata?.['{Exif}']?.ISOSpeedRatings,
          subjectArea: photo.metadata?.['{Exif}']?.SubjectArea,
          flash: photo.metadata?.['{Exif}']?.Flash,
        },
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
  }, [device, hasPermission, onPhotoCaptured, requestCameraPermission]);

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
    cameraRef,
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
    requestCameraPermission,
    retake,
    useMockCapture,
  };
}
