import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {AuthenticationScreen} from '../../screens/AuthenticationScreen';
import {BenchmarkScreen} from '../../screens/BenchmarkScreen';
import {EnrollmentCaptureScreen} from '../../screens/EnrollmentCaptureScreen';
import {EnrollmentScreen} from '../../screens/EnrollmentScreen';
import {HomeScreen} from '../../screens/HomeScreen';
import {OfflineLogsScreen} from '../../screens/OfflineLogsScreen';
import {ProfileScreen} from '../../screens/ProfileScreen';
import {SettingsScreen} from '../../screens/SettingsScreen';
import {ROOT_SCREEN_OPTIONS} from '../../config/appConfig';
import {AppShell} from './AppShell';
import {NavigationMenuProvider} from './NavigationMenuContext';
import {RootStackParamList, ROUTES} from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): React.JSX.Element {
  return (
    <NavigationMenuProvider>
      <AppShell>
        <Stack.Navigator
        initialRouteName={ROUTES.HOME}
        screenOptions={ROOT_SCREEN_OPTIONS}
      >
        <Stack.Screen
          name={ROUTES.HOME}
          component={HomeScreen}
          options={{title: 'Netraksh AI'}}
        />
        <Stack.Screen
          name={ROUTES.ENROLLMENT}
          component={EnrollmentScreen}
          options={{title: 'Enroll User'}}
        />
        <Stack.Screen
          name={ROUTES.ENROLLMENT_CAPTURE}
          component={EnrollmentCaptureScreen}
          options={{title: 'Face Capture'}}
        />
        <Stack.Screen
          name={ROUTES.AUTHENTICATION}
          component={AuthenticationScreen}
          options={{title: 'Authenticate User'}}
        />
        <Stack.Screen
          name={ROUTES.OFFLINE_LOGS}
          component={OfflineLogsScreen}
          options={{title: 'Offline Logs'}}
        />
        <Stack.Screen
          name={ROUTES.BENCHMARK}
          component={BenchmarkScreen}
          options={{title: 'Benchmark'}}
        />
        <Stack.Screen
          name={ROUTES.PROFILE}
          component={ProfileScreen}
          options={{title: 'Profile'}}
        />
        <Stack.Screen
          name={ROUTES.SETTINGS}
          component={SettingsScreen}
          options={{title: 'Settings'}}
        />
        </Stack.Navigator>
      </AppShell>
    </NavigationMenuProvider>
  );
}
