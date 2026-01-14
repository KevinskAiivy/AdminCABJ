-- =====================================================
-- TABLA: solicitudes (Demandes d'habilitations)
-- =====================================================
-- Cette table stocke toutes les demandes d'habilitations
-- des socios pour assister aux matches
-- =====================================================

-- 1. Créer la table solicitudes
CREATE TABLE IF NOT EXISTS public.solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id BIGINT NOT NULL,
    socio_id UUID NOT NULL,
    socio_name TEXT NOT NULL,
    socio_dni TEXT NOT NULL,
    socio_category TEXT NOT NULL,
    consulado TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLATION_REQUESTED')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_solicitudes_match_id ON public.solicitudes(match_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_socio_id ON public.solicitudes(socio_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_consulado ON public.solicitudes(consulado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON public.solicitudes(status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_timestamp ON public.solicitudes(timestamp DESC);

-- 3. Créer un trigger pour mettre à jour updated_at automatiquement
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

-- 4. Activer Row Level Security (RLS)
ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS

-- Policy: Les SUPERADMIN et ADMIN peuvent tout voir
DROP POLICY IF EXISTS "SUPERADMIN et ADMIN peuvent voir toutes les solicitudes" ON public.solicitudes;
CREATE POLICY "SUPERADMIN et ADMIN peuvent voir toutes les solicitudes"
    ON public.solicitudes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('SUPERADMIN', 'ADMIN')
            AND users.active = true
        )
    );

-- Policy: Les PRESIDENTE et REFERENTE peuvent voir les solicitudes de leur consulado
DROP POLICY IF EXISTS "PRESIDENTE et REFERENTE peuvent voir solicitudes de leur consulado" ON public.solicitudes;
CREATE POLICY "PRESIDENTE et REFERENTE peuvent voir solicitudes de leur consulado"
    ON public.solicitudes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('PRESIDENTE', 'REFERENTE')
            AND users.consulado_id IN (
                SELECT c.id FROM public.consulados c WHERE c.name = solicitudes.consulado
            )
            AND users.active = true
        )
    );

-- Policy: Les SOCIO peuvent voir leurs propres solicitudes
DROP POLICY IF EXISTS "SOCIO peuvent voir leurs propres solicitudes" ON public.solicitudes;
CREATE POLICY "SOCIO peuvent voir leurs propres solicitudes"
    ON public.solicitudes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'SOCIO'
            AND users.active = true
        )
        AND socio_id::text = auth.uid()::text
    );

-- Policy: Les SUPERADMIN et ADMIN peuvent insérer des solicitudes
DROP POLICY IF EXISTS "SUPERADMIN et ADMIN peuvent créer solicitudes" ON public.solicitudes;
CREATE POLICY "SUPERADMIN et ADMIN peuvent créer solicitudes"
    ON public.solicitudes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('SUPERADMIN', 'ADMIN')
            AND users.active = true
        )
    );

-- Policy: Les PRESIDENTE et REFERENTE peuvent créer des solicitudes pour leur consulado
DROP POLICY IF EXISTS "PRESIDENTE et REFERENTE peuvent créer solicitudes pour leur consulado" ON public.solicitudes;
CREATE POLICY "PRESIDENTE et REFERENTE peuvent créer solicitudes pour leur consulado"
    ON public.solicitudes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('PRESIDENTE', 'REFERENTE')
            AND users.consulado_id IN (
                SELECT c.id FROM public.consulados c WHERE c.name = consulado
            )
            AND users.active = true
        )
    );

-- Policy: Les SOCIO peuvent créer leurs propres solicitudes
DROP POLICY IF EXISTS "SOCIO peuvent créer leurs propres solicitudes" ON public.solicitudes;
CREATE POLICY "SOCIO peuvent créer leurs propres solicitudes"
    ON public.solicitudes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'SOCIO'
            AND users.active = true
        )
        AND socio_id::text = auth.uid()::text
    );

-- Policy: Les SUPERADMIN et ADMIN peuvent mettre à jour toutes les solicitudes
DROP POLICY IF EXISTS "SUPERADMIN et ADMIN peuvent modifier solicitudes" ON public.solicitudes;
CREATE POLICY "SUPERADMIN et ADMIN peuvent modifier solicitudes"
    ON public.solicitudes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('SUPERADMIN', 'ADMIN')
            AND users.active = true
        )
    );

-- Policy: Les PRESIDENTE et REFERENTE peuvent mettre à jour les solicitudes de leur consulado
DROP POLICY IF EXISTS "PRESIDENTE et REFERENTE peuvent modifier solicitudes de leur consulado" ON public.solicitudes;
CREATE POLICY "PRESIDENTE et REFERENTE peuvent modifier solicitudes de leur consulado"
    ON public.solicitudes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('PRESIDENTE', 'REFERENTE')
            AND users.consulado_id IN (
                SELECT c.id FROM public.consulados c WHERE c.name = consulado
            )
            AND users.active = true
        )
    );

-- Policy: Les SOCIO peuvent annuler leurs propres solicitudes (CANCELLATION_REQUESTED)
DROP POLICY IF EXISTS "SOCIO peuvent annuler leurs propres solicitudes" ON public.solicitudes;
CREATE POLICY "SOCIO peuvent annuler leurs propres solicitudes"
    ON public.solicitudes
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'SOCIO'
            AND users.active = true
        )
        AND socio_id::text = auth.uid()::text
        AND status IN ('PENDING', 'APPROVED')
    )
    WITH CHECK (
        status = 'CANCELLATION_REQUESTED'
    );

-- Policy: Les SUPERADMIN et ADMIN peuvent supprimer des solicitudes
DROP POLICY IF EXISTS "SUPERADMIN et ADMIN peuvent supprimer solicitudes" ON public.solicitudes;
CREATE POLICY "SUPERADMIN et ADMIN peuvent supprimer solicitudes"
    ON public.solicitudes
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('SUPERADMIN', 'ADMIN')
            AND users.active = true
        )
    );

-- 6. Ajouter des commentaires pour la documentation
COMMENT ON TABLE public.solicitudes IS 'Demandes d''habilitations des socios pour assister aux matches';
COMMENT ON COLUMN public.solicitudes.id IS 'Identifiant unique de la solicitud';
COMMENT ON COLUMN public.solicitudes.match_id IS 'ID du match concerné';
COMMENT ON COLUMN public.solicitudes.socio_id IS 'ID du socio qui fait la demande';
COMMENT ON COLUMN public.solicitudes.socio_name IS 'Nom complet du socio';
COMMENT ON COLUMN public.solicitudes.socio_dni IS 'DNI du socio';
COMMENT ON COLUMN public.solicitudes.socio_category IS 'Catégorie du socio (ACTIVO, ADHERENTE, etc.)';
COMMENT ON COLUMN public.solicitudes.consulado IS 'Nom du consulado du socio';
COMMENT ON COLUMN public.solicitudes.status IS 'Statut: PENDING, APPROVED, REJECTED, CANCELLATION_REQUESTED';
COMMENT ON COLUMN public.solicitudes.timestamp IS 'Date et heure de la demande';

-- 7. Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Table solicitudes créée avec succès';
    RAISE NOTICE '✅ Index créés pour optimiser les performances';
    RAISE NOTICE '✅ Trigger updated_at configuré';
    RAISE NOTICE '✅ Row Level Security (RLS) activé';
    RAISE NOTICE '✅ Politiques RLS configurées pour tous les rôles';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Structure de la table:';
    RAISE NOTICE '   - id (UUID)';
    RAISE NOTICE '   - match_id (BIGINT)';
    RAISE NOTICE '   - socio_id (UUID)';
    RAISE NOTICE '   - socio_name (TEXT)';
    RAISE NOTICE '   - socio_dni (TEXT)';
    RAISE NOTICE '   - socio_category (TEXT)';
    RAISE NOTICE '   - consulado (TEXT)';
    RAISE NOTICE '   - status (TEXT): PENDING, APPROVED, REJECTED, CANCELLATION_REQUESTED';
    RAISE NOTICE '   - timestamp (TIMESTAMPTZ)';
    RAISE NOTICE '   - created_at (TIMESTAMPTZ)';
    RAISE NOTICE '   - updated_at (TIMESTAMPTZ)';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Permissions RLS:';
    RAISE NOTICE '   - SUPERADMIN/ADMIN: Accès complet';
    RAISE NOTICE '   - PRESIDENTE/REFERENTE: Accès aux solicitudes de leur consulado';
    RAISE NOTICE '   - SOCIO: Accès uniquement à leurs propres solicitudes';
END $$;
