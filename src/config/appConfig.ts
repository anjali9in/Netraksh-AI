import type {NativeStackNavigationOptions} from '@react-navigation/native-stack';

import {runtimeConfig} from './runtimeConfig';

export const APP_NAME = 'Netraksh AI';
export const MODEL_VERSION = 'mobilefacenet-tflite-1.0';
export const DEMO_MODE = runtimeConfig.demoMode;

export const ROOT_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  headerBackTitle: '',
  headerShown: false,
  headerTitleAlign: 'center',
};
