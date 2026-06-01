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

function loadBurner() {
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
  const kp = loadBurner();
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
  const sig = await connection.requestAirdrop(payer, 2 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
  return connection.getBalance(payer);
}
