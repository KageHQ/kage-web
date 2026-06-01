# Product

## Register

product

## Users

Primarily a **demo and pitch audience**: people watching the verifier run live during product demos, hackathon judging, and investor pitches. They are not operating it as a daily job; they are forming a fast judgment about whether zero-knowledge KYC is real and credible.

Their context: a few minutes of attention, often on a shared screen or projector, frequently seeing the concept for the first time. The job to be done is *understanding* more than *operating*. The privacy contrast (this verifier stores no PII, traditional KYC stores everything) is the moment that has to land.

## Product Purpose

A zero-knowledge KYC verifier UI. A user enters a 6-digit relay code; the app fetches a Groth16 proof from the issuer, submits it on-chain to the Solana program, and shows **pass** or **replay rejected**, storing **no PII**.

The product exists to make an abstract cryptographic guarantee tangible: you can prove someone holds a valid Indonesian KTP and is age >= 18 without ever learning their NIK, name, or DOB. Success is a viewer walking away certain that the privacy claim is true, not just asserted.

## Brand Personality

**Calm, precise, trustworthy.** Quiet confidence over hype. The interface should feel security-grade: deliberate, exact, unflashy. Cryptographic seriousness without coldness. The result of a verification should read as a fact, not a celebration. Voice is plain and direct; it states what happened and what was (not) stored.

## Anti-references

- **Crypto neon-on-black / web3 casino.** No glowing saturated neon, no gradient-on-black "to the moon" energy. This is the category reflex and it undercuts trust.
- **Generic AI-SaaS template.** No gradient hero, no identical icon-heading-text card grids, no purple blur, no default Vercel-clone landing look.
- **Cluttered raw-JSON demo.** The current dev-dump aesthetic (raw `JSON.stringify`, default red/green `1px` borders) is the explicit thing to move away from. The data-stored claim must be designed, not dumped.

## Design Principles

- **Show, don't assert.** The "no PII stored" claim must be visible in the actual stored record, side by side with what traditional KYC would hold. The contrast does the persuading.
- **Make the invisible legible.** Cryptographic mechanics (nullifier, on-chain confirmation, replay rejection) are the value. Surface them as plain, readable facts, not jargon dumps.
- **A result is a fact.** Pass and replay-rejected are unambiguous, calm, and instantly distinguishable, never confettied, never hedged.
- **Earn trust through restraint.** Precision and quiet over decoration. Every element justifies its presence; nothing is there to look "techy".
- **One screen, one moment.** This is a single focused surface. Guide attention to the verify action and the privacy contrast; resist feature sprawl.

## Accessibility & Inclusion

Best-effort for a demo/pitch surface. Pragmatic baseline: legible contrast, keyboard-operable verify flow. One non-negotiable carryover from the privacy-legibility goal: **pass / replay-rejected must not rely on color alone** (use label + icon + text), since the result reads on projectors and to color-blind viewers. Honor `prefers-reduced-motion` if motion is added later.
