import { createAppStore } from '../services/state.js';
import { dispatchCapsule } from '../services/dispatcher.js';

const store = createAppStore({
  sandboxMode: 'SAFE',
  telemetryOn: true,
  pinnedNonce: false,
  sessionNonce: makeNonce(),
  jsExecutionEnabled: false,
  aggregate: { total: 0, fired: 0, quarantined: 0, errors: 0, types: {} }
});

const el = (id) => document.getElementById(id);

function makeNonce() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function logLine(tag, text) {
  const node = document.createElement('div');
  node.className = `line ${tag}`;
  node.textContent = text;
  el('log')?.prepend(node);
}

function updateAggregate(receipt) {
  store.update((prev) => {
    const next = { ...prev.aggregate };
    next.total += 1;
    next.fired += receipt.firedCount;
    next.quarantined += receipt.quarantinedCount;
    next.errors += receipt.errorCount;
    for (const action of receipt.actions) {
      next.types[action.type] = (next.types[action.type] || 0) + 1;
    }
    return { ...prev, aggregate: next };
  });
}

function renderInsights(state) {
  el('iTotal').textContent = String(state.aggregate.total);
  el('iFired').textContent = String(state.aggregate.fired);
  el('iQuarantined').textContent = String(state.aggregate.quarantined);
  el('iErrors').textContent = String(state.aggregate.errors);

  const typesHost = el('insightTypes');
  if (typesHost) {
    typesHost.innerHTML = '';
    Object.entries(state.aggregate.types)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const chip = document.createElement('div');
        chip.className = 'insight';
        chip.innerHTML = `<div class="n">${count}</div><div class="l">${type}</div>`;
        typesHost.appendChild(chip);
      });
  }
}

function syncPills(state) {
  const mode = state.sandboxMode;
  const telemetry = state.telemetryOn ? 'ON' : 'OFF';
  el('modePill').textContent = `MODE: ${mode}`;
  el('modePill').className = `pill ${mode === 'ARMED' ? 'armed' : 'on'}`;
  el('modeToggle').textContent = mode === 'SAFE' ? 'MODE: SAFE → ARM' : 'MODE: ARMED → SAFE';
  el('telemetryPill').textContent = `TELEMETRY: ${telemetry}`;
  el('telemetryPill').className = `pill ${state.telemetryOn ? 'on' : 'off'}`;
  el('telemetryToggle').textContent = state.telemetryOn ? 'TELEMETRY: ON → OPT OUT' : 'TELEMETRY: OFF → OPT IN';
  el('jsPill').textContent = `SCRIPT TEXT: ${state.jsExecutionEnabled ? 'ALLOWED' : 'BLOCKED'}`;
  el('jsPill').className = `pill ${state.jsExecutionEnabled ? 'armed' : 'off'}`;
  el('noncePinPill').textContent = `PIN: ${state.pinnedNonce ? 'PINNED' : 'UNPINNED'}`;
  el('noncePinPill').className = `pill ${state.pinnedNonce ? 'on' : 'off'}`;
  el('sessionNonce').textContent = state.sessionNonce;
}

function renderExamples() {
  const examples = [
    { title: 'Hint', body: '#!exec:hint:welcome, scanner.' },
    { title: 'Gunicorn', body: '#!exec:gunicorn:phase_3 unlocked' },
    { title: 'Open', body: '#!exec:open:https://musha1140.github.io/' },
    { title: 'Multi', body: '#!multi:["#!exec:hint:stage 1","#!exec:gunicorn:stage 2"]' },
    { title: 'Lab', body: '#!exec:lab:{"version":1,"title":"LAB","nodes":[{"id":"one","label":"Front Door","href":"https://musha1140.github.io/"}]}' }
  ];

  const host = el('examples');
  if (!host) return;
  host.innerHTML = '';

  examples.forEach((item) => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = item.title;
    button.addEventListener('click', () => {
      el('capsuleInput').value = item.body;
    });
    host.appendChild(button);
  });
}

function renderLab(manifest, armed) {
  const host = el('hopsChain');
  if (!host) return;
  host.innerHTML = '';

  const nodes = Array.isArray(manifest?.nodes) ? manifest.nodes : [];
  nodes.forEach((node) => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = `${node.label || node.id || 'node'} → ${node.href || ''}`;
    button.disabled = !armed;
    button.addEventListener('click', () => {
      if (!armed) return;
      if (node.href && confirm(`Navigate to ${node.href}?`)) {
        location.href = node.href;
      }
    });
    host.appendChild(button);
  });
}

function executeFiredActions(receipt) {
  const armed = store.getState().sandboxMode === 'ARMED';
  receipt.actions.forEach((action) => {
    logLine('dispatch', `${action.type} → ${action.status}`);
    if (action.status !== 'fired') return;

    if (action.type === 'hint') {
      logLine('effect', `hint: ${action.payload}`);
    } else if (action.type === 'gunicorn') {
      logLine('effect', `gunicorn: ${action.payload}`);
    } else if (action.type === 'lab') {
      renderLab(action.payload, armed);
      logLine('effect', `lab rendered: ${action.nodes || 0} node(s)`);
    } else if (['hop', 'open', 'redirect'].includes(action.type)) {
      if (confirm(`Confirm ${action.type} to ${action.payload}?`)) {
        if (action.type === 'open') {
          window.open(action.payload, '_blank', 'noopener,noreferrer');
        } else {
          location.href = action.payload;
        }
      }
    }
  });
}

async function runCapsule() {
  const capsule = el('capsuleInput').value;
  const state = store.getState();
  const nonce = state.pinnedNonce ? state.sessionNonce : makeNonce();

  const receipt = await dispatchCapsule(capsule, {
    mode: state.sandboxMode,
    allowExecJs: state.jsExecutionEnabled,
    nonce
  });

  if (state.telemetryOn) {
    store.appendReceipt(receipt);
  }

  updateAggregate(receipt);

  logLine('receipt', `hash=${receipt.hash.slice(0, 16)} nonce=${receipt.nonce} fired=${receipt.firedCount} quarantined=${receipt.quarantinedCount} errors=${receipt.errorCount}`);
  receipt.parserTrace.forEach((trace) => logLine('parse', trace));

  executeFiredActions(receipt);
}

function exportTelemetry() {
  const data = store.getState().telemetryReceipts;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sandbox-telemetry.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  el('runBtn')?.addEventListener('click', runCapsule);
  el('modeToggle')?.addEventListener('click', () => {
    store.setState({ sandboxMode: store.getState().sandboxMode === 'SAFE' ? 'ARMED' : 'SAFE' });
  });
  el('telemetryToggle')?.addEventListener('click', () => {
    store.setState({ telemetryOn: !store.getState().telemetryOn });
  });
  el('newNonceBtn')?.addEventListener('click', () => {
    store.setState({ sessionNonce: makeNonce() });
  });
  el('pinNonceBtn')?.addEventListener('click', () => {
    store.setState({ pinnedNonce: !store.getState().pinnedNonce });
  });
  el('resetSessionBtn')?.addEventListener('click', () => {
    store.setState({
      telemetryReceipts: [],
      aggregate: { total: 0, fired: 0, quarantined: 0, errors: 0, types: {} },
      sessionNonce: makeNonce()
    });
    el('log').innerHTML = '';
    el('hopsChain').innerHTML = '';
  });
  el('clearBtn')?.addEventListener('click', () => {
    el('log').innerHTML = '';
  });
  el('exportBtn')?.addEventListener('click', exportTelemetry);
}

store.subscribe((state) => {
  syncPills(state);
  renderInsights(state);
});

renderExamples();
bindEvents();
logLine('dispatch', 'sandbox dispatcher online');
