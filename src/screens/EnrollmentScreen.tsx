import React, {useState} from 'react';
import {StyleSheet, Text, TextInput} from 'react-native';

import {FaceCapturePanel} from '../components/FaceCapturePanel';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';

export function EnrollmentScreen(): React.JSX.Element {
  const [employeeId, setEmployeeId] = useState('');
  const [capturedImagePath, setCapturedImagePath] = useState<string | null>(
    null,
  );

  return (
    <ScreenContainer>
      <Text style={styles.placeholder}>
        Capture a clear face image for local enrollment.
      </Text>
      <TextInput
        autoCapitalize="characters"
        onChangeText={setEmployeeId}
        placeholder="Employee ID"
        style={styles.input}
        value={employeeId}
      />
      <FaceCapturePanel
        title="Enrollment Capture"
        description="Center the employee face in the frame before capturing."
        onPhotoCaptured={image => setCapturedImagePath(image.path)}
      />
      {capturedImagePath ? (
        <StatusBadge label="Face image captured for enrollment" status="info" />
      ) : null}
      <PrimaryButton
        title="Continue Enrollment"
        onPress={() => {}}
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
