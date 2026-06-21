const TYPE_RE = /^[a-z][a-z0-9-]{0,15}$/;
const URL_TYPES = new Set(['hop', 'open', 'redirect']);
const EXEC_ALLOWED = new Set(['hint', 'gunicorn', 'hop', 'open', 'redirect', 'lab', 'js', 'safe']);

function nowISO() {
  return new Date().toISOString();
}

function makeNonce() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizeMode(mode) {
  return String(mode || 'SAFE').toUpperCase() === 'ARMED' ? 'ARMED' : 'SAFE';
}

export function parseCapsuleEnvelope(input) {
  const trace = [];
  const text = String(input ?? '').trim();

  if (!text.startsWith('#!')) {
    trace.push('reject: missing #! prefix');
    return { ok: false, error: 'missing #! prefix', trace };
  }

  const payload = text.slice(2);
  const colonIndex = payload.indexOf(':');
  if (colonIndex < 1) {
    trace.push('reject: missing type/body delimiter');
    return { ok: false, error: 'missing type/body delimiter', trace };
  }

  const type = payload.slice(0, colonIndex).toLowerCase();
  const body = payload.slice(colonIndex + 1);
  trace.push(`type=${type}`);
  trace.push(`body_length=${body.length}`);

  if (!TYPE_RE.test(type)) {
    trace.push('reject: invalid type');
    return { ok: false, error: 'invalid type', trace };
  }

  return { ok: true, type, body, trace };
}

function summarizeActions(actions) {
  const tally = { fired: 0, quarantined: 0, errors: 0 };
  for (const action of actions) {
    if (action.status === 'fired') tally.fired += 1;
    if (action.status === 'quarantined') tally.quarantined += 1;
    if (action.status === 'error') tally.errors += 1;
  }
  return tally;
}

function parseExecBody(body) {
  const splitAt = body.indexOf(':');
  if (splitAt < 1) {
    return { ok: false, error: 'missing exec subtype delimiter' };
  }
  const subtype = body.slice(0, splitAt).toLowerCase();
  const payload = body.slice(splitAt + 1);
  if (!TYPE_RE.test(subtype)) {
    return { ok: false, error: 'invalid exec subtype' };
  }
  return { ok: true, subtype, payload };
}

function parseUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, error: 'unsupported protocol' };
    }
    return { ok: true, href: url.href };
  } catch {
    return { ok: false, error: 'invalid URL' };
  }
}

function buildAction(type, payload, mode, allowExecJs) {
  const armed = mode === 'ARMED';

  if (type === 'safe') {
    return { type, payload, status: 'quarantined', reason: 'safe subtype forces quarantine' };
  }

  if (type === 'js' && !allowExecJs) {
    return { type, payload, status: 'quarantined', reason: 'exec:js blocked' };
  }

  if (URL_TYPES.has(type)) {
    const parsedUrl = parseUrl(payload);
    if (!parsedUrl.ok) {
      return { type, payload, status: 'error', reason: parsedUrl.error };
    }
    if (!armed) {
      return { type, payload: parsedUrl.href, status: 'quarantined', reason: 'SAFE mode' };
    }
    return { type, payload: parsedUrl.href, status: 'fired', requiresConfirmation: true };
  }

  if (type === 'lab') {
    try {
      const manifest = JSON.parse(payload);
      const nodes = Array.isArray(manifest.nodes) ? manifest.nodes.length : 0;
      if (!armed) {
        return { type, payload: manifest, status: 'quarantined', reason: 'SAFE preview', nodes };
      }
      return { type, payload: manifest, status: 'fired', nodes };
    } catch {
      return { type, payload, status: 'error', reason: 'invalid lab JSON' };
    }
  }

  if (!armed) {
    return { type, payload, status: 'quarantined', reason: 'SAFE mode' };
  }

  return { type, payload, status: 'fired' };
}

async function dispatchSingle(parsed, options, depth = 0) {
  const mode = normalizeMode(options.mode);
  const allowExecJs = Boolean(options.allowExecJs);
  const actions = [];
  const parserTrace = [...parsed.trace, `mode=${mode}`, `depth=${depth}`];
  const childReceipts = [];

  if (parsed.type === 'multi') {
    try {
      const arr = JSON.parse(parsed.body);
      if (!Array.isArray(arr)) {
        throw new Error('multi body must be array');
      }
      parserTrace.push(`multi_count=${arr.length}`);
      for (const child of arr) {
        const childReceipt = await dispatchCapsule(child, options, depth + 1);
        childReceipts.push(childReceipt);
      }
    } catch (error) {
      actions.push({ type: 'multi', payload: parsed.body, status: 'error', reason: error.message });
    }
  } else if (parsed.type === 'exec') {
    const exec = parseExecBody(parsed.body);
    if (!exec.ok) {
      actions.push({ type: 'exec', payload: parsed.body, status: 'error', reason: exec.error });
    } else if (!EXEC_ALLOWED.has(exec.subtype)) {
      actions.push({ type: exec.subtype, payload: exec.payload, status: 'quarantined', reason: 'unsupported subtype' });
    } else {
      actions.push(buildAction(exec.subtype, exec.payload, mode, allowExecJs));
      parserTrace.push(`exec_subtype=${exec.subtype}`);
    }
  } else {
    actions.push(buildAction(parsed.type, parsed.body, mode, allowExecJs));
  }

  const nested = childReceipts.reduce((acc, child) => {
    acc.fired += child.firedCount;
    acc.quarantined += child.quarantinedCount;
    acc.errors += child.errorCount;
    return acc;
  }, { fired: 0, quarantined: 0, errors: 0 });

  const own = summarizeActions(actions);
  return {
    mode,
    parserTrace,
    actions,
    childReceipts,
    firedCount: own.fired + nested.fired,
    quarantinedCount: own.quarantined + nested.quarantined,
    errorCount: own.errors + nested.errors
  };
}

export async function dispatchCapsule(plaintext, options = {}, depth = 0) {
  const nonce = options.nonce || makeNonce();
  const timestamp = nowISO();
  const parsed = parseCapsuleEnvelope(plaintext);

  let dispatchResult;
  if (!parsed.ok) {
    dispatchResult = {
      mode: normalizeMode(options.mode),
      parserTrace: parsed.trace,
      actions: [{ type: 'parse', payload: plaintext, status: 'error', reason: parsed.error }],
      childReceipts: [],
      firedCount: 0,
      quarantinedCount: 0,
      errorCount: 1
    };
  } else {
    dispatchResult = await dispatchSingle(parsed, options, depth);
  }

  const hashInput = JSON.stringify({ nonce, timestamp, plaintext, mode: dispatchResult.mode, depth });
  const hash = await sha256Hex(hashInput);

  return {
    nonce,
    hash,
    timestamp,
    mode: dispatchResult.mode,
    parserTrace: dispatchResult.parserTrace,
    actions: dispatchResult.actions,
    childReceipts: dispatchResult.childReceipts,
    firedCount: dispatchResult.firedCount,
    quarantinedCount: dispatchResult.quarantinedCount,
    errorCount: dispatchResult.errorCount
  };
}
