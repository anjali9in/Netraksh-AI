import {useIsFocused} from '@react-navigation/native';
import React from 'react';
import {AppState, Image, StyleSheet, Text, View} from 'react-native';
import {Camera} from 'react-native-vision-camera';

import {useFaceCapture} from '../hooks/useFaceCapture';
import type {CapturedFaceImage} from '../types/CameraTypes';
import {PrimaryButton} from './PrimaryButton';
import {StatusBadge} from './StatusBadge';

type FaceCapturePanelProps = {
  title: string;
  description: string;
  controlsDisabled?: boolean;
  onPhotoCaptured?: (image: CapturedFaceImage) => void;
  onPhotoCleared?: () => void;
};

export function FaceCapturePanel({
  title,
  description,
  controlsDisabled = false,
  onPhotoCaptured,
  onPhotoCleared,
}: FaceCapturePanelProps): React.JSX.Element {
  const isScreenFocused = useIsFocused();
  const [appState, setAppState] = React.useState(AppState.currentState);
  const {
    cameraRef,
    photoOutput,
    canRequestPermission,
    canUseMockCapture,
    capturedImage,
    captureFaceImage,
    device,
    errorMessage,
    hasPermission,
    isCameraReady,
    isCapturing,
    openCameraSettings,
    requestCameraPermission,
    retake,
    useMockCapture,
  } = useFaceCapture({onPhotoCaptured, onPhotoCleared});
  const isCameraActive =
    isScreenFocused && appState === 'active' && !controlsDisabled;

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);

    return () => subscription.remove();
  }, []);

  return (
    <View
      pointerEvents={controlsDisabled ? 'none' : 'auto'}
      style={styles.panel}
    >
      <View
        style={[
          styles.panelContent,
          controlsDisabled && styles.panelContentDisabled,
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.description, styles.headerDescription]}>
            {description}
          </Text>
        </View>

        <View style={[styles.previewFrame, styles.panelItem]}>
          {capturedImage?.source === 'mock' ? (
            <View style={styles.mockPreview}>
              <Text style={styles.emptyTitle}>Mock face image captured</Text>
              <Text style={styles.emptyText}>
                Simulator fallback saved a temporary mock image path.
              </Text>
            </View>
          ) : capturedImage ? (
            <Image
              resizeMode="cover"
              source={{uri: capturedImage.uri}}
              style={styles.preview}
            />
          ) : isCameraReady && device ? (
            <Camera
              ref={cameraRef}
              device={device}
              isActive={isCameraActive}
              outputs={[photoOutput]}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyTitle}>
                {hasPermission ? 'Camera unavailable' : 'Camera access needed'}
              </Text>
              <Text style={styles.emptyText}>
                {hasPermission
                  ? 'No camera was found on this device.'
                  : 'Allow camera access to capture a face image.'}
              </Text>
              {!hasPermission && canRequestPermission ? (
                <View style={styles.inlineAction}>
                  <PrimaryButton
                    icon="camera"
                    title="Allow Camera"
                    onPress={requestCameraPermission}
                    disabled={controlsDisabled}
                  />
                </View>
              ) : null}
              {!hasPermission && !canRequestPermission ? (
                <View style={styles.inlineAction}>
                  <PrimaryButton
                    icon="settings"
                    title="Open Settings"
                    onPress={openCameraSettings}
                    disabled={controlsDisabled}
                  />
                </View>
              ) : null}
              {canUseMockCapture ? (
                <View style={styles.inlineAction}>
                  <PrimaryButton
                    icon="camera"
                    title="Use Mock Capture"
                    onPress={useMockCapture}
                    disabled={controlsDisabled}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>

        {capturedImage ? (
          <View style={styles.panelItem}>
            <StatusBadge label="Temporary image path saved" status="success" />
          </View>
        ) : null}
        {errorMessage ? (
          <View style={styles.panelItem}>
            <StatusBadge label={errorMessage} status="error" />
          </View>
        ) : null}

        <View style={styles.panelItem}>
          {capturedImage ? (
            <PrimaryButton
              icon="refresh"
              title="Retake Photo"
              onPress={retake}
              disabled={controlsDisabled}
            />
          ) : hasPermission ? (
            <PrimaryButton
              icon="camera"
              title={isCapturing ? 'Capturing...' : 'Capture'}
              onPress={captureFaceImage}
              disabled={
                controlsDisabled ||
                isCapturing ||
                !isCameraReady ||
                !isCameraActive
              }
            />
          ) : null}
        </View>
      </View>
      {controlsDisabled ? (
        <View pointerEvents="none" style={styles.disabledOverlay} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  description: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(148, 163, 184, 0.28)',
    elevation: 10,
    zIndex: 10,
  },
  emptyPreview: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {},
  headerDescription: {
    marginTop: 6,
  },
  inlineAction: {
    marginTop: 10,
    minWidth: 180,
  },
  mockPreview: {
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    position: 'relative',
  },
  panelContent: {},
  panelContentDisabled: {
    opacity: 0.55,
  },
  panelItem: {
    marginTop: 14,
  },
  preview: {
    height: '100%',
    width: '100%',
  },
  previewFrame: {
    backgroundColor: '#0f172a',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    height: 360,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
});
