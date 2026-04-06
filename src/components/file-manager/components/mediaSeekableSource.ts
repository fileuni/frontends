export interface ResolvedSeekableMediaSource {
  url: string;
  cleanup?: (() => void) | undefined;
}

const rangeSupportCache = new Map<string, boolean>();
const rangeSupportPromiseCache = new Map<string, Promise<boolean>>();

const cancelResponseBody = (response: Response) => {
  void response.body?.cancel().catch((): void => undefined);
};

const probeRangeSupport = async (url: string): Promise<boolean> => {
  const cached = rangeSupportCache.get(url);
  if (typeof cached === 'boolean') {
    return cached;
  }

  const pending = rangeSupportPromiseCache.get(url);
  if (pending) {
    return pending;
  }

  const promise = fetch(url, {
    headers: {
      Range: 'bytes=0-0',
    },
  })
    .then((response) => {
      const supported = response.status === 206 && response.headers.get('content-range')?.startsWith('bytes 0-0/') === true;
      cancelResponseBody(response);
      rangeSupportCache.set(url, supported);
      rangeSupportPromiseCache.delete(url);
      return supported;
    })
    .catch(() => {
      rangeSupportPromiseCache.delete(url);
      return true;
    });

  rangeSupportPromiseCache.set(url, promise);
  return promise;
};

export const resolveSeekableMediaSource = async (url: string): Promise<ResolvedSeekableMediaSource> => {
  const supportsByteRange = await probeRangeSupport(url);
  if (supportsByteRange) {
    return { url };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load media source: ${response.status}`);
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  return {
    url: objectUrl,
    cleanup: () => {
      URL.revokeObjectURL(objectUrl);
    },
  };
};
