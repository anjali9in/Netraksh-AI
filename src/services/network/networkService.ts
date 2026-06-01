import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from '@react-native-community/netinfo';

export type NetworkChangeCallback = (
  online: boolean,
  state: NetInfoState,
) => void;

function getOnlineStatus(state: NetInfoState): boolean {
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return getOnlineStatus(state);
}

export function subscribeToNetworkChanges(
  callback: NetworkChangeCallback,
): NetInfoSubscription {
  return NetInfo.addEventListener(state => {
    callback(getOnlineStatus(state), state);
  });
}

export const networkService = {
  isOnline,
  subscribeToNetworkChanges,
};
