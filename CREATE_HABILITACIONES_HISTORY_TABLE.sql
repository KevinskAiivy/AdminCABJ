-- =====================================================
-- TABLE COMPLÈTE: habilitaciones_history
-- Historique ultra-complet des demandes d'habilitations
-- =====================================================

-- 1. Créer la table principale
CREATE TABLE IF NOT EXISTS habilitaciones_history (
    -- Identifiant unique
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- =====================================================
    -- INFORMATIONS DU SOCIO (dénormalisées pour historique)
    -- =====================================================
    socio_id TEXT NOT NULL,
    socio_numero TEXT,                    -- Numéro de socio au moment de la demande
    socio_name TEXT NOT NULL,             -- Nom complet du socio
    socio_dni TEXT,                       -- DNI/Pasaporte
    socio_category TEXT,                  -- Catégorie (ACTIVO, ADHERENTE, etc.)
    socio_status TEXT,                    -- Statut cuota (AL DÍA, EN DEUDA, DE BAJA)
    socio_email TEXT,                     -- Email du socio
    socio_phone TEXT,                     -- Téléphone du socio
    
    -- =====================================================
    -- INFORMATIONS DU CONSULADO (dénormalisées)
    -- =====================================================
    consulado_id TEXT,
    consulado_name TEXT NOT NULL,         -- Nom du consulado
    consulado_city TEXT,                  -- Ville du consulado
    consulado_country TEXT,               -- Pays du consulado
    
    -- =====================================================
    -- INFORMATIONS DU MATCH (dénormalisées pour historique)
    -- =====================================================
    match_id TEXT NOT NULL,               -- ID du match (peut être UUID ou numérique)
    match_date TEXT NOT NULL,             -- Date du match (YYYY-MM-DD)
    match_hour TEXT,                      -- Heure du match (HH:MM)
    match_rival TEXT NOT NULL,            -- Nom de l'équipe adverse
    match_rival_short TEXT,               -- Nom court de l'équipe adverse
    match_competition TEXT,               -- Nom de la compétition
    match_competition_id TEXT,            -- ID de la compétition
    match_venue TEXT,                     -- Stade
    match_city TEXT,                      -- Ville du match
    match_is_home BOOLEAN DEFAULT true,   -- Match à domicile ou extérieur
    match_fecha_jornada TEXT,             -- Journée/Fecha
    
    -- =====================================================
    -- FENÊTRE D'HABILITATION
    -- =====================================================
    ventana_apertura_date TEXT,           -- Date d'ouverture de la ventana
    ventana_apertura_hour TEXT,           -- Heure d'ouverture
    ventana_cierre_date TEXT,             -- Date de fermeture de la ventana
    ventana_cierre_hour TEXT,             -- Heure de fermeture
    
    -- =====================================================
    -- STATUT DE LA DEMANDE
    -- =====================================================
    request_status TEXT NOT NULL DEFAULT 'SOLICITADO',
    -- Valeurs possibles:
    -- 'SOLICITADO' - Demande en attente
    -- 'ACEPTADO' - Demande acceptée
    -- 'RECHAZADO' - Demande refusée
    -- 'CANCELADO_SOCIO' - Annulé par le socio/consulado avant acceptation
    -- 'CANCELADO_ADMIN' - Annulé par l'admin
    -- 'CANCELADO_POST_ACEPTACION' - Annulé après acceptation
    -- 'EXPIRADO' - Demande expirée (ventana fermée sans traitement)
    
    -- =====================================================
    -- STATUT DE PRÉSENCE AU MATCH (post-match)
    -- =====================================================
    attendance_status TEXT,
    -- Valeurs possibles:
    -- NULL - Non encore enregistré
    -- 'PRESENTE' - Le socio était présent au match
    -- 'AUSENTE_SIN_AVISO' - Absent sans prévenir (no-show)
    -- 'AUSENTE_CON_AVISO' - Absent mais a prévenu
    -- 'ENTRADA_ANULADA' - Entrée annulée (problème technique, etc.)
    
    -- =====================================================
    -- RAISONS ET COMMENTAIRES
    -- =====================================================
    rejection_reason TEXT,                -- Raison du refus (si RECHAZADO)
    cancellation_reason TEXT,             -- Raison de l'annulation
    absence_reason TEXT,                  -- Raison de l'absence (si AUSENTE_CON_AVISO)
    admin_notes TEXT,                     -- Notes internes des admins
    
    -- =====================================================
    -- DEMANDE D'ANNULATION POST-ACCEPTATION
    -- =====================================================
    cancellation_requested BOOLEAN DEFAULT false,     -- Demande d'annulation en cours
    cancellation_requested_at TIMESTAMPTZ,            -- Date de la demande d'annulation
    cancellation_requested_by TEXT,                   -- Qui a demandé l'annulation
    cancellation_request_reason TEXT,                 -- Raison de la demande d'annulation
    cancellation_approved BOOLEAN,                    -- Annulation approuvée ou refusée
    cancellation_processed_at TIMESTAMPTZ,            -- Date de traitement de la demande
    cancellation_processed_by TEXT,                   -- Qui a traité la demande
    
    -- =====================================================
    -- PLACES / ENTRÉES
    -- =====================================================
    places_requested INTEGER DEFAULT 1,   -- Nombre de places demandées
    places_granted INTEGER,               -- Nombre de places accordées
    ticket_number TEXT,                   -- Numéro de ticket/entrée si applicable
    sector TEXT,                          -- Secteur attribué
    row_number TEXT,                      -- Rangée
    seat_number TEXT,                     -- Siège
    
    -- =====================================================
    -- MÉTADONNÉES DE CRÉATION
    -- =====================================================
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,                      -- Qui a créé la demande (ID user ou 'SYSTEM')
    
    -- =====================================================
    -- MÉTADONNÉES DE TRAITEMENT
    -- =====================================================
    processed_at TIMESTAMPTZ,             -- Date de traitement (acceptation/refus)
    processed_by TEXT,                    -- Qui a traité la demande (ID user)
    processed_by_name TEXT,               -- Nom de la personne qui a traité
    
    -- =====================================================
    -- MÉTADONNÉES DE PRÉSENCE
    -- =====================================================
    attendance_recorded_at TIMESTAMPTZ,   -- Date d'enregistrement de la présence
    attendance_recorded_by TEXT,          -- Qui a enregistré la présence
    attendance_recorded_by_name TEXT,     -- Nom de la personne
    
    -- =====================================================
    -- MÉTADONNÉES DE MISE À JOUR
    -- =====================================================
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- =====================================================
    -- RÉFÉRENCE À LA SOLICITUD ORIGINALE
    -- =====================================================
    original_solicitud_id TEXT,           -- ID de la solicitud originale (si migration)
    
    -- =====================================================
    -- FLAGS SPÉCIAUX
    -- =====================================================
    is_vip BOOLEAN DEFAULT false,         -- Demande VIP
    is_priority BOOLEAN DEFAULT false,    -- Demande prioritaire
    is_first_match BOOLEAN DEFAULT false, -- Premier match du socio
    has_special_needs BOOLEAN DEFAULT false, -- Besoins spéciaux (accessibilité, etc.)
    special_needs_notes TEXT              -- Notes sur les besoins spéciaux
);

-- 2. Créer les index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_socio_id ON habilitaciones_history(socio_id);
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_consulado_id ON habilitaciones_history(consulado_id);
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_match_id ON habilitaciones_history(match_id);
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_match_date ON habilitaciones_history(match_date);
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_request_status ON habilitaciones_history(request_status);
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_attendance_status ON habilitaciones_history(attendance_status);
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_created_at ON habilitaciones_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_socio_name ON habilitaciones_history(socio_name);
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_consulado_name ON habilitaciones_history(consulado_name);

-- Index composite pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_match_consulado ON habilitaciones_history(match_id, consulado_id);
CREATE INDEX IF NOT EXISTS idx_habilitaciones_history_socio_match ON habilitaciones_history(socio_id, match_id);

-- 3. Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_habilitaciones_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_habilitaciones_history_updated_at ON habilitaciones_history;
CREATE TRIGGER trigger_habilitaciones_history_updated_at
    BEFORE UPDATE ON habilitaciones_history
    FOR EACH ROW
    EXECUTE FUNCTION update_habilitaciones_history_updated_at();

-- 4. Commentaires sur la table et les colonnes importantes
COMMENT ON TABLE habilitaciones_history IS 'Historique complet des demandes d''habilitations pour les matchs';
COMMENT ON COLUMN habilitaciones_history.request_status IS 'Statut de la demande: SOLICITADO, ACEPTADO, RECHAZADO, CANCELADO_SOCIO, CANCELADO_ADMIN, CANCELADO_POST_ACEPTACION, EXPIRADO';
COMMENT ON COLUMN habilitaciones_history.attendance_status IS 'Statut de présence: NULL (non enregistré), PRESENTE, AUSENTE_SIN_AVISO, AUSENTE_CON_AVISO, ENTRADA_ANULADA';

-- 5. Politiques RLS (Row Level Security)
ALTER TABLE habilitaciones_history ENABLE ROW LEVEL SECURITY;

-- Politique pour lecture (tous les utilisateurs authentifiés peuvent lire)
CREATE POLICY "habilitaciones_history_select_policy" ON habilitaciones_history
    FOR SELECT USING (true);

-- Politique pour insertion (tous les utilisateurs authentifiés peuvent insérer)
CREATE POLICY "habilitaciones_history_insert_policy" ON habilitaciones_history
    FOR INSERT WITH CHECK (true);

-- Politique pour mise à jour (tous les utilisateurs authentifiés peuvent modifier)
CREATE POLICY "habilitaciones_history_update_policy" ON habilitaciones_history
    FOR UPDATE USING (true);

-- =====================================================
-- VÉRIFICATION
-- =====================================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'habilitaciones_history'
ORDER BY ordinal_position;

-- =====================================================
-- EXEMPLES DE REQUÊTES UTILES
-- =====================================================

-- Obtenir l'historique complet d'un socio
/*
SELECT * FROM habilitaciones_history 
WHERE socio_id = 'socio-uuid' 
ORDER BY created_at DESC;
*/

-- Obtenir toutes les demandes pour un match
/*
SELECT * FROM habilitaciones_history 
WHERE match_id = 'match-id' 
ORDER BY consulado_name, socio_name;
*/

-- Statistiques par consulado
/*
SELECT 
    consulado_name,
    COUNT(*) as total_demandes,
    COUNT(*) FILTER (WHERE request_status = 'ACEPTADO') as aceptadas,
    COUNT(*) FILTER (WHERE request_status = 'RECHAZADO') as rechazadas,
    COUNT(*) FILTER (WHERE attendance_status = 'PRESENTE') as presentes,
    COUNT(*) FILTER (WHERE attendance_status = 'AUSENTE_SIN_AVISO') as no_shows
FROM habilitaciones_history
GROUP BY consulado_name
ORDER BY total_demandes DESC;
*/

-- Socios avec le plus de no-shows
/*
SELECT 
    socio_id,
    socio_name,
    consulado_name,
    COUNT(*) FILTER (WHERE attendance_status = 'AUSENTE_SIN_AVISO') as no_shows,
    COUNT(*) FILTER (WHERE attendance_status = 'PRESENTE') as presencias
FROM habilitaciones_history
GROUP BY socio_id, socio_name, consulado_name
HAVING COUNT(*) FILTER (WHERE attendance_status = 'AUSENTE_SIN_AVISO') > 0
ORDER BY no_shows DESC;
*/
