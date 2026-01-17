-- =====================================================
-- SCRIPT DE VÉRIFICATION ET CORRECTION DE LA TABLE SOLICITUDES
-- =====================================================

-- 1. Vérifier si la table existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'solicitudes'
) AS table_exists;

-- 2. Si la table n'existe pas, la créer
CREATE TABLE IF NOT EXISTS solicitudes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id TEXT NOT NULL,
    socio_id TEXT NOT NULL,
    socio_name TEXT NOT NULL,
    socio_dni TEXT,
    socio_category TEXT,
    consulado TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    cancellation_requested BOOLEAN DEFAULT false,
    cancellation_rejected BOOLEAN DEFAULT false,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vérifier la structure de la table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'solicitudes'
ORDER BY ordinal_position;

-- 4. Ajouter les colonnes manquantes si nécessaire
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS match_id TEXT;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS socio_id TEXT;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS socio_name TEXT;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS socio_dni TEXT;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS socio_category TEXT;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS consulado TEXT;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS cancellation_requested BOOLEAN DEFAULT false;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS cancellation_rejected BOOLEAN DEFAULT false;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();

-- 5. Activer RLS (Row Level Security)
ALTER TABLE solicitudes ENABLE ROW LEVEL SECURITY;

-- 6. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "solicitudes_select_policy" ON solicitudes;
DROP POLICY IF EXISTS "solicitudes_insert_policy" ON solicitudes;
DROP POLICY IF EXISTS "solicitudes_update_policy" ON solicitudes;
DROP POLICY IF EXISTS "solicitudes_delete_policy" ON solicitudes;
DROP POLICY IF EXISTS "Enable read access for all users" ON solicitudes;
DROP POLICY IF EXISTS "Enable insert for all users" ON solicitudes;
DROP POLICY IF EXISTS "Enable update for all users" ON solicitudes;
DROP POLICY IF EXISTS "Enable delete for all users" ON solicitudes;

-- 7. Créer les politiques RLS permissives
CREATE POLICY "solicitudes_select_policy" ON solicitudes
    FOR SELECT USING (true);

CREATE POLICY "solicitudes_insert_policy" ON solicitudes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "solicitudes_update_policy" ON solicitudes
    FOR UPDATE USING (true);

CREATE POLICY "solicitudes_delete_policy" ON solicitudes
    FOR DELETE USING (true);

-- 8. Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_solicitudes_match_id ON solicitudes(match_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_socio_id ON solicitudes(socio_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_consulado ON solicitudes(consulado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_status ON solicitudes(status);

-- 9. Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_solicitudes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_solicitudes_updated_at ON solicitudes;
CREATE TRIGGER trigger_solicitudes_updated_at
    BEFORE UPDATE ON solicitudes
    FOR EACH ROW
    EXECUTE FUNCTION update_solicitudes_updated_at();

-- 10. Vérifier les données existantes
SELECT COUNT(*) as total_solicitudes FROM solicitudes;

-- 11. Test d'insertion
/*
INSERT INTO solicitudes (match_id, socio_id, socio_name, socio_dni, socio_category, consulado, status)
VALUES ('test-match-id', 'test-socio-id', 'Test Socio', '12345678', 'ACTIVO', 'Test Consulado', 'PENDING')
RETURNING *;
*/

-- 12. Commentaire sur la table
COMMENT ON TABLE solicitudes IS 'Table des demandes d''habilitation pour les matchs';
