# 🔄 Guide de Migration et Synchronisation des Logos

Ce guide explique comment migrer les logos existants et activer la synchronisation automatique.

---

## 📋 Étapes à suivre

### ✅ Étape 1 : Créer la table logos

**Fichier** : `CREATE_LOGOS_TABLE.sql`

Vous avez déjà fait cette étape ! La table `logos` existe maintenant dans votre base de données.

---

### ✅ Étape 2 : Migrer les données existantes

**Fichier** : `MIGRATE_LOGOS_DATA.sql`

Cette étape copie tous les logos existants de la table `consulados` vers la nouvelle table `logos`.

**Dans Supabase SQL Editor :**

1. Ouvrez le fichier `MIGRATE_LOGOS_DATA.sql`
2. Copiez tout le contenu
3. Collez dans l'éditeur SQL de Supabase
4. Cliquez sur **"Run"**

**Ce que fait ce script :**
- ✅ Copie `consulados.logo` → `logos.marco_url`
- ✅ Copie `consulados.banner` → `logos.logotipo_url`
- ✅ Crée une entrée pour chaque consulado qui a au moins un logo
- ✅ Affiche les statistiques de migration

**Résultat attendu :**
```
total_consulados | total_logos_migres | logos_avec_marco | logos_avec_logotipo
-----------------|-------------------|------------------|--------------------
       45        |         45        |       42         |        38
```

---

### ✅ Étape 3 : Activer la synchronisation automatique

**Fichier** : `SYNC_LOGOS_TRIGGERS.sql`

Cette étape crée des triggers qui synchronisent automatiquement les deux tables.

**Dans Supabase SQL Editor :**

1. Ouvrez le fichier `SYNC_LOGOS_TRIGGERS.sql`
2. Copiez tout le contenu
3. Collez dans l'éditeur SQL de Supabase
4. Cliquez sur **"Run"**

**Ce que font ces triggers :**

#### 🔄 Trigger 1 : Insertion d'un nouveau consulado
Quand vous créez un nouveau consulado avec un logo, une entrée est automatiquement créée dans `logos`.

#### 🔄 Trigger 2 : Modification d'un consulado
Quand vous modifiez `consulados.logo` ou `consulados.banner`, les changements sont automatiquement copiés dans `logos.marco_url` et `logos.logotipo_url`.

#### 🔄 Trigger 3 : Suppression d'un consulado
Quand vous supprimez un consulado, ses logos sont automatiquement supprimés de la table `logos`.

#### 🔄 Trigger 4 : Synchronisation bidirectionnelle
Quand vous modifiez `logos.marco_url` ou `logos.logotipo_url`, les changements sont automatiquement appliqués à `consulados.logo` et `consulados.banner`.

---

## 🎯 Utilisation après migration

### Méthode 1 : Via la table `consulados` (comme avant)

```typescript
// Modifier le logo d'un consulado (automatiquement synchronisé)
await supabase
  .from('consulados')
  .update({ 
    logo: 'Logo/consulados/marco_paris.png',
    banner: 'Logo/consulados/logotipo_paris.png'
  })
  .eq('id', consuladoId);

// ✅ La table logos est automatiquement mise à jour !
```

### Méthode 2 : Via la table `logos` (nouvelle méthode)

```typescript
// Via dataService
await dataService.updateMarco(consuladoId, 'Logo/consulados/marco_paris.png');
await dataService.updateLogotipo(consuladoId, 'Logo/consulados/logotipo_paris.png');

// ✅ La table consulados est automatiquement mise à jour !
```

### Méthode 3 : Directement via Supabase

```typescript
await supabase
  .from('logos')
  .update({
    marco_url: 'Logo/consulados/marco_paris.png',
    logotipo_url: 'Logo/consulados/logotipo_paris.png'
  })
  .eq('consulado_id', consuladoId);

// ✅ La table consulados est automatiquement mise à jour !
```

---

## 🧪 Tester la synchronisation

### Test 1 : Modifier un logo via consulados

```sql
-- Modifier le logo d'un consulado
UPDATE public.consulados
SET logo = 'Logo/test_marco.png'
WHERE name = 'Paris';

-- Vérifier dans la table logos (devrait être synchronisé)
SELECT marco_url FROM public.logos
WHERE consulado_id = (SELECT id FROM consulados WHERE name = 'Paris');
```

### Test 2 : Modifier un logo via logos

```sql
-- Modifier directement dans logos
UPDATE public.logos
SET marco_url = 'Logo/test_marco_v2.png'
WHERE consulado_id = (SELECT id FROM consulados WHERE name = 'Paris');

-- Vérifier dans consulados (devrait être synchronisé)
SELECT logo FROM public.consulados
WHERE name = 'Paris';
```

---

## 📊 Requêtes utiles

### Voir tous les logos

```sql
SELECT 
    c.name,
    c.city,
    l.marco_url,
    l.logotipo_url,
    l.updated_at
FROM public.logos l
JOIN public.consulados c ON l.consulado_id = c.id
ORDER BY c.name;
```

### Consulados sans logos

```sql
SELECT c.name, c.city, c.country
FROM public.consulados c
LEFT JOIN public.logos l ON c.id = l.consulado_id
WHERE l.id IS NULL;
```

### Statistiques

```sql
SELECT 
    COUNT(*) as total_logos,
    COUNT(marco_url) as avec_marco,
    COUNT(logotipo_url) as avec_logotipo,
    COUNT(CASE WHEN marco_url IS NOT NULL AND logotipo_url IS NOT NULL THEN 1 END) as avec_les_deux
FROM public.logos;
```

---

## 🛠️ Maintenance

### Resynchroniser manuellement

Si vous pensez que les données sont désynchronisées :

```sql
-- Resynchroniser logos → consulados
UPDATE public.consulados c
SET 
    logo = l.marco_url,
    banner = l.logotipo_url
FROM public.logos l
WHERE c.id = l.consulado_id;

-- OU resynchroniser consulados → logos
INSERT INTO public.logos (consulado_id, marco_url, logotipo_url, created_at, updated_at)
SELECT id, logo, banner, NOW(), NOW()
FROM public.consulados
WHERE logo IS NOT NULL OR banner IS NOT NULL
ON CONFLICT (consulado_id) DO UPDATE SET
    marco_url = EXCLUDED.marco_url,
    logotipo_url = EXCLUDED.logotipo_url,
    updated_at = NOW();
```

---

## ⚠️ Notes importantes

1. **Compatibilité rétroactive** : Les anciennes colonnes `consulados.logo` et `consulados.banner` continuent de fonctionner normalement.

2. **Pas de duplication** : Les triggers évitent la duplication en utilisant `ON CONFLICT`.

3. **Performance** : Les index assurent que les synchronisations sont rapides.

4. **Rollback** : Si vous voulez désactiver les triggers :
   ```sql
   DROP TRIGGER IF EXISTS trigger_sync_logos_on_insert ON public.consulados;
   DROP TRIGGER IF EXISTS trigger_sync_logos_on_update ON public.consulados;
   DROP TRIGGER IF EXISTS trigger_delete_logos_on_delete ON public.consulados;
   DROP TRIGGER IF EXISTS trigger_sync_consulados_on_logos_update ON public.logos;
   ```

---

## ✅ Checklist finale

- [ ] Table `logos` créée
- [ ] Données migrées (exécuter `MIGRATE_LOGOS_DATA.sql`)
- [ ] Triggers activés (exécuter `SYNC_LOGOS_TRIGGERS.sql`)
- [ ] Tests effectués
- [ ] Vérification des statistiques

---

🎉 **Une fois toutes les étapes complétées, vos logos sont automatiquement synchronisés !**
