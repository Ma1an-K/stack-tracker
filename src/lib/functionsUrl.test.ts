import { describe, it, expect } from 'vitest';
import { deriveProjectRef } from './functionsUrl';

describe('deriveProjectRef', () => {
  it('pulls the ref out of a project URL', () => {
    expect(deriveProjectRef('https://ebfhvwadfazehvhevsle.supabase.co')).toBe('ebfhvwadfazehvhevsle');
  });

  it('tolerates trailing whitespace and a trailing slash', () => {
    expect(deriveProjectRef('  https://abcdef.supabase.co/  ')).toBe('abcdef');
  });

  it('handles http and a missing scheme', () => {
    expect(deriveProjectRef('http://abcdef.supabase.co')).toBe('abcdef');
    expect(deriveProjectRef('abcdef.supabase.co')).toBe('abcdef');
  });

  it('returns undefined when the URL is missing or empty', () => {
    expect(deriveProjectRef(undefined)).toBeUndefined();
    expect(deriveProjectRef('')).toBeUndefined();
    expect(deriveProjectRef('   ')).toBeUndefined();
  });
});
