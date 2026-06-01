import React, { useEffect, useState, useRef } from "react";
import "./styles.css";
import { parseScannedPayload } from "./qrDecode";
import { createVerifierStore } from "./store";
import { submitProof } from "./submit";
import { getSolana, ensureFunded } from "./solana";

const store = createVerifierStore();

// Where the phone published its proof. Same host as the issuer/prover.
const ISSUER = import.meta.env.VITE_ISSUER_URL || "http://localhost:4000";

// Track nullifiers we've already handled so the same proof isn't resubmitted.
const handled = new Set();

const IDLE = { kind: "idle", text: "Awaiting a 6-digit code." };

// Middle-truncate a long base58 string, keeping it copy-readable on screen.
function trunc(s, head = 6, tail = 6) {
  if (!s) return "";
  const str = String(s);
  return str.length <= head + tail + 1 ? str : `${str.slice(0, head)}…${str.slice(-tail)}`;
}

export default function App() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(IDLE);
  const [wallet, setWallet] = useState(null);
  const [rpc, setRpc] = useState(null);
  const [code, setCode] = useState("");
  const busyRef = useRef(false);
  const busy = status.kind === "busy";

  // Decode a payload string then verify it on-chain.
  async function handlePayload(text) {
    if (busyRef.current) return;
    let proof, publicSignals;
    try {
      ({ proof, publicSignals } = parseScannedPayload(text));
    } catch (e) {
      console.error("decode failed", e);
      setStatus({ kind: "error", strong: "Invalid payload", text: String(e?.message || e) });
      return;
    }
    const nullifier = publicSignals[5];
    if (handled.has(nullifier)) {
      setStatus({ kind: "replay", strong: "Already processed", text: "this proof was verified in this session." });
      return;
    }
    busyRef.current = true;
    setStatus({ kind: "busy", text: "Verifying on-chain…" });
    try {
      const { program, payer, connection } = getSolana();
      await ensureFunded();
      const res = await submitProof(program, payer, proof, publicSignals);
      const slot = await connection.getSlot();
      handled.add(nullifier);
      store.recordPass({ wallet: res.wallet, nullifier: res.nullifier, slot });
      setRows(store.all());
      setStatus({ kind: "pass", strong: "Pass", text: "verified on-chain." });
    } catch (e) {
      const msg = String(e?.message || e);
      if (/already in use|custom program error: 0x0|nullifier/i.test(msg)) {
        handled.add(nullifier);
        setStatus({ kind: "replay", strong: "Replay rejected", text: "nullifier already used." });
      } else {
        setStatus({ kind: "error", strong: "Verification failed", text: msg.slice(0, 160) });
      }
    } finally {
      busyRef.current = false;
    }
  }

  // Fetch the payload from the relay by the code shown on the phone.
  async function fetchAndVerify() {
    const c = code.trim();
    if (c.length < 6 || busyRef.current) return;
    setStatus({ kind: "busy", text: "Fetching proof from issuer…" });
    try {
      const res = await fetch(`${ISSUER}/relay/${c}`);
      if (!res.ok) {
        setStatus({ kind: "error", strong: "Code not found", text: "it may be wrong or expired." });
        return;
      }
      const { payload } = await res.json();
      await handlePayload(payload);
      setCode("");
    } catch (e) {
      setStatus({ kind: "error", strong: "Relay unreachable", text: String(e?.message || e).slice(0, 120) });
    }
  }

  useEffect(() => {
    try {
      const sol = getSolana();
      setWallet(sol.payer.toBase58());
      setRpc(sol.rpc);
      ensureFunded().catch(() => {});
      console.log("verifier wallet", sol.payer.toBase58(), "rpc", sol.rpc);
    } catch (e) {
      console.error("solana init failed", e);
    }
  }, []);

  return (
    <main className="shell">
      <header className="masthead">
        <h1 className="brand">
          <ShieldMark />
          Kage
        </h1>
        <span className="role">Zero-knowledge verifier</span>
      </header>

      <p className="lede">
        Enter the 6-digit code from the prover's phone. Kage confirms a valid KTP and age over 18,
        then records the result <b>without ever seeing the person's identity</b>.
      </p>

      <section className="console" aria-labelledby="verify-label">
        <p className="section-label" id="verify-label">01 / Verify</p>
        <div className="verify-row">
          <CodeField value={code} onChange={setCode} onSubmit={fetchAndVerify} disabled={busy} />
          <button
            className="verify-btn"
            onClick={fetchAndVerify}
            disabled={code.trim().length < 6 || busy}
          >
            {busy ? "Working…" : "Verify"}
            {!busy && <ArrowIcon />}
          </button>
        </div>

        <div className="status" data-kind={status.kind} role="status" aria-live="polite">
          <span className="status-dot" aria-hidden="true">
            <StatusIcon kind={status.kind} />
          </span>
          <span className="status-text">
            {status.strong && <strong>{status.strong}</strong>}
            {status.strong ? " " : ""}
            {status.text}
          </span>
        </div>
      </section>

      <section className="ledger" aria-labelledby="ledger-label">
        <p className="section-label" id="ledger-label">02 / What was kept</p>
        <div className="ledger-grid">
          <div className="col old">
            <div className="col-head">
              <h3>Traditional KYC stores</h3>
              <span className="col-tag">Full PII</span>
            </div>
            {[
              ["NIK (national ID no.)", "retained"],
              ["Full name", "retained"],
              ["Address", "retained"],
              ["Date of birth", "retained"],
              ["ID photo", "retained"],
            ].map(([label, val]) => (
              <div className="field" key={label}>
                <span className="field-label">{label}</span>
                <span className="field-value">
                  <LockIcon />
                  {val}
                </span>
              </div>
            ))}
            <p className="col-foot">
              <AlertIcon />
              One breach leaks every record: identity, location, birthdate, face.
            </p>
          </div>

          <div className="col kage">
            <div className="col-head">
              <h3>Kage kept</h3>
              <span className="col-tag">No PII</span>
            </div>

            {rows.length === 0 ? (
              <div className="empty">
                <div className="empty-title">Nothing recorded yet</div>
                <p>Verify a code and the exact stored record appears here: a result, a wallet, a nullifier, a slot. No identity fields exist.</p>
              </div>
            ) : (
              <div className="records">
                {rows.slice().reverse().map((r, i) => (
                  <article className="record" key={`${r.nullifier}-${i}`}>
                    <div className="record-top">
                      <span className="pass-chip"><CheckIcon /> Pass</span>
                      <span className="record-slot">slot {r.slot}</span>
                    </div>
                    <div className="field">
                      <span className="field-label">Wallet</span>
                      <span className="field-value" title={r.wallet}>{trunc(r.wallet)}</span>
                    </div>
                    <div className="field">
                      <span className="field-label">Nullifier</span>
                      <span className="field-value" title={r.nullifier}>{trunc(r.nullifier)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <p className="col-foot">
              <CheckIcon />
              No identity field exists in this record by construction. A breach leaks nothing useful.
            </p>
          </div>
        </div>

        <footer className="meta">
          <span><span className="k">Verifier wallet</span><span className="v">{wallet ? trunc(wallet, 8, 8) : "connecting…"}</span></span>
          <span><span className="k">RPC</span><span className="v">{rpc ?? "…"}</span></span>
        </footer>
      </section>
    </main>
  );
}

/* ---------- Segmented 6-digit code field ---------- */

function CodeField({ value, onChange, onSubmit, disabled }) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const activeIndex = Math.min(value.length, 5);

  return (
    <div className="code-field" onClick={() => inputRef.current?.focus()}>
      <div className="cells" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => {
          const filled = i < value.length;
          const isActive = focused && !disabled && i === activeIndex;
          return (
            <div key={i} className={`cell${filled ? " is-filled" : ""}${isActive ? " is-active" : ""}`}>
              {filled ? value[i] : isActive ? <span className="caret" /> : ""}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="6-digit verification code"
        maxLength={6}
        autoFocus
      />
    </div>
  );
}

/* ---------- Icons (inline, no dependency) ---------- */

function StatusIcon({ kind }) {
  if (kind === "busy") return <span className="spinner" />;
  if (kind === "pass") return <CheckCircleIcon />;
  if (kind === "replay") return <RepeatIcon />;
  if (kind === "error") return <AlertIcon />;
  return <DotIcon />;
}

const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" };

function ShieldMark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" {...s} aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
function CheckCircleIcon() {
  return <svg viewBox="0 0 24 24" {...s} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" {...s} strokeWidth="2.2" aria-hidden="true"><path d="M5 12.5l4 4 10-10" /></svg>;
}
function RepeatIcon() {
  return <svg viewBox="0 0 24 24" {...s} aria-hidden="true"><path d="M17 4l3 3-3 3" /><path d="M20 7H8a4 4 0 0 0-4 4" /><path d="M7 20l-3-3 3-3" /><path d="M4 17h12a4 4 0 0 0 4-4" /></svg>;
}
function AlertIcon() {
  return <svg viewBox="0 0 24 24" {...s} aria-hidden="true"><path d="M12 4l9 16H3l9-16z" /><path d="M12 10v4" /><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" /></svg>;
}
function LockIcon() {
  return <svg viewBox="0 0 24 24" {...s} aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
}
function DotIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" /></svg>;
}
function ArrowIcon() {
  return <svg viewBox="0 0 24 24" width="17" height="17" {...s} aria-hidden="true"><path d="M5 12h13" /><path d="M13 6l6 6-6 6" /></svg>;
}
