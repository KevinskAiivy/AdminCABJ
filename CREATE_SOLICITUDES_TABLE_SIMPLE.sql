-- =====================================================
-- TABLA: solicitudes (Version Simple - Sans RLS)
-- =====================================================
-- Cette version crée la table sans les politiques RLS
-- pour éviter les problèmes de types
-- =====================================================

-- 1. Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS public.solicitudes CASCADE;

-- 2. Créer la table solicitudes
CREATE TABLE public.solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id BIGINT NOT NULL,
    socio_id TEXT NOT NULL,
    socio_name TEXT NOT NULL,
    socio_dni TEXT NOT NULL,
    socio_category TEXT NOT NULL,
    consulado TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLATION_REQUESTED')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Créer les index pour améliorer les performances
CREATE INDEX idx_solicitudes_match_id ON public.solicitudes(match_id);
CREATE INDEX idx_solicitudes_socio_id ON public.solicitudes(socio_id);
CREATE INDEX idx_solicitudes_consulado ON public.solicitudes(consulado);
CREATE INDEX idx_solicitudes_status ON public.solicitudes(status);
CREATE INDEX idx_solicitudes_timestamp ON public.solicitudes(timestamp DESC);

-- 4. Créer un trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_solicitudes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_solicitudes_updated_at ON public.solicitudes;
CREATE TRIGGER trigger_update_solicitudes_updated_at
    BEFORE UPDATE ON public.solicitudes
    FOR EACH ROW
    EXECUTE FUNCTION update_solicitudes_updated_at();

-- 5. DÉSACTIVER Row Level Security pour l'instant
ALTER TABLE public.solicitudes DISABLE ROW LEVEL SECURITY;

-- 6. Donner les permissions complètes (temporaire - à sécuriser plus tard)
GRANT ALL ON public.solicitudes TO authenticated;
GRANT ALL ON public.solicitudes TO anon;
GRANT ALL ON public.solicitudes TO service_role;

-- 7. Ajouter des commentaires pour la documentation
COMMENT ON TABLE public.solicitudes IS 'Demandes d''habilitations des socios pour assister aux matches';
COMMENT ON COLUMN public.solicitudes.id IS 'Identifiant unique de la solicitud';
COMMENT ON COLUMN public.solicitudes.match_id IS 'ID du match concerné';
COMMENT ON COLUMN public.solicitudes.socio_id IS 'ID du socio qui fait la demande (TEXT pour compatibilité)';
COMMENT ON COLUMN public.solicitudes.socio_name IS 'Nom complet du socio';
COMMENT ON COLUMN public.solicitudes.socio_dni IS 'DNI du socio';
COMMENT ON COLUMN public.solicitudes.socio_category IS 'Catégorie du socio (ACTIVO, ADHERENTE, etc.)';
COMMENT ON COLUMN public.solicitudes.consulado IS 'Nom du consulado du socio';
COMMENT ON COLUMN public.solicitudes.status IS 'Statut: PENDING, APPROVED, REJECTED, CANCELLATION_REQUESTED';
COMMENT ON COLUMN public.solicitudes.timestamp IS 'Date et heure de la demande';

-- 8. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Table solicitudes créée avec succès (VERSION SIMPLE)';
    RAISE NOTICE '✅ Index créés pour optimiser les performances';
    RAISE NOTICE '✅ Trigger updated_at configuré';
    RAISE NOTICE '⚠️  Row Level Security DÉSACTIVÉ (à activer plus tard)';
    RAISE NOTICE '⚠️  Permissions complètes accordées (à restreindre plus tard)';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Structure de la table:';
    RAISE NOTICE '   - id (UUID)';
    RAISE NOTICE '   - match_id (BIGINT)';
    RAISE NOTICE '   - socio_id (TEXT) ← Type TEXT pour compatibilité';
    RAISE NOTICE '   - socio_name (TEXT)';
    RAISE NOTICE '   - socio_dni (TEXT)';
    RAISE NOTICE '   - socio_category (TEXT)';
    RAISE NOTICE '   - consulado (TEXT)';
    RAISE NOTICE '   - status (TEXT): PENDING, APPROVED, REJECTED, CANCELLATION_REQUESTED';
    RAISE NOTICE '   - timestamp (TIMESTAMPTZ)';
    RAISE NOTICE '   - created_at (TIMESTAMPTZ)';
    RAISE NOTICE '   - updated_at (TIMESTAMPTZ)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Cette version N''A PAS de sécurité RLS';
    RAISE NOTICE '   Utilisez CREATE_SOLICITUDES_TABLE_WITH_RLS.sql pour ajouter la sécurité';
END $$;

-- 9. Vérifier que la table a été créée
SELECT 'Table solicitudes créée avec ' || COUNT(*) || ' colonnes' as result
FROM information_schema.columns 
WHERE table_name = 'solicitudes' AND table_schema = 'public';
