import { describe, expect, it } from 'vitest';

import { resolveMediaUrl } from './media-url';

describe('resolveMediaUrl', () => {
  it('rewrites installation media to authenticated serve path', () => {
    expect(resolveMediaUrl('/media/installations/abc-123/photo.jpg')).toMatch(
      /\/media\/serve\/installations\/abc-123\/photo\.jpg$/
    );
  });

  it('rewrites transfer media to authenticated serve path', () => {
    expect(resolveMediaUrl('/media/transfers/def-456/photo.webp')).toMatch(
      /\/media\/serve\/transfers\/def-456\/photo\.webp$/
    );
  });

  it('passes through absolute URLs', () => {
    expect(resolveMediaUrl('https://cdn.example/x.jpg')).toBe(
      'https://cdn.example/x.jpg'
    );
  });
});
