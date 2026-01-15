-- =====================================================
-- TABLE: match_attendance (Historique des socios aux matchs)
-- =====================================================
-- Cette table conserve l'historique complet de tous les socios
-- pour chaque match : demandes, acceptations, refus, présences, etc.

-- Supprimer la table si elle existe (pour développement)
-- DROP TABLE IF EXISTS match_attendance;

CREATE TABLE IF NOT EXISTS match_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Références
    match_id TEXT NOT NULL,                    -- ID du match (partido)
    socio_id TEXT NOT NULL,                    -- ID du socio
    consulado_id TEXT,                         -- ID du consulado du socio
    
    -- Informations du match (dénormalisées pour l'historique)
    match_date DATE NOT NULL,                  -- Date du match
    match_competition TEXT,                    -- Compétition (Liga, Copa, etc.)
    match_opponent TEXT,                       -- Adversaire
    match_location TEXT,                       -- Lieu (Bombonera, etc.)
    match_type TEXT DEFAULT 'LOCAL',           -- LOCAL ou VISITANTE
    
    -- Informations du socio (dénormalisées pour l'historique)
    socio_name TEXT NOT NULL,                  -- Nom complet du socio
    socio_numero TEXT,                         -- Numéro de socio
    socio_dni TEXT,                            -- DNI du socio
    
    -- Statut de la demande d'habilitación
    request_status TEXT NOT NULL DEFAULT 'SOLICITADO',
    -- Valeurs possibles:
    -- 'SOLICITADO'  : Demande soumise, en attente
    -- 'ACEPTADO'    : Demande acceptée/habilitado
    -- 'RECHAZADO'   : Demande refusée
    -- 'CANCELADO'   : Demande annulée par le socio
    -- 'EXPIRADO'    : Demande expirée (match passé sans traitement)
    
    -- Statut de présence (rempli après le match par les admins)
    attendance_status TEXT DEFAULT NULL,
    -- Valeurs possibles:
    -- NULL          : Non encore renseigné
    -- 'PRESENTE'    : Le socio est venu au match
    -- 'AUSENTE_SIN_AVISO' : Absent sans prévenir
    -- 'AUSENTE_CON_AVISO' : Absent mais a prévenu
    -- 'ANULADO'     : Annulation de dernière minute
    
    -- Métadonnées de la demande
    requested_at TIMESTAMPTZ DEFAULT NOW(),    -- Date/heure de la demande
    requested_by TEXT,                         -- Qui a fait la demande (socio lui-même ou président)
    
    -- Métadonnées du traitement
    processed_at TIMESTAMPTZ,                  -- Date/heure du traitement
    processed_by TEXT,                         -- Qui a traité (admin/président)
    rejection_reason TEXT,                     -- Raison du refus si applicable
    
    -- Métadonnées de la présence
    attendance_recorded_at TIMESTAMPTZ,        -- Date/heure de l'enregistrement présence
    attendance_recorded_by TEXT,               -- Qui a enregistré la présence
    attendance_notes TEXT,                     -- Notes additionnelles
    
    -- Nombre de places demandées/accordées
    places_requested INT DEFAULT 1,            -- Places demandées
    places_granted INT DEFAULT 0,              -- Places accordées
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_match_attendance_socio ON match_attendance(socio_id);
CREATE INDEX IF NOT EXISTS idx_match_attendance_match ON match_attendance(match_id);
CREATE INDEX IF NOT EXISTS idx_match_attendance_consulado ON match_attendance(consulado_id);
CREATE INDEX IF NOT EXISTS idx_match_attendance_date ON match_attendance(match_date);
CREATE INDEX IF NOT EXISTS idx_match_attendance_request_status ON match_attendance(request_status);
CREATE INDEX IF NOT EXISTS idx_match_attendance_attendance_status ON match_attendance(attendance_status);

-- Index composite pour recherche par socio et date
CREATE INDEX IF NOT EXISTS idx_match_attendance_socio_date ON match_attendance(socio_id, match_date DESC);

-- Contrainte d'unicité : un socio ne peut avoir qu'une seule entrée par match
CREATE UNIQUE INDEX IF NOT EXISTS idx_match_attendance_unique 
ON match_attendance(match_id, socio_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_match_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_match_attendance_updated_at ON match_attendance;
CREATE TRIGGER trigger_match_attendance_updated_at
    BEFORE UPDATE ON match_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_match_attendance_updated_at();

-- =====================================================
-- POLITIQUES RLS (Row Level Security)
-- =====================================================

ALTER TABLE match_attendance ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : tout le monde peut lire
CREATE POLICY "match_attendance_select_policy" ON match_attendance
    FOR SELECT USING (true);

-- Politique d'insertion : utilisateurs authentifiés
CREATE POLICY "match_attendance_insert_policy" ON match_attendance
    FOR INSERT WITH CHECK (true);

-- Politique de mise à jour : utilisateurs authentifiés
CREATE POLICY "match_attendance_update_policy" ON match_attendance
    FOR UPDATE USING (true);

-- =====================================================
-- VUES UTILES
-- =====================================================

-- Vue pour les statistiques par socio
CREATE OR REPLACE VIEW socio_match_stats AS
SELECT 
    socio_id,
    socio_name,
    socio_numero,
    consulado_id,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE request_status = 'ACEPTADO') as total_accepted,
    COUNT(*) FILTER (WHERE request_status = 'RECHAZADO') as total_rejected,
    COUNT(*) FILTER (WHERE attendance_status = 'PRESENTE') as total_attended,
    COUNT(*) FILTER (WHERE attendance_status = 'AUSENTE_SIN_AVISO') as total_no_show,
    COUNT(*) FILTER (WHERE attendance_status = 'AUSENTE_CON_AVISO') as total_excused,
    ROUND(
        COUNT(*) FILTER (WHERE attendance_status = 'PRESENTE')::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE request_status = 'ACEPTADO'), 0) * 100, 
        1
    ) as attendance_rate
FROM match_attendance
GROUP BY socio_id, socio_name, socio_numero, consulado_id;

-- Vue pour l'historique récent d'un socio (derniers 20 matchs)
CREATE OR REPLACE VIEW socio_recent_history AS
SELECT 
    ma.*,
    CASE 
        WHEN ma.attendance_status = 'PRESENTE' THEN 'Presente'
        WHEN ma.attendance_status = 'AUSENTE_SIN_AVISO' THEN 'Ausente (sin aviso)'
        WHEN ma.attendance_status = 'AUSENTE_CON_AVISO' THEN 'Ausente (con aviso)'
        WHEN ma.attendance_status = 'ANULADO' THEN 'Anulado'
        WHEN ma.request_status = 'ACEPTADO' AND ma.attendance_status IS NULL THEN 'Pendiente confirmación'
        WHEN ma.request_status = 'SOLICITADO' THEN 'En espera'
        WHEN ma.request_status = 'RECHAZADO' THEN 'Rechazado'
        WHEN ma.request_status = 'CANCELADO' THEN 'Cancelado'
        ELSE 'Desconocido'
    END as status_display
FROM match_attendance ma
ORDER BY ma.match_date DESC;

-- =====================================================
-- DONNÉES D'EXEMPLE (optionnel, pour tests)
-- =====================================================

-- INSERT INTO match_attendance (
--     match_id, socio_id, consulado_id,
--     match_date, match_competition, match_opponent, match_location, match_type,
--     socio_name, socio_numero, socio_dni,
--     request_status, attendance_status,
--     places_requested, places_granted
-- ) VALUES 
-- ('match_001', 'socio_001', 'consulado_001',
--  '2024-03-15', 'Liga Profesional', 'River Plate', 'La Bombonera', 'LOCAL',
--  'GARCIA, Juan Carlos', '12345', '30123456',
--  'ACEPTADO', 'PRESENTE',
--  2, 2),
-- ('match_002', 'socio_001', 'consulado_001',
--  '2024-03-22', 'Copa Libertadores', 'Palmeiras', 'La Bombonera', 'LOCAL',
--  'GARCIA, Juan Carlos', '12345', '30123456',
--  'ACEPTADO', 'AUSENTE_SIN_AVISO',
--  1, 1);

-- =====================================================
-- FONCTIONS UTILES
-- =====================================================

-- Fonction pour enregistrer une nouvelle demande d'habilitación
CREATE OR REPLACE FUNCTION register_match_request(
    p_match_id TEXT,
    p_socio_id TEXT,
    p_consulado_id TEXT,
    p_match_date DATE,
    p_match_competition TEXT,
    p_match_opponent TEXT,
    p_match_location TEXT,
    p_match_type TEXT,
    p_socio_name TEXT,
    p_socio_numero TEXT,
    p_socio_dni TEXT,
    p_places_requested INT DEFAULT 1,
    p_requested_by TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO match_attendance (
        match_id, socio_id, consulado_id,
        match_date, match_competition, match_opponent, match_location, match_type,
        socio_name, socio_numero, socio_dni,
        places_requested, requested_by
    ) VALUES (
        p_match_id, p_socio_id, p_consulado_id,
        p_match_date, p_match_competition, p_match_opponent, p_match_location, p_match_type,
        p_socio_name, p_socio_numero, p_socio_dni,
        p_places_requested, p_requested_by
    )
    ON CONFLICT (match_id, socio_id) 
    DO UPDATE SET
        places_requested = EXCLUDED.places_requested,
        updated_at = NOW()
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le statut de présence (post-match)
CREATE OR REPLACE FUNCTION update_attendance_status(
    p_match_id TEXT,
    p_socio_id TEXT,
    p_attendance_status TEXT,
    p_recorded_by TEXT,
    p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE match_attendance
    SET 
        attendance_status = p_attendance_status,
        attendance_recorded_at = NOW(),
        attendance_recorded_by = p_recorded_by,
        attendance_notes = p_notes
    WHERE match_id = p_match_id AND socio_id = p_socio_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir les statistiques d'un socio
CREATE OR REPLACE FUNCTION get_socio_stats(p_socio_id TEXT)
RETURNS TABLE (
    total_requests BIGINT,
    total_accepted BIGINT,
    total_rejected BIGINT,
    total_attended BIGINT,
    total_no_show BIGINT,
    total_excused BIGINT,
    attendance_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE request_status = 'ACEPTADO')::BIGINT,
        COUNT(*) FILTER (WHERE request_status = 'RECHAZADO')::BIGINT,
        COUNT(*) FILTER (WHERE attendance_status = 'PRESENTE')::BIGINT,
        COUNT(*) FILTER (WHERE attendance_status = 'AUSENTE_SIN_AVISO')::BIGINT,
        COUNT(*) FILTER (WHERE attendance_status = 'AUSENTE_CON_AVISO')::BIGINT,
        ROUND(
            COUNT(*) FILTER (WHERE attendance_status = 'PRESENTE')::NUMERIC / 
            NULLIF(COUNT(*) FILTER (WHERE request_status = 'ACEPTADO'), 0) * 100, 
            1
        )
    FROM match_attendance
    WHERE socio_id = p_socio_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTAIRES
-- =====================================================

COMMENT ON TABLE match_attendance IS 'Historique complet des demandes et présences des socios aux matchs';
COMMENT ON COLUMN match_attendance.request_status IS 'Statut de la demande: SOLICITADO, ACEPTADO, RECHAZADO, CANCELADO, EXPIRADO';
COMMENT ON COLUMN match_attendance.attendance_status IS 'Statut de présence (post-match): PRESENTE, AUSENTE_SIN_AVISO, AUSENTE_CON_AVISO, ANULADO';
