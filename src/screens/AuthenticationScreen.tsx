import React, {useState} from 'react';
import {StyleSheet, Text, TextInput} from 'react-native';

import {FaceCapturePanel} from '../components/FaceCapturePanel';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';

export function AuthenticationScreen(): React.JSX.Element {
  const [employeeId, setEmployeeId] = useState('');
  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(
    null,
  );

  const handleAuthentication = (empId: string, imagePath: string | null) => {
    console.log('Continue authentication with Employee ID:', empId);
    console.log('Captured image path:', imagePath);
  };

  return (
    <ScreenContainer>
      <Text style={styles.placeholder}>
        Capture a live face image for offline authentication.
      </Text>
      <TextInput
        autoCapitalize="characters"
        onChangeText={setEmployeeId}
        placeholder="Employee ID"
        style={styles.input}
        value={employeeId}
      />
      <FaceCapturePanel
        title="Authentication Capture"
        description="Use the front camera to capture the person being verified."
        onPhotoCaptured={image => setCapturedImagePath(image.path)}
        onPhotoCleared={() => setCapturedImagePath(null)}
      />
      {capturedImagePath ? (
        <StatusBadge
          label="Face image captured for authentication"
          status="info"
        />
      ) : null}
      <PrimaryButton
        icon="shield"
        title="Continue Authentication"
        onPress={() => handleAuthentication(employeeId, capturedImagePath)}
        disabled={!capturedImagePath}
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
});
