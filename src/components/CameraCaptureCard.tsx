import {useIsFocused} from '@react-navigation/native';
import React from 'react';
import {AppState, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {Camera} from 'react-native-vision-camera';

import {useFaceCapture} from '../hooks/useFaceCapture';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';
import type {CapturedFaceImage} from '../types/CameraTypes';
import {PrimaryButton} from './PrimaryButton';
import {StatusBadge} from './StatusBadge';
import {ButtonIcon} from './icons/ButtonIcon';

type CameraCaptureCardProps = {
  title: string;
  description: string;
  controlsDisabled?: boolean;
  validationMessages?: string[];
  onPhotoCaptured?: (image: CapturedFaceImage) => void;
  onPhotoCleared?: () => void;
};

const DEFAULT_MESSAGES = ['Center face in frame', 'Blink check ready'];

export function CameraCaptureCard({
  title,
  description,
  controlsDisabled = false,
  validationMessages = DEFAULT_MESSAGES,
  onPhotoCaptured,
  onPhotoCleared,
}: CameraCaptureCardProps): React.JSX.Element {
  const isScreenFocused = useIsFocused();
  const [appState, setAppState] = React.useState(AppState.currentState);
  const {
    cameraRef,
    canRequestPermission,
    canUseMockCapture,
    capturedImage,
    captureFaceImage,
    device,
    devicePosition,
    errorMessage,
    hasPermission,
    isCameraReady,
    isCapturing,
    openCameraSettings,
    requestCameraPermission,
    retake,
    useMockCapture,
    canSwitchCamera,
    switchCamera,
  } = useFaceCapture({onPhotoCaptured, onPhotoCleared});
  const isCameraActive =
    isScreenFocused && appState === 'active' && !controlsDisabled;

  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);

    return () => subscription.remove();
  }, []);

  const showCaptureButton = hasPermission && !capturedImage;

  return (
    <View
      pointerEvents={controlsDisabled ? 'none' : 'auto'}
      style={styles.card}
    >
      <View style={controlsDisabled && styles.cardDisabled}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>SECURE CAMERA</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <StatusBadge
            compact
            label={capturedImage ? 'Captured' : 'Live'}
            status={capturedImage ? 'success' : 'info'}
          />
        </View>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.previewFrame}>
          {capturedImage?.source === 'mock' ? (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyTitle}>Mock face image captured</Text>
              <Text style={styles.emptyText}>
                Simulator fallback saved a temporary image path.
              </Text>
            </View>
          ) : capturedImage ? (
            <Image
              resizeMode="contain"
              source={{uri: capturedImage.uri}}
              style={[
                styles.preview,
                capturedImage.displayRotationDegrees
                  ? {
                      transform: [
                        {
                          rotate: `${capturedImage.displayRotationDegrees}deg`,
                        },
                      ],
                    }
                  : null,
              ]}
            />
          ) : isCameraReady && device ? (
            <Camera
              key={device.id}
              ref={cameraRef}
              device={device}
              isActive={isCameraActive}
              orientation="portrait"
              photo={true}
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
                    variant="secondary"
                  />
                </View>
              ) : null}
            </View>
          )}

          {!capturedImage && hasPermission && device ? (
            <View style={styles.cameraSwitchContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${devicePosition === 'front' ? 'back' : 'front'} camera`}
                disabled={!canSwitchCamera}
                onPress={switchCamera}
                style={[
                  styles.cameraSwitchButton,
                  !canSwitchCamera && styles.cameraSwitchButtonDisabled,
                ]}
              >
                <ButtonIcon name="cameraSwitch" color="#ffffff" size={22} />
                <Text style={styles.cameraSwitchLabel}>
                  {devicePosition === 'front' ? 'Back' : 'Front'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View pointerEvents="none" style={styles.cameraOverlay}>
            <View style={styles.guideFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.overlayInstruction}>
              Align face inside frame
            </Text>
          </View>
        </View>

        <View style={styles.validationList}>
          {validationMessages.map(message => (
            <View key={message} style={styles.validationItem}>
              <View style={styles.validationDot} />
              <Text style={styles.validationText}>{message}</Text>
            </View>
          ))}
        </View>

        {capturedImage ? (
          <View style={styles.statusBlock}>
            <StatusBadge
              label="Temporary encrypted path staged"
              status="success"
            />
          </View>
        ) : null}
        {errorMessage ? (
          <View style={styles.statusBlock}>
            <StatusBadge label={errorMessage} status="error" />
          </View>
        ) : null}

        <View style={styles.actions}>
          {capturedImage ? (
            <PrimaryButton
              icon="refresh"
              title="Retake"
              onPress={retake}
              disabled={controlsDisabled}
              variant="secondary"
            />
          ) : null}
          {showCaptureButton ? (
            <PrimaryButton
              icon="camera"
              title={isCapturing ? 'Capturing...' : 'Capture Face'}
              onPress={captureFaceImage}
              disabled={
                controlsDisabled ||
                isCapturing ||
                !isCameraReady ||
                !isCameraActive
              }
              loading={isCapturing}
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
  actions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.58,
  },
  corner: {
    borderColor: colors.surface,
    height: 34,
    position: 'absolute',
    width: 34,
  },
  cornerBottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    bottom: 0,
    left: 0,
  },
  cornerBottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    bottom: 0,
    right: 0,
  },
  cornerTopLeft: {
    borderLeftWidth: 3,
    borderTopWidth: 3,
    left: 0,
    top: 0,
  },
  cornerTopRight: {
    borderRightWidth: 3,
    borderTopWidth: 3,
    right: 0,
    top: 0,
  },
  description: {
    color: colors.textSubtle,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(148, 163, 184, 0.24)',
    borderRadius: radius.lg,
    elevation: 10,
    zIndex: 10,
  },
  emptyPreview: {
    alignItems: 'center',
    backgroundColor: colors.cameraBg,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  emptyTitle: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  guideFrame: {
    borderColor: 'rgba(255,255,255,0.38)',
    borderRadius: radius.xl,
    borderWidth: 1,
    height: '58%',
    maxHeight: 250,
    maxWidth: 220,
    minHeight: 190,
    minWidth: 166,
    position: 'relative',
    width: '56%',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineAction: {
    marginTop: spacing.md,
    minWidth: 180,
  },
  overlayInstruction: {
    backgroundColor: 'rgba(8, 17, 31, 0.72)',
    borderRadius: radius.round,
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  preview: {
    height: '100%',
    width: '100%',
  },
  previewFrame: {
    backgroundColor: colors.cameraBg,
    borderColor: colors.primaryDark,
    borderRadius: radius.xl,
    borderWidth: 1,
    height: 360,
    marginTop: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  statusBlock: {
    marginTop: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  validationDot: {
    backgroundColor: colors.warning,
    borderRadius: 4,
    height: 8,
    marginRight: spacing.sm,
    width: 8,
  },
  validationItem: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    marginRight: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  validationList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  validationText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  cameraSwitchContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 20,
    elevation: 20,
  },
  cameraSwitchButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 24,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cameraSwitchButtonDisabled: {
    opacity: 0.45,
  },
  cameraSwitchLabel: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
});
