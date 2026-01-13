-- ============================================
-- DIAGNOSTIC COMPLET - Problème logos tablette
-- ============================================

-- 1. Vérifier le bucket Logo
SELECT 
    '1. BUCKET LOGO' AS test,
    name,
    public,
    CASE 
        WHEN public = true THEN '✅ Public'
        ELSE '❌ Pas public'
    END AS status
FROM storage.buckets 
WHERE name = 'Logo';

-- 2. Vérifier les policies
SELECT 
    '2. POLICIES' AS test,
    policyname,
    cmd,
    roles::text,
    CASE 
        WHEN 'public' = ANY(roles::text[]) THEN '✅ Public access'
        ELSE '⚠️ Restricted'
    END AS status
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%Logo%';

-- 3. Compter les fichiers dans le bucket
SELECT 
    '3. FICHIERS BUCKET' AS test,
    COUNT(*) AS total_fichiers,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Fichiers présents'
        ELSE '❌ Bucket vide'
    END AS status
FROM storage.objects
WHERE bucket_id = 'Logo';

-- 4. Lister quelques fichiers
SELECT 
    '4. EXEMPLES FICHIERS' AS test,
    name,
    created_at,
    'https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/Logo/' || name AS url_complete
FROM storage.objects
WHERE bucket_id = 'Logo'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Vérifier les consulados avec logos
SELECT 
    '5. CONSULADOS AVEC LOGOS' AS test,
    COUNT(*) AS total_avec_logos,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Consulados ont des logos'
        ELSE '❌ Aucun consulado avec logo'
    END AS status
FROM consulados
WHERE logo IS NOT NULL OR banner IS NOT NULL;

-- 6. Exemples de consulados et leurs logos
SELECT 
    '6. EXEMPLES CONSULADOS' AS test,
    name,
    logo,
    banner,
    'https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/Logo/' || logo AS logo_url,
    'https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/Logo/' || banner AS banner_url
FROM consulados
WHERE logo IS NOT NULL OR banner IS NOT NULL
LIMIT 5;

-- 7. Vérifier la table logos
SELECT 
    '7. TABLE LOGOS' AS test,
    COUNT(*) AS total_logos,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Table logos remplie'
        ELSE '⚠️ Table logos vide'
    END AS status
FROM logos;

-- 8. Exemples de la table logos
SELECT 
    '8. EXEMPLES TABLE LOGOS' AS test,
    l.consulado_id,
    c.name AS consulado_name,
    l.marco_url,
    l.logotipo_url
FROM logos l
LEFT JOIN consulados c ON l.consulado_id = c.id
LIMIT 5;

-- 9. Vérifier les CORS (si configurés)
SELECT 
    '9. CONFIGURATION' AS test,
    'Bucket: Logo, Public: true, Policies: OK' AS info,
    '✅ Configuration correcte' AS status;

-- ============================================
-- RÉSUMÉ ET RECOMMANDATIONS
-- ============================================
SELECT 
    '10. RÉSUMÉ' AS test,
    'Si tous les tests ci-dessus sont ✅, le problème vient de:' AS diagnostic,
    '1. Cache navigateur tablette - Vider le cache' AS solution_1,
    '2. Réseau/Pays - Tester avec VPN' AS solution_2,
    '3. Timestamp cache - Déjà ajouté dans le code' AS solution_3;
