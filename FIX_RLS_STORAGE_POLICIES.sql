-- ============================================================================
-- FIX : Erreur "new row violates row-level security policy"
-- ============================================================================
-- Ce script corrige les politiques RLS du bucket Storage
-- pour permettre l'upload de fichiers par les utilisateurs authentifiés
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Supprimer les anciennes politiques
-- ============================================================================

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read Logo" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert Logo" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update Logo" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete Logo" ON storage.objects;
DROP POLICY IF EXISTS "Allow all for Logo bucket" ON storage.objects;

-- ============================================================================
-- ÉTAPE 2 : Créer des politiques permissives
-- ============================================================================

-- Politique 1 : Lecture publique (tout le monde peut voir les fichiers)
CREATE POLICY "Logo bucket - Public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'Logo');

-- Politique 2 : Upload pour tous (permissif pour les tests)
CREATE POLICY "Logo bucket - Allow insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'Logo');

-- Politique 3 : Mise à jour pour tous
CREATE POLICY "Logo bucket - Allow update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'Logo')
WITH CHECK (bucket_id = 'Logo');

-- Politique 4 : Suppression pour tous
CREATE POLICY "Logo bucket - Allow delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'Logo');

-- ============================================================================
-- ÉTAPE 3 : Vérifier les politiques créées
-- ============================================================================

SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%Logo%'
ORDER BY policyname;

-- ============================================================================
-- ALTERNATIVE : Politique ultra-permissive (si l'erreur persiste)
-- ============================================================================
-- Décommentez les lignes ci-dessous si vous avez encore l'erreur

/*
-- Supprimer toutes les politiques Logo
DROP POLICY IF EXISTS "Logo bucket - Public read" ON storage.objects;
DROP POLICY IF EXISTS "Logo bucket - Allow insert" ON storage.objects;
DROP POLICY IF EXISTS "Logo bucket - Allow update" ON storage.objects;
DROP POLICY IF EXISTS "Logo bucket - Allow delete" ON storage.objects;

-- Créer UNE SEULE politique permissive pour tout
CREATE POLICY "Logo bucket - Allow all operations"
ON storage.objects
FOR ALL
USING (bucket_id = 'Logo')
WITH CHECK (bucket_id = 'Logo');
*/

-- ============================================================================
-- ÉTAPE 4 : Vérifier que le bucket est public
-- ============================================================================

-- S'assurer que le bucket Logo est bien public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'Logo';

-- Vérifier
SELECT 
    id,
    name,
    public,
    file_size_limit
FROM storage.buckets 
WHERE id = 'Logo';

-- ============================================================================
-- RÉSULTAT ATTENDU
-- ============================================================================
-- ✅ 4 politiques RLS créées pour le bucket Logo
-- ✅ Bucket Logo est public
-- ✅ Upload devrait fonctionner sans erreur
-- ============================================================================

-- Message de succès
DO $$
BEGIN
    RAISE NOTICE '✅ Politiques RLS corrigées !';
    RAISE NOTICE '🔓 Upload autorisé pour le bucket Logo';
    RAISE NOTICE '🧪 Testez l''upload dans l''application';
END $$;
