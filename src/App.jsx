import React, { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { parseScannedPayload } from "./qrDecode";
import { createVerifierStore } from "./store";

const store = createVerifierStore();

export default function App() {
  const [rows, setRows] = useState([]);
  const [last, setLast] = useState(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 280 },
      async (text) => {
        try {
          const { proof, publicSignals } = parseScannedPayload(text);
          // In the demo, submitProof(program, ...) runs here; for UI we record the pass.
          store.recordPass({ wallet: "DemoWallet", nullifier: publicSignals[5], slot: 0 });
          setRows(store.all());
          setLast("pass");
        } catch { setLast("invalid"); }
      }, () => {});
    return () => scanner.stop().catch(() => {});
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900, margin: "auto" }}>
      <h1>proven-kyc — Verifier</h1>
      <div id="reader" style={{ width: 320 }} />
      <p>Last scan: <b>{last ?? "—"}</b></p>

      <h2>What this verifier stores</h2>
      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1, border: "1px solid #c00", padding: 12 }}>
          <h3>Traditional KYC</h3>
          <p>Stores: NIK, full name, address, DOB…</p>
          <p style={{ color: "#c00" }}>Breach → mass PII leak</p>
        </div>
        <div style={{ flex: 1, border: "1px solid #090", padding: 12 }}>
          <h3>proven-kyc</h3>
          <pre>{JSON.stringify(rows, null, 2) || "[]"}</pre>
          <p style={{ color: "#090" }}>No PII stored → breach leaks nothing useful</p>
        </div>
      </div>
    </div>
  );
}
