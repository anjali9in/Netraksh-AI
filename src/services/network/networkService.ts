import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from '@react-native-community/netinfo';

export type NetworkChangeCallback = (
  online: boolean,
  state: NetInfoState,
) => void;

export type NetworkStatusSnapshot = {
  isOnline: boolean;
  connectionType: string;
  isInternetReachable: boolean | null;
};

/**
 * Android often reports isInternetReachable=false briefly (or incorrectly on some
 * OEMs) while Wi‑Fi/mobile data is actually working. Treat "connected" as online
 * unless reachability is explicitly false.
 */
export function getOnlineStatus(state: NetInfoState): boolean {
  if (state.isConnected !== true) {
    return false;
  }

  if (state.isInternetReachable === false) {
    return false;
  }

  const offlineTypes = new Set(['none', 'unknown']);
  if (state.type && offlineTypes.has(state.type)) {
    return false;
  }

  return true;
}

export function toNetworkSnapshot(state: NetInfoState): NetworkStatusSnapshot {
  return {
    isOnline: getOnlineStatus(state),
    connectionType: state.type ?? 'unknown',
    isInternetReachable:
      state.isInternetReachable === null || state.isInternetReachable === undefined
        ? null
        : state.isInternetReachable,
  };
}

export async function fetchNetworkStatus(): Promise<NetworkStatusSnapshot> {
  const state = await NetInfo.fetch();
  return toNetworkSnapshot(state);
}

export async function isOnline(): Promise<boolean> {
  const status = await fetchNetworkStatus();
  return status.isOnline;
}

export function subscribeToNetworkChanges(
  callback: NetworkChangeCallback,
): NetInfoSubscription {
  return NetInfo.addEventListener(state => {
    callback(getOnlineStatus(state), state);
  });
}

export const networkService = {
  fetchNetworkStatus,
  getOnlineStatus,
  isOnline,
  subscribeToNetworkChanges,
};
