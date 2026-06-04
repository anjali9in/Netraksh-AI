import {useEffect, useState} from 'react';

import {networkService} from '../services/network/networkService';

export type NetworkStatus = {
  isOnline: boolean;
  isChecking: boolean;
  connectionType: string;
};

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');

  useEffect(() => {
    let mounted = true;

    const applyState = (online: boolean, type: string) => {
      if (!mounted) {
        return;
      }

      setIsOnline(online);
      setConnectionType(type);
      setIsChecking(false);
    };

    networkService
      .fetchNetworkStatus()
      .then(status => {
        applyState(status.isOnline, status.connectionType);
      })
      .catch(() => {
        applyState(false, 'unknown');
      });

    const unsubscribe = networkService.subscribeToNetworkChanges(
      (online, state) => {
        applyState(online, state.type ?? 'unknown');
      },
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return {isOnline, isChecking, connectionType};
}
