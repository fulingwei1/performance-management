import { classifyLoginClient } from '../../models/loginLog.model';

describe('classifyLoginClient', () => {
  it('marks curl and script user agents as api/script logins', () => {
    expect(classifyLoginClient('curl/7.61.1')).toBe('api');
    expect(classifyLoginClient('python-requests/2.32.0')).toBe('api');
  });

  it('marks common browser user agents as browser logins', () => {
    expect(classifyLoginClient('Mozilla/5.0 Chrome/126.0 Safari/537.36')).toBe('browser');
    expect(classifyLoginClient('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Safari')).toBe('browser');
  });
});
