import React from 'react';
import {StyleSheet, Text} from 'react-native';

import {InfoCard} from '../components/InfoCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {colors} from '../theme/colors';
import {spacing} from '../theme/spacing';

export function SupportScreen(): React.JSX.Element {
  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <InfoCard title="Support" style={styles.firstSection}>
        <Text style={styles.hint}>
          We are here to help. Reach out through any of the channels below or
          browse the FAQ for common questions.
        </Text>
      </InfoCard>

      <InfoCard title="Contact" style={styles.section}>
        <PrimaryButton
          icon="mail"
          title="Email Support"
          onPress={() => {}}
          variant="secondary"
          style={styles.actionButton}
        />
        <PrimaryButton
          icon="chat"
          title="Live Chat"
          onPress={() => {}}
          variant="secondary"
          style={styles.actionButton}
        />
      </InfoCard>

      <InfoCard title="Resources" style={styles.section}>
        <PrimaryButton
          icon="logs"
          title="Knowledge Base"
          onPress={() => {}}
          variant="secondary"
          style={styles.actionButton}
        />
        <PrimaryButton
          icon="refresh"
          title="Submit Feedback"
          onPress={() => {}}
          variant="secondary"
          style={styles.actionButton}
        />
      </InfoCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    marginBottom: spacing.sm,
  },
  container: {
    backgroundColor: colors.background,
    minHeight: '100%',
    paddingBottom: spacing.xxxl,
  },
  firstSection: {
    marginTop: 0,
  },
  hint: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  section: {
    marginTop: spacing.xl,
  },
});
