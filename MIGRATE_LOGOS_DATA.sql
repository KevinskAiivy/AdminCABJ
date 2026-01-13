-- Script de migration : Copier les logos existants de consulados vers la table logos
-- À exécuter dans l'éditeur SQL de Supabase APRÈS avoir créé la table logos

-- Étape 1 : Insérer les logos existants depuis consulados vers logos
INSERT INTO public.logos (consulado_id, marco_url, logotipo_url, created_at, updated_at)
SELECT 
    id AS consulado_id,
    logo AS marco_url,           -- La colonne 'logo' devient 'marco_url'
    banner AS logotipo_url,      -- La colonne 'banner' devient 'logotipo_url'
    NOW() AS created_at,
    NOW() AS updated_at
FROM public.consulados
WHERE logo IS NOT NULL OR banner IS NOT NULL  -- Ne migrer que les consulados qui ont au moins un logo
ON CONFLICT (consulado_id) DO UPDATE SET
    marco_url = EXCLUDED.marco_url,
    logotipo_url = EXCLUDED.logotipo_url,
    updated_at = NOW();

-- Étape 2 : Vérification - Afficher les logos migrés
SELECT 
    l.id,
    c.name AS consulado_name,
    c.city,
    c.country,
    l.marco_url,
    l.logotipo_url,
    l.created_at
FROM public.logos l
JOIN public.consulados c ON l.consulado_id = c.id
ORDER BY c.name;

-- Étape 3 : Statistiques de migration
SELECT 
    (SELECT COUNT(*) FROM public.consulados) AS total_consulados,
    (SELECT COUNT(*) FROM public.logos) AS total_logos_migres,
    (SELECT COUNT(*) FROM public.logos WHERE marco_url IS NOT NULL) AS logos_avec_marco,
    (SELECT COUNT(*) FROM public.logos WHERE logotipo_url IS NOT NULL) AS logos_avec_logotipo;
