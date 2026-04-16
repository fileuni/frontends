import { describe, expect, test } from 'vitest';

import {
  getDefaultLoginDestination,
  normalizeLoginIdentifierInput,
  resolveLoginSuccessRoute,
} from './login-shared';

describe('normalizeLoginIdentifierInput', () => {
  test('keeps hyphenated usernames unchanged', () => {
    expect(normalizeLoginIdentifierInput('chat-ui-debug-1776285851956')).toBe('chat-ui-debug-1776285851956');
  });

  test('normalizes phone-like identifiers only when input is phone-shaped', () => {
    expect(normalizeLoginIdentifierInput(' +1 (415) 555-2671 ')).toBe('+14155552671');
  });

  test('normalizes email identifiers', () => {
    expect(normalizeLoginIdentifierInput(' Test.User@Example.COM ')).toBe('test.user@example.com');
  });
});

describe('getDefaultLoginDestination', () => {
  test('uses legacy internal route when valid', () => {
    expect(
      getDefaultLoginDestination({ default_login_route: 'mod=user&page=welcome' } as never),
    ).toEqual({ type: 'internal', params: { mod: 'user', page: 'welcome' } });
  });

  test('uses relative same-page hash address as internal route', () => {
    expect(
      getDefaultLoginDestination({ default_login_route: '/#mod=file-manager&page=files' } as never),
    ).toEqual({ type: 'internal', params: { mod: 'file-manager', page: 'files' } });
  });

  test('uses absolute http target as external address', () => {
    expect(
      getDefaultLoginDestination({ default_login_route: 'https://example.com/welcome' } as never),
    ).toEqual({ type: 'external', href: 'https://example.com/welcome' });
  });

  test('falls back to file manager files route when config is invalid', () => {
    expect(
      getDefaultLoginDestination({ default_login_route: 'mod=file-manager&page=login' } as never),
    ).toEqual({ type: 'internal', params: { mod: 'file-manager', page: 'files' } });
  });
});

describe('resolveLoginSuccessRoute', () => {
  test('uses configured default route when no redirect is present', () => {
    expect(
      resolveLoginSuccessRoute({
        capabilities: { default_login_route: '/#mod=user&page=welcome' } as never,
      }),
    ).toEqual({ type: 'internal', params: { mod: 'user', page: 'welcome' } });
  });

  test('preserves explicit external redirect over configured default route', () => {
    expect(
      resolveLoginSuccessRoute({
        redirect: 'https://example.com/after-login',
        capabilities: { default_login_route: '/#mod=user&page=welcome' } as never,
      }),
    ).toEqual({ type: 'external', href: 'https://example.com/after-login' });
  });
});
