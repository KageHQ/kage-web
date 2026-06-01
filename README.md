# kage-web

The zero-knowledge KYC verifier UI — scans a mobile QR code, submits the Groth16 proof to the Solana program, and shows the result. Stores **no PII**.

---

## Where it fits

```
Mobile (PII, on-device proof)
  → QR code (proof + public signals, no PII)
    → kage-web  ← YOU ARE HERE
      → kage-program (on-chain Groth16 verify + nullifier PDA)
```

A user proves they hold a valid Indonesian KTP and are age ≥ 18 without revealing NIK, name, or DOB. This verifier learns only `pass` and a sybil-resistant nullifier — it never sees personal data.

---

## What it does

| Module | Role |
|---|---|
| `src/qrDecode.js` | Wraps `decodeProofPayload` from `@kagehq/shared`; turns raw QR text into `{ proof, publicSignals }`. |
| `src/submit.js` | Formats the snarkjs proof to the 256-byte on-chain layout expected by `groth16-solana` (negated A-y, imaginary-first G2), derives the nullifier PDA, and calls the Anchor `verify` instruction via `@coral-xyz/anchor`. |
| `src/store.js` | In-memory store that can only hold `{ result, wallet, nullifier, slot, timestampLocal }` — the schema has no PII fields by construction. |
| `src/App.jsx` | Activates the rear camera via `html5-qrcode` at 10 fps / 280 px viewfinder. On each successful scan it calls `parseScannedPayload`, records the pass via the store, and renders a side-by-side contrast panel (Traditional KYC vs. proven-kyc). |

---

## Install

`@kagehq/shared` is published to GitHub Packages. Create `.npmrc` (do **not** commit it):

```
@kagehq:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

The PAT needs `read:packages` scope.

Then install dependencies:

```sh
pnpm install
```

---

## Run

```sh
pnpm dev
```

Vite starts at **http://localhost:5173**.

> Camera access requires `localhost` or HTTPS — `http://` over a network will be blocked by the browser.

---

## Test

```sh
pnpm test
```

Runs the Vitest suite once (`vitest run`).

---

## Prerequisites

- A running Solana validator with `kage-program` deployed, listening on `:8899` (e.g. `surfpool` simnet).
- Point the Anchor provider in the app at that RPC endpoint before scanning.

---

## Privacy note

`src/store.js` records only:

```json
{
  "result": "pass",
  "wallet": "<public key>",
  "nullifier": "<public signal[5]>",
  "slot": 0,
  "timestampLocal": "2026-06-01T00:00:00.000Z"
}
```

No NIK, no name, no date of birth, no address. A breach of this verifier leaks nothing useful.

---

## Sibling repos

| Repo | Role |
|---|---|
| [kage-shared](https://github.com/KageHQ/kage-shared) | Shared types, `decodeProofPayload`, and circuit constants |
| [kage-circuits](https://github.com/KageHQ/kage-circuits) | Circom circuits + trusted setup (Groth16) |
| [kage-issuer](https://github.com/KageHQ/kage-issuer) | Issues signed KTP credentials to the mobile app |
| [kage-program](https://github.com/KageHQ/kage-program) | Anchor program — on-chain Groth16 verify + nullifier PDA |
| [kage-mobile](https://github.com/KageHQ/kage-mobile) | Mobile app — holds PII, generates proof on-device |
| [kage-e2e](https://github.com/KageHQ/kage-e2e) | End-to-end tests: issuer → proof → QR → on-chain |
