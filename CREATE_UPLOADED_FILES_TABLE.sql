-- ============================================
-- Table: uploaded_files
-- Description: Enregistre automatiquement tous les fichiers uploadés dans l'application
-- ============================================

-- Création de la table uploaded_files
CREATE TABLE IF NOT EXISTS public.uploaded_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Informations du fichier
    file_path TEXT NOT NULL UNIQUE,  -- Chemin complet dans Storage (ex: 'consulados/logo_123.png')
    file_name TEXT NOT NULL,         -- Nom original du fichier
    bucket_name TEXT NOT NULL,       -- Nom du bucket ('Logo', etc.)
    
    -- Métadonnées
    file_type TEXT,                  -- Type MIME (image/png, image/jpeg, etc.)
    file_size INTEGER,               -- Taille en bytes
    width INTEGER,                   -- Largeur en pixels (si image)
    height INTEGER,                  -- Hauteur en pixels (si image)
    
    -- Contexte d'upload
    uploaded_by UUID,                -- ID de l'utilisateur qui a uploadé
    entity_type TEXT,                -- Type d'entité ('consulado', 'socio', 'team', 'asset', etc.)
    entity_id TEXT,                  -- ID de l'entité associée
    field_name TEXT,                 -- Nom du champ ('logo', 'banner', 'avatar', etc.)
    
    -- URLs
    public_url TEXT,                 -- URL publique du fichier
    
    -- Statut
    is_active BOOLEAN DEFAULT true,  -- Fichier actif ou supprimé
    
    -- Dates
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_uploaded_files_path ON public.uploaded_files(file_path);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_bucket ON public.uploaded_files(bucket_name);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_entity ON public.uploaded_files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by ON public.uploaded_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_active ON public.uploaded_files(is_active);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_uploaded_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_uploaded_files_updated_at
    BEFORE UPDATE ON public.uploaded_files
    FOR EACH ROW
    EXECUTE FUNCTION update_uploaded_files_updated_at();

-- Commentaires
COMMENT ON TABLE public.uploaded_files IS 'Enregistre tous les fichiers uploadés dans l''application';
COMMENT ON COLUMN public.uploaded_files.file_path IS 'Chemin complet du fichier dans Storage';
COMMENT ON COLUMN public.uploaded_files.entity_type IS 'Type d''entité (consulado, socio, team, asset)';
COMMENT ON COLUMN public.uploaded_files.entity_id IS 'ID de l''entité associée';
COMMENT ON COLUMN public.uploaded_files.field_name IS 'Nom du champ (logo, banner, avatar)';

-- Vérification
SELECT 
    'Table uploaded_files créée avec succès!' AS status,
    COUNT(*) AS total_fichiers
FROM public.uploaded_files;
