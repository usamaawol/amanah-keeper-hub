import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    react(),
    tsconfigPaths(),
    // Nitro handles SSR bundling.
    // NITRO_PRESET=vercel is set in vercel.json for Vercel builds.
    // Local dev uses the default node preset.
    nitro({
      preset: process.env.NITRO_PRESET || undefined,
    }),
  ],
});
