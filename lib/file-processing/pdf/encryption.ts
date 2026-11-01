const KEY = [0x2f, 0x45, 0x6e, 0x63, 0x72, 0x79, 0x70, 0x74]; // "/Encrypt"

function isWhitespace(byte: number): boolean {
  return byte === 0x20 || byte === 0x0a || byte === 0x0d || byte === 0x09 || byte === 0x0c || byte === 0x00;
}

/**
 * True when the file declares an /Encrypt dictionary (in its trailer or
 * cross-reference stream), i.e. it has an owner and/or user password.
 *
 * pdf-lib only notices encryption after parsing, and encrypted object streams
 * make it fail earlier with a generic parse error — which would be reported as
 * "damaged". Checking the raw bytes first gives the right message. The entry
 * must be followed by an object reference ("/Encrypt 12 0 R") or a dictionary
 * ("/Encrypt <<"), so the word appearing elsewhere does not count.
 */
export function declaresEncryption(bytes: Uint8Array): boolean {
  const last = bytes.length - KEY.length;
  outer: for (let i = 0; i <= last; i++) {
    if (bytes[i] !== 0x2f) continue;
    for (let k = 1; k < KEY.length; k++) if (bytes[i + k] !== KEY[k]) continue outer;
    let j = i + KEY.length;
    if (j < bytes.length && !isWhitespace(bytes[j]!) && bytes[j] !== 0x3c) continue; // "/EncryptMetadata" etc.
    while (j < bytes.length && isWhitespace(bytes[j]!)) j++;
    const next = bytes[j];
    if (next === undefined) return false;
    if (next >= 0x30 && next <= 0x39) return true; // indirect reference
    if (next === 0x3c && bytes[j + 1] === 0x3c) return true; // inline dictionary
  }
  return false;
}
