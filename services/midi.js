function getCryptoJS() {
  if (!globalThis.CryptoJS) {
    throw new Error('CryptoJS is required in global scope');
  }
  return globalThis.CryptoJS;
}

export function parseMidiFile(midiBuffer) {
  if (!globalThis.Midi) {
    return null;
  }

  try {
    return new globalThis.Midi(midiBuffer);
  } catch {
    return null;
  }
}

function normalizeNumber(value, scale = 1000) {
  return Math.round(Number(value || 0) * scale);
}

export function extractNormalizedMidiSequence(midiBuffer) {
  const parsed = parseMidiFile(midiBuffer);
  if (parsed && Array.isArray(parsed.tracks)) {
    const notes = [];
    parsed.tracks.forEach((track, trackIndex) => {
      (track.notes || []).forEach((note) => {
        notes.push([
          trackIndex,
          note.midi,
          normalizeNumber(note.time),
          normalizeNumber(note.duration),
          normalizeNumber(note.velocity)
        ]);
      });
    });

    if (notes.length) {
      notes.sort((a, b) => (a[2] - b[2]) || (a[1] - b[1]) || (a[0] - b[0]));
      return notes.map((item) => item.join(':')).join('|');
    }
  }

  const bytes = new Uint8Array(midiBuffer);
  const sampled = [];
  for (let i = 0; i < bytes.length; i += 8) {
    sampled.push(bytes[i]);
  }
  return sampled.join('-');
}

export function deriveMidiKeyMaterial(midiBuffer) {
  const CryptoJS = getCryptoJS();
  const normalized = extractNormalizedMidiSequence(midiBuffer);
  const digest = CryptoJS.SHA256(normalized).toString(CryptoJS.enc.Hex);
  return {
    normalized,
    digest
  };
}
