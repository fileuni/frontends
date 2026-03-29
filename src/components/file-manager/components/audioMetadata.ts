import { BASE_URL } from '@/lib/api.ts';
import { getFileDownloadToken } from '@/lib/fileTokens.ts';

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
  coverMimeType?: string;
}

const MAX_ID3_READ_BYTES = 2 * 1024 * 1024;

const decodeAscii = (bytes: Uint8Array) => new TextDecoder('ascii').decode(bytes);

const decodeLatin1 = (bytes: Uint8Array) => {
  try {
    return new TextDecoder('iso-8859-1').decode(bytes);
  } catch {
    return new TextDecoder().decode(bytes);
  }
};

const decodeUtf16 = (bytes: Uint8Array, littleEndian?: boolean) => {
  const slice = bytes.slice();
  if (slice.length >= 2) {
    if (slice[0] === 0xff && slice[1] === 0xfe) {
      return new TextDecoder('utf-16le').decode(slice.subarray(2));
    }
    if (slice[0] === 0xfe && slice[1] === 0xff) {
      return new TextDecoder('utf-16be').decode(slice.subarray(2));
    }
  }
  return new TextDecoder(littleEndian ? 'utf-16le' : 'utf-16be').decode(slice);
};

const decodeText = (bytes: Uint8Array, encoding: number) => {
  if (bytes.length === 0) return '';
  if (encoding === 0) return decodeLatin1(bytes);
  if (encoding === 1) return decodeUtf16(bytes, true);
  if (encoding === 2) return decodeUtf16(bytes, false);
  return new TextDecoder('utf-8').decode(bytes);
};

const readSynchsafeInteger = (bytes: Uint8Array, offset: number) => (
  ((bytes[offset] ?? 0) << 21)
  | ((bytes[offset + 1] ?? 0) << 14)
  | ((bytes[offset + 2] ?? 0) << 7)
  | (bytes[offset + 3] ?? 0)
);

const readUInt32BE = (bytes: Uint8Array, offset: number) => (
  ((bytes[offset] ?? 0) << 24)
  | ((bytes[offset + 1] ?? 0) << 16)
  | ((bytes[offset + 2] ?? 0) << 8)
  | (bytes[offset + 3] ?? 0)
);

const concatBytes = (chunks: Uint8Array[]) => {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
};

const stripTrailingNulls = (value: string) => value.replaceAll('\0', '').trim();

const removeUnsynchronisation = (bytes: Uint8Array) => {
  const output: number[] = [];
  for (let index = 0; index < bytes.length; index += 1) {
    if (bytes[index] === 0xff && bytes[index + 1] === 0x00) {
      output.push(0xff);
      index += 1;
      continue;
    }
    const byte = bytes[index];
    if (typeof byte !== 'number') continue;
    output.push(byte);
  }
  return new Uint8Array(output);
};

const findTerminator = (bytes: Uint8Array, offset: number, encoding: number) => {
  if (encoding === 0 || encoding === 3) {
    for (let index = offset; index < bytes.length; index += 1) {
      if (bytes[index] === 0x00) return index;
    }
    return bytes.length;
  }
  for (let index = offset; index < bytes.length - 1; index += 2) {
    if (bytes[index] === 0x00 && bytes[index + 1] === 0x00) return index;
  }
  return bytes.length;
};

const parseTextFrame = (frameData: Uint8Array) => {
  if (frameData.length === 0) return '';
  const encoding = frameData[0] ?? 3;
  return stripTrailingNulls(decodeText(frameData.subarray(1), encoding));
};

const parseApicFrame = (frameData: Uint8Array, version: number) => {
  if (frameData.length < 4) return null;
  const encoding = frameData[0] ?? 0;
  let offset = 1;
  let mimeType = 'image/jpeg';

  if (version === 2) {
    const format = decodeAscii(frameData.subarray(offset, offset + 3)).toLowerCase();
    mimeType = format === 'png' ? 'image/png' : format === 'gif' ? 'image/gif' : 'image/jpeg';
    offset += 3;
  } else {
    const mimeEnd = frameData.indexOf(0x00, offset);
    const mimeSliceEnd = mimeEnd === -1 ? frameData.length : mimeEnd;
    mimeType = stripTrailingNulls(decodeLatin1(frameData.subarray(offset, mimeSliceEnd))) || mimeType;
    offset = mimeEnd === -1 ? frameData.length : mimeEnd + 1;
  }

  offset += 1;
  const descriptionEnd = findTerminator(frameData, offset, encoding);
  offset = descriptionEnd + (encoding === 0 || encoding === 3 ? 1 : 2);
  if (offset >= frameData.length) return null;

  const imageBytes = frameData.subarray(offset);
  if (imageBytes.length === 0) return null;

  const blobBytes = new Uint8Array(imageBytes.byteLength);
  blobBytes.set(imageBytes);

  return {
    coverUrl: URL.createObjectURL(new Blob([blobBytes.buffer], { type: mimeType })),
    coverMimeType: mimeType,
  } satisfies Pick<AudioMetadata, 'coverUrl' | 'coverMimeType'>;
};

const readStreamBytes = async (url: string, maxBytes: number) => {
  const response = await fetch(url, {
    headers: { Range: `bytes=0-${Math.max(maxBytes - 1, 0)}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch audio metadata: ${response.status}`);
  }

  if (!response.body) {
    return new Uint8Array((await response.arrayBuffer()).slice(0, maxBytes));
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const nextChunk = total + value.length > maxBytes ? value.subarray(0, maxBytes - total) : value;
      chunks.push(nextChunk);
      total += nextChunk.length;
      if (total >= maxBytes) break;
    }
  } finally {
    await reader.cancel().catch((): void => undefined);
  }

  return concatBytes(chunks);
};

const parseId3Metadata = (bytes: Uint8Array) => {
  if (bytes.length < 10 || decodeAscii(bytes.subarray(0, 3)) !== 'ID3') return {} satisfies AudioMetadata;

  const version = bytes[3] ?? 4;
  const flags = bytes[5] ?? 0;
  const tagSize = readSynchsafeInteger(bytes, 6);
  const totalTagSize = 10 + tagSize;
  let body = bytes.subarray(10, Math.min(totalTagSize, bytes.length));
  if ((flags & 0x80) !== 0) {
    body = removeUnsynchronisation(body);
  }

  const metadata: AudioMetadata = {};
  let offset = 0;

  while (offset < body.length) {
    const headerSize = version === 2 ? 6 : 10;
    if (offset + headerSize > body.length) break;

    const frameId = decodeAscii(body.subarray(offset, offset + (version === 2 ? 3 : 4)));
    const isPadding = [...frameId].every((char) => char === '\u0000' || char === ' ');
    if (isPadding) break;

    const frameSize = version === 2
      ? ((body[offset + 3] ?? 0) << 16) | ((body[offset + 4] ?? 0) << 8) | (body[offset + 5] ?? 0)
      : version === 4
        ? readSynchsafeInteger(body, offset + 4)
        : readUInt32BE(body, offset + 4);

    offset += headerSize;
    if (frameSize <= 0 || offset + frameSize > body.length) break;

    const frameData = body.subarray(offset, offset + frameSize);
    if ((frameId === 'TIT2' || frameId === 'TT2') && !metadata.title) {
      metadata.title = parseTextFrame(frameData);
    }
    if ((frameId === 'TPE1' || frameId === 'TP1') && !metadata.artist) {
      metadata.artist = parseTextFrame(frameData);
    }
    if ((frameId === 'TALB' || frameId === 'TAL') && !metadata.album) {
      metadata.album = parseTextFrame(frameData);
    }
    if ((frameId === 'APIC' || frameId === 'PIC') && !metadata.coverUrl) {
      Object.assign(metadata, parseApicFrame(frameData, version) ?? {});
    }

    offset += frameSize;
  }

  return metadata;
};

export const loadAudioMetadata = async (path: string) => {
  if (!path.toLowerCase().endsWith('.mp3')) return {} satisfies AudioMetadata;

  const token = await getFileDownloadToken(path);
  const url = `${BASE_URL}/api/v1/file/get-content?file_download_token=${encodeURIComponent(token)}&inline=true`;

  const headerBytes = await readStreamBytes(url, 10);
  if (headerBytes.length < 10 || decodeAscii(headerBytes.subarray(0, 3)) !== 'ID3') {
    return {} satisfies AudioMetadata;
  }

  const requiredBytes = Math.min(10 + readSynchsafeInteger(headerBytes, 6), MAX_ID3_READ_BYTES);
  const tagBytes = requiredBytes <= headerBytes.length ? headerBytes : await readStreamBytes(url, requiredBytes);
  return parseId3Metadata(tagBytes);
};
