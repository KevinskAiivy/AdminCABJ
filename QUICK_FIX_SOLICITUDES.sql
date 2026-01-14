-- =====================================================
-- SCRIPT ULTRA-SIMPLE: Créer table solicitudes
-- =====================================================
-- Copiez-collez ce script EXACTEMENT dans Supabase SQL Editor
-- =====================================================

-- Supprimer la table si elle existe (pour repartir de zéro)
DROP TABLE IF EXISTS public.solicitudes CASCADE;

-- Créer la table
CREATE TABLE public.solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id BIGINT NOT NULL DEFAULT 0,
    socio_id TEXT NOT NULL DEFAULT '',
    socio_name TEXT NOT NULL DEFAULT '',
    socio_dni TEXT DEFAULT '',
    socio_category TEXT DEFAULT '',
    consulado TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDING',
    cancellation_requested BOOLEAN NOT NULL DEFAULT FALSE,
    cancellation_rejected BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DÉSACTIVER COMPLÈTEMENT RLS (important pour que ça marche!)
ALTER TABLE public.solicitudes DISABLE ROW LEVEL SECURITY;

-- Donner tous les droits à tout le monde
GRANT ALL ON public.solicitudes TO anon;
GRANT ALL ON public.solicitudes TO authenticated;
GRANT ALL ON public.solicitudes TO service_role;

-- Vérifier que la table existe
SELECT 'Table solicitudes créée avec succès!' AS message;
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'solicitudes' ORDER BY ordinal_position;
