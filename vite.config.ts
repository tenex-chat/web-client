import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
    include: ['@ricky0123/vad-web'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        widget: resolve(__dirname, 'src/widget/index.tsx'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Name the widget bundle as 'widget.js'
          if (chunkInfo.name === 'widget') {
            return 'widget.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    strictPort: false, // Allow Vite to use next available port if 3000 is in use
    allowedHosts: ['d1c684ca8fac.ngrok.app', '.ngrok.app', 'localhost'],
    // WebSocket configuration for HMR - will auto-detect port
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    // Ensure WebSocket connections work properly
    cors: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
    // Handle proxy for WebSocket connections if needed
    proxy: {
      // Proxy WebSocket connections to the Nostr relay
      '/relay': {
        target: 'wss://tenex.chat',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/relay/, ''),
      },
    },
  },
})
