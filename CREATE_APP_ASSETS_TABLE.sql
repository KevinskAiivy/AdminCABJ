-- ============================================
-- Table: app_assets
-- Description: Stocke tous les logos et assets de l'application
-- ============================================

-- Création de la table app_assets
CREATE TABLE IF NOT EXISTS public.app_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Identifiant unique de l'asset
    asset_key TEXT NOT NULL UNIQUE,  -- Ex: 'navbar_logo', 'escudo_deportivo', 'favicon'
    
    -- Nom et description
    name TEXT NOT NULL,              -- Ex: 'Logo Navbar'
    description TEXT,                -- Description de l'asset
    category TEXT NOT NULL,          -- Ex: 'navbar', 'footer', 'general', 'icons'
    
    -- URL du fichier dans Storage
    file_url TEXT,                   -- Chemin dans le bucket (ex: 'assets/navbar_logo.png')
    
    -- Métadonnées
    file_type TEXT,                  -- Ex: 'image/png', 'image/svg+xml'
    file_size INTEGER,               -- Taille en bytes
    width INTEGER,                   -- Largeur en pixels
    height INTEGER,                  -- Hauteur en pixels
    
    -- Fallback (si le fichier n'est pas chargé)
    fallback_svg TEXT,               -- SVG par défaut en cas d'erreur
    fallback_color TEXT,             -- Couleur de fallback
    
    -- Paramètres d'affichage
    display_size INTEGER DEFAULT 40, -- Taille d'affichage par défaut (px)
    is_active BOOLEAN DEFAULT true,  -- Actif ou non
    
    -- Dates
    uploaded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_app_assets_key ON public.app_assets(asset_key);
CREATE INDEX IF NOT EXISTS idx_app_assets_category ON public.app_assets(category);
CREATE INDEX IF NOT EXISTS idx_app_assets_active ON public.app_assets(is_active);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_app_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_app_assets_updated_at
    BEFORE UPDATE ON public.app_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_app_assets_updated_at();

-- Commentaires
COMMENT ON TABLE public.app_assets IS 'Stocke tous les logos et assets de l''application';
COMMENT ON COLUMN public.app_assets.asset_key IS 'Identifiant unique de l''asset (ex: navbar_logo)';
COMMENT ON COLUMN public.app_assets.file_url IS 'Chemin du fichier dans Supabase Storage';
COMMENT ON COLUMN public.app_assets.category IS 'Catégorie de l''asset (navbar, footer, general, icons)';

-- Insérer les assets par défaut
INSERT INTO public.app_assets (asset_key, name, description, category, fallback_svg, fallback_color, display_size, is_active)
VALUES 
    -- ============================================
    -- NAVBAR - Logos de navigation
    -- ============================================
    (
        'navbar_logo',
        'Logo Navbar',
        'Logo principal affiché dans la barre de navigation',
        'navbar',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#003B94" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z"/><path fill="#FCB131" d="M15 40 H85 V60 H15 Z"/><text x="50" y="32" fontSize="10" fill="#FCB131" textAnchor="middle" fontWeight="bold" fontFamily="Arial">C A B J</text><text x="50" y="75" fontSize="10" fill="#FCB131" textAnchor="middle" fontWeight="bold" fontFamily="Arial">1905</text></svg>',
        '#003B94',
        40,
        true
    ),
    (
        'navbar_logo_mobile',
        'Logo Navbar Mobile',
        'Version mobile du logo navbar (plus petit)',
        'navbar',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#003B94" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z"/><path fill="#FCB131" d="M15 40 H85 V60 H15 Z"/></svg>',
        '#003B94',
        32,
        true
    ),
    
    -- ============================================
    -- GENERAL - Logos et escudos principaux
    -- ============================================
    (
        'escudo_deportivo',
        'Escudo Deportivo',
        'Escudo officiel du club Boca Juniors',
        'general',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#003B94" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z"/><path fill="#FCB131" d="M15 40 H85 V60 H15 Z"/><text x="50" y="32" fontSize="10" fill="#FCB131" textAnchor="middle" fontWeight="bold" fontFamily="Arial">C A B J</text></svg>',
        '#003B94',
        80,
        true
    ),
    (
        'escudo_grande',
        'Escudo Grande',
        'Version grande du escudo pour affichages importants',
        'general',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#003B94" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z"/><path fill="#FCB131" d="M15 40 H85 V60 H15 Z"/></svg>',
        '#003B94',
        120,
        true
    ),
    (
        'logo_cabj_text',
        'Logo CABJ avec Texte',
        'Logo avec le nom complet du club',
        'general',
        NULL,
        '#003B94',
        100,
        true
    ),
    
    -- ============================================
    -- ICONS - Icônes et favicons
    -- ============================================
    (
        'favicon',
        'Favicon',
        'Icône du site (onglet navigateur) - 32x32px',
        'icons',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect fill="#003B94" width="100" height="100"/><path fill="#FCB131" d="M20 40 H80 V60 H20 Z"/></svg>',
        '#003B94',
        32,
        true
    ),
    (
        'favicon_192',
        'Favicon 192x192',
        'Icône pour PWA et Android - 192x192px',
        'icons',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect fill="#003B94" width="100" height="100"/><path fill="#FCB131" d="M20 40 H80 V60 H20 Z"/></svg>',
        '#003B94',
        192,
        true
    ),
    (
        'favicon_512',
        'Favicon 512x512',
        'Icône pour PWA et splash screens - 512x512px',
        'icons',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect fill="#003B94" width="100" height="100"/><path fill="#FCB131" d="M20 40 H80 V60 H20 Z"/></svg>',
        '#003B94',
        512,
        true
    ),
    (
        'apple_touch_icon',
        'Apple Touch Icon',
        'Icône pour iOS (raccourci écran d''accueil) - 180x180px',
        'icons',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect fill="#003B94" width="100" height="100" rx="20"/><path fill="#FCB131" d="M20 40 H80 V60 H20 Z"/></svg>',
        '#003B94',
        180,
        true
    ),
    
    -- ============================================
    -- FOOTER - Logos du pied de page
    -- ============================================
    (
        'footer_logo',
        'Logo Footer',
        'Logo affiché dans le pied de page',
        'footer',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#003B94" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z"/><path fill="#FCB131" d="M15 40 H85 V60 H15 Z"/></svg>',
        '#003B94',
        50,
        true
    ),
    (
        'footer_logo_white',
        'Logo Footer Blanc',
        'Version blanche du logo pour fond sombre',
        'footer',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#FFFFFF" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z"/><path fill="#FCB131" d="M15 40 H85 V60 H15 Z"/></svg>',
        '#FFFFFF',
        50,
        true
    ),
    
    -- ============================================
    -- BACKGROUNDS - Images de fond
    -- ============================================
    (
        'login_background',
        'Fond Page Login',
        'Image de fond de la page de connexion',
        'general',
        NULL,
        '#003B94',
        NULL,
        true
    ),
    (
        'dashboard_background',
        'Fond Dashboard',
        'Image de fond du dashboard (optionnel)',
        'general',
        NULL,
        '#F0F4F8',
        NULL,
        true
    ),
    (
        'hero_image',
        'Image Hero',
        'Grande image pour la page d''accueil',
        'general',
        NULL,
        '#003B94',
        NULL,
        true
    ),
    
    -- ============================================
    -- SOCIAL - Logos réseaux sociaux
    -- ============================================
    (
        'social_og_image',
        'Image Open Graph',
        'Image pour partages sur réseaux sociaux (1200x630px)',
        'general',
        NULL,
        '#003B94',
        NULL,
        true
    ),
    (
        'social_twitter_card',
        'Twitter Card Image',
        'Image pour Twitter/X cards (1200x600px)',
        'general',
        NULL,
        '#003B94',
        NULL,
        true
    ),
    
    -- ============================================
    -- PRINT - Logos pour impression
    -- ============================================
    (
        'logo_print_color',
        'Logo Impression Couleur',
        'Logo haute résolution pour impression couleur',
        'general',
        NULL,
        '#003B94',
        NULL,
        true
    ),
    (
        'logo_print_bw',
        'Logo Impression N&B',
        'Logo noir et blanc pour impression',
        'general',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#000000" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z"/><path fill="#FFFFFF" d="M15 40 H85 V60 H15 Z"/></svg>',
        '#000000',
        NULL,
        true
    ),
    
    -- ============================================
    -- LOADER - Animations de chargement
    -- ============================================
    (
        'loader_spinner',
        'Spinner de Chargement',
        'Animation de chargement (spinner)',
        'icons',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" stroke="#003B94" stroke-width="8" fill="none" stroke-dasharray="60 200"/></svg>',
        '#003B94',
        40,
        true
    ),
    (
        'loader_logo',
        'Logo Animé',
        'Logo animé pour écrans de chargement',
        'icons',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#003B94" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z"/><path fill="#FCB131" d="M15 40 H85 V60 H15 Z"/></svg>',
        '#003B94',
        60,
        true
    ),
    
    -- ============================================
    -- PLACEHOLDER - Images par défaut
    -- ============================================
    (
        'placeholder_user',
        'Avatar Utilisateur par Défaut',
        'Image par défaut pour les profils sans photo',
        'icons',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="50" fill="#003B94"/><circle cx="50" cy="40" r="15" fill="#FCB131"/><path d="M 30 80 Q 50 70 70 80" stroke="#FCB131" stroke-width="8" fill="none"/></svg>',
        '#003B94',
        100,
        true
    ),
    (
        'placeholder_consulado',
        'Logo Consulado par Défaut',
        'Logo par défaut pour consulados sans logo',
        'icons',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect fill="#003B94" width="100" height="100" rx="10"/><path fill="#FCB131" d="M20 40 H80 V60 H20 Z"/><text x="50" y="55" fontSize="12" fill="#003B94" textAnchor="middle" fontWeight="bold">CABJ</text></svg>',
        '#003B94',
        80,
        true
    ),
    (
        'placeholder_team',
        'Logo Équipe par Défaut',
        'Logo par défaut pour équipes adverses',
        'icons',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="#666666"/><text x="50" y="60" fontSize="20" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">?</text></svg>',
        '#666666',
        60,
        true
    ),
    (
        'placeholder_image',
        'Image par Défaut',
        'Image générique pour contenus sans image',
        'icons',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect fill="#E0E0E0" width="100" height="100"/><path d="M30 70 L50 50 L70 70" stroke="#999999" stroke-width="4" fill="none"/><circle cx="35" cy="35" r="8" fill="#999999"/></svg>',
        '#E0E0E0',
        100,
        true
    ),
    
    -- ============================================
    -- EMAIL - Templates emails
    -- ============================================
    (
        'email_header_logo',
        'Logo Header Email',
        'Logo pour en-tête des emails',
        'general',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#003B94" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z"/><path fill="#FCB131" d="M15 40 H85 V60 H15 Z"/></svg>',
        '#003B94',
        60,
        true
    ),
    (
        'email_footer_logo',
        'Logo Footer Email',
        'Logo pour pied de page des emails',
        'general',
        '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path fill="#003B94" d="M50 5 L85 20 L85 80 L50 95 L15 80 L15 20 Z"/><path fill="#FCB131" d="M15 40 H85 V60 H15 Z"/></svg>',
        '#003B94',
        40,
        true
    )
ON CONFLICT (asset_key) DO NOTHING;

-- Vérification
SELECT 
    asset_key,
    name,
    category,
    CASE 
        WHEN file_url IS NOT NULL THEN '✅ Fichier uploadé'
        WHEN fallback_svg IS NOT NULL THEN '⚠️ Utilise fallback SVG'
        ELSE '❌ Pas de fichier'
    END AS status,
    is_active,
    created_at
FROM public.app_assets
ORDER BY category, name;
