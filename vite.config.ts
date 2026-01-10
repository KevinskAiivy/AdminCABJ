import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
        port: 3000,
        host: '0.0.0.0',
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
