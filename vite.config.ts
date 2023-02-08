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
            fileName: (format) => `index.${format}.js`,
        },
        // modulePreload: {
        //     polyfill: false,
        // },
        // watch: {
        //     exclude: ['node_modules/**', 'dist/**'],
        //     buildDelay: 1000,
        // },
    },
    plugins: [dts()],
});
