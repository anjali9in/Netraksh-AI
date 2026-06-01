type LogPayload = Record<string, unknown> | string | number | boolean | unknown;

function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  payload?: LogPayload,
) {
  if (!__DEV__ && level !== 'error') {
    return;
  }

  if (payload === undefined) {
    console[level](message);
    return;
  }

  console[level](message, payload);
}

export const logger = {
  debug: (message: string, payload?: LogPayload) =>
    log('debug', message, payload),
  info: (message: string, payload?: LogPayload) =>
    log('info', message, payload),
  warn: (message: string, payload?: LogPayload) =>
    log('warn', message, payload),
  error: (message: string, payload?: LogPayload) =>
    log('error', message, payload),
};
