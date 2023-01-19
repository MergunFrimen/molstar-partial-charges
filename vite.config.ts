import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    reportCompressedSize: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: "[name].[ext]",
        chunkFileNames: "[name].js",
        entryFileNames: "[name].js",
      }
    }
  }
})
