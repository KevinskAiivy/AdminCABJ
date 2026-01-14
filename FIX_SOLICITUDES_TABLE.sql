-- =====================================================
-- SCRIPT RAPIDE: Corriger/Créer la table solicitudes
-- =====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- =====================================================

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id BIGINT NOT NULL,
    socio_id TEXT NOT NULL,
    socio_name TEXT NOT NULL,
    socio_dni TEXT,
    socio_category TEXT,
    consulado TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    cancellation_requested BOOLEAN NOT NULL DEFAULT FALSE,
    cancellation_rejected BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ajouter les colonnes manquantes si la table existe déjà
DO $$
BEGIN
    -- cancellation_requested
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'solicitudes' 
                   AND column_name = 'cancellation_requested') THEN
        ALTER TABLE public.solicitudes ADD COLUMN cancellation_requested BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE '✅ Colonne cancellation_requested ajoutée';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne cancellation_requested existe déjà';
    END IF;
    
    -- cancellation_rejected
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'solicitudes' 
                   AND column_name = 'cancellation_rejected') THEN
        ALTER TABLE public.solicitudes ADD COLUMN cancellation_rejected BOOLEAN NOT NULL DEFAULT FALSE;
        RAISE NOTICE '✅ Colonne cancellation_rejected ajoutée';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne cancellation_rejected existe déjà';
    END IF;
END $$;

-- 3. Créer les index
CREATE INDEX IF NOT EXISTS idx_solicitudes_match_id ON public.solicitudes(match_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_consulado ON public.solicitudes(consulado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON public.solicitudes(status);
CREATE INDEX IF NOT EXISTS idx_solicitudes_cancellation ON public.solicitudes(cancellation_requested);

-- 4. Désactiver RLS temporairement pour permettre l'accès (IMPORTANT pour le développement)
ALTER TABLE public.solicitudes DISABLE ROW LEVEL SECURITY;

-- OU si vous voulez garder RLS activé, créez une politique permissive:
-- ALTER TABLE public.solicitudes ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "allow_all" ON public.solicitudes;
-- CREATE POLICY "allow_all" ON public.solicitudes FOR ALL USING (true) WITH CHECK (true);

-- 5. Vérification
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'solicitudes'
ORDER BY ordinal_position;

-- Message final
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '✅ TABLE SOLICITUDES CONFIGURÉE AVEC SUCCÈS';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Colonnes importantes:';
    RAISE NOTICE '  - status: PENDING / APPROVED / REJECTED';
    RAISE NOTICE '  - cancellation_requested: TRUE quand annulation demandée';
    RAISE NOTICE '  - cancellation_rejected: TRUE quand annulation refusée';
    RAISE NOTICE '';
    RAISE NOTICE 'Flux:';
    RAISE NOTICE '  1. Président envoie liste -> status=PENDING';
    RAISE NOTICE '  2. Président demande annulation -> cancellation_requested=TRUE';
    RAISE NOTICE '  3a. Admin accepte -> solicitudes SUPPRIMÉES';
    RAISE NOTICE '  3b. Admin refuse -> cancellation_rejected=TRUE, bouton grisé';
    RAISE NOTICE '';
END $$;
