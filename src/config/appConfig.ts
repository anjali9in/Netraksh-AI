import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';

export const APP_NAME = 'Netraksh AI';
export const MODEL_VERSION = 'arcface-mobilenet-v2-1.0';
// Set false when react-native-fast-tflite is linked (RN 0.72+).
export const DEMO_MODE = false;

export const ROOT_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerBackTitle: '',
  headerShown: false,
  headerTitleAlign: 'center',
};
