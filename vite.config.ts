import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    reportCompressedSize: false,
    emptyOutDir: true,
    rollupOptions: {
    },
    lib: {
      entry: './src/acc2/index.ts',
      name: 'Molstar Partial Charges',
      fileName: 'molstar-partial-charges',
      formats: ['es', 'cjs'],
    },
  },
})
