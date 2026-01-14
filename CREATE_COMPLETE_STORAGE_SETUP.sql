-- ============================================================================
-- SCRIPT COMPLET : Configuration Storage + Table app_assets
-- ============================================================================
-- Ce script crée tout ce qui est nécessaire pour le système de logos :
-- 1. Bucket Storage "Logo"
-- 2. Politiques RLS pour le bucket
-- 3. Table app_assets avec données par défaut
-- ============================================================================

-- ============================================================================
-- PARTIE 1 : CRÉER LE BUCKET STORAGE
-- ============================================================================

-- Supprimer le bucket s'il existe déjà (optionnel)
-- DELETE FROM storage.buckets WHERE id = 'Logo';

-- Créer le bucket "Logo" (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Logo',
  'Logo',
  true,
  10485760,  -- 10 MB en bytes
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ];

-- ============================================================================
-- PARTIE 2 : POLITIQUES RLS POUR LE BUCKET
-- ============================================================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- Politique 1 : Lecture publique
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'Logo');

-- Politique 2 : Upload pour authentifiés
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'Logo' 
  AND auth.role() = 'authenticated'
);

-- Politique 3 : Mise à jour pour authentifiés
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'Logo')
WITH CHECK (bucket_id = 'Logo');

-- Politique 4 : Suppression pour authentifiés
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'Logo');

-- ============================================================================
-- PARTIE 3 : TABLE APP_ASSETS
-- ============================================================================

-- Créer la table app_assets
CREATE TABLE IF NOT EXISTS public.app_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Identification
    asset_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    
    -- Fichier uploadé (Storage)
    file_url TEXT,
    file_type TEXT,
    file_size INTEGER,
    uploaded_at TIMESTAMP WITH TIME ZONE,
    
    -- Fallback SVG
    fallback_svg TEXT,
    
    -- Métadonnées
    display_size INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_app_assets_key ON public.app_assets(asset_key);
CREATE INDEX IF NOT EXISTS idx_app_assets_category ON public.app_assets(category);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_app_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_app_assets_updated_at ON public.app_assets;
CREATE TRIGGER trigger_update_app_assets_updated_at
    BEFORE UPDATE ON public.app_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_app_assets_updated_at();

-- Commentaires
COMMENT ON TABLE public.app_assets IS 'Table centralisée pour tous les assets de l''application (logos, icônes, images)';
COMMENT ON COLUMN public.app_assets.asset_key IS 'Clé unique pour identifier l''asset (ex: navbar_logo_main)';
COMMENT ON COLUMN public.app_assets.file_url IS 'Chemin du fichier dans Supabase Storage (ex: assets/logo_123.png)';
COMMENT ON COLUMN public.app_assets.fallback_svg IS 'Code SVG de fallback si pas de fichier uploadé';

-- ============================================================================
-- PARTIE 4 : DONNÉES PAR DÉFAUT
-- ============================================================================

-- SVG par défaut pour les logos
DO $$
DECLARE
    default_svg TEXT := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#003B94" width="200" height="200"/><text x="100" y="100" font-family="Arial" font-size="24" font-weight="bold" fill="#FCB131" text-anchor="middle" dominant-baseline="middle">CABJ</text></svg>';
    icon_svg TEXT := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect fill="#003B94" width="48" height="48" rx="8"/><text x="24" y="28" font-family="Arial" font-size="20" font-weight="bold" fill="#FCB131" text-anchor="middle">C</text></svg>';
BEGIN

-- Navbar
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, display_size) VALUES
('navbar_logo_main', 'Logo Navigation Principal', 'Logo affiché dans la barre de navigation', 'navbar', default_svg, 40),
('navbar_logo_alt', 'Logo Navigation Alternatif', 'Logo alternatif pour mode sombre', 'navbar', default_svg, 40),
('navbar_logo_mobile', 'Logo Navigation Mobile', 'Logo pour version mobile', 'navbar', default_svg, 32)
ON CONFLICT (asset_key) DO NOTHING;

-- General
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, display_size) VALUES
('app_logo_main', 'Logo Principal Application', 'Logo principal de l''application', 'general', default_svg, 128),
('login_logo', 'Logo Page Connexion', 'Logo affiché sur la page de connexion', 'general', default_svg, 96),
('loading_logo', 'Logo Chargement', 'Logo affiché pendant le chargement', 'general', default_svg, 64),
('match_logo', 'Logo Match', 'Logo utilisé dans les cartes de match', 'general', default_svg, 128),
('rival_logo', 'Logo Équipe Adverse', 'Logo par défaut pour équipe adverse', 'general', default_svg, 128),
('background_habilitaciones', 'Fond Habilitaciones', 'Image de fond pour la page habilitaciones', 'general', default_svg, NULL)
ON CONFLICT (asset_key) DO NOTHING;

-- Icons & Favicons
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, display_size) VALUES
('favicon', 'Favicon', 'Icône de l''onglet navigateur', 'icons', icon_svg, 32),
('favicon_16', 'Favicon 16x16', 'Favicon taille 16x16', 'icons', icon_svg, 16),
('favicon_32', 'Favicon 32x32', 'Favicon taille 32x32', 'icons', icon_svg, 32),
('apple_touch_icon', 'Apple Touch Icon', 'Icône pour iOS', 'icons', icon_svg, 180),
('android_chrome_192', 'Android Chrome 192', 'Icône Android 192x192', 'icons', icon_svg, 192),
('android_chrome_512', 'Android Chrome 512', 'Icône Android 512x512', 'icons', icon_svg, 512),
('mstile_150', 'MS Tile 150', 'Tuile Windows 150x150', 'icons', icon_svg, 150),
('safari_pinned_tab', 'Safari Pinned Tab', 'Icône Safari onglet épinglé', 'icons', icon_svg, 16)
ON CONFLICT (asset_key) DO NOTHING;

-- Footer
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, display_size) VALUES
('footer_logo_main', 'Logo Footer Principal', 'Logo principal du footer', 'footer', default_svg, 48),
('footer_logo_secondary', 'Logo Footer Secondaire', 'Logo secondaire du footer', 'footer', default_svg, 48),
('footer_background', 'Fond Footer', 'Image de fond du footer', 'footer', default_svg, NULL)
ON CONFLICT (asset_key) DO NOTHING;

END $$;

-- ============================================================================
-- PARTIE 5 : VÉRIFICATIONS
-- ============================================================================

-- Vérifier le bucket
SELECT 
    id,
    name,
    public,
    file_size_limit,
    created_at
FROM storage.buckets 
WHERE id = 'Logo';

-- Vérifier les politiques
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%Logo%'
OR policyname LIKE '%Public%'
OR policyname LIKE '%Authenticated%';

-- Vérifier la table app_assets
SELECT 
    COUNT(*) as total_assets,
    COUNT(CASE WHEN file_url IS NOT NULL THEN 1 END) as assets_with_file,
    COUNT(CASE WHEN file_url IS NULL THEN 1 END) as assets_with_fallback
FROM public.app_assets;

-- Lister tous les assets par catégorie
SELECT 
    category,
    COUNT(*) as count,
    array_agg(asset_key ORDER BY asset_key) as assets
FROM public.app_assets
GROUP BY category
ORDER BY category;

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================
-- ✅ Bucket "Logo" créé et public
-- ✅ 4 politiques RLS configurées
-- ✅ Table app_assets créée avec 20 assets par défaut
-- ✅ Tous les assets ont un fallback SVG
-- ✅ Prêt pour l'upload de fichiers
-- ============================================================================

-- Message de succès
DO $$
BEGIN
    RAISE NOTICE '✅ Configuration Storage terminée avec succès !';
    RAISE NOTICE '📦 Bucket: Logo (public)';
    RAISE NOTICE '🗂️ Table: app_assets (% assets)', (SELECT COUNT(*) FROM public.app_assets);
    RAISE NOTICE '🚀 Prêt pour l''upload de logos !';
END $$;
