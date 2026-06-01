import React, { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { parseScannedPayload } from "./qrDecode";
import { createVerifierStore } from "./store";
import { submitProof } from "./submit";
import { getSolana, ensureFunded } from "./solana";

const store = createVerifierStore();

// QR scanners fire the same frame many times/sec. Track nullifiers we've already
// handled so a held-up QR isn't resubmitted in a loop (which would just spam the
// replay-rejection path).
const handled = new Set();

export default function App() {
  const [rows, setRows] = useState([]);
  const [last, setLast] = useState(null);
  const [wallet, setWallet] = useState(null);
  const busyRef = React.useRef(false);

  useEffect(() => {
    // Surface the verifier's burner wallet + best-effort fund it on a local validator.
    try {
      const { payer, rpc } = getSolana();
      setWallet(payer.toBase58());
      ensureFunded().catch(() => {});
      console.log("verifier wallet", payer.toBase58(), "rpc", rpc);
    } catch (e) {
      console.error("solana init failed", e);
    }

    const scanner = new Html5Qrcode("reader");
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 280 },
      async (text) => {
        if (busyRef.current) return;

        let publicSignals;
        let proof;
        try {
          ({ proof, publicSignals } = parseScannedPayload(text));
        } catch {
          setLast("invalid QR");
          return;
        }

        const nullifier = publicSignals[5];
        if (handled.has(nullifier)) return; // already processed this QR
        busyRef.current = true;
        setLast("verifying on-chain…");
        try {
          const { program, payer, connection } = getSolana();
          await ensureFunded();
          const res = await submitProof(program, payer, proof, publicSignals);
          const slot = await connection.getSlot();
          handled.add(nullifier);
          store.recordPass({ wallet: res.wallet, nullifier: res.nullifier, slot });
          setRows(store.all());
          setLast("pass — verified on-chain");
        } catch (e) {
          const msg = String(e?.message || e);
          // Nullifier PDA already exists -> system Allocate fails with custom 0x0.
          if (/already in use|custom program error: 0x0|nullifier/i.test(msg)) {
            handled.add(nullifier);
            setLast("replay rejected (nullifier already used)");
          } else {
            setLast("error: " + msg.slice(0, 140));
          }
        } finally {
          busyRef.current = false;
        }
      },
      () => {}
    );
    return () => scanner.stop().catch(() => {});
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900, margin: "auto" }}>
      <h1>proven-kyc — Verifier</h1>
      <div id="reader" style={{ width: 320 }} />
      <p>Last scan: <b>{last ?? "—"}</b></p>
      <p style={{ fontSize: 12, color: "#666" }}>
        Verifier wallet: <code>{wallet ?? "…"}</code>
      </p>

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
