
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase - Utilise les variables d'environnement avec fallback
export const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mihvnjyicixelzdwztet.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1paHZuanlpY2l4ZWx6ZHd6dGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTMzMTAsImV4cCI6MjA4MzA2OTMxMH0.3vljeLGeWPyKZvV9qRVwxHrDk2ERJRfRxxdbL_L2mqg';

// Vérifier que les variables sont définies
if (!DEFAULT_SUPABASE_URL || !DEFAULT_SUPABASE_ANON_KEY) {
  console.error('❌ Variables d\'environnement Supabase manquantes !');
  console.error('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.error('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Définie' : 'Non définie');
}

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

/**
 * Retourne l'URL publique d'un logo de consulado stocké dans Supabase Storage
 * 
 * Le bucket 'logo' contient des sous-dossiers :
 * - consulados/ : logos et bannières des consulados (ex: "consulados/consulado_123_logo_1234567890.png")
 * - (racine) : photos des socios (ex: "12345678_1234567890.jpg")
 * 
 * @param filePath - Chemin complet du fichier dans le bucket incluant le sous-dossier
 *                   Exemples valides :
 *                   - "consulados/consulado_abc123_logo_1234567890.png"
 *                   - "consulados/consulado_xyz456_banner_1234567890.jpg"
 *                   - "12345678_1234567890.jpg" (socios à la racine)
 * 
 * @returns URL publique du fichier ou une image placeholder SVG si le filePath est vide/null
 * 
 * @example
 * // Avec un logo de consulado
 * const logoUrl = getConsuladoLogoUrl("consulados/consulado_123_logo_1234567890.png");
 * // → "https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/logo/consulados/consulado_123_logo_1234567890.png"
 * 
 * @example
 * // Sans logo (placeholder)
 * const placeholderUrl = getConsuladoLogoUrl(null);
 * // → "data:image/svg+xml,..." (SVG bleu/or Boca)
 */
export const getConsuladoLogoUrl = (filePath: string | null | undefined): string => {
  // Image placeholder par défaut (SVG avec les couleurs Boca)
  const placeholderUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect fill="%23003B94" width="200" height="200" rx="20"/%3E%3Ctext fill="%23FCB131" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="24" font-weight="bold"%3ELOGO%3C/text%3E%3C/svg%3E';
  
  // Si le filePath est vide, null ou undefined, retourner le placeholder
  if (!filePath || filePath.trim() === '') {
    return placeholderUrl;
  }
  
  // Récupérer l'URL publique depuis le bucket 'logo'
  // Le filePath contient déjà le sous-dossier (ex: "consulados/fichier.png")
  const { data } = supabase.storage
    .from('logo')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};

/**
 * Liste tous les fichiers dans un sous-dossier spécifique du bucket 'logo'
 * 
 * @param folderPath - Chemin du sous-dossier (ex: "consulados", "" pour la racine)
 * @param options - Options de listage (limit, sortBy, etc.)
 * @returns Promise avec la liste des fichiers et leurs métadonnées
 * 
 * @example
 * // Lister tous les logos de consulados
 * const consuladoFiles = await listStorageFiles('consulados');
 * 
 * @example
 * // Lister les photos de socios (racine)
 * const socioFiles = await listStorageFiles('');
 */
export const listStorageFiles = async (
  folderPath: string = '',
  options: {
    limit?: number;
    offset?: number;
    sortBy?: { column: string; order: 'asc' | 'desc' };
  } = {}
) => {
  try {
    const { data, error } = await supabase.storage
      .from('logo')
      .list(folderPath, {
        limit: options.limit || 100,
        offset: options.offset || 0,
        sortBy: options.sortBy || { column: 'created_at', order: 'desc' }
      });

    if (error) throw error;

    // Ajouter les URLs publiques à chaque fichier
    const filesWithUrls = (data || [])
      .filter(file => file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i))
      .map(file => {
        const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
        const publicUrl = getConsuladoLogoUrl(fullPath);
        
        return {
          ...file,
          fullPath,
          publicUrl,
          folder: folderPath || 'root'
        };
      });

    return { data: filesWithUrls, error: null };
  } catch (error) {
    console.error('Erreur lors du listage des fichiers:', error);
    return { data: [], error };
  }
};
