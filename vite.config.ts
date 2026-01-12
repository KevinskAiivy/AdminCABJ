import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
        port: 5173,
        host: 'localhost',
        watch: {
            usePolling: true,
            interval: 1000,
            ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/.vite/**'],
        },
        hmr: {
            overlay: true,
        },
    },
    plugins: [react()],
    envPrefix: 'VITE_', // Ne charger que les variables préfixées par VITE_
    define: {
        'process.env.API_KEY': JSON.stringify(''),
        'process.env.GEMINI_API_KEY': JSON.stringify('')
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        }
    }
});
