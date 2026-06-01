import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["@kagehq/shared"],
  },
  build: {
    commonjsOptions: {
      // Workspace symlinks resolve outside node_modules; widen the include
      // pattern so rollup's CJS plugin transforms them.
      include: [/proven-kyc\/shared/, /node_modules/],
      transformMixedEsModules: true,
    },
  },
});
