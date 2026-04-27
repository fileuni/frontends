import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import {
  SharedToastContainer,
  type SharedToastViewModel,
} from '@fileuni/ts-shared/toast-ui';

const toastI18n = {
  doNotShowAgain: 'Do not show again',
  viewDetails: 'View details',
  hideDetails: 'Hide details',
  copy: 'Copy',
};

const toastDurations = {
  short: 2000,
  normal: 4000,
  long: 8000,
};

const baseToast: SharedToastViewModel = {
  id: 'toast-1',
  message: 'Saved',
  type: 'success',
  duration: 'normal',
  showDetails: false,
  showDoNotShowAgain: false,
  createdAt: Date.now(),
};

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: ResizeObserverMock,
  });
});

afterEach(() => {
  document.documentElement.style.removeProperty('--safe-area-top');
  for (const anchor of document.querySelectorAll('[data-toast-top-anchor]')) {
    anchor.remove();
  }
});

function renderToast(overrides?: Partial<ComponentProps<typeof SharedToastContainer>>) {
  return render(
    <SharedToastContainer
      toasts={[baseToast]}
      durations={toastDurations}
      isDark={false}
      i18n={toastI18n}
      portalTarget={document.body}
      renderPortal={(children) => children}
      onDismiss={() => undefined}
      onToggleDetails={() => undefined}
      onDoNotShowAgain={() => undefined}
      {...overrides}
    />,
  );
}

function createRect(bottom: number, height = 64, width = 320): DOMRect {
  return {
    x: 0,
    y: 0,
    top: bottom - height,
    left: 0,
    right: width,
    bottom,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('SharedToastContainer', () => {
  it('places toast below tagged top anchors by default', async () => {
    document.documentElement.style.setProperty('--safe-area-top', '0px');

    const header = document.createElement('div');
    header.setAttribute('data-toast-top-anchor', 'true');
    Object.defineProperty(header, 'getBoundingClientRect', {
      configurable: true,
      value: () => createRect(72),
    });
    document.body.appendChild(header);

    let container: HTMLElement;
    await act(async () => {
      ({ container } = renderToast());
    });

    await screen.findByText('Saved');

    await waitFor(() => {
      expect((container.firstElementChild as HTMLDivElement | null)?.style.top).toBe('88px');
    });
  });

  it('falls back to safe area when no top anchor exists', async () => {
    document.documentElement.style.setProperty('--safe-area-top', '20px');

    let container: HTMLElement;
    await act(async () => {
      ({ container } = renderToast());
    });

    await screen.findByText('Saved');

    await waitFor(() => {
      expect((container.firstElementChild as HTMLDivElement | null)?.style.top).toBe('36px');
    });
  });

  it('keeps explicit topOffset higher priority for compatibility', async () => {
    document.documentElement.style.setProperty('--safe-area-top', '0px');

    const header = document.createElement('div');
    header.setAttribute('data-toast-top-anchor', 'true');
    Object.defineProperty(header, 'getBoundingClientRect', {
      configurable: true,
      value: () => createRect(96),
    });
    document.body.appendChild(header);

    let container: HTMLElement;
    await act(async () => {
      ({ container } = renderToast({ topOffset: '120px' }));
    });

    await screen.findByText('Saved');

    await waitFor(() => {
      expect((container.firstElementChild as HTMLDivElement | null)?.style.top).toBe('120px');
    });
  });
});
