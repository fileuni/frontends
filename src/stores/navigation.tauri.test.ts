import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useNavigationStore } from './navigation';

const resetNavigationState = () => {
  window.location.hash = '';
  useNavigationStore.setState({ params: {} });
};

describe('navigation store', () => {
  beforeEach(() => {
    resetNavigationState();
  });

  afterEach(() => {
    resetNavigationState();
  });

  it('uses the file manager default page when switching modules without page', () => {
    window.location.hash = '#mod=public&page=login';
    useNavigationStore.getState().syncFromHash();

    useNavigationStore.getState().navigate({ mod: 'file-manager' });

    expect(window.location.hash).toBe('#mod=file-manager&page=files');
  });

  it('drops stale params when switching modules', () => {
    window.location.hash = '#mod=public&page=login&reason=session_expired&redirect=%23mod%3Duser%26page%3Dsecurity';
    useNavigationStore.getState().syncFromHash();

    useNavigationStore.getState().navigate({ mod: 'file-manager', page: 'files' });

    expect(window.location.hash).toBe('#mod=file-manager&page=files');
  });

  it('removes params when navigate receives undefined values in the same module', () => {
    window.location.hash = '#mod=file-manager&page=files&path=%2Fdocs&preview_path=%2Fdocs%2Freadme.md';
    useNavigationStore.getState().syncFromHash();

    useNavigationStore.getState().navigate({ preview_path: undefined });

    expect(window.location.hash).toBe('#mod=file-manager&page=files&path=%2Fdocs');
  });
});
