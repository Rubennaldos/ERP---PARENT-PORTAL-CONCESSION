import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Configuración para Vercel (Ruta raíz)
  base: "/",
  
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild", // Cambiado de terser a esbuild (viene por defecto)
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
