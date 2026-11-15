/** Audio length from file headers (MP3 CBR or PCM WAV), no ffmpeg. Owner: Agent 2. Spike helper. */
/** Seconds of audio in an MP3 (constant bitrate, from the first frame header) or a PCM WAV. Null when unknown. */
export function audioSeconds(bytes: Buffer): number | null {
  if (bytes.toString('ascii', 0, 4) === 'RIFF') {
    const byteRate = bytes.readUInt32LE(28);
    let i = 12;
    while (i + 8 <= bytes.length) {
      const id = bytes.toString('ascii', i, i + 4);
      const size = bytes.readUInt32LE(i + 4);
      if (id === 'data') return Math.min(size, bytes.length - i - 8) / byteRate;
      i += 8 + size + (size % 2);
    }
    return null;
  }
  let i = 0;
  if (bytes.toString('ascii', 0, 3) === 'ID3') i = 10 + ((bytes[6] & 0x7f) << 21 | (bytes[7] & 0x7f) << 14 | (bytes[8] & 0x7f) << 7 | (bytes[9] & 0x7f));
  for (; i + 4 < bytes.length; i++) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;
    const kbps = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320][bytes[i + 2] >> 4];
    if (!kbps) continue;
    return ((bytes.length - i) * 8) / (kbps * 1000);
  }
  return null;
}

