import {authApi, AuthUser} from '../../services/api/authApi';
import {secureStorage} from '../../services/storage/secureStorage';

export async function loginUser(
  username: string,
  password: string,
): Promise<AuthUser> {
  const response = await authApi.login({username, password});

  await secureStorage.saveTokens(response.accessToken, response.refreshToken);

  return response.user;
}

export const authService = {
  loginUser,
};
