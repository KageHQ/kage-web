import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    // @solana/web3.js + @coral-xyz/anchor expect Node globals (Buffer/process/global)
    // in the browser. Inject them.
    nodePolyfills({ globals: { Buffer: true, global: true, process: true } }),
  ],
  optimizeDeps: {
    include: [
      "@kagehq/shared",
      "@kagehq/program-idl",
      "@coral-xyz/anchor",
      "@solana/web3.js",
    ],
  },
});
