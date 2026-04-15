import { describe, expect, test } from 'bun:test';

import { normalizeLoginIdentifierInput } from './login-shared';

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
