import {loginUser} from './authService';

export async function submitLoginForm(username: string, password: string) {
  try {
    const user = await loginUser(username, password);

    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}
