import { isValidUrl, formatDuration, formatBytes } from '../lib/url';

describe('URL Helper Utilities', () => {
  test('isValidUrl validates http and https URLs', () => {
    expect(isValidUrl('https://youtube.com/watch?v=123')).toBe(true);
    expect(isValidUrl('http://vimeo.com/456')).toBe(true);
    expect(isValidUrl('invalid-string')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });

  test('formatDuration formats seconds to MM:SS or HH:MM:SS', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3665)).toBe('1:01:05');
    expect(formatDuration(0)).toBe('0:00');
  });

  test('formatBytes formats file sizes correctly', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});
