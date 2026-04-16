import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigSelector from './ConfigSelector';
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks';

describe('ConfigSelector tauri mock', () => {
  it('shows validation errors returned by tauri command', async () => {
    mockWindows('main');
    mockIPC((cmd, args) => {
      if (cmd === 'validate_runtime_dir') {
        const typedArgs = args as { runtimeDir?: string };
        if (typedArgs?.runtimeDir === '/tmp/invalid-runtime') {
          throw new Error('Runtime directory must be an existing directory.');
        }
        return true;
      }
      if (cmd === 'prepare_native_file_dialog') {
        return true;
      }
      throw new Error(`unexpected command: ${cmd}`);
    });

    const onRuntimeDirSelected = vi.fn(async () => undefined);

    render(
      <ConfigSelector
        isOpen={true}
        onRuntimeDirSelected={onRuntimeDirSelected}
        onClose={() => undefined}
        currentValue={{ runtimeDir: '/tmp/current-runtime' }}
        presets={{
          current_runtime_dir: '/tmp/current-runtime',
          default_runtime_dir: '/tmp/default-runtime',
        }}
      />,
    );

    const input = await screen.findByTestId('launcher-runtime-dir-input');
    await userEvent.clear(input);
    await userEvent.type(input, '/tmp/invalid-runtime');
    await userEvent.click(screen.getByTestId('launcher-runtime-dir-confirm'));

    await waitFor(() => {
      const errorNode = screen.getByTestId('launcher-runtime-dir-error');
      expect(errorNode.textContent ?? '').toContain(
        'Runtime directory must be an existing directory.',
      );
    });
    expect(onRuntimeDirSelected).not.toHaveBeenCalled();
  });

  it('submits selected runtime directory after successful validation', async () => {
    mockWindows('main');
    mockIPC((cmd) => {
      if (cmd === 'validate_runtime_dir') {
        return true;
      }
      if (cmd === 'prepare_native_file_dialog') {
        return true;
      }
      throw new Error(`unexpected command: ${cmd}`);
    });

    const onRuntimeDirSelected = vi.fn(async () => undefined);

    render(
      <ConfigSelector
        isOpen={true}
        onRuntimeDirSelected={onRuntimeDirSelected}
        onClose={() => undefined}
        currentValue={{ runtimeDir: '/tmp/current-runtime' }}
        presets={{
          current_runtime_dir: '/tmp/current-runtime',
          default_runtime_dir: '/tmp/default-runtime',
        }}
      />,
    );

    await userEvent.click(await screen.findByTestId('launcher-runtime-dir-default'));
    await userEvent.click(screen.getByTestId('launcher-runtime-dir-confirm'));

    await waitFor(() => {
      expect(onRuntimeDirSelected).toHaveBeenCalledWith('/tmp/default-runtime');
    });
  });
});
