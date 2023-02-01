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
        lib: {
            name: 'MolstarPartialCharges',
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['umd', 'es'],
            fileName: (format) => `index.${format}.js`,
        },
    },
    plugins: [dts()],
});
