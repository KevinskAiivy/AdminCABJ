-- =====================================================
-- AJOUT DE LA COLONNE transfer_history À LA TABLE socios
-- =====================================================
-- Cette colonne stocke l'historique des transferts d'un socio
-- Format: JSON array d'objets TransferHistoryEntry
-- =====================================================

-- 1. Ajouter la colonne transfer_history à la table socios
ALTER TABLE socios 
ADD COLUMN IF NOT EXISTS transfer_history JSONB DEFAULT '[]'::jsonb;

-- 2. Créer un index pour les recherches dans l'historique
CREATE INDEX IF NOT EXISTS idx_socios_transfer_history 
ON socios USING GIN (transfer_history);

-- 3. Commentaire sur la colonne
COMMENT ON COLUMN socios.transfer_history IS 'Historique des transferts du socio. Format JSON: [{id, from_consulado_id, from_consulado_name, to_consulado_id, to_consulado_name, transfer_date, request_id, approved_by, comments}]';

-- =====================================================
-- VÉRIFICATION
-- =====================================================
-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'socios' AND column_name = 'transfer_history';

-- =====================================================
-- EXEMPLE D'UTILISATION
-- =====================================================
-- Pour ajouter une entrée à l'historique d'un socio:
/*
UPDATE socios 
SET transfer_history = transfer_history || '[{
    "id": "uuid-here",
    "from_consulado_id": "old-consulado-id",
    "from_consulado_name": "Consulado de Madrid",
    "to_consulado_id": "new-consulado-id", 
    "to_consulado_name": "Consulado de Barcelona",
    "transfer_date": "2025-01-16",
    "request_id": "transfer-request-id",
    "approved_by": "Admin Name",
    "comments": "Transfert approuvé"
}]'::jsonb
WHERE id = 'socio-id';
*/

-- Pour consulter l'historique d'un socio:
/*
SELECT id, name, transfer_history 
FROM socios 
WHERE id = 'socio-id';
*/

-- Pour trouver tous les socios qui ont été transférés:
/*
SELECT id, name, transfer_history 
FROM socios 
WHERE jsonb_array_length(transfer_history) > 0;
*/
