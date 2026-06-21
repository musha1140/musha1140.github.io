const DEFAULT_STATE = {
  activeMidiBuffer: null,
  activeCapsuleData: null,
  sandboxMode: 'SAFE',
  telemetryReceipts: [],
  statusText: 'SYSTEM READY',
  cipherHash: 'SIG: NONE',
  decryptedText: '',
  jsExecutionEnabled: false,
  playbackToken: 0
};

export function createAppStore(initial = {}) {
  let state = { ...DEFAULT_STATE, ...initial };
  const listeners = new Set();

  function getState() {
    return state;
  }

  function emit() {
    for (const listener of listeners) {
      listener(state);
    }
    document.dispatchEvent(new CustomEvent('onStateChange', { detail: state }));
  }

  function setState(partial) {
    state = { ...state, ...partial };
    emit();
    return state;
  }

  function update(updater) {
    state = updater(state);
    emit();
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(state);
    return () => listeners.delete(listener);
  }

  function appendReceipt(receipt) {
    return update((prev) => ({
      ...prev,
      telemetryReceipts: [...prev.telemetryReceipts, receipt]
    }));
  }

  return {
    getState,
    setState,
    update,
    subscribe,
    appendReceipt
  };
}

export function toArrayBuffer(input) {
  if (input instanceof ArrayBuffer) return input;
  if (ArrayBuffer.isView(input)) return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  throw new Error('Expected ArrayBuffer or TypedArray');
}
