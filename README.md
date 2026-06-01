<h1 align="center">kage-web</h1>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Solana-000?style=flat-square&logo=solana&logoColor=14F195" alt="Solana">
  <img src="https://img.shields.io/badge/Zero--Knowledge-6E56CF?style=flat-square" alt="Zero-Knowledge">
</p>

The zero-knowledge KYC verifier UI. A user types a 6-digit relay code, the app fetches the Groth16 proof from the issuer, submits it on-chain to the Solana program, and shows **pass** or **replay rejected** — storing **no PII**.

A user proves they hold a valid Indonesian KTP and are age ≥ 18 without revealing NIK, name, or DOB. This verifier learns only a `pass` result and a sybil-resistant nullifier; it never sees personal data.

> **No camera required.** The proof payload is too dense for reliable webcam scanning, so transport is a 6-digit relay code the mobile prover obtains from the issuer after submitting its proof.

## Where it fits

```
Mobile (PII stays on-device)
  → POST /prove  (server-side proof generation via issuer)
    → POST /relay  (issuer publishes proof, returns 6-digit code)
      → User types code into kage-web  ← YOU ARE HERE
        → GET /relay/:code  (fetch encoded payload from issuer)
          → decode payload (@kagehq/shared)
            → submitProof on-chain
              → kage-program (Groth16 verify + nullifier PDA)
```

## How it works

1. **Enter code** — `src/App.jsx` renders a numeric input; the user types the 6-digit code shown on the prover's phone.
2. **Fetch** — `fetchAndVerify()` calls `GET ${VITE_ISSUER_URL}/relay/:code`. The issuer returns `{ payload }`, a compact encoded string.
3. **Decode** — `handlePayload()` passes the payload string to `parseScannedPayload` (`src/qrDecode.js`), which delegates to `decodeProofPayload` from `@kagehq/shared` to recover `{ proof, publicSignals }`.
4. **Submit on-chain** — `submitProof` (`src/submit.js`) formats the snarkjs proof to the 256-byte layout expected by `groth16-solana` (negated A-y, imaginary-first G2 coords), derives the nullifier PDA, and calls the Anchor `verify` instruction via `@coral-xyz/anchor`.
5. **Result** — `pass` if the transaction confirms; `replay rejected` if the nullifier PDA already exists (nullifier reuse caught on-chain).

### Key modules

| Module | Role |
|---|---|
| `src/App.jsx` | 6-digit code input + Verify button; orchestrates fetch → decode → submit; renders the pass/replay result and the side-by-side privacy contrast panel. |
| `src/qrDecode.js` | Thin wrapper around `decodeProofPayload` from `@kagehq/shared`; turns the relay payload string into `{ proof, publicSignals }`. |
| `src/submit.js` | Formats the snarkjs proof to the 256-byte on-chain layout, derives the nullifier PDA from `publicSignals[5]`, and calls the Anchor `verify` instruction. |
| `src/solana.js` | Loads (or generates) a burner `Keypair` from `localStorage`, builds an `AnchorProvider` + `Program` from `@kagehq/program-idl`, and exposes `ensureFunded` for auto-airdrop on local/surfpool validators. |
| `src/store.js` | In-memory store; records only `{ result, wallet, nullifier, slot, timestampLocal }` — no PII fields by construction. |

## Config

| Variable | Default | Purpose |
|---|---|---|
| `VITE_ISSUER_URL` | `http://localhost:4000` | Base URL of the kage-issuer (relay endpoint). |
| `VITE_RPC_URL` | `http://localhost:8899` | Solana RPC endpoint. Points at a surfpool simnet locally. |

The browser burner wallet is stored in `localStorage` under `kage-verifier-burner`. `ensureFunded` auto-airdrops 2 SOL when the balance falls below 1 SOL — this only works on a local or surfpool validator that accepts `requestAirdrop`.

## Install

`@kagehq/shared` and `@kagehq/program-idl` are published to GitHub Packages. Create `.npmrc` at the repo root (**do not commit it**):

```
@kagehq:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

The PAT needs `read:packages` scope. Then install dependencies:

```sh
pnpm install
```

## Run

Prerequisites:
- surfpool simnet (or local `solana-test-validator`) on `:8899` with `kage-program` deployed.
- `kage-issuer` running on `:4000` (provides the `/relay/:code` endpoint).

```sh
pnpm dev
```

Vite starts at **http://localhost:5173**.

## Test

```sh
pnpm test
```

Runs the Vitest suite once (`vitest run`).

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

## Sibling repos

| Repo | Role |
|---|---|
| [kage-shared](https://github.com/KageHQ/kage-shared) | Shared types, `decodeProofPayload`, and circuit constants |
| [kage-circuits](https://github.com/KageHQ/kage-circuits) | Circom circuits + trusted setup (Groth16) |
| [kage-issuer](https://github.com/KageHQ/kage-issuer) | Issues credentials, runs server-side proof generation, hosts the relay endpoint |
| [kage-program](https://github.com/KageHQ/kage-program) | Anchor program — on-chain Groth16 verify + nullifier PDA |
| **kage-web** *(this repo)* | React/Vite browser verifier — relay-code input + on-chain submit |
| [kage-mobile](https://github.com/KageHQ/kage-mobile) | Mobile app — holds PII, triggers proof generation, displays the 6-digit relay code |
| [kage-e2e](https://github.com/KageHQ/kage-e2e) | End-to-end tests: issuer → proof → relay code → on-chain verify |
