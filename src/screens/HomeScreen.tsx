import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import Svg, {Circle, Path} from 'react-native-svg';

import {PrimaryButton} from '../components/PrimaryButton';
import {ScreenContainer} from '../components/ScreenContainer';
import {StatusBadge} from '../components/StatusBadge';
import {UserProfileSidebar} from '../components/UserProfileSidebar';
import {RootStackParamList, ROUTES} from '../app/navigation/routes';
import {
  offlineDatabaseService,
  AuthLogEntry,
} from '../services/OfflineDatabaseService';
import type {User} from '../types/UserTypes';

type HomeNavigation = NativeStackNavigationProp<
  RootStackParamList,
  typeof ROUTES.HOME
>;

// Demo profile shown when no real user is authenticated
const DEMO_USER: User = {
  employeeId: 'EMP-001',
  fullName: 'Demo User',
  department: 'Engineering',
  designation: 'Software Engineer',
  email: 'demo@netraksh.ai',
  phone: '+91 98765 43210',
  siteId: 'HQ-Bangalore',
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  syncStatus: 'SYNCED',
};

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<HomeNavigation>();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [logs, setLogs] = useState<AuthLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        // Give the database time to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        const allLogs = await offlineDatabaseService.getAllLogs();
        setLogs(allLogs);
      } catch (error) {
        console.warn('Could not load attendance logs:', error);
        // Gracefully handle if database isn't ready yet
        setLogs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  return (
    <>
      <ScreenContainer>
        {/* Top bar with profile button */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.appName}>Netraksh AI</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Open user profile"
            accessibilityRole="button"
            onPress={() => setSidebarVisible(true)}
            style={styles.profileBtn}
          >
            <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}>
              <Circle
                cx="12"
                cy="8"
                r="4"
                stroke="#0f172a"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
              <Path
                d="M4 21a8 8 0 0 1 16 0"
                stroke="#0f172a"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </Svg>
          </TouchableOpacity>
        </View>

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

      <UserProfileSidebar
        logs={logs}
        onClose={() => setSidebarVisible(false)}
        user={DEMO_USER}
        visible={sidebarVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: 12,
  },
  actionItem: {
    marginTop: 12,
  },
  appName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    marginTop: 8,
  },
  profileBtn: {
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
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
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  topBarLeft: {
    flex: 1,
  },
});
