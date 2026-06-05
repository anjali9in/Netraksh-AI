import React from 'react';
import {ActivityIndicator, InteractionManager, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {offlineDatabaseService} from '../services/OfflineDatabaseService';
import {connectivitySyncService} from '../services/network/connectivitySyncService';
import {backgroundSyncService} from '../services/sync/backgroundSyncService';
import {pendingSyncNotificationService} from '../services/sync/pendingSyncNotificationService';
import {appPermissionsService} from '../services/permissions/appPermissionsService';
import {deviceContextService} from '../services/location/deviceContextService';
import {logger} from '../utils/logger';
import {cleanupTemporaryCaptureImages} from '../utils/fileUtils';
import {AppNavigator} from './navigation/AppNavigator';

export default function App(): React.JSX.Element {
  const [dbReady, setDbReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    offlineDatabaseService
      .initDatabase()
      .then(async () => {
        await appPermissionsService.requestAppPermissions();
        connectivitySyncService.startConnectivitySync();
        await backgroundSyncService.initializeBackgroundSync();
        await pendingSyncNotificationService.initializePendingSyncNotifications();

        InteractionManager.runAfterInteractions(() => {
          void cleanupTemporaryCaptureImages().catch(error => {
            logger.warn('Temporary image cleanup skipped', error);
          });
          void deviceContextService.refreshDeviceLocationContext().catch(
            error => {
              logger.warn('Initial location capture skipped', error);
            },
          );
        });

        if (mounted) {
          setDbReady(true);
        }
      })
      .catch(error => {
        logger.error('Failed to initialize local database', error);

        if (mounted) {
          setDbReady(true);
        }
      });

    return () => {
      mounted = false;
      pendingSyncNotificationService.stopPendingSyncNotificationWatcher();
      backgroundSyncService.stopBackgroundSync();
      connectivitySyncService.stopConnectivitySync();
    };
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
