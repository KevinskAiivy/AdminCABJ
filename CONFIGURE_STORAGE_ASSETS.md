# 📦 Configuration Storage pour App Assets

## 🎯 Objectif

Configurer le bucket Supabase Storage pour stocker tous les logos et assets de l'application.

---

## Option 1 : Utiliser le bucket existant `Logo` (Recommandé)

Le système utilise déjà le bucket `Logo`. Il suffit de vérifier qu'il est bien configuré.

### Vérification dans Supabase Dashboard

1. Allez dans **Storage** → **Logo**
2. Vérifiez que le bucket est **public**
3. Créez un dossier `assets/` pour organiser les fichiers

### Structure recommandée :

```
Logo/
├── assets/              # Logos de l'application (navbar, footer, etc.)
│   ├── navbar_logo_main_*.png
│   ├── navbar_logo_alt_*.png
│   ├── footer_logo_*.png
│   └── favicon_*.ico
├── consulados/          # Logos des consulados
│   ├── logo/
│   └── banner/
└── socios/              # Photos des socios
    └── avatars/
```

---

## Option 2 : Créer un bucket dédié `app-assets` (Optionnel)

Si vous préférez séparer les assets de l'application des logos consulados.

### 1. Créer le bucket

```sql
-- Dans Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true);
```

### 2. Configurer les politiques RLS

```sql
-- Autoriser la lecture publique
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-assets');

-- Autoriser l'upload pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'app-assets' 
  AND auth.role() = 'authenticated'
);

-- Autoriser la mise à jour pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'app-assets')
WITH CHECK (bucket_id = 'app-assets');

-- Autoriser la suppression pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'app-assets');
```

### 3. Modifier le code pour utiliser le nouveau bucket

Dans `services/dataService.ts`, ligne 2987 :

```typescript
// Remplacer
const { error: uploadError } = await supabase.storage
  .from('Logo')
  .upload(fileName, file);

// Par
const { error: uploadError } = await supabase.storage
  .from('app-assets')
  .upload(fileName, file);
```

---

## 🧪 Test de la configuration

### Test 1 : Vérifier l'accès public

Ouvrez dans votre navigateur :

```
https://VOTRE_PROJET.supabase.co/storage/v1/object/public/Logo/
```

Vous devriez voir la liste des dossiers (ou une erreur 404 si vide, c'est normal).

### Test 2 : Upload un fichier test

Dans l'application :

1. Connectez-vous en tant qu'admin
2. Allez dans **Centro de Control** → **Identidad & Logos**
3. Cliquez sur **Upload** pour n'importe quel logo
4. Sélectionnez une image
5. Vérifiez que l'image s'affiche immédiatement

### Test 3 : Vérifier dans Storage

1. Allez dans **Supabase Dashboard** → **Storage** → **Logo** → **assets/**
2. Vous devriez voir le fichier uploadé avec un nom comme `navbar_logo_main_1705234567890.png`

---

## 📊 Vérification de la base de données

Après upload, vérifiez que la table `app_assets` est bien mise à jour :

```sql
SELECT 
  asset_key,
  name,
  file_url,
  file_type,
  file_size,
  uploaded_at
FROM app_assets
WHERE file_url IS NOT NULL
ORDER BY uploaded_at DESC;
```

Vous devriez voir :
- `file_url` : chemin du fichier dans Storage (ex: `assets/navbar_logo_main_1705234567890.png`)
- `file_type` : type MIME (ex: `image/png`)
- `file_size` : taille en bytes
- `uploaded_at` : date d'upload

---

## 🔧 Dépannage

### Erreur "bucket not found"

**Cause** : Le bucket n'existe pas ou le nom est incorrect (sensible à la casse).

**Solution** :
1. Vérifiez dans **Storage** que le bucket existe
2. Vérifiez la casse : `Logo` ≠ `logo`

### Erreur "new row violates row-level security policy"

**Cause** : Les politiques RLS bloquent l'upload.

**Solution** :
```sql
-- Vérifier les politiques existantes
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Créer une politique permissive pour les tests
CREATE POLICY "Allow all for testing"
ON storage.objects
FOR ALL
USING (bucket_id = 'Logo');
```

### Les images ne s'affichent pas

**Cause** : Le bucket n'est pas public ou problème CORS.

**Solution** :
1. Dans **Storage** → **Logo** → **Settings**
2. Cochez **Public bucket**
3. Ajoutez les CORS si nécessaire :
   ```json
   {
     "allowedOrigins": ["*"],
     "allowedMethods": ["GET", "HEAD"],
     "allowedHeaders": ["*"],
     "maxAge": 3600
   }
   ```

---

## ✅ Résultat attendu

Après configuration :

✅ Les logos uploadés sont stockés dans Storage  
✅ Les URLs sont enregistrées dans `app_assets`  
✅ Les images s'affichent immédiatement  
✅ Pas besoin de redéployer pour modifier un logo  
✅ Fallback SVG si pas de fichier uploadé  

---

## 📝 Notes importantes

1. **Nommage des fichiers** : Chaque upload génère un nom unique avec timestamp pour éviter les conflits
2. **Cache** : Les URLs incluent un timestamp pour bypass le cache navigateur
3. **Sécurité** : Seuls les utilisateurs authentifiés peuvent uploader
4. **Organisation** : Utilisez le dossier `assets/` pour les logos de l'app

---

## 🚀 Prochaine étape

Testez l'upload d'un logo dans l'application ! 🎉
