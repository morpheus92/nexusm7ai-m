import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger"; // Removed due to ESM loading issue

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './', // 将基础路径设置为相对路径
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // mode === 'development' && // Removed componentTagger as it causes ESM loading issues
    // componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));