// In-memory verifier state. By construction it can hold ONLY attestation
// metadata — there is no field for personal data. This is the demo's thesis.
export function createVerifierStore() {
  const rows = [];
  return {
    recordPass({ wallet, nullifier, slot }) {
      rows.push({
        result: "pass",
        wallet,
        nullifier,
        slot,
        timestampLocal: new Date().toISOString(),
      });
    },
    all() { return rows.slice(); },
  };
}
