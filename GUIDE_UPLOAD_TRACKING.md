# 📤 Guide - Tracking automatique des uploads

## 🎯 Problème résolu

**AVANT** : Quand vous uploadiez un logo, il allait dans Storage mais **n'était pas enregistré dans la base de données**.

**MAINTENANT** : Chaque upload est **automatiquement enregistré** dans la table `uploaded_files` avec toutes ses métadonnées.

---

## 📊 Table `uploaded_files`

Enregistre automatiquement :
- ✅ Chemin du fichier
- ✅ Nom original
- ✅ Taille, type, dimensions
- ✅ Qui a uploadé
- ✅ Pour quelle entité (consulado, socio, etc.)
- ✅ Quel champ (logo, banner, avatar)
- ✅ URL publique
- ✅ Date d'upload

---

## 🚀 Installation

### Étape 1 : Créer la table

```sql
-- Exécuter dans Supabase SQL Editor
-- Fichier: CREATE_UPLOADED_FILES_TABLE.sql
```

### Étape 2 : Utiliser dans votre code

---

## 💻 Utilisation

### AVANT (ancien code) :

```typescript
// pages/admin/Consulados.tsx
const { data, error } = await supabase.storage
  .from('Logo')
  .upload(fileName, selectedLogoFile);

// ❌ Le fichier est uploadé mais pas enregistré dans la DB
```

### MAINTENANT (nouveau code) :

```typescript
import { uploadFileWithTracking } from '../lib/uploadHelper';

// Upload avec tracking automatique
const result = await uploadFileWithTracking({
  bucket: 'Logo',
  folder: 'consulados',
  entityType: 'consulado',
  entityId: consuladoId,
  fieldName: 'logo',
  file: selectedLogoFile,
  userId: user?.id // Optionnel
});

if (result.success) {
  console.log('✅ Fichier uploadé ET enregistré dans la DB');
  console.log('URL:', result.publicUrl);
  console.log('Chemin:', result.filePath);
} else {
  console.error('❌ Erreur:', result.error);
}
```

---

## 📝 Exemples d'utilisation

### 1. Upload logo de consulado

```typescript
import { uploadFileWithTracking } from '../lib/uploadHelper';

const handleUploadLogo = async (consuladoId: string, file: File) => {
  const result = await uploadFileWithTracking({
    bucket: 'Logo',
    folder: 'consulados',
    entityType: 'consulado',
    entityId: consuladoId,
    fieldName: 'logo',
    file: file
  });

  if (result.success) {
    // Mettre à jour le consulado avec la nouvelle URL
    await dataService.updateConsulado(consuladoId, {
      logo: result.filePath
    });
  }
};
```

### 2. Upload banner de consulado

```typescript
const handleUploadBanner = async (consuladoId: string, file: File) => {
  const result = await uploadFileWithTracking({
    bucket: 'Logo',
    folder: 'consulados',
    entityType: 'consulado',
    entityId: consuladoId,
    fieldName: 'banner',
    file: file
  });

  if (result.success) {
    await dataService.updateConsulado(consuladoId, {
      banner: result.filePath
    });
  }
};
```

### 3. Upload photo de socio

```typescript
const handleUploadAvatar = async (socioId: string, file: File) => {
  const result = await uploadFileWithTracking({
    bucket: 'Logo',
    folder: 'socios',
    entityType: 'socio',
    entityId: socioId,
    fieldName: 'avatar',
    file: file
  });

  if (result.success) {
    await dataService.updateSocio(socioId, {
      foto: result.filePath
    });
  }
};
```

### 4. Upload logo d'équipe

```typescript
const handleUploadTeamLogo = async (teamId: string, file: File) => {
  const result = await uploadFileWithTracking({
    bucket: 'Logo',
    folder: 'teams',
    entityType: 'team',
    entityId: teamId,
    fieldName: 'logo',
    file: file
  });

  if (result.success) {
    await dataService.updateTeam(teamId, {
      logo: result.filePath
    });
  }
};
```

---

## 🔍 Récupérer les fichiers uploadés

### Tous les fichiers d'un consulado

```typescript
import { getEntityFiles } from '../lib/uploadHelper';

const files = await getEntityFiles('consulado', consuladoId);

console.log('Fichiers du consulado:');
files.forEach(file => {
  console.log(`- ${file.field_name}: ${file.public_url}`);
});
```

### Statistiques d'upload

```typescript
import { getUploadStats } from '../lib/uploadHelper';

const stats = await getUploadStats();

console.log(`Total fichiers: ${stats.totalFiles}`);
console.log(`Taille totale: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log('Par type:', stats.byType);
// { consulado: 45, socio: 120, team: 30 }
```

---

## 🗑️ Supprimer un fichier

```typescript
import { markFileAsDeleted } from '../lib/uploadHelper';

// Soft delete (marque comme supprimé mais garde l'historique)
await markFileAsDeleted('consulados/logo_123.png');
```

---

## 📊 Requêtes SQL utiles

### Voir tous les fichiers uploadés

```sql
SELECT 
  entity_type,
  field_name,
  file_name,
  file_size,
  uploaded_at,
  public_url
FROM uploaded_files
WHERE is_active = true
ORDER BY uploaded_at DESC
LIMIT 50;
```

### Fichiers par type d'entité

```sql
SELECT 
  entity_type,
  COUNT(*) as total_fichiers,
  SUM(file_size) as taille_totale,
  AVG(file_size) as taille_moyenne
FROM uploaded_files
WHERE is_active = true
GROUP BY entity_type
ORDER BY total_fichiers DESC;
```

### Fichiers récents (dernières 24h)

```sql
SELECT 
  file_name,
  entity_type,
  field_name,
  file_size,
  uploaded_at
FROM uploaded_files
WHERE uploaded_at > NOW() - INTERVAL '24 hours'
  AND is_active = true
ORDER BY uploaded_at DESC;
```

### Fichiers d'un consulado spécifique

```sql
SELECT 
  field_name,
  file_name,
  public_url,
  uploaded_at
FROM uploaded_files
WHERE entity_type = 'consulado'
  AND entity_id = 'votre-consulado-id'
  AND is_active = true
ORDER BY uploaded_at DESC;
```

### Espace utilisé par bucket

```sql
SELECT 
  bucket_name,
  COUNT(*) as nombre_fichiers,
  SUM(file_size) as taille_totale_bytes,
  ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as taille_totale_mb
FROM uploaded_files
WHERE is_active = true
GROUP BY bucket_name
ORDER BY taille_totale_bytes DESC;
```

---

## 🔄 Migrer le code existant

### Dans `pages/admin/Consulados.tsx`

**Remplacer** :

```typescript
// ANCIEN CODE
const { data, error } = await supabase.storage
  .from('Logo')
  .upload(fileName, selectedLogoFile);
```

**Par** :

```typescript
// NOUVEAU CODE
import { uploadFileWithTracking } from '../../lib/uploadHelper';

const result = await uploadFileWithTracking({
  bucket: 'Logo',
  folder: 'consulados',
  entityType: 'consulado',
  entityId: consuladoId,
  fieldName: 'logo',
  file: selectedLogoFile
});

if (!result.success) {
  throw new Error(result.error || 'Erreur upload');
}

logoUrl = result.publicUrl;
```

---

## ✅ Avantages

| Avant | Maintenant |
|-------|------------|
| Fichiers dans Storage seulement | Fichiers trackés dans la DB |
| Pas d'historique | Historique complet |
| Pas de métadonnées | Taille, type, dimensions |
| Pas de statistiques | Stats par type, taille, etc. |
| Difficile de retrouver les fichiers | Recherche facile par entité |

---

## 🎯 Résultat

Maintenant, **chaque fois que vous uploadez un logo** :
1. ✅ Il est uploadé dans Storage
2. ✅ Il est enregistré dans `uploaded_files`
3. ✅ Vous pouvez voir l'historique
4. ✅ Vous avez des statistiques
5. ✅ Vous pouvez retrouver tous les fichiers d'une entité

**Plus aucun fichier perdu !** 🎉
