import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {AuthenticationScreen} from '../../screens/AuthenticationScreen';
import {BenchmarkScreen} from '../../screens/BenchmarkScreen';
import {EnrollmentScreen} from '../../screens/EnrollmentScreen';
import {HomeScreen} from '../../screens/HomeScreen';
import {OfflineLogsScreen} from '../../screens/OfflineLogsScreen';
import {ROOT_SCREEN_OPTIONS} from '../../config/appConfig';
import {RootStackParamList, ROUTES} from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): React.JSX.Element {
  return (
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
    </Stack.Navigator>
  );
}
