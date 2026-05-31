import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {HomeScreen} from '../../screens/HomeScreen';
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
    </Stack.Navigator>
  );
}
