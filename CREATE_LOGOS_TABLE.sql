-- Table pour stocker les logos marco et logotipo des consulados
-- À exécuter dans l'éditeur SQL de Supabase

-- Création de la table logos
CREATE TABLE public.logos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consulado_id TEXT NOT NULL,
    marco_url TEXT,
    logotipo_url TEXT,
    marco_uploaded_at TIMESTAMP WITH TIME ZONE,
    logotipo_uploaded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(consulado_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_logos_consulado_id ON public.logos(consulado_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_logos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_logos_updated_at
    BEFORE UPDATE ON public.logos
    FOR EACH ROW
    EXECUTE FUNCTION update_logos_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE public.logos IS 'Stocke les logos marco et logotipo des consulados';
COMMENT ON COLUMN public.logos.marco_url IS 'URL du logo marco (cadre) stocké dans Supabase Storage';
COMMENT ON COLUMN public.logos.logotipo_url IS 'URL du logo logotipo stocké dans Supabase Storage';
COMMENT ON COLUMN public.logos.consulado_id IS 'Référence au consulado (relation 1:1)';

-- Commentaires
COMMENT ON TABLE public.logos IS 'Stocke les logos marco et logotipo des consulados';
COMMENT ON COLUMN public.logos.marco_url IS 'URL du logo marco (cadre) stocké dans Supabase Storage';
COMMENT ON COLUMN public.logos.logotipo_url IS 'URL du logo logotipo stocké dans Supabase Storage';

-- Vérification simple
SELECT COUNT(*) as total_logos FROM public.logos;
