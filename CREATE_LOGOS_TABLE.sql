-- Table pour stocker les logos marco et logotipo des consulados
-- À exécuter dans l'éditeur SQL de Supabase

-- Création de la table logos
CREATE TABLE IF NOT EXISTS public.logos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    consulado_id UUID REFERENCES public.consulados(id) ON DELETE CASCADE,
    
    -- URLs des logos
    marco_url TEXT,  -- URL du logo "marco" (cadre)
    logotipo_url TEXT,  -- URL du logo "logotipo"
    
    -- Métadonnées
    marco_uploaded_at TIMESTAMP WITH TIME ZONE,
    logotipo_uploaded_at TIMESTAMP WITH TIME ZONE,
    
    -- Dates de suivi
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Contrainte unique : un seul enregistrement par consulado
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

-- Row Level Security (RLS)
ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY;

-- Policy : Tout le monde peut voir les logos (lecture publique)
CREATE POLICY "Les logos sont visibles par tous"
    ON public.logos
    FOR SELECT
    USING (true);

-- Policy : Seuls les admins peuvent créer des logos
CREATE POLICY "Seuls les admins peuvent créer des logos"
    ON public.logos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('SUPERADMIN', 'ADMIN')
        )
    );

-- Policy : Seuls les admins peuvent modifier les logos
CREATE POLICY "Seuls les admins peuvent modifier les logos"
    ON public.logos
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('SUPERADMIN', 'ADMIN')
        )
    );

-- Policy : Seuls les admins peuvent supprimer les logos
CREATE POLICY "Seuls les admins peuvent supprimer les logos"
    ON public.logos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('SUPERADMIN', 'ADMIN')
        )
    );

-- Données d'exemple (optionnel - à adapter selon vos consulados existants)
-- INSERT INTO public.logos (consulado_id, marco_url, logotipo_url)
-- VALUES 
--     ('consulado-id-1', 'Logo/consulados/marco_consulado1.png', 'Logo/consulados/logotipo_consulado1.png'),
--     ('consulado-id-2', 'Logo/consulados/marco_consulado2.png', 'Logo/consulados/logotipo_consulado2.png');

-- Vérification
SELECT 
    l.id,
    c.name AS consulado_name,
    l.marco_url,
    l.logotipo_url,
    l.created_at,
    l.updated_at
FROM public.logos l
LEFT JOIN public.consulados c ON l.consulado_id = c.id
ORDER BY c.name;
