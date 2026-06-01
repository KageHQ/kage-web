import React, { useEffect, useState, useRef } from "react";
import { parseScannedPayload } from "./qrDecode";
import { createVerifierStore } from "./store";
import { submitProof } from "./submit";
import { getSolana, ensureFunded } from "./solana";

const store = createVerifierStore();

// Where the phone published its proof. Same host as the issuer/prover.
const ISSUER = import.meta.env.VITE_ISSUER_URL || "http://localhost:4000";

// Track nullifiers we've already handled so the same proof isn't resubmitted.
const handled = new Set();

export default function App() {
  const [rows, setRows] = useState([]);
  const [last, setLast] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [code, setCode] = useState("");
  const busyRef = useRef(false);

  // Decode a payload string then verify it on-chain.
  async function handlePayload(text) {
    if (busyRef.current) return;
    let proof, publicSignals;
    try {
      ({ proof, publicSignals } = parseScannedPayload(text));
    } catch (e) {
      console.error("decode failed", e);
      setLast("invalid payload: " + String(e?.message || e));
      return;
    }
    const nullifier = publicSignals[5];
    if (handled.has(nullifier)) {
      setLast("already processed this proof");
      return;
    }
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
      if (/already in use|custom program error: 0x0|nullifier/i.test(msg)) {
        handled.add(nullifier);
        setLast("replay rejected (nullifier already used)");
      } else {
        setLast("error: " + msg.slice(0, 160));
      }
    } finally {
      busyRef.current = false;
    }
  }

  // Fetch the payload from the relay by the code shown on the phone.
  async function fetchAndVerify() {
    const c = code.trim();
    if (c.length < 6) return;
    setLast("fetching proof…");
    try {
      const res = await fetch(`${ISSUER}/relay/${c}`);
      if (!res.ok) {
        setLast("code not found or expired");
        return;
      }
      const { payload } = await res.json();
      await handlePayload(payload);
      setCode("");
    } catch (e) {
      setLast("relay error: " + String(e?.message || e).slice(0, 120));
    }
  }

  useEffect(() => {
    try {
      const { payer, rpc } = getSolana();
      setWallet(payer.toBase58());
      ensureFunded().catch(() => {});
      console.log("verifier wallet", payer.toBase58(), "rpc", rpc);
    } catch (e) {
      console.error("solana init failed", e);
    }
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900, margin: "auto" }}>
      <h1>Kage — Verifier</h1>

      <p style={{ fontSize: 14, color: "#555" }}>
        Enter the 6-digit code shown on the prover phone:
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => e.key === "Enter" && fetchAndVerify()}
          placeholder="123456"
          inputMode="numeric"
          style={{ fontSize: 28, letterSpacing: 6, padding: "8px 14px", width: 200 }}
        />
        <button
          onClick={fetchAndVerify}
          disabled={code.trim().length < 6}
          style={{ fontSize: 18, padding: "10px 20px", cursor: "pointer" }}
        >
          Verify
        </button>
      </div>

      <p>Last result: <b>{last ?? "—"}</b></p>
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
          <h3>Kage</h3>
          <pre>{JSON.stringify(rows, null, 2) || "[]"}</pre>
          <p style={{ color: "#090" }}>No PII stored → breach leaks nothing useful</p>
        </div>
      </div>
    </div>
  );
}
