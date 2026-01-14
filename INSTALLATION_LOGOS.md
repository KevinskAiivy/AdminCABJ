# 🚀 Installation du Système de Logos

## ⚠️ Erreur "bucket not found"

Vous avez cette erreur car le bucket Storage n'existe pas encore.

---

## ✅ Solution rapide (2 minutes)

### Étape 1 : Exécuter le script SQL

1. **Ouvrez Supabase Dashboard**
   - https://supabase.com/dashboard
   - Sélectionnez votre projet

2. **Allez dans SQL Editor**
   - Cliquez sur **SQL Editor** dans le menu de gauche
   - Cliquez sur **New query**

3. **Copiez-collez le script**
   - Ouvrez le fichier `CREATE_COMPLETE_STORAGE_SETUP.sql`
   - Copiez tout le contenu
   - Collez dans l'éditeur SQL

4. **Exécutez le script**
   - Cliquez sur **Run** (ou Ctrl+Enter)
   - Attendez quelques secondes

5. **Vérifiez les résultats**
   - Vous devriez voir :
     ```
     ✅ Bucket "Logo" créé
     ✅ 4 politiques RLS
     ✅ 20 assets créés
     ```

### Étape 2 : Vérifier dans Storage

1. Allez dans **Storage** (menu de gauche)
2. Vous devriez voir le bucket **Logo**
3. Cliquez dessus → il est vide (c'est normal)

### Étape 3 : Tester l'upload

1. Connectez-vous à l'application
2. Allez dans **Centro de Control** → **Identidad & Logos**
3. Cliquez sur **Upload** pour n'importe quel logo
4. Sélectionnez une image
5. ✅ L'upload devrait fonctionner !

---

## 🎯 Ce que le script fait

Le script `CREATE_COMPLETE_STORAGE_SETUP.sql` crée automatiquement :

1. **Bucket Storage "Logo"**
   - Public (accessible sans authentification)
   - Limite : 10 MB par fichier
   - Types acceptés : PNG, JPG, SVG, GIF, WebP, ICO

2. **4 Politiques de sécurité**
   - Lecture publique (tout le monde peut voir)
   - Upload pour authentifiés uniquement
   - Mise à jour pour authentifiés
   - Suppression pour authentifiés

3. **Table `app_assets`**
   - 20 assets pré-configurés
   - Fallback SVG pour chaque asset
   - Métadonnées (taille, type, catégorie)

4. **Organisation par catégories**
   - `navbar` : 3 logos navigation
   - `general` : 6 logos généraux
   - `icons` : 8 favicons et icônes
   - `footer` : 3 logos footer

---

## 🔍 Vérification manuelle

Si vous voulez vérifier que tout est bien créé :

### Vérifier le bucket

```sql
SELECT * FROM storage.buckets WHERE id = 'Logo';
```

**Résultat attendu** :
```
id   | name | public | file_size_limit
-----|------|--------|----------------
Logo | Logo | true   | 10485760
```

### Vérifier les assets

```sql
SELECT 
    category,
    COUNT(*) as count
FROM app_assets
GROUP BY category;
```

**Résultat attendu** :
```
category | count
---------|------
navbar   | 3
general  | 6
icons    | 8
footer   | 3
```

### Vérifier les politiques

```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
```

**Résultat attendu** : 4 politiques listées

---

## 🐛 Dépannage

### Erreur : "new row violates row-level security policy"

**Cause** : Les politiques RLS du bucket sont trop restrictives.

**Solution** : Exécutez le script `FIX_RLS_STORAGE_POLICIES.sql` dans Supabase SQL Editor.

Ce script :
- ✅ Supprime les anciennes politiques restrictives
- ✅ Crée 4 nouvelles politiques permissives
- ✅ Vérifie que le bucket est public
- ✅ Permet l'upload pour tous les utilisateurs authentifiés

### Le script échoue avec "permission denied"

**Cause** : Vous n'avez pas les droits d'admin.

**Solution** : Utilisez l'interface Supabase pour créer le bucket manuellement (voir `CREATE_STORAGE_BUCKET.md`).

### "Bucket Logo already exists"

**Cause** : Le bucket existe déjà.

**Solution** : C'est bon ! Passez directement à l'étape 2.

### L'upload échoue toujours

**Vérifiez** :

1. Le bucket est **public** :
   ```sql
   UPDATE storage.buckets SET public = true WHERE id = 'Logo';
   ```

2. Les politiques existent :
   ```sql
   SELECT COUNT(*) FROM pg_policies 
   WHERE tablename = 'objects' AND schemaname = 'storage';
   ```
   Devrait retourner au moins 4.

3. Vous êtes connecté dans l'application.

---

## 📁 Structure finale

Après installation, voici comment les fichiers seront organisés :

```
Supabase Storage
└── Logo/                          (bucket public)
    ├── assets/                    (logos de l'app)
    │   ├── navbar_logo_main_1705234567890.png
    │   ├── login_logo_1705234567891.png
    │   └── favicon_1705234567892.ico
    ├── consulados/                (logos consulados)
    │   ├── logo/
    │   └── banner/
    └── socios/                    (photos socios)
        └── avatars/

Supabase Database
└── app_assets                     (table)
    ├── navbar_logo_main → file_url: 'assets/navbar_logo_main_1705234567890.png'
    ├── login_logo → file_url: 'assets/login_logo_1705234567891.png'
    └── favicon → file_url: 'assets/favicon_1705234567892.ico'
```

---

## ✅ Checklist finale

Avant de tester l'upload :

- [ ] Script SQL exécuté sans erreur
- [ ] Bucket `Logo` visible dans Storage
- [ ] Bucket est **public** (coché)
- [ ] Table `app_assets` existe avec 20 lignes
- [ ] Vous êtes connecté à l'application

---

## 🎉 Résultat

Après installation :

✅ **Bucket Storage créé**  
✅ **20 assets pré-configurés**  
✅ **Upload fonctionnel**  
✅ **Modification sans redéploiement**  

**Exécutez le script et testez !** 🚀

---

## 📚 Documentation complète

Pour plus de détails, consultez :

- `CREATE_COMPLETE_STORAGE_SETUP.sql` - Script d'installation
- `CREATE_STORAGE_BUCKET.md` - Création manuelle du bucket
- `CONFIGURE_STORAGE_ASSETS.md` - Configuration avancée
- `GUIDE_SYSTEME_LOGOS.md` - Architecture du système
