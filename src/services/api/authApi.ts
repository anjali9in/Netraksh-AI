import axiosClient from './axiosClient';

export type LoginPayload = {
  username: string;
  password: string;
};

export type AuthUser = {
  id: string;
  name: string;
  role?: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return axiosClient.post<unknown, LoginResponse>('/auth/login', payload);
}

export const authApi = {
  login,
};
