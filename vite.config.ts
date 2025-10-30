import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vike from 'vike/plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]]
      }
    }),
    vike()
  ],
  resolve: {
    alias: {
      '~': join(__dirname, './src'),
      'styled-system': join(__dirname, './styled-system')
    }
  },
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'query': ['@tanstack/react-query'],
          'charts': ['recharts']
        }
      }
    }
  }
});
