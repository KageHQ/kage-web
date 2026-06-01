import { describe, it, expect } from "vitest";
import { createVerifierStore } from "./store";

describe("verifier store", () => {
  it("records only non-PII attestation fields", () => {
    const store = createVerifierStore();
    store.recordPass({ wallet: "Wallet111", nullifier: "99999", slot: 42 });
    const rows = store.all();
    expect(rows).toHaveLength(1);
    const keys = Object.keys(rows[0]);
    expect(keys.sort()).toEqual(["nullifier", "result", "slot", "timestampLocal", "wallet"].sort());
    expect(JSON.stringify(rows)).not.toMatch(/nik|name|dob/i);
  });
});
