import * as Keychain from 'react-native-keychain';

type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
};

const TOKEN_SERVICE = 'netraksh-ai.auth-tokens';
const TOKEN_USERNAME = 'auth';

async function getTokens(): Promise<StoredTokens | null> {
  const credentials = await Keychain.getGenericPassword({
    service: TOKEN_SERVICE,
  });

  if (!credentials) {
    return null;
  }

  try {
    return JSON.parse(credentials.password) as StoredTokens;
  } catch {
    await clearTokens();
    return null;
  }
}

export async function saveTokens(
  accessToken: string,
  refreshToken?: string,
): Promise<void> {
  const tokens: StoredTokens = {accessToken, refreshToken};

  await Keychain.setGenericPassword(TOKEN_USERNAME, JSON.stringify(tokens), {
    service: TOKEN_SERVICE,
  });
}

export async function getAccessToken(): Promise<string | null> {
  const tokens = await getTokens();
  return tokens?.accessToken ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const tokens = await getTokens();
  return tokens?.refreshToken ?? null;
}

export async function clearTokens(): Promise<void> {
  await Keychain.resetGenericPassword({
    service: TOKEN_SERVICE,
  });
}

export const secureStorage = {
  saveTokens,
  getAccessToken,
  getRefreshToken,
  clearTokens,
};
