import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {Camera} from 'react-native-vision-camera';

import {useFaceCapture} from '../hooks/useFaceCapture';
import type {CapturedFaceImage} from '../types/CameraTypes';
import {PrimaryButton} from './PrimaryButton';
import {StatusBadge} from './StatusBadge';

type FaceCapturePanelProps = {
  title: string;
  description: string;
  onPhotoCaptured?: (image: CapturedFaceImage) => void;
};

export function FaceCapturePanel({
  title,
  description,
  onPhotoCaptured,
}: FaceCapturePanelProps): React.JSX.Element {
  const {
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
    photoOutput,
    requestCameraPermission,
    retake,
    useMockCapture,
  } = useFaceCapture({onPhotoCaptured});

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.previewFrame}>
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
            device={device}
            isActive
            outputs={[photoOutput]}
            resizeMode="cover"
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
                />
              </View>
            ) : null}
            {!hasPermission && !canRequestPermission ? (
              <View style={styles.inlineAction}>
                <PrimaryButton
                  icon="settings"
                  title="Open Settings"
                  onPress={openCameraSettings}
                />
              </View>
            ) : null}
            {canUseMockCapture ? (
              <View style={styles.inlineAction}>
                <PrimaryButton
                  icon="camera"
                  title="Use Mock Capture"
                  onPress={useMockCapture}
                />
              </View>
            ) : null}
          </View>
        )}
      </View>

      {capturedImage ? (
        <StatusBadge label="Temporary image path saved" status="success" />
      ) : null}
      {errorMessage ? (
        <StatusBadge label={errorMessage} status="error" />
      ) : null}

      {capturedImage ? (
        <PrimaryButton icon="refresh" title="Retake Photo" onPress={retake} />
      ) : hasPermission ? (
        <PrimaryButton
          icon="camera"
          title={isCapturing ? 'Capturing...' : 'Capture'}
          onPress={captureFaceImage}
          disabled={isCapturing || !isCameraReady}
        />
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
  emptyPreview: {
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    flex: 1,
    gap: 8,
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
  header: {
    gap: 6,
  },
  inlineAction: {
    marginTop: 10,
    minWidth: 180,
  },
  mockPreview: {
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 20,
  },
  panel: {
    gap: 14,
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
    width: '100%',
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
});
