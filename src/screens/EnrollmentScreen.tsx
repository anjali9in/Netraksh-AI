import React, {useState} from 'react';
import {Alert, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {EmployeeInput} from '../components/EmployeeInput';
import {InfoCard} from '../components/InfoCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {RootStackParamList, ROUTES} from '../app/navigation/routes';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';

type EnrollmentNavigation = NativeStackNavigationProp<
  RootStackParamList,
  typeof ROUTES.ENROLLMENT
>;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function EnrollmentScreen(): React.JSX.Element {
  const navigation = useNavigation<EnrollmentNavigation>();
  const [fullName, setFullName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');

  const handleContinue = () => {
    const trimmedId = employeeId.trim();
    const trimmedName = fullName.trim();
    const trimmedContact = contact.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      Alert.alert('Validation Error', 'Please enter the employee name.');
      return;
    }

    if (!trimmedId) {
      Alert.alert('Validation Error', 'Please enter a valid Employee ID.');
      return;
    }

    if (trimmedContact.length < 10) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid 10-digit contact number.',
      );
      return;
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    navigation.navigate(ROUTES.ENROLLMENT_CAPTURE, {
      employeeId: trimmedId.toUpperCase(),
      fullName: trimmedName,
      contact: `+91${trimmedContact}`,
      email: trimmedEmail,
    });
  };

  const canContinue =
    fullName.trim().length > 0 &&
    employeeId.trim().length > 0 &&
    contact.trim().length >= 10 &&
    email.trim().length > 0;

  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <InfoCard
        title="Employee Details"
        subtitle="Enter official employee information before face capture."
        style={styles.section}
      >
        <EmployeeInput
          autoCapitalize="words"
          autoCorrect={false}
          containerStyle={styles.firstField}
          editable
          helperText="Full legal name as per HR records."
          label="Full Name"
          onChangeText={setFullName}
          placeholder="Full name"
          value={fullName}
        />
        <EmployeeInput
          editable
          helperText="Used for offline template lookup and audit logs."
          label="Employee ID"
          onChangeText={setEmployeeId}
          value={employeeId}
        />
        <EmployeeInput
          editable
          helperText="Country code +91 is fixed. Enter the 10-digit mobile number."
          label="Contact Number"
          maxLength={10}
          onChangeText={setContact}
          prefix="+91"
          value={contact}
        />
        <EmployeeInput
          autoCapitalize="none"
          autoCorrect={false}
          editable
          keyboardType="email-address"
          label="Email ID"
          onChangeText={setEmail}
          placeholder="name@company.com"
          textContentType="emailAddress"
          value={email}
        />
      </InfoCard>

      <PrimaryButton
        icon="userPlus"
        title="Continue Enrollment"
        onPress={handleContinue}
        disabled={!canContinue}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingBottom: spacing.xxxl,
  },
  firstField: {
    marginTop: 0,
  },
  section: {
    marginTop: spacing.md,
  },
});
