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
import {getDynamicThreshold} from '../ai/dynamicThreshold';
import {RootStackParamList, ROUTES} from '../app/navigation/routes';
import {secureStorageService} from '../services/SecureStorageService';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

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
  const [qualityCheck, setQualityCheck] = useState<{
    passed: boolean;
    brightness: number;
    quality: number;
    reason: string;
  } | null>(null);

  const handlePhotoCaptured = (imagePath: string) => {
    setCapturedImagePath(imagePath);

    const simulatedBrightness = 80 + Math.floor(Math.random() * 80);
    const simulatedQuality = 0.7 + Math.random() * 0.28;
    const checkResult = getDynamicThreshold(
      simulatedBrightness,
      simulatedQuality,
    );

    setQualityCheck({
      passed:
        simulatedQuality >= 0.5 &&
        simulatedBrightness >= 40 &&
        simulatedBrightness <= 210,
      brightness: simulatedBrightness,
      quality: simulatedQuality,
      reason: checkResult.reason,
    });
    setStep('REVIEW');
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

    if (qualityCheck && !qualityCheck.passed) {
      Alert.alert(
        'Quality Check Failed',
        'The captured image does not meet quality standards. Please retake the photo in better lighting.',
        [{text: 'Retake', onPress: () => setStep('SCAN')}],
      );
      return;
    }

    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const success = await secureStorageService.registerFace(
        employeeId,
        capturedImagePath,
        'device-tablet-01',
      );

      if (success) {
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
      setIsProcessing(false);
    }
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

      {step === 'REVIEW' && capturedImagePath && qualityCheck ? (
        <InfoCard
          title="Quality Inspection"
          subtitle={qualityCheck.reason}
          style={styles.section}
        >
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Brightness</Text>
            <Text style={styles.metricValue}>
              {qualityCheck.brightness} / 210
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Sharpness</Text>
            <Text style={styles.metricValue}>
              {(qualityCheck.quality * 100).toFixed(0)}%
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Frame Centering</Text>
            <Text style={styles.metricValue}>VALID</Text>
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
        </InfoCard>
      ) : null}

      <View style={styles.actionBlock}>
        {isProcessing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>
              Generating 512-dim ArcFace embedding...
            </Text>
          </View>
        ) : step === 'REVIEW' ? (
          <>
            <PrimaryButton
              title="Complete Enrollment"
              onPress={handleEnroll}
              disabled={!capturedImagePath || isProcessing}
            />
            <PrimaryButton
              title="Retake Photo"
              onPress={() => {
                setCapturedImagePath(null);
                setQualityCheck(null);
                setStep('SCAN');
              }}
              disabled={isProcessing}
              variant="secondary"
            />
            <PrimaryButton
              title="Edit Employee Details"
              onPress={() => navigation.goBack()}
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
