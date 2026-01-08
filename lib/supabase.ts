
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
export const DEFAULT_SUPABASE_URL = 'https://mihvnjyicixelzdwztet.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1paHZuanlpY2l4ZWx6ZHd6dGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTMzMTAsImV4cCI6MjA4MzA2OTMxMH0.3vljeLGeWPyKZvV9qRVwxHrDk2ERJRfRxxdbL_L2mqg';

// Création du client
export const supabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper pour le mode dynamique (si besoin plus tard)
export const createDynamicClient = (url: string, key: string) => {
    return createClient(url, key);
};
