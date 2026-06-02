import React, {useState} from 'react';
import {StyleSheet, Text, TextInput} from 'react-native';

import {FaceCapturePanel} from '../components/FaceCapturePanel';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {validateAuthenticationCapture} from '../features/authentication/authenticationService';

export function AuthenticationScreen(): React.JSX.Element {
  const [employeeId, setEmployeeId] = useState('');
  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(
    null,
  );
  const [isValidatingAuthentication, setIsValidatingAuthentication] =
    useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAuthentication = async (empId: string, imagePath: string) => {
    setValidationError(null);
    setIsValidatingAuthentication(true);

    try {
      await validateAuthenticationCapture({
        employeeId: empId,
        imagePath,
      });
    } catch (error) {
      setValidationError(
        error instanceof Error
          ? error.message
          : 'Unable to validate authentication capture.',
      );
    } finally {
      setIsValidatingAuthentication(false);
    }
  };

  return (
    <ScreenContainer>
      <Text style={styles.placeholder}>
        Capture a live face image for offline authentication.
      </Text>
      <TextInput
        autoCapitalize="characters"
        editable={!isValidatingAuthentication}
        onChangeText={setEmployeeId}
        placeholder="Employee ID"
        style={[
          styles.input,
          isValidatingAuthentication && styles.inputDisabled,
        ]}
        value={employeeId}
      />
      <FaceCapturePanel
        title="Authentication Capture"
        description="Use the front camera to capture the person being verified."
        controlsDisabled={isValidatingAuthentication}
        onPhotoCaptured={image => setCapturedImagePath(image.path)}
        onPhotoCleared={() => {
          setCapturedImagePath(null);
          setValidationError(null);
        }}
      />
      {capturedImagePath ? (
        <StatusBadge
          label="Face image captured for authentication"
          status="info"
        />
      ) : null}
      {isValidatingAuthentication ? (
        <StatusBadge
          label="Validating authentication capture..."
          status="info"
        />
      ) : null}
      {validationError ? (
        <StatusBadge label={validationError} status="error" />
      ) : null}
      <PrimaryButton
        icon="shield"
        loading={isValidatingAuthentication}
        title={
          isValidatingAuthentication
            ? 'Validating...'
            : 'Continue Authentication'
        }
        onPress={() =>
          capturedImagePath
            ? handleAuthentication(employeeId, capturedImagePath)
            : undefined
        }
        disabled={!capturedImagePath || isValidatingAuthentication}
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
  inputDisabled: {
    backgroundColor: '#e2e8f0',
    color: '#64748b',
  },
  placeholder: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 23,
  },
});
