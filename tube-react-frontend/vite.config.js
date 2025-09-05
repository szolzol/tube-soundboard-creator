import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/extract": "http://localhost:8000",
      "/status": "http://localhost:8000",
      "/download": "http://localhost:8000",
      "/thumbnail": "http://localhost:8000",
      "/screenshot": "http://localhost:8000",
      "/session": "http://localhost:8000",
    },
  },
});
