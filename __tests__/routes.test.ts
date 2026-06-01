import {ROUTES} from '../src/app/navigation/routes';

describe('ROUTES', () => {
  it('defines route names', () => {
    expect(ROUTES.HOME).toBe('Home');
    expect(ROUTES.ENROLLMENT).toBe('Enrollment');
    expect(ROUTES.AUTHENTICATION).toBe('Authentication');
    expect(ROUTES.OFFLINE_LOGS).toBe('OfflineLogs');
    expect(ROUTES.BENCHMARK).toBe('Benchmark');
  });
});
