import { PublicKey } from "@solana/web3.js";

// ---------------------------------------------------------------------------
// Proof byte-formatting helpers — ported verbatim from
// program/tests/proof-format.ts so the web client stays byte-identical to
// what the on-chain groth16-solana verifier expects.
//
// Conventions (must match program/scripts/vk-to-rust.js):
//   - every field element  -> 32 big-endian bytes
//   - proof_a (G1)         -> [x(32), y_negated(32)]  (light-protocol convention)
//   - proof_b (G2)         -> imaginary coord FIRST then real:
//                             [x.c1, x.c0, y.c1, y.c0]  (snarkjs stores [real, imag])
//   - proof_c (G1)         -> [x(32), y(32)]
// ---------------------------------------------------------------------------

// BN254 base field prime.
const FIELD_P =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;

// Decimal string / bigint / number -> 32 big-endian bytes (number[]).
export function to32(dec) {
  const h = BigInt(dec).toString(16).padStart(64, "0");
  if (h.length > 64) {
    throw new Error(`field element does not fit in 32 bytes: ${dec}`);
  }
  const out = [];
  for (let i = 0; i < 64; i += 2) out.push(parseInt(h.slice(i, i + 2), 16));
  return out;
}

// snarkjs proof object -> 256-byte on-chain proof (number[256]).
export function formatProof(proof) {
  const aX = BigInt(proof.pi_a[0]);
  const aY = BigInt(proof.pi_a[1]);
  // Negate A's y coordinate: (FIELD_P - y) mod FIELD_P.
  const aYNeg = (FIELD_P - (aY % FIELD_P)) % FIELD_P;

  const a = [...to32(aX), ...to32(aYNeg)];

  // G2: snarkjs stores [[x.c0, x.c1], [y.c0, y.c1], [1, 0]] (real, imag).
  // groth16-solana wants imaginary first then real.
  const b = [
    ...to32(proof.pi_b[0][1]),
    ...to32(proof.pi_b[0][0]),
    ...to32(proof.pi_b[1][1]),
    ...to32(proof.pi_b[1][0]),
  ];

  const c = [...to32(proof.pi_c[0]), ...to32(proof.pi_c[1])];

  const out = [...a, ...b, ...c];
  if (out.length !== 256) {
    throw new Error(`formatted proof must be 256 bytes, got ${out.length}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Submits the verify instruction. `program` is an initialized Anchor Program.
// The on-chain instruction signature is:
//   verify(proof: [u8; 256], public_inputs: Vec<[u8; 32]>, nullifier_hash: [u8; 32])
// ---------------------------------------------------------------------------
export async function submitProof(program, payer, proof, publicSignals) {
  const nullifierBytes = Buffer.from(to32(publicSignals[5]));
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier"), nullifierBytes],
    program.programId
  );
  await program.methods
    .verify(
      formatProof(proof),
      publicSignals.map((s) => Array.from(to32(s))),
      Array.from(nullifierBytes)
    )
    .accountsPartial({ nullifier: pda, payer })
    .rpc();
  return { wallet: payer.toBase58(), nullifier: publicSignals[5] };
}
