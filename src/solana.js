// On-chain wiring for the verifier.
//
// The verifier itself is the payer: a burner keypair generated in-browser and
// persisted in localStorage (so reloads keep the same wallet). On a surfpool /
// local validator it auto-airdrops. Point at a different RPC with VITE_RPC_URL.
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { idl } from "@kagehq/program-idl";

const RPC = import.meta.env.VITE_RPC_URL || "http://localhost:8899";
const STORAGE_KEY = "kage-verifier-burner";

// Optional fixed payer: a JSON array of the 64-byte secret key (the contents of
// a `solana-keygen` keypair file). When set, every visitor uses this same
// pre-funded wallet instead of a per-browser burner — fund it once on devnet and
// stop chasing airdrops.
//
// WARNING: VITE_* values are inlined into the PUBLIC client bundle, so this
// secret key is readable by anyone. Use ONLY a throwaway devnet keypair holding
// a little devnet SOL. Never a wallet with real funds.
const PAYER_SECRET = import.meta.env.VITE_PAYER_SECRET;

function loadKeypair() {
  if (PAYER_SECRET) {
    try {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(PAYER_SECRET)));
    } catch (e) {
      console.warn(
        "VITE_PAYER_SECRET set but unparseable; falling back to burner:",
        e.message
      );
    }
  }
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved)));
  const kp = Keypair.generate();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

// Minimal Anchor-compatible wallet around a Keypair (browser has no NodeWallet).
function walletFor(kp) {
  return {
    publicKey: kp.publicKey,
    signTransaction: async (tx) => {
      tx.partialSign(kp);
      return tx;
    },
    signAllTransactions: async (txs) =>
      txs.map((t) => {
        t.partialSign(kp);
        return t;
      }),
  };
}

let cached;

export function getSolana() {
  if (cached) return cached;
  const kp = loadKeypair();
  const connection = new Connection(RPC, "confirmed");
  const provider = new AnchorProvider(connection, walletFor(kp), {
    commitment: "confirmed",
  });
  // Anchor 0.30+ reads the program id from idl.address.
  const program = new Program(idl, provider);
  cached = { program, payer: kp.publicKey, connection, rpc: RPC };
  return cached;
}

// Best-effort airdrop on a local/surfpool validator. No-op (caught) on networks
// that reject requestAirdrop.
export async function ensureFunded(minSol = 1) {
  const { connection, payer } = getSolana();
  const bal = await connection.getBalance(payer);
  if (bal >= minSol * LAMPORTS_PER_SOL) return bal;
  // Best-effort: the public devnet faucet rate-limits / runs dry (429). Don't
  // let that crash verification — with a pre-funded fixed payer we never get
  // here anyway. If the airdrop fails, return the current balance and let the
  // submit proceed (it will surface a clear "insufficient funds" if truly empty).
  try {
    const sig = await connection.requestAirdrop(payer, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  } catch (e) {
    console.warn("airdrop failed (faucet limited/dry):", e.message);
  }
  return connection.getBalance(payer);
}
