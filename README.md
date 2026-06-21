# musha1140.github.io — Gas-Lighting Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Site](https://img.shields.io/website?url=https%3A%2F%2Fmusha1140.github.io&label=site&style=flat)](https://musha1140.github.io)
[![Hosted on](https://img.shields.io/badge/hosted-GitHub%20Pages-181717?logo=github)](https://pages.github.com/)
[![Static](https://img.shields.io/badge/build-static-blue)](#directory-map)
[![Redirect from](https://img.shields.io/badge/redirect%20from-gas--lighting.com-ec4899)](https://gas-lighting.com)
[![Status](https://img.shields.io/badge/protocol-experimental-orange)](#disclaimer--liability)

> `musha1140.github.io` is the canonical destination for **gas-lighting.com**.
> Treat any link, share, QR code, or sub-path on this domain as part of the
> same publication surface as `gas-lighting.com`, including subdirectories
> (`/kilo/`, `/sandbox/`, etc.).

---

## Overview

This site publishes a small family of related experiments around the same
idea: **a song is a key**. A user picks a MIDI track, the track derives a
cryptographic key, and arbitrary text gets encrypted into a shareable
artifact whose plaintext is only recoverable by the same song.

There are three surfaces, each progressively more interactive:

| Path | Role | State |
| --- | --- | --- |
| `/` | Redirect entrypoint to the Next UI landing page. | Static redirect (`index.html` → `/nextui/`). |
| `/nextui/` | Primary landing page for gas-lighting.com on GitHub Pages. | Static, single file (`nextui/index.html`). |
| `/about/` | Company profile page for Gas-lighting LLC. | Static, single file (`about/index.html`). |
| `/kilo/` | Non-static, functional, full version of the protocol — capsule dispatcher, `#!exec:` handlers, share-link decryption, hop chains. | Lives in a separate codebase; this repo only links to it. |
| `/sandbox/` | **HOPS Sandbox**: capsule-injection playground. Mirror of `/kilo/`'s dispatcher *without* the encryption layer, for studying the protocol mechanic in isolation. Verbose telemetry, SAFE/ARMED modes, HOP labyrinth deck (`#!exec:lab:`). | Static, single file (`sandbox/index.html`). |

---

## Directory map

```
/                  → index.html             Redirect to /nextui/
/nextui/           → nextui/index.html      Primary landing page
/about/            → about/index.html       Company profile page
/sandbox/          → sandbox/index.html     HOPS capsule injection playground
/kilo/             → (external app)         Full functional version of the protocol
404.html           → soft-404 with the same chrome as the front door
indexold.html      → historical snapshot of an earlier UI revision
```

---

## The HOPS Sandbox in one paragraph

A **capsule** is a plaintext with envelope `#!TYPE:BODY`. In `/kilo/` the
plaintext only appears after decrypting a share link with the right MIDI.
The dispatcher then routes the capsule by type to a handler. The cipher
proves who sent it; the **capability cage** decides what it touches.
`/sandbox/` exposes the dispatcher without the crypto so visitors can
author, run, and study capsules safely. Every run produces a verbose
receipt (parser trace, SHA-256, per-run nonce, fired vs quarantined),
collected as in-memory, opt-out telemetry. SAFE mode is the default;
ARMED mode lets `hint:`, `gunicorn:`, `hop:`, `open:`, `redirect:`, and
`lab:` actually fire. The richest type is `#!exec:lab:` — a JSON
manifest that turns the message into a setlist of guarded HOPs.

---

## Third-party libraries

All third-party code is loaded from public CDNs at runtime; nothing is
vendored into this repository. Credit and links below.

| Library | Version | Used by | Source | License |
| --- | --- | --- | --- | --- |
| [Tone.js](https://tonejs.github.io/) | latest | `/` | [unpkg](https://unpkg.com/tone@latest) · [npm](https://www.npmjs.com/package/tone) | MIT |
| [@tonejs/midi](https://github.com/Tonejs/Midi) | latest | `/` | [jsDelivr](https://cdn.jsdelivr.net/npm/@tonejs/midi) · [npm](https://www.npmjs.com/package/@tonejs/midi) | MIT |
| [p5.js](https://p5js.org/) | 1.4.1 | `/` | [cdnjs](https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.1/p5.min.js) · [npm](https://www.npmjs.com/package/p5) | LGPL-2.1 |
| [crypto-js](https://github.com/brix/crypto-js) | 4.1.1 | `/` | [cdnjs](https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js) · [npm](https://www.npmjs.com/package/crypto-js) | MIT |
| [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) | 1.4.4 | `/` | [cdnjs](https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js) · [npm](https://www.npmjs.com/package/qrcode-generator) | MIT |
| [Tailwind CSS](https://tailwindcss.com/) | 2.2.19 | `/`, `/sandbox/` | [jsDelivr](https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css) · [npm](https://www.npmjs.com/package/tailwindcss) | MIT |

The HOPS sandbox additionally uses only browser-native primitives:
[`crypto.subtle`](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
for SHA-256, [`crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)
for nonce generation, and `localStorage` for visited-hop tracking
(`kilo_hop_visited`).

MIDI assets are fetched from `irp.cdn-website.com` (the author's hosted
asset CDN) and are referenced, not redistributed, here.

---

## Local development

The whole repository is plain static HTML. No build step, no package
manager, no installer.

```bash
git clone https://github.com/musha1140/musha1140.github.io
cd musha1140.github.io
python3 -m http.server 8080
# open http://localhost:8080/
# open http://localhost:8080/sandbox/
```

Pushing to `main` republishes via GitHub Pages.

---

## Licensing

This repository is released under the **MIT License** — see
[`LICENSE`](./LICENSE) for the full text.

Third-party libraries listed in [Third-party libraries](#third-party-libraries)
remain under their own respective licenses; this project does not
relicense them.

---

## Disclaimer & Liability

This site (`musha1140.github.io`), its `gas-lighting.com` alias, and
every subdirectory under either domain — including but not limited to
`/`, `/kilo/`, `/sandbox/`, and any future paths — are published as
**experimental, educational artifacts**. They demonstrate cryptographic
and protocol-design concepts and are explicitly **not** intended for
protecting sensitive information, for use in production systems, or as
a basis for security claims about any third party.

The HOPS Sandbox (`/sandbox/`) intentionally exposes a capability
dispatcher (`#!exec:hint`, `#!exec:hop`, `#!exec:redirect`, `#!exec:open`,
`#!exec:gunicorn`, `#!exec:js`, `#!exec:lab`, `#!multi`) for teaching
purposes. It is the visitor's responsibility to understand what each
capsule does before running it in ARMED mode. Defaults are SAFE
(quarantined receipts only). The `#!exec:js` handler is double-gated
behind an explicit toggle and a confirmation dialog. Telemetry is
in-memory and opt-out; nothing is transmitted off the visitor's device
by the sandbox itself.

### Corporate notice

The publisher of this site operates under the following legal entity:

| Field | Value |
| --- | --- |
| Company name | GAS-LIGHTING, LLC |
| Company number | LLC_15258268 |
| Native company number | 15258268 |
| Status | Good standing |
| Entity type | Limited Liability Company |
| Jurisdiction | Illinois, United States |

Registered-agent details, registered street addresses, and the names
and addresses of any directors, officers, or members are intentionally
**redacted** from this README. Official records are publicly available
through the Illinois Secretary of State's business records system for
anyone with a legitimate need to inspect them.

### Limitation of liability

By accessing, sharing, embedding, or otherwise interacting with
`musha1140.github.io`, `gas-lighting.com`, or any subdirectory or
artifact thereof (including share links, `.slayy` files, capsule
plaintexts, and HOP manifests), you acknowledge and agree that:

1. The software is provided **"AS IS"** under the MIT License, without
   warranty of any kind, express or implied, including but not limited
   to warranties of merchantability, fitness for a particular purpose,
   and non-infringement.
2. **In no event** shall GAS-LIGHTING, LLC, its members, officers,
   agents, contractors, or any contributor to this repository be liable
   for any claim, damages, loss, or other liability — whether in
   contract, tort, or otherwise — arising from, out of, or in
   connection with the software, this site, any subdirectory, any
   linked external resource, or the use or other dealings in any of the
   foregoing.
3. Use of the HOPS Sandbox's ARMED mode, `#!exec:js` evaluation, or
   any capsule that triggers navigation (`hop:`, `redirect:`, `open:`,
   `lab:`) is undertaken at your sole risk. You are responsible for
   inspecting capsule plaintexts before arming them.
4. Nothing on this site constitutes a security audit, certification,
   compliance attestation, or professional advice of any kind.

If you do not agree with the above, do not access or interact with
this site.

---

**© Gas-Lighting, LLC.** Code released under MIT. Concept, copy, and
the protocol mechanic remain the work of the author.
