import { describe, it, expect } from 'vitest';
import { shellRoute } from './shellRoute';

const base = { loading: false, user: false, homegame: false, pathname: '/', native: false };

describe('shellRoute', () => {
  it('shows the splash while auth is loading', () => {
    expect(shellRoute({ ...base, loading: true })).toBe('splash');
    expect(shellRoute({ ...base, loading: true, user: true, homegame: true })).toBe('splash');
  });

  it('shows the landing page to signed-out visitors on / in a browser', () => {
    expect(shellRoute({ ...base, pathname: '/' })).toBe('landing');
  });

  it('sends signed-out visitors on / in the native app to sign-in', () => {
    expect(shellRoute({ ...base, pathname: '/', native: true })).toBe('auth');
  });

  it('sends signed-out visitors on any other path to sign-in', () => {
    expect(shellRoute({ ...base, pathname: '/sessions' })).toBe('auth');
    expect(shellRoute({ ...base, pathname: '/sessions', native: true })).toBe('auth');
  });

  it('lets signed-in users with no homegame into the shell', () => {
    expect(shellRoute({ ...base, user: true, pathname: '/' })).toBe('shell');
    expect(shellRoute({ ...base, user: true, pathname: '/sessions' })).toBe('shell');
    expect(shellRoute({ ...base, user: true, pathname: '/', native: true })).toBe('shell');
  });

  it('lets signed-in users with a homegame into the shell', () => {
    expect(shellRoute({ ...base, user: true, homegame: true, pathname: '/' })).toBe('shell');
    expect(shellRoute({ ...base, user: true, homegame: true, pathname: '/sessions' })).toBe('shell');
  });
});
