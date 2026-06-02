import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';

import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {RootStackParamList, ROUTES} from '../app/navigation/routes';

type HomeNavigation = NativeStackNavigationProp<
  RootStackParamList,
  typeof ROUTES.HOME
>;

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<HomeNavigation>();

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Offline Face Authentication</Text>
        <Text style={styles.subtitle}>
          Secure offline facial recognition and liveness detection
        </Text>
      </View>

      <StatusBadge label="Offline mode placeholder" status="info" />

      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <PrimaryButton
            icon="userPlus"
            title="Enroll User"
            onPress={() => navigation.navigate(ROUTES.ENROLLMENT)}
          />
        </View>
        <View style={styles.actionItem}>
          <PrimaryButton
            icon="shield"
            title="Authenticate User"
            onPress={() => navigation.navigate(ROUTES.AUTHENTICATION)}
          />
        </View>
        <View style={styles.actionItem}>
          <PrimaryButton
            icon="logs"
            title="View Offline Logs"
            onPress={() => navigation.navigate(ROUTES.OFFLINE_LOGS)}
          />
        </View>
        <View style={styles.actionItem}>
          <PrimaryButton
            icon="chart"
            title="View Benchmark"
            onPress={() => navigation.navigate(ROUTES.BENCHMARK)}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: 12,
  },
  actionItem: {
    marginTop: 12,
  },
  header: {},
  subtitle: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 8,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
});
