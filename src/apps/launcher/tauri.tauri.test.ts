import { describe, expect, it } from 'vitest';
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks';
import { emit } from '@tauri-apps/api/event';
import { isTauriRuntime, safeInvoke, safeListen } from './tauri';

describe('launcher tauri bridge', () => {
  it('uses tauri invoke and event bridge in tauri runtime', async () => {
    mockWindows('main');
    mockIPC((cmd, args) => {
      if (cmd === 'get_service_status') {
        return {
          status: 'Stopped',
          is_running: false,
        };
      }
      if (cmd === 'open_web_ui') {
        return null;
      }
      throw new Error(`unexpected command: ${cmd} ${JSON.stringify(args)}`);
    }, { shouldMockEvents: true });

    expect(isTauriRuntime()).toBe(true);

    const payload = await safeInvoke<{ status: string; is_running: boolean }>('get_service_status');
    expect(payload.status).toBe('Stopped');
    expect(payload.is_running).toBe(false);

    const events: string[] = [];
    const unlisten = await safeListen<string>('service-action', (event) => {
      events.push(event.payload);
    });

    await emit('service-action', 'start');
    expect(events).toEqual(['start']);

    await unlisten();
  });
});
