# 📋 Guide - Table `logos` pour Marco et Logotipo

## 🎯 Objectif

La table `logos` permet de stocker les références aux logos **marco** (cadre) et **logotipo** pour chaque consulado de manière structurée et centralisée.

---

## 📊 Structure de la table

```sql
logos
├── id (UUID, PK)
├── consulado_id (UUID, FK → consulados.id)
├── marco_url (TEXT, nullable)
├── logotipo_url (TEXT, nullable)
├── marco_uploaded_at (TIMESTAMP)
├── logotipo_uploaded_at (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

**Relation** : 1 consulado → 1 enregistrement logos (relation 1:1)

---

## 🚀 Installation

### Étape 1 : Créer la table dans Supabase

1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Menu : **SQL Editor**
4. Copiez-collez le contenu du fichier **`CREATE_LOGOS_TABLE.sql`**
5. Cliquez sur **Run** / **Exécuter**

### Étape 2 : Vérifier la création

```sql
SELECT * FROM public.logos;
```

Vous devriez voir une table vide avec les colonnes définies.

---

## 💻 Utilisation dans le code

### Import du type

```typescript
import { Logo } from '../types';
import { dataService } from '../services/dataService';
```

### Récupérer les logos d'un consulado

```typescript
const logos = await dataService.getConsuladoLogos(consuladoId);

if (logos) {
  console.log('Marco:', logos.marco_url);
  console.log('Logotipo:', logos.logotipo_url);
}
```

### Créer ou mettre à jour les deux logos

```typescript
await dataService.upsertConsuladoLogos(
  consuladoId,
  'Logo/consulados/marco_paris.png',
  'Logo/consulados/logotipo_paris.png'
);
```

### Mettre à jour uniquement le marco

```typescript
await dataService.updateMarco(
  consuladoId,
  'Logo/consulados/marco_paris_v2.png'
);
```

### Mettre à jour uniquement le logotipo

```typescript
await dataService.updateLogotipo(
  consuladoId,
  'Logo/consulados/logotipo_paris_v2.png'
);
```

### Supprimer les logos

```typescript
await dataService.deleteConsuladoLogos(consuladoId);
```

### Récupérer tous les logos

```typescript
const allLogos = await dataService.getAllLogos();

allLogos.forEach(logo => {
  console.log(`${logo.consulado_name}:`);
  console.log(`  Marco: ${logo.marco_url}`);
  console.log(`  Logotipo: ${logo.logotipo_url}`);
});
```

---

## 🎨 Exemple d'interface utilisateur

### Composant React pour uploader marco et logotipo

```typescript
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { supabase, getConsuladoLogoUrl } from '../lib/supabase';

const ConsuladoLogosManager = ({ consuladoId, consuladoName }) => {
  const [logos, setLogos] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadLogos();
  }, [consuladoId]);

  const loadLogos = async () => {
    const data = await dataService.getConsuladoLogos(consuladoId);
    setLogos(data);
  };

  const handleUploadMarco = async (file) => {
    setUploading(true);
    try {
      const fileName = `consulados/marco_${consuladoId}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('Logo')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      await dataService.updateMarco(consuladoId, fileName);
      await loadLogos();
      alert('Marco uploadé avec succès !');
    } catch (error) {
      alert('Erreur lors de l\'upload : ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadLogotipo = async (file) => {
    setUploading(true);
    try {
      const fileName = `consulados/logotipo_${consuladoId}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('Logo')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      await dataService.updateLogotipo(consuladoId, fileName);
      await loadLogos();
      alert('Logotipo uploadé avec succès !');
    } catch (error) {
      alert('Erreur lors de l\'upload : ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Marco */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm uppercase text-[#003B94]">Marco (Cadre)</h3>
        
        {logos?.marco_url && (
          <img 
            src={getConsuladoLogoUrl(logos.marco_url)}
            alt="Marco"
            className="w-full h-48 object-contain bg-gray-50 rounded-lg"
          />
        )}
        
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadMarco(file);
          }}
          disabled={uploading}
          className="block w-full text-sm"
        />
      </div>

      {/* Logotipo */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm uppercase text-[#003B94]">Logotipo</h3>
        
        {logos?.logotipo_url && (
          <img 
            src={getConsuladoLogoUrl(logos.logotipo_url)}
            alt="Logotipo"
            className="w-full h-48 object-contain bg-gray-50 rounded-lg"
          />
        )}
        
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadLogotipo(file);
          }}
          disabled={uploading}
          className="block w-full text-sm"
        />
      </div>
    </div>
  );
};

export default ConsuladoLogosManager;
```

---

## 📁 Organisation des fichiers dans Storage

### Structure recommandée dans le bucket `Logo`

```
Logo/
├── consulados/
│   ├── marco_consulado-id-1_timestamp.png
│   ├── logotipo_consulado-id-1_timestamp.png
│   ├── marco_consulado-id-2_timestamp.png
│   ├── logotipo_consulado-id-2_timestamp.png
│   └── ...
└── (autres fichiers)
```

**Convention de nommage** :
- Marco : `marco_{consulado_id}_{timestamp}.{extension}`
- Logotipo : `logotipo_{consulado_id}_{timestamp}.{extension}`

---

## 🔐 Sécurité (Row Level Security)

La table `logos` utilise les politiques RLS suivantes :

1. **Lecture publique** : Tout le monde peut voir les logos
2. **Écriture restreinte** : Seuls les SUPERADMIN et ADMIN peuvent :
   - Créer de nouveaux logos
   - Modifier des logos existants
   - Supprimer des logos

---

## 🧪 Tests

### Test 1 : Créer des logos pour un consulado

```typescript
const consuladoId = 'abc-123-def';

await dataService.upsertConsuladoLogos(
  consuladoId,
  'Logo/consulados/marco_test.png',
  'Logo/consulados/logotipo_test.png'
);

const logos = await dataService.getConsuladoLogos(consuladoId);
console.log('Logos créés:', logos);
```

### Test 2 : Mettre à jour seulement le marco

```typescript
await dataService.updateMarco(
  consuladoId,
  'Logo/consulados/marco_test_v2.png'
);
```

### Test 3 : Récupérer tous les logos

```typescript
const allLogos = await dataService.getAllLogos();
console.log(`${allLogos.length} consulados ont des logos`);
```

---

## 📊 Requêtes SQL utiles

### Voir les consulados sans logos

```sql
SELECT c.id, c.name, c.city, c.country
FROM consulados c
LEFT JOIN logos l ON c.id = l.consulado_id
WHERE l.id IS NULL;
```

### Voir les consulados avec marco mais sans logotipo

```sql
SELECT c.name, l.marco_url, l.logotipo_url
FROM consulados c
JOIN logos l ON c.id = l.consulado_id
WHERE l.marco_url IS NOT NULL
  AND l.logotipo_url IS NULL;
```

### Statistiques

```sql
SELECT 
  COUNT(*) AS total_consulados,
  COUNT(l.id) AS consulados_avec_logos,
  COUNT(l.marco_url) AS consulados_avec_marco,
  COUNT(l.logotipo_url) AS consulados_avec_logotipo
FROM consulados c
LEFT JOIN logos l ON c.id = l.consulado_id;
```

---

## 🔄 Migration des données existantes

Si vous avez déjà des logos dans les colonnes `consulados.logo` et `consulados.banner`, vous pouvez les migrer :

```sql
-- Migrer les logos existants vers la nouvelle table
INSERT INTO logos (consulado_id, marco_url, logotipo_url, created_at, updated_at)
SELECT 
  id AS consulado_id,
  logo AS marco_url,
  banner AS logotipo_url,
  NOW() AS created_at,
  NOW() AS updated_at
FROM consulados
WHERE logo IS NOT NULL OR banner IS NOT NULL
ON CONFLICT (consulado_id) DO NOTHING;
```

---

## ✅ Checklist d'implémentation

- [ ] Exécuter `CREATE_LOGOS_TABLE.sql` dans Supabase
- [ ] Vérifier que la table est créée : `SELECT * FROM logos;`
- [ ] Vérifier les RLS policies
- [ ] Tester les fonctions CRUD du dataService
- [ ] Créer l'interface utilisateur pour uploader marco et logotipo
- [ ] Organiser les fichiers dans le bucket Storage
- [ ] Migrer les données existantes si nécessaire
- [ ] Documenter pour l'équipe

---

## 📝 Notes importantes

1. **Relation 1:1** : Un consulado ne peut avoir qu'un seul enregistrement dans la table logos
2. **Contrainte UNIQUE** : `consulado_id` est unique
3. **Cascade DELETE** : Si un consulado est supprimé, ses logos le sont aussi
4. **Nullable** : Les champs `marco_url` et `logotipo_url` peuvent être NULL
5. **Updated_at** : Se met à jour automatiquement via un trigger

---

## 🆘 Support

En cas de problème :

1. Vérifiez que la table existe : `SELECT * FROM logos;`
2. Vérifiez les permissions RLS
3. Vérifiez que le bucket `Logo` est PUBLIC
4. Consultez les logs Supabase pour les erreurs

---

✅ **La table `logos` est maintenant prête à être utilisée !**
