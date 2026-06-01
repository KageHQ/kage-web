<!-- SEED: re-run /impeccable document once there's code to capture the actual tokens and components. -->
---
name: Kage Verifier
description: Security-grade UI for a zero-knowledge KYC verifier; calm, precise, trustworthy.
---

# Design System: Kage Verifier

## 1. Overview

**Creative North Star: "The Verification Instrument"**

A precise, security-grade tool that reads like an official instrument of verification, a passport check or a notarized receipt, not a crypto app. The personality is calm, exact, and trustworthy. It earns belief through restraint: ink on paper, deliberate spacing, plain language. The privacy claim is proven on screen, never shouted. When a verification resolves, the result reads as a *fact* recorded, not an event celebrated.

The aesthetic lane is the precise product-tool craft of Stripe, Linear, and Vercel, warmed by the quiet polish of Mercury, Arc, and Things. Confident, developer-respected, soft but exact. Color is restrained: tinted near-black ink on warm paper with a single trust accent reserved for the moment of confirmation.

This system explicitly rejects: crypto neon-on-black and any web3 casino glow; the generic AI-SaaS template (gradient hero, purple blur, identical card grids); and the cluttered raw-JSON dev-dump it is replacing. The "no PII stored" claim must be *designed*, not printed as `JSON.stringify`.

**Key Characteristics:**
- Ink-on-paper restraint; one accent, used rarely.
- Plain language over jargon; mechanics surfaced as readable facts.
- Result states that are unambiguous without relying on color.
- One focused screen; verify action and privacy contrast carry the weight.

## 2. Colors

A restrained ink-on-paper palette: tinted near-black text on a warm off-white surface, with a single accent held in reserve for confirmation. Every neutral is tinted toward a cool-neutral hue; never pure `#000` or `#fff`.

### Primary
- **Ink** (`oklch` near-black, cool-neutral hue, chroma ~0.01) `[exact value to be resolved during implementation]`: primary text, the Verify action, structural marks. The voice of the interface.

### Secondary
- **Trust Accent** (single reserved hue, e.g. a deep verifiable green or steel-blue) `[hue + exact value to be resolved during implementation]`: used only on the confirmed-pass state and the active verify control. Its rarity is the point.

### Neutral
- **Paper** (warm off-white, tinted) `[to be resolved]`: page surface.
- **Surface** (one step off paper) `[to be resolved]`: the stored-record panel and input field.
- **Hairline** (low-contrast tinted border) `[to be resolved]`: 1px dividers and field strokes.
- **Muted Ink** `[to be resolved]`: secondary text, labels, metadata (wallet, slot).

### Named Rules
**The One Accent Rule.** The trust accent appears on <=10% of any screen and only on confirmation and the live verify control. Everything else is ink, paper, and hairline. Rarity is what makes the pass moment read as a fact.

**The Result-Not-Color Rule.** Pass and replay-rejected must be distinguishable by label, icon, and text, never by color alone. Color is reinforcement, not the signal.

## 3. Typography

**Display Font:** `[single precise grotesque to be chosen at implementation; Inter / Geist / similar]`
**Body Font:** same family (single-sans system)
**Label/Mono Font:** the family's tabular/mono numerals or a paired mono `[to be chosen]` for codes, nullifiers, and wallet addresses

**Character:** One precise, technical grotesque carries the whole interface. Numbers and codes are first-class: tabular figures, generous letter-spacing on the 6-digit entry. No decorative type, no second personality.

### Hierarchy
- **Display** (`[weight/size to be resolved]`): the verifier title and the single framing line. Used once.
- **Headline**: section markers ("What this verifier stores").
- **Title**: the pass / replay-rejected result line.
- **Body** (cap line length 65-75ch): the framing and contrast copy.
- **Label** (uppercase, letter-spaced, muted ink): field labels and metadata keys (wallet, slot, nullifier).

### Named Rules
**The Code-Is-Mono Rule.** Every cryptographic value, the 6-digit code, nullifier, wallet address, slot, renders in tabular/mono figures. It signals that these are exact machine facts, not prose.

## 4. Elevation

Flat by default. Depth comes from tonal layering (paper -> surface -> hairline borders), not shadows. This matches the restrained motion energy and the instrument metaphor: an official document is layered by tone and rule lines, not drop shadows. A single soft shadow may appear only on the active verify control at the moment of focus. `[exact shadow value, if any, to be resolved during implementation]`

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Any shadow is a response to state (focus on the verify control), never decoration.

## 5. Components

<!-- No components exist yet beyond inline-style scaffolding. Re-run /impeccable document after the first build pass to capture real component tokens (code input, verify button, result line, privacy-contrast panel). -->

## 6. Do's and Don'ts

### Do:
- **Do** keep ink-on-paper restraint: tinted near-black text on warm off-white, one accent held for confirmation only.
- **Do** render every cryptographic value (code, nullifier, wallet, slot) in tabular/mono figures.
- **Do** make pass and replay-rejected distinguishable by label + icon + text, not color alone.
- **Do** design the stored-record contrast so a first-time viewer instantly sees "no PII" versus traditional KYC.
- **Do** keep motion to state changes only; the result appears, nothing dances.

### Don't:
- **Don't** use crypto neon-on-black, glow, or web3 casino energy. It undercuts trust.
- **Don't** reach for the generic AI-SaaS template: no gradient hero, no purple blur, no identical icon-heading-text card grids, no Vercel-clone landing look.
- **Don't** ship the raw-JSON dev-dump: no `JSON.stringify` panels, no default red/green 1px borders standing in for design.
- **Don't** use `border-left`/`border-right` greater than 1px as a colored accent stripe.
- **Don't** use gradient text or `background-clip: text`.
- **Don't** celebrate a pass with confetti or animation; a result is a recorded fact.
