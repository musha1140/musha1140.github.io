let activeToken = null;

async function playMidiBuffer(midiBuffer) {
  if (!globalThis.Tone || !globalThis.Midi) return;

  await globalThis.Tone.start();
  const midi = new globalThis.Midi(midiBuffer);
  const synth = new globalThis.Tone.PolySynth(globalThis.Tone.Synth).toDestination();

  const now = globalThis.Tone.now();
  let count = 0;
  midi.tracks.forEach((track) => {
    (track.notes || []).forEach((note) => {
      if (count >= 40) return;
      synth.triggerAttackRelease(note.name, Math.max(note.duration, 0.08), now + note.time, Math.min(note.velocity || 0.7, 0.9));
      count += 1;
    });
  });

  if (count === 0) {
    synth.triggerAttackRelease('C4', '8n', now, 0.6);
  }
}

export function initAudioUI(store) {
  return store.subscribe(async (state) => {
    if (!state.playbackToken || state.playbackToken === activeToken) return;
    activeToken = state.playbackToken;
    if (!state.activeMidiBuffer) return;

    try {
      await playMidiBuffer(state.activeMidiBuffer);
    } catch {
      // Ignore playback failures to keep crypto/storage independent.
    }
  });
}
