import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    reportCompressedSize: false,
    emptyOutDir: true,
    lib: {
      entry: './src/index.ts',
      name: 'Molstar Partial Charges',
      fileName: (format) => `molstar-partial-charges.${format}.js`
    },
  },
})
