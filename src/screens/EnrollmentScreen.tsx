import React, {useState} from 'react';
import {StyleSheet, Text, TextInput} from 'react-native';

import {FaceCapturePanel} from '../components/FaceCapturePanel';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {validateEnrollmentCapture} from '../features/enrollment/enrollmentService';

export function EnrollmentScreen(): React.JSX.Element {
  const [employeeId, setEmployeeId] = useState('');
  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(
    null,
  );
  const [isValidatingEnrollment, setIsValidatingEnrollment] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleContinueEnrollment = async (empId: string, imagePath: string) => {
    setValidationError(null);
    setIsValidatingEnrollment(true);

    try {
      await validateEnrollmentCapture({
        employeeId: empId,
        imagePath,
      });
    } catch (error) {
      setValidationError(
        error instanceof Error
          ? error.message
          : 'Unable to validate enrollment capture.',
      );
    } finally {
      setIsValidatingEnrollment(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.placeholder}>
        Capture a clear face image for local enrollment.
      </Text>
      <TextInput
        autoCapitalize="characters"
        editable={!isValidatingEnrollment}
        onChangeText={setEmployeeId}
        placeholder="Employee ID"
        style={[
          styles.input,
          isValidatingEnrollment && styles.inputDisabled,
        ]}
        value={employeeId}
      />
      <FaceCapturePanel
        title="Enrollment Capture"
        description="Center the employee face in the frame before capturing."
        controlsDisabled={isValidatingEnrollment}
        onPhotoCaptured={image => setCapturedImagePath(image.path)}
        onPhotoCleared={() => {
          setCapturedImagePath(null);
          setValidationError(null);
        }}
      />
      {capturedImagePath ? (
        <StatusBadge label="Face image captured for enrollment" status="info" />
      ) : null}
      {isValidatingEnrollment ? (
        <StatusBadge label="Validating enrollment capture..." status="info" />
      ) : null}
      {validationError ? (
        <StatusBadge label={validationError} status="error" />
      ) : null}
      <PrimaryButton
        icon="check"
        loading={isValidatingEnrollment}
        title={isValidatingEnrollment ? 'Validating...' : 'Continue Enrollment'}
        onPress={() =>
          capturedImagePath
            ? handleContinueEnrollment(employeeId, capturedImagePath)
            : undefined
        }
        disabled={!capturedImagePath || isValidatingEnrollment}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  placeholder: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 23,
  },
  inputDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
  },
});
