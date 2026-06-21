import { deriveMidiKeyMaterial } from './midi.js';

const MAGIC = 'SLAY';
const VERSION = 1;

function getCryptoJS() {
  if (!globalThis.CryptoJS) {
    throw new Error('CryptoJS is required in global scope');
  }
  return globalThis.CryptoJS;
}

function utf8ToBytes(value) {
  return new TextEncoder().encode(value);
}

function bytesToUtf8(value) {
  return new TextDecoder().decode(value);
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToWordArray(bytes) {
  const words = [];
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
  }
  return getCryptoJS().lib.WordArray.create(words, bytes.length);
}

function wordArrayToBytes(wordArray) {
  const { words, sigBytes } = wordArray;
  const out = new Uint8Array(sigBytes);
  for (let i = 0; i < sigBytes; i += 1) {
    out[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return out;
}

function makeMaskStream(keyBytes, ivBytes, length) {
  const stream = new Uint8Array(length);
  for (let i = 0; i < length; i += 1) {
    stream[i] = keyBytes[i % keyBytes.length] ^ ivBytes[i % ivBytes.length] ^ ((i * 31) & 0xff);
  }
  return stream;
}

function xorBytes(data, mask) {
  const out = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    out[i] = data[i] ^ mask[i];
  }
  return out;
}

function packPayload(ivBytes, maskedCipherBytes) {
  const magicBytes = utf8ToBytes(MAGIC);
  const headerLength = 10 + ivBytes.length;
  const out = new Uint8Array(headerLength + maskedCipherBytes.length);
  out.set(magicBytes, 0);
  out[4] = VERSION;
  out[5] = ivBytes.length;
  const length = maskedCipherBytes.length;
  out[6] = (length >>> 24) & 0xff;
  out[7] = (length >>> 16) & 0xff;
  out[8] = (length >>> 8) & 0xff;
  out[9] = length & 0xff;
  out.set(ivBytes, 10);
  out.set(maskedCipherBytes, headerLength);
  return out;
}

function findHeaderOffset(bytes) {
  const magicBytes = utf8ToBytes(MAGIC);
  for (let i = 0; i <= bytes.length - magicBytes.length; i += 1) {
    let match = true;
    for (let j = 0; j < magicBytes.length; j += 1) {
      if (bytes[i + j] !== magicBytes[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

function unpackPayload(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const anchor = findHeaderOffset(bytes);
  if (anchor < 0) {
    throw new Error('SLAY header not found');
  }

  const version = bytes[anchor + 4];
  if (version !== VERSION) {
    throw new Error(`Unsupported capsule version: ${version}`);
  }

  const ivLength = bytes[anchor + 5];
  const cipherLength =
    (bytes[anchor + 6] << 24) |
    (bytes[anchor + 7] << 16) |
    (bytes[anchor + 8] << 8) |
    bytes[anchor + 9];

  const ivStart = anchor + 10;
  const cipherStart = ivStart + ivLength;
  const cipherEnd = cipherStart + cipherLength;

  if (cipherEnd > bytes.length) {
    throw new Error('Corrupt capsule length');
  }

  return {
    anchor,
    ivBytes: bytes.slice(ivStart, cipherStart),
    maskedCipherBytes: bytes.slice(cipherStart, cipherEnd)
  };
}

function deriveKeyBytesFromMidiBuffer(midiBuffer) {
  const { digest } = deriveMidiKeyMaterial(midiBuffer);
  return hexToBytes(digest);
}

export function encryptCapsule(text, midiBuffer) {
  const CryptoJS = getCryptoJS();
  const keyBytes = deriveKeyBytesFromMidiBuffer(midiBuffer);
  const ivBytes = randomBytes(16);

  const keyWordArray = bytesToWordArray(keyBytes);
  const ivWordArray = bytesToWordArray(ivBytes);
  const plainWordArray = CryptoJS.enc.Utf8.parse(String(text ?? ''));

  const encrypted = CryptoJS.AES.encrypt(plainWordArray, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  const cipherBytes = wordArrayToBytes(encrypted.ciphertext);
  const mask = makeMaskStream(keyBytes, ivBytes, cipherBytes.length);
  const maskedCipherBytes = xorBytes(cipherBytes, mask);
  const payload = packPayload(ivBytes, maskedCipherBytes);
  const hashHex = CryptoJS.SHA256(bytesToWordArray(payload)).toString(CryptoJS.enc.Hex).slice(0, 16).toUpperCase();

  return {
    payload,
    hashHex,
    anchor: 0
  };
}

export function decryptCapsule(slayyBuffer, midiBuffer) {
  const CryptoJS = getCryptoJS();
  const packed = unpackPayload(slayyBuffer);
  const keyBytes = deriveKeyBytesFromMidiBuffer(midiBuffer);

  // Correct reverse order: unmask/XOR first, AES decrypt second.
  const mask = makeMaskStream(keyBytes, packed.ivBytes, packed.maskedCipherBytes.length);
  const cipherBytes = xorBytes(packed.maskedCipherBytes, mask);

  const keyWordArray = bytesToWordArray(keyBytes);
  const ivWordArray = bytesToWordArray(packed.ivBytes);
  const cipherWordArray = bytesToWordArray(cipherBytes);

  const decrypted = CryptoJS.AES.decrypt({ ciphertext: cipherWordArray }, keyWordArray, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  const plaintext = CryptoJS.enc.Utf8.stringify(decrypted);
  if (!plaintext) {
    throw new Error('Decryption failed (wrong key or malformed capsule)');
  }

  return {
    plaintext,
    anchor: packed.anchor,
    iv: packed.ivBytes,
    ciphertext: cipherBytes
  };
}

export function saveBinaryAsFile(data, filename = 'payload.slayy') {
  const blob = new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function textToBinary(text) {
  const bytes = utf8ToBytes(text);
  return Array.from(bytes).map((b) => b.toString(2).padStart(8, '0')).join('');
}

export function binaryToText(binary) {
  const bytes = binary.match(/.{1,8}/g)?.map((chunk) => parseInt(chunk, 2)) ?? [];
  return bytesToUtf8(new Uint8Array(bytes));
}
