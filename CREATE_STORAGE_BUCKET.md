# 📦 Créer le Bucket Storage "Logo"

## ⚠️ Erreur : "bucket not found"

Cette erreur signifie que le bucket `Logo` n'existe pas dans votre projet Supabase.

---

## 🔧 Solution 1 : Créer via l'interface Supabase (Recommandé)

### Étapes :

1. **Ouvrez Supabase Dashboard**
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Allez dans Storage**
   - Cliquez sur **Storage** dans le menu de gauche
   - Cliquez sur **New bucket**

3. **Créer le bucket**
   - **Name** : `Logo` (⚠️ Respectez la casse : L majuscule)
   - **Public bucket** : ✅ Coché (important !)
   - **File size limit** : 5 MB (ou plus si besoin)
   - Cliquez sur **Create bucket**

4. **Créer les dossiers** (optionnel)
   - Cliquez sur le bucket `Logo`
   - Créez les dossiers suivants :
     - `assets/` (pour les logos de l'app)
     - `consulados/` (pour les logos consulados)
     - `socios/` (pour les photos socios)

---

## 🔧 Solution 2 : Créer via SQL

Si vous préférez créer le bucket via SQL :

### 1. Créer le bucket

```sql
-- Dans Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'Logo',
  'Logo',
  true,
  5242880,  -- 5 MB en bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);
```

### 2. Configurer les politiques RLS

```sql
-- Autoriser la lecture publique
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'Logo');

-- Autoriser l'upload pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'Logo' 
  AND auth.role() = 'authenticated'
);

-- Autoriser la mise à jour pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'Logo')
WITH CHECK (bucket_id = 'Logo');

-- Autoriser la suppression pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'Logo');
```

### 3. Vérifier la création

```sql
-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE id = 'Logo';

-- Vérifier les politiques
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%Logo%';
```

---

## ✅ Vérification

### Test 1 : Via l'interface

1. Allez dans **Storage** → **Logo**
2. Vous devriez voir le bucket vide
3. Essayez d'uploader un fichier test

### Test 2 : Via l'URL

Ouvrez dans votre navigateur :

```
https://VOTRE_PROJET_ID.supabase.co/storage/v1/object/public/Logo/
```

Remplacez `VOTRE_PROJET_ID` par votre ID de projet Supabase.

**Résultat attendu** :
- ✅ Page blanche ou liste vide (c'est normal)
- ❌ Erreur 404 = le bucket n'existe pas encore

### Test 3 : Dans l'application

1. Connectez-vous à l'application
2. Allez dans **Centro de Control** → **Identidad & Logos**
3. Cliquez sur **Upload** pour un logo
4. Sélectionnez une image
5. ✅ L'upload devrait fonctionner

---

## 🔍 Dépannage

### Erreur : "new row violates row-level security policy"

**Cause** : Les politiques RLS bloquent l'upload.

**Solution** : Créer une politique permissive temporaire :

```sql
-- Politique permissive pour les tests
CREATE POLICY "Allow all for testing"
ON storage.objects
FOR ALL
USING (bucket_id = 'Logo')
WITH CHECK (bucket_id = 'Logo');
```

⚠️ **Attention** : Cette politique permet tout. À utiliser uniquement pour les tests.

### Erreur : "Bucket Logo already exists"

**Cause** : Le bucket existe déjà mais avec un nom différent (casse différente).

**Solution** : Vérifier les buckets existants :

```sql
SELECT * FROM storage.buckets;
```

Si vous voyez `logo` (minuscule) au lieu de `Logo`, vous avez 2 options :

**Option A** : Renommer le bucket existant

```sql
UPDATE storage.buckets SET id = 'Logo', name = 'Logo' WHERE id = 'logo';
```

**Option B** : Modifier le code pour utiliser `logo`

Dans `services/dataService.ts`, ligne 2987 :

```typescript
// Remplacer
.from('Logo')

// Par
.from('logo')
```

⚠️ **Important** : Si vous modifiez le code, il faudra aussi modifier tous les autres endroits qui utilisent `'Logo'`.

### Le bucket existe mais l'erreur persiste

**Vérifier la casse** :

```sql
-- Vérifier le nom exact
SELECT id, name, public FROM storage.buckets;
```

Le code utilise `'Logo'` avec un **L majuscule**. Si votre bucket s'appelle `'logo'` (minuscule), vous aurez l'erreur "bucket not found".

---

## 📋 Checklist finale

Avant de tester l'upload, vérifiez :

- [ ] Le bucket `Logo` existe (avec L majuscule)
- [ ] Le bucket est **public** (`public = true`)
- [ ] Les politiques RLS sont créées
- [ ] Vous pouvez accéder à l'URL du bucket dans le navigateur
- [ ] La table `app_assets` existe dans la base de données

---

## 🚀 Après la création

Une fois le bucket créé :

1. **Testez l'upload** dans l'application
2. **Vérifiez dans Storage** que le fichier apparaît
3. **Vérifiez dans `app_assets`** que l'URL est enregistrée

---

## 💡 Astuce

Pour éviter les problèmes de casse à l'avenir, utilisez toujours des noms en **minuscules** pour les buckets :

```sql
-- Meilleure pratique
INSERT INTO storage.buckets (id, name, public)
VALUES ('logo', 'logo', true);
```

Et modifiez le code en conséquence.

---

## ✅ Résultat attendu

Après avoir créé le bucket :

✅ Bucket `Logo` visible dans Storage  
✅ Upload fonctionne dans l'application  
✅ Fichiers stockés dans `Logo/assets/`  
✅ URLs enregistrées dans `app_assets`  

**Créez le bucket et testez !** 🎉
