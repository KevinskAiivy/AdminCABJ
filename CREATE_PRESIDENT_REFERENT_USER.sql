-- Script SQL pour créer un utilisateur avec les rôles PRESIDENTE ou REFERENTE
-- 
-- Instructions:
-- 1. Remplacez les valeurs entre < > par vos informations
-- 2. Choisissez le rôle: 'PRESIDENTE' ou 'REFERENTE'
-- 3. Remplacez <CONSULADO_ID> par l'ID d'un consulado existant (requis pour PRESIDENTE et REFERENTE)
-- 4. Exécutez ce script dans l'éditeur SQL de Supabase

-- Option 1: Créer un utilisateur PRESIDENTE
INSERT INTO users (
  id,
  username,
  password,
  email,
  full_name,
  role,
  consulado_id,
  active,
  gender
) VALUES (
  gen_random_uuid(), -- Génère un UUID automatiquement
  'presidente', -- Nom d'utilisateur (à modifier)
  'presidente123', -- Mot de passe (à modifier)
  'presidente@bocajuniors.com.ar', -- Email (à modifier)
  'Presidente Consulado', -- Nom complet (à modifier)
  'PRESIDENTE', -- Rôle
  (SELECT id FROM consulados LIMIT 1), -- ID du consulado (remplacez par un ID spécifique si nécessaire)
  true, -- Actif
  'M' -- Genre: 'M', 'F', ou 'X'
);

-- Option 2: Créer un utilisateur REFERENTE
INSERT INTO users (
  id,
  username,
  password,
  email,
  full_name,
  role,
  consulado_id,
  active,
  gender
) VALUES (
  gen_random_uuid(), -- Génère un UUID automatiquement
  'referente', -- Nom d'utilisateur (à modifier)
  'referente123', -- Mot de passe (à modifier)
  'referente@bocajuniors.com.ar', -- Email (à modifier)
  'Referente Consulado', -- Nom complet (à modifier)
  'REFERENTE', -- Rôle
  (SELECT id FROM consulados LIMIT 1), -- ID du consulado (remplacez par un ID spécifique si nécessaire)
  true, -- Actif
  'M' -- Genre: 'M', 'F', ou 'X'
);

-- Pour voir les consulados disponibles et leurs IDs:
-- SELECT id, name, city, country FROM consulados ORDER BY name;

-- Pour voir tous les utilisateurs créés:
-- SELECT id, username, email, full_name, role, consulado_id, active FROM users ORDER BY role, full_name;

-- Pour modifier le consulado_id d'un utilisateur existant:
-- UPDATE users 
-- SET consulado_id = '<NOUVEAU_CONSULADO_ID>'
-- WHERE username = '<NOM_UTILISATEUR>';

-- Pour modifier le rôle d'un utilisateur existant:
-- UPDATE users 
-- SET role = 'PRESIDENTE' -- ou 'REFERENTE'
-- WHERE username = '<NOM_UTILISATEUR>';
