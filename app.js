import { createAppStore } from './services/state.js';
import { encryptCapsule, decryptCapsule, saveBinaryAsFile } from './services/crypto.js';
import { dispatchCapsule } from './services/dispatcher.js';
import { initCanvasUI } from './ui/canvas.js';
import { initAudioUI } from './ui/audio.js';

const SONG_COUNT = 16;

const store = createAppStore({
  sandboxMode: 'SAFE'
});

const els = {
  status: document.getElementById('status'),
  cipherHash: document.getElementById('cipherHash'),
  typingInput: document.getElementById('typingInput'),
  decryptedOutput: document.getElementById('decryptedOutput'),
  inputSection: document.getElementById('inputSection'),
  outputSection: document.getElementById('outputSection'),
  songNumber: document.getElementById('songNumber'),
  encryptButton: document.getElementById('encryptButton'),
  downloadBtn: document.getElementById('downloadBtn'),
  decryptButton: document.getElementById('decryptButton'),
  fileInput: document.getElementById('fileInput'),
  dropArea: document.getElementById('dropArea'),
  dropText: document.getElementById('dropText')
};

function status(text, hash = null) {
  store.setState({ statusText: text, ...(hash ? { cipherHash: hash } : {}) });
}

function createVirtualMidiBuffer(songNumber) {
  const seed = String(songNumber || '0');
  const bytes = new Uint8Array(2048);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = (seed.charCodeAt(i % seed.length) + (i * 17)) & 0xff;
  }
  return bytes.buffer;
}

function maybeEnableEncrypt() {
  const enabled = Boolean(els.songNumber.value) && Boolean(els.typingInput.value.trim());
  els.encryptButton.disabled = !enabled;
}

function syncView(state) {
  if (els.status) els.status.textContent = state.statusText;
  if (els.cipherHash) els.cipherHash.textContent = state.cipherHash;

  const hasCapsule = Boolean(state.activeCapsuleData);
  if (els.downloadBtn) els.downloadBtn.classList.toggle('hidden', !hasCapsule);
  if (els.decryptButton) els.decryptButton.classList.toggle('hidden', !hasCapsule);

  if (els.decryptedOutput) {
    els.decryptedOutput.value = state.decryptedText || '';
  }

  const showOutput = Boolean(state.decryptedText);
  if (els.outputSection) els.outputSection.classList.toggle('hidden', !showOutput);
  if (els.inputSection) els.inputSection.classList.toggle('hidden', showOutput);
}

async function ensureMidiLoaded() {
  const current = store.getState().activeMidiBuffer;
  if (current) return current;

  const selected = els.songNumber.value;
  if (!selected || Number(selected) < 1 || Number(selected) > SONG_COUNT) {
    throw new Error('Select a harmonic key first.');
  }

  const virtualBuffer = createVirtualMidiBuffer(selected);
  store.setState({ activeMidiBuffer: virtualBuffer });
  return virtualBuffer;
}

async function handleEncrypt() {
  try {
    const text = els.typingInput.value.trim();
    if (!text) throw new Error('Payload cannot be empty.');

    const midiBuffer = await ensureMidiLoaded();
    const result = encryptCapsule(text, midiBuffer);

    let receipt = null;
    if (text.startsWith('#!')) {
      receipt = await dispatchCapsule(text, {
        mode: store.getState().sandboxMode,
        allowExecJs: false
      });
      store.appendReceipt(receipt);
    }

    store.setState({
      activeCapsuleData: result.payload.buffer.slice(result.payload.byteOffset, result.payload.byteOffset + result.payload.byteLength),
      decryptedText: '',
      cipherHash: `SIG: ${result.hashHex}`,
      statusText: receipt ? `CAPSULE SEALED + DISPATCH RECEIPT ${receipt.hash.slice(0, 10)}` : 'CAPSULE SEALED',
      playbackToken: Date.now()
    });
  } catch (error) {
    status(`ERROR: ${error.message}`);
  }
}

async function handleDecrypt() {
  try {
    const state = store.getState();
    if (!state.activeCapsuleData) throw new Error('Load or generate a .slayy capsule first.');
    const midiBuffer = await ensureMidiLoaded();

    const result = decryptCapsule(state.activeCapsuleData, midiBuffer);
    const nextState = {
      decryptedText: result.plaintext,
      statusText: 'ACOUSTIC REVEAL COMPLETE',
      playbackToken: Date.now()
    };

    if (result.plaintext.startsWith('#!')) {
      const receipt = await dispatchCapsule(result.plaintext, {
        mode: state.sandboxMode,
        allowExecJs: false
      });
      store.appendReceipt(receipt);
      nextState.statusText = `ACOUSTIC REVEAL + RECEIPT ${receipt.hash.slice(0, 10)}`;
    }

    store.setState(nextState);
  } catch (error) {
    status(`ERROR: ${error.message}`);
  }
}

function handleSave() {
  const data = store.getState().activeCapsuleData;
  if (!data) {
    status('ERROR: NO CAPSULE TO SAVE');
    return;
  }
  saveBinaryAsFile(data, 'gas-lighting.slayy');
  status('CAPSULE EXPORTED');
}

async function handleSlayyFile(file) {
  if (!file) return;
  const arrayBuffer = await file.arrayBuffer();
  store.setState({
    activeCapsuleData: arrayBuffer,
    decryptedText: '',
    statusText: `LOADED ${file.name.toUpperCase()}`
  });
}

function bindEvents() {
  els.songNumber?.addEventListener('change', () => {
    store.setState({
      activeMidiBuffer: els.songNumber.value ? createVirtualMidiBuffer(els.songNumber.value) : null,
      statusText: els.songNumber.value ? `HARMONIC KEY ${els.songNumber.value} LOCKED` : 'SYSTEM READY'
    });
    maybeEnableEncrypt();
  });

  els.typingInput?.addEventListener('input', maybeEnableEncrypt);
  els.encryptButton?.addEventListener('click', handleEncrypt);
  els.decryptButton?.addEventListener('click', handleDecrypt);
  els.downloadBtn?.addEventListener('click', handleSave);

  els.fileInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    await handleSlayyFile(file);
  });

  const prevent = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((type) => {
    els.dropArea?.addEventListener(type, prevent);
  });

  els.dropArea?.addEventListener('drop', async (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.slayy')) {
      await handleSlayyFile(file);
      if (els.fileInput) {
        const dt = new DataTransfer();
        dt.items.add(file);
        els.fileInput.files = dt.files;
      }
      if (els.dropText) els.dropText.textContent = file.name;
    } else {
      status('ERROR: ONLY .SLAYY FILES ARE ACCEPTED');
    }
  });
}

store.subscribe(syncView);
initCanvasUI(store, 'gameboard');
initAudioUI(store);
bindEvents();
maybeEnableEncrypt();
