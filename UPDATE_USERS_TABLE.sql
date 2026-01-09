-- Script SQL pour mettre à jour la table 'users' 
-- pour qu'elle reflète les champs du formulaire "Editar Usuario" et "Nuevo Usuario"
-- 
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- 1. Vérifier la structure actuelle de la table
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- 2. Ajouter les colonnes manquantes si elles n'existent pas

-- Ajouter 'full_name' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE users ADD COLUMN full_name TEXT;
    END IF;
END $$;

-- Ajouter 'email' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email TEXT;
    END IF;
END $$;

-- Ajouter 'username' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
    END IF;
END $$;

-- Ajouter 'password' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password'
    ) THEN
        ALTER TABLE users ADD COLUMN password TEXT;
    END IF;
END $$;

-- Ajouter 'role' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'PRESIDENTE';
    END IF;
END $$;

-- Ajouter 'consulado_id' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'consulado_id'
    ) THEN
        ALTER TABLE users ADD COLUMN consulado_id TEXT;
    END IF;
END $$;

-- Ajouter 'active' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'active'
    ) THEN
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Ajouter 'last_login' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_login'
    ) THEN
        ALTER TABLE users ADD COLUMN last_login TEXT;
    END IF;
END $$;

-- Ajouter 'avatar' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'avatar'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar TEXT;
    END IF;
END $$;

-- Ajouter 'gender' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'gender'
    ) THEN
        ALTER TABLE users ADD COLUMN gender TEXT;
    END IF;
END $$;

-- 3. Modifier les contraintes pour refléter les exigences du formulaire

-- 'full_name' est obligatoire
ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

-- 'email' est obligatoire et unique
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_email_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
END $$;

-- 'username' est obligatoire et unique
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_username_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- 'role' est obligatoire avec valeurs possibles
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'PRESIDENTE';
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('SUPERADMIN', 'ADMIN', 'PRESIDENTE', 'REFERENTE', 'SOCIO'));
    END IF;
END $$;

-- 'active' est obligatoire avec valeur par défaut
ALTER TABLE users ALTER COLUMN active SET NOT NULL;
ALTER TABLE users ALTER COLUMN active SET DEFAULT true;

-- 'consulado_id' est optionnel mais requis si role = PRESIDENTE ou REFERENTE
-- (Cette contrainte peut être gérée au niveau de l'application)

-- 'gender' est optionnel avec valeurs possibles
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_gender_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_gender_check 
        CHECK (gender IS NULL OR gender IN ('M', 'F', 'X'));
    END IF;
END $$;

-- 4. Créer un index sur 'consulado_id' pour améliorer les performances
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' AND indexname = 'users_consulado_id_idx'
    ) THEN
        CREATE INDEX users_consulado_id_idx ON users(consulado_id);
    END IF;
END $$;

-- 5. Créer un index sur 'role' pour améliorer les performances
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'users' AND indexname = 'users_role_idx'
    ) THEN
        CREATE INDEX users_role_idx ON users(role);
    END IF;
END $$;

-- 6. Vérification finale de la structure
-- SELECT 
--     column_name, 
--     data_type, 
--     is_nullable, 
--     column_default,
--     character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- Structure attendue après exécution :
-- id              TEXT        NOT NULL (PRIMARY KEY)
-- username        TEXT        NOT NULL UNIQUE
-- password        TEXT        NULLABLE
-- email           TEXT        NOT NULL UNIQUE
-- full_name       TEXT        NOT NULL
-- role            TEXT        NOT NULL DEFAULT 'PRESIDENTE' CHECK (role IN ('SUPERADMIN', 'ADMIN', 'PRESIDENTE', 'REFERENTE', 'SOCIO'))
-- consulado_id    TEXT        NULLABLE (Requis si role = PRESIDENTE ou REFERENTE)
-- active          BOOLEAN     NOT NULL DEFAULT true
-- last_login      TEXT        NULLABLE
-- avatar          TEXT        NULLABLE
-- gender          TEXT        NULLABLE CHECK (gender IN ('M', 'F', 'X') OR gender IS NULL)
