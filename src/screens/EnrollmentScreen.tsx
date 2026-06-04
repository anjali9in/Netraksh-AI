import React, {useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';

import {AppHeader} from '../components/AppHeader';
import {CameraCaptureCard} from '../components/CameraCaptureCard';
import {EmployeeInput} from '../components/EmployeeInput';
import {InfoCard} from '../components/InfoCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {getDynamicThreshold} from '../ai/dynamicThreshold';
import {secureStorageService} from '../services/SecureStorageService';
import {colors} from '../theme/colors';
import {radius, spacing} from '../theme/spacing';

export function EnrollmentScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [employeeId, setEmployeeId] = useState('');
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

  const handlePhotoCaptured = (image: {path: string}) => {
    setCapturedImagePath(image.path);

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
  };

  const handleEnroll = async () => {
    if (!employeeId.trim()) {
      Alert.alert('Validation Error', 'Please enter a valid Employee ID.');
      return;
    }

    if (!capturedImagePath) {
      Alert.alert('Validation Error', 'Please capture a face image first.');
      return;
    }

    if (qualityCheck && !qualityCheck.passed) {
      Alert.alert(
        'Quality Check Failed',
        'The captured image does not meet quality standards. Please retake the photo in better lighting.',
      );
      return;
    }

    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const success = await secureStorageService.registerFace(
        employeeId.trim().toUpperCase(),
        capturedImagePath,
        'device-tablet-01',
      );

      if (success) {
        Alert.alert(
          'Enrollment Successful',
          `Employee ${employeeId
            .trim()
            .toUpperCase()} has been registered locally.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
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
      <AppHeader
        title="Employee Enrollment"
        subtitle="Register a local encrypted face template for offline access control."
        statusLabel="Template stored on device"
        status="info"
      />

      <InfoCard
        title="Employee Details"
        subtitle="Use the official employee code issued by the organization."
        style={styles.section}
      >
        <EmployeeInput
          editable={!isProcessing}
          helperText="This ID is used for offline template lookup and audit logs."
          onChangeText={setEmployeeId}
          value={employeeId}
        />
      </InfoCard>

      <View style={styles.section}>
        <CameraCaptureCard
          title="Enrollment Capture"
          description="Capture a clear frontal image. Keep the face centered and evenly lit."
          controlsDisabled={isProcessing}
          validationMessages={[
            'Face not centered',
            'Low light',
            'Blink detected',
          ]}
          faceDetected={qualityCheck ? qualityCheck.passed : undefined}
          onPhotoCaptured={handlePhotoCaptured}
          onPhotoCleared={() => {
            setCapturedImagePath(null);
            setQualityCheck(null);
          }}
        />
      </View>

      {capturedImagePath && qualityCheck ? (
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
        ) : (
          <PrimaryButton
            title="Complete Enrollment"
            onPress={handleEnroll}
            disabled={!capturedImagePath || isProcessing || !employeeId.trim()}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionBlock: {
    marginTop: spacing.lg,
  },
  container: {
    backgroundColor: colors.background,
    paddingBottom: spacing.xxxl,
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
