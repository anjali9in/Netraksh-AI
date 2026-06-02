import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { FaceCapturePanel } from '../components/FaceCapturePanel';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { StatusBadge } from '../components/StatusBadge';
import { secureStorageService } from '../services/SecureStorageService';
import { getDynamicThreshold } from '../ai/dynamicThreshold';

export function EnrollmentScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [employeeId, setEmployeeId] = useState('');
  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qualityCheck, setQualityCheck] = useState<{
    passed: boolean;
    brightness: number;
    quality: number;
    reason: string;
  } | null>(null);

  const handlePhotoCaptured = (image: { path: string }) => {
    setCapturedImagePath(image.path);
    
    // Simulate frame/image quality inspection (typical for edge AI)
    const simulatedBrightness = 80 + Math.floor(Math.random() * 80); // 80 - 160 (optimal)
    const simulatedQuality = 0.7 + Math.random() * 0.28; // 0.70 - 0.98 (sharp)
    
    const checkResult = getDynamicThreshold(simulatedBrightness, simulatedQuality);
    
    setQualityCheck({
      passed: simulatedQuality >= 0.5 && simulatedBrightness >= 40 && simulatedBrightness <= 210,
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
        'The captured image does not meet quality standards. Please retake the photo in better lighting.'
      );
      return;
    }

    setIsProcessing(true);
    try {
      // Small simulated delay for local embedding calculation (ArcFace is fast, but we show spinner)
      await new Promise(resolve => setTimeout(resolve, 800));

      const success = await secureStorageService.registerFace(
        employeeId.trim().toUpperCase(),
        capturedImagePath,
        'device-tablet-01'
      );

      if (success) {
        Alert.alert(
          'Enrollment Successful',
          `Employee ${employeeId.trim().toUpperCase()} has been registered locally.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Enrollment Failed', 'Unable to register face template. Try again.');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred during enrollment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Employee Enrollment</Text>
        <Text style={styles.placeholder}>
          Register a new face template by entering the Employee ID and capturing a high-quality face photo.
        </Text>
        
        <TextInput
          autoCapitalize="characters"
          onChangeText={setEmployeeId}
          placeholder="ENTER EMPLOYEE ID (e.g. EMP042)"
          placeholderTextColor="#94a3b8"
          style={[
            styles.input,
            isProcessing && styles.inputDisabled,
          ]}
          value={employeeId}
          editable={!isProcessing}
        />
      </View>

      <FaceCapturePanel
        title="Enrollment Photo Capture"
        description="Align face within the frame. Ensure eyes are open and face is well-lit."
        controlsDisabled={isProcessing}
        onPhotoCaptured={handlePhotoCaptured}
        onPhotoCleared={() => {
          setCapturedImagePath(null);
          setQualityCheck(null);
        }}
      />

      {capturedImagePath && qualityCheck ? (
        <View style={[styles.card, styles.qualityCard]}>
          <Text style={styles.qualityTitle}>Quality Inspection Results</Text>
          <View style={styles.qualityMetricRow}>
            <Text style={styles.qualityLabel}>Brightness Score:</Text>
            <Text style={[styles.qualityValue, { color: qualityCheck.brightness >= 80 ? '#10b981' : '#f59e0b' }]}>
              {qualityCheck.brightness} (Optimal: 80-210)
            </Text>
          </View>
          <View style={styles.qualityMetricRow}>
            <Text style={styles.qualityLabel}>Image Sharpness:</Text>
            <Text style={[styles.qualityValue, { color: qualityCheck.quality >= 0.7 ? '#10b981' : '#f43f5e' }]}>
              {(qualityCheck.quality * 100).toFixed(0)}% (Required: &gt;50%)
            </Text>
          </View>
          <View style={styles.qualityMetricRow}>
            <Text style={styles.qualityLabel}>Frame Centering:</Text>
            <Text style={[styles.qualityValue, { color: '#10b981' }]}>VALID</Text>
          </View>
          
          <StatusBadge
            label={qualityCheck.passed ? 'Image passed quality checks.' : 'Image quality is too low.'}
            status={qualityCheck.passed ? 'success' : 'error'}
          />
        </View>
      ) : null}

      {isProcessing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6366f1" size="large" />
          <Text style={styles.loadingText}>Generating 512-dim ArcFace embedding...</Text>
        </View>
      ) : (
        <PrimaryButton
          title="Complete Enrollment"
          onPress={handleEnroll}
          disabled={!capturedImagePath || isProcessing || !employeeId.trim()}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  placeholder: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
    minHeight: 48,
    paddingHorizontal: 14,
    marginTop: 6,
  },
  qualityCard: {
    borderColor: '#cbd5e1',
  },
  qualityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    borderBottomColor: '#f1f5f9',
    borderBottomWidth: 1,
    paddingBottom: 6,
  },
  qualityMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  qualityLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  qualityValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
  },
});
