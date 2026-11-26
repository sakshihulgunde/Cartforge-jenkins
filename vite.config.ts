
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    tsconfigPaths: true,
  },

  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  server: {
    watch: {
      // Terraform writes generated working files here.
      // Ignore them so Terraform operations do not
      // trigger a full Vite page reload.
      ignored: [
        '**/server/terraform-workspaces/**',
      ],
    },
  },
});
