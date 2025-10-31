import { defineConfig } from 'vite';
import path from 'path';
export default defineConfig({
    envDir: path.resolve(__dirname, '../../'),
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@logger': path.resolve(__dirname, './src/modules/logger'),
            '@modules': path.resolve(__dirname, './src/modules'),
            '@middleware': path.resolve(__dirname, './src/middleware'),
            '@routes': path.resolve(__dirname, './src/routes'),
            '@routers': path.resolve(__dirname, './src/routers'),
        },
    },
    optimizeDeps: {
        exclude: ['better-sqlite3', 'argon2', '@prisma/client'],
        include: ['reflect-metadata', 'tsyringe'],
    },
    ssr: {
        noExternal: ['reflect-metadata', 'tsyringe'],
    },
    build: {
        ssr: true,
        target: 'node20',
        outDir: 'dist',
        rollupOptions: {
            input: 'src/index.ts',
            output: {
                entryFileNames: 'index.js',
                format: 'cjs',
                exports: 'default',
            },
            external: ['better-sqlite3', 'argon2', '@prisma/client'],
        },
    },
    test: {
        environment: 'node',
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                '**/*.d.ts',
                '**/*.test.ts',
                'Test/**',
                'src/openapi.ts',
            ],
        },
    },
});
