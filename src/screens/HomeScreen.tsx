import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
      <View style={styles.container}>
        <View pointerEvents="none" style={styles.bgBlobTop} />
        <View pointerEvents="none" style={styles.bgBlobBottom} />

        {/* Fixed profile button at top right */}
        <TouchableOpacity
          accessibilityLabel="Open user profile"
          accessibilityRole="button"
          onPress={() => setSidebarVisible(true)}
          style={[styles.profileBtn, {top: insets.top + 8}]}
        >
          <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
            <Circle
              cx="12"
              cy="8"
              r="4"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            <Path
              d="M4 21a8 8 0 0 1 16 0"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </Svg>
        </TouchableOpacity>

        <ScreenContainer contentContainerStyle={styles.screenContent}>
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
      </View>

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
  bgBlobBottom: {
    backgroundColor: '#dbeafe',
    borderRadius: 180,
    bottom: -90,
    height: 260,
    position: 'absolute',
    right: -110,
    width: 260,
  },
  bgBlobTop: {
    backgroundColor: '#bfdbfe',
    borderRadius: 220,
    height: 280,
    left: -140,
    position: 'absolute',
    top: -120,
    width: 280,
  },
  container: {
    backgroundColor: '#eef6ff',
    flex: 1,
  },
  header: {
    marginTop: 8,
    paddingRight: 72,
  },
  profileBtn: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 16,
    shadowColor: '#1e3a8a',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.25,
    shadowRadius: 12,
    width: 48,
    zIndex: 10,
    elevation: 6,
  },
  screenContent: {
    backgroundColor: '#eef6ff',
    minHeight: '100%',
    paddingTop: 84,
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
});
