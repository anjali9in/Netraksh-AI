import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {offlineDatabaseService} from '../services/OfflineDatabaseService';
import {logger} from '../utils/logger';
import {AppNavigator} from './navigation/AppNavigator';

export default function App(): React.JSX.Element {
  const [dbReady, setDbReady] = React.useState(false);

  React.useEffect(() => {
    offlineDatabaseService
      .initDatabase()
      .then(() => setDbReady(true))
      .catch(error => {
        logger.error('Failed to initialize local database', error);
        setDbReady(true);
      });
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
