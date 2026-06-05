import React, {useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {RouteProp} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {InfoCard} from '../components/InfoCard';
import {LiveScannerPanel} from '../components/LiveScannerPanel';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {
  analyzeEnrollmentImageQuality,
  type EnrollmentQualityResult,
} from '../ai/enrollmentQuality';
import {RootStackParamList, ROUTES} from '../app/navigation/routes';
import {secureStorageService} from '../services/SecureStorageService';
import {deviceInfoService} from '../services/device/deviceInfo';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';
import {deleteTemporaryImage} from '../utils/fileUtils';

type EnrollmentCaptureRoute = RouteProp<
  RootStackParamList,
  typeof ROUTES.ENROLLMENT_CAPTURE
>;

type EnrollmentCaptureNavigation = NativeStackNavigationProp<
  RootStackParamList,
  typeof ROUTES.ENROLLMENT_CAPTURE
>;

type CaptureStep = 'SCAN' | 'REVIEW';

export function EnrollmentCaptureScreen(): React.JSX.Element {
  const navigation = useNavigation<EnrollmentCaptureNavigation>();
  const route = useRoute<EnrollmentCaptureRoute>();
  const {employeeId, fullName, contact, email} = route.params;

  const [step, setStep] = useState<CaptureStep>('SCAN');
  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(
    null,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInspectingQuality, setIsInspectingQuality] = useState(false);
  const [qualityCheck, setQualityCheck] =
    useState<EnrollmentQualityResult | null>(null);

  const handlePhotoCaptured = async (imagePath: string) => {
    if (capturedImagePath && capturedImagePath !== imagePath) {
      await deleteTemporaryImage(capturedImagePath);
    }

    setCapturedImagePath(imagePath);
    setQualityCheck(null);
    setStep('REVIEW');
    setIsInspectingQuality(true);

    try {
      const result = await analyzeEnrollmentImageQuality(imagePath);
      setQualityCheck(result);
    } catch (error) {
      setQualityCheck({
        passed: false,
        brightness: 0,
        sharpness: 0,
        exposure: 0,
        overallQuality: 0,
        blurVariance: 0,
        underexposedRatio: 0,
        overexposedRatio: 0,
        reason:
          error instanceof Error
            ? error.message
            : 'Unable to inspect the captured image. Retake the photo.',
      });
    } finally {
      setIsInspectingQuality(false);
    }
  };

  const handleScanFailed = (reason: string) => {
    Alert.alert('Face Capture Failed', reason, [
      {text: 'Try Again', onPress: () => setStep('SCAN')},
      {text: 'Edit Details', onPress: () => navigation.goBack()},
    ]);
  };

  const handleEnroll = async () => {
    if (!capturedImagePath) {
      Alert.alert('Validation Error', 'Please capture a face image first.');
      return;
    }

    if (isInspectingQuality || !qualityCheck) {
      Alert.alert(
        'Quality Check In Progress',
        'Wait for the capture quality inspection to finish.',
      );
      return;
    }

    if (!qualityCheck.passed) {
      Alert.alert(
        'Quality Check Failed',
        qualityCheck.reason,
        [{text: 'Retake', onPress: () => void handleRetake()}],
      );
      return;
    }

    setIsProcessing(true);
    let enrollmentSucceeded = false;

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const deviceId = await deviceInfoService.getDeviceId();

      const success = await secureStorageService.registerFace(
        employeeId,
        capturedImagePath,
        deviceId,
      );

      if (success) {
        enrollmentSucceeded = true;
        Alert.alert(
          'Enrollment Successful',
          `${fullName} (${employeeId}) has been registered locally.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate(ROUTES.HOME),
            },
          ],
        );
      } else {
        Alert.alert(
          'Enrollment Failed',
          'Unable to register face template. Try again.',
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'An error occurred during enrollment.',
      );
    } finally {
      await deleteTemporaryImage(capturedImagePath);
      setIsProcessing(false);

      if (!enrollmentSucceeded) {
        setCapturedImagePath(null);
        setQualityCheck(null);
        setStep('SCAN');
      }
    }
  };

  const handleRetake = async () => {
    await deleteTemporaryImage(capturedImagePath);
    setCapturedImagePath(null);
    setQualityCheck(null);
    setStep('SCAN');
  };

  const handleEditDetails = async () => {
    await deleteTemporaryImage(capturedImagePath);
    navigation.goBack();
  };

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <InfoCard title="Enrolling" style={styles.section}>
        <DetailRow label="Name" value={fullName} />
        <DetailRow label="Employee ID" value={employeeId} />
        <DetailRow label="Contact" value={contact} />
        <DetailRow label="Email" value={email} />
      </InfoCard>

      {step === 'SCAN' ? (
        <View style={styles.section}>
          <LiveScannerPanel
            employeeId={employeeId}
            scanMode="enrollment"
            onLivenessComplete={handlePhotoCaptured}
            onLivenessFailed={handleScanFailed}
            onCancel={() => navigation.goBack()}
          />
        </View>
      ) : null}

      {step === 'REVIEW' && capturedImagePath ? (
        <InfoCard
          title="Quality Inspection"
          subtitle={
            isInspectingQuality
              ? 'Analyzing brightness, blur, and exposure...'
              : qualityCheck?.reason
          }
          style={styles.section}
        >
          {isInspectingQuality || !qualityCheck ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.inlineLoadingText}>Inspecting capture...</Text>
            </View>
          ) : (
            <>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Brightness</Text>
                <Text style={styles.metricValue}>
                  {qualityCheck.brightness} / 255
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Sharpness</Text>
                <Text style={styles.metricValue}>
                  {(qualityCheck.sharpness * 100).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Exposure</Text>
                <Text style={styles.metricValue}>
                  {(qualityCheck.exposure * 100).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Overall Quality</Text>
                <Text style={styles.metricValue}>
                  {(qualityCheck.overallQuality * 100).toFixed(0)}%
                </Text>
              </View>
              <View style={styles.qualityStatus}>
                <StatusBadge
                  label={
                    qualityCheck.passed
                      ? 'Image passed quality checks'
                      : 'Image quality is too low'
                  }
                  status={qualityCheck.passed ? 'success' : 'error'}
                />
              </View>
            </>
          )}
        </InfoCard>
      ) : null}

      <View style={styles.actionBlock}>
        {isProcessing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>
              Generating 128-dim MobileFaceNet embedding...
            </Text>
          </View>
        ) : step === 'REVIEW' ? (
          <>
            <PrimaryButton
              title="Complete Enrollment"
              onPress={handleEnroll}
              disabled={!capturedImagePath || isProcessing || isInspectingQuality}
            />
            <PrimaryButton
              title="Retake Photo"
              onPress={() => void handleRetake()}
              disabled={isProcessing}
              variant="secondary"
            />
            <PrimaryButton
              title="Edit Employee Details"
              onPress={() => void handleEditDetails()}
              disabled={isProcessing}
              variant="secondary"
            />
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionBlock: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  container: {
    backgroundColor: colors.background,
    paddingBottom: spacing.xxxl,
  },
  detailLabel: {
    color: colors.textSubtle,
    flex: 0.38,
    fontSize: 13,
    fontWeight: '800',
  },
  detailRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  detailValue: {
    color: colors.text,
    flex: 0.62,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  inlineLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  inlineLoadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: '800',
  },
  metricRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  qualityStatus: {
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
});
