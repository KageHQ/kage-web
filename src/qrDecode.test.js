import { describe, it, expect } from "vitest";
import { encodeProofPayload } from "@kagehq/shared";
import { parseScannedPayload } from "./qrDecode";

describe("qr decode", () => {
  it("parses a scanned proof payload", () => {
    const proof = { pi_a: ["1","2","1"], pi_b: [["3","4"],["5","6"],["1","0"]], pi_c: ["7","8","1"] };
    const pub = ["11","22","20260601","26","18","99999"];
    const encoded = encodeProofPayload(proof, pub);
    const out = parseScannedPayload(encoded);
    expect(out.publicSignals[5]).toBe("99999");
    expect(out.proof.pi_a[0]).toBe("1");
  });

  it("throws on junk", () => {
    expect(() => parseScannedPayload("###")).toThrow();
  });
});
