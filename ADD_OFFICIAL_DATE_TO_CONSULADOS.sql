-- Ajouter la colonne official_date à la table consulados
-- Cette colonne stocke la date d'officialisation d'un consulado (format DD/MM/YYYY)

ALTER TABLE consulados 
ADD COLUMN IF NOT EXISTS official_date TEXT;

-- Commentaire sur la colonne
COMMENT ON COLUMN consulados.official_date IS 'Date d''officialisation du consulado au format DD/MM/YYYY. Uniquement remplie si is_official est true';
