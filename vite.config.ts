import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    define: {
        'process.env.NODE_ENV': '"production"',
    },
    build: {
        outDir: 'dist',
        reportCompressedSize: true,
        emptyOutDir: true,
        target: 'es2015',
        lib: {
            name: 'MolstarPartialCharges',
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['umd', 'es'],
            fileName: (format) => `molstar.${format}.js`,
        },
    },
    plugins: [dts()],
});
