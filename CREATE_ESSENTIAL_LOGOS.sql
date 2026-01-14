-- ============================================================================
-- SCRIPT : Créer uniquement les logos essentiels dans app_assets
-- ============================================================================
-- Ce script crée seulement les 6 logos vraiment utiles pour l'application
-- ============================================================================

-- SVG par défaut pour les logos
DO $$
DECLARE
    default_svg TEXT := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect fill="#003B94" width="200" height="200"/><text x="100" y="100" font-family="Arial" font-size="24" font-weight="bold" fill="#FCB131" text-anchor="middle" dominant-baseline="middle">CABJ</text></svg>';
    icon_svg TEXT := '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect fill="#003B94" width="48" height="48" rx="8"/><text x="24" y="28" font-family="Arial" font-size="20" font-weight="bold" fill="#FCB131" text-anchor="middle">C</text></svg>';
BEGIN

-- 1. Logo Navigation (Navbar)
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, display_size) VALUES
('navbar_logo_main', 'Logo Navegación', 'Logo principal en la barra de navegación', 'navbar', default_svg, 40)
ON CONFLICT (asset_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  display_size = EXCLUDED.display_size;

-- 2. Logo Login
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, display_size) VALUES
('login_logo', 'Logo Login', 'Logo en la página de inicio de sesión', 'general', default_svg, 96)
ON CONFLICT (asset_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  display_size = EXCLUDED.display_size;

-- 3. Logo Carga (PageTransition)
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, display_size) VALUES
('loading_logo', 'Logo Carga', 'Logo mostrado durante la carga de páginas', 'general', default_svg, 96)
ON CONFLICT (asset_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  display_size = EXCLUDED.display_size;

-- 4. Logo Principal App
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, display_size) VALUES
('app_logo_main', 'Logo Principal', 'Logo principal de la aplicación', 'general', default_svg, 128)
ON CONFLICT (asset_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  display_size = EXCLUDED.display_size;

-- 5. Logo Match (Escudo Deportivo)
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, display_size) VALUES
('match_logo', 'Escudo Deportivo', 'Logo usado en las tarjetas de partidos', 'general', default_svg, 128)
ON CONFLICT (asset_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  display_size = EXCLUDED.display_size;

-- 6. Favicon
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, display_size) VALUES
('favicon', 'Favicon', 'Icono de la pestaña del navegador', 'icons', icon_svg, 32)
ON CONFLICT (asset_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  display_size = EXCLUDED.display_size;

END $$;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

-- Lister les logos essentiels créés
SELECT 
    asset_key,
    name,
    category,
    display_size,
    CASE 
        WHEN file_url IS NOT NULL THEN '✓ Subido'
        ELSE '○ SVG por defecto'
    END as estado
FROM public.app_assets
WHERE asset_key IN (
    'navbar_logo_main',
    'login_logo',
    'loading_logo',
    'app_logo_main',
    'match_logo',
    'favicon'
)
ORDER BY 
    CASE asset_key
        WHEN 'navbar_logo_main' THEN 1
        WHEN 'login_logo' THEN 2
        WHEN 'loading_logo' THEN 3
        WHEN 'app_logo_main' THEN 4
        WHEN 'match_logo' THEN 5
        WHEN 'favicon' THEN 6
    END;

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================
-- ✅ 6 logos essentiels créés
-- ✅ Tous ont un fallback SVG
-- ✅ Prêts pour l'upload
-- ============================================================================

-- Message de succès
DO $$
BEGIN
    RAISE NOTICE '✅ 6 logos essentiels créés avec succès !';
    RAISE NOTICE '📱 Logos disponibles :';
    RAISE NOTICE '  1. Logo Navegación (navbar)';
    RAISE NOTICE '  2. Logo Login';
    RAISE NOTICE '  3. Logo Carga';
    RAISE NOTICE '  4. Logo Principal';
    RAISE NOTICE '  5. Escudo Deportivo';
    RAISE NOTICE '  6. Favicon';
END $$;
