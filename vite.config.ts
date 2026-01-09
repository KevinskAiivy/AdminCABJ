import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'fs';

export default defineConfig(({ mode }) => {
    // Charger les variables d'environnement de manière sécurisée
    let env = {};
    try {
        // Vérifier si le fichier existe avant de le charger
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (existsSync(envPath)) {
            env = loadEnv(mode, '.', '');
        }
    } catch (error) {
        // Ignorer les erreurs de chargement d'env (fichier peut ne pas exister)
        console.warn('⚠️ Fichier .env.local non trouvé, utilisation des valeurs par défaut');
    }
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
