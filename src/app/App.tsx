import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {offlineDatabaseService} from '../services/OfflineDatabaseService';
import {logger} from '../utils/logger';
import {AppNavigator} from './navigation/AppNavigator';

export default function App(): React.JSX.Element {
  React.useEffect(() => {
    offlineDatabaseService.initDatabase().catch(error => {
      logger.error('Failed to initialize local database', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
