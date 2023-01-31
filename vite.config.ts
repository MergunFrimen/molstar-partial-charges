import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        'process.env.NODE_ENV': '"production"',
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        minify: true,
        manifest: true,
        reportCompressedSize: true,
        emptyOutDir: true,
        lib: {
            name: 'Molstar Partial Charges',
            entry: resolve(__dirname, 'src/main.ts'),
            formats: ['es', 'cjs'],
            fileName: (format) => `main.${format}.js`,
        },
    },
    plugins: [dts()],
});
