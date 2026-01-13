# 📦 Guide - Table `app_assets` pour tous les logos de l'application

## 🎯 Objectif

La table `app_assets` centralise **tous les logos et images** de l'application :
- ✅ Logos navbar, footer, favicon
- ✅ Escudos et images officielles
- ✅ Placeholders et images par défaut
- ✅ Logos pour emails et réseaux sociaux
- ✅ Chargement au démarrage de l'app
- ✅ Mise à jour en temps réel

---

## 📊 Assets disponibles

### 🧭 NAVBAR (Barre de navigation)
| Asset Key | Description | Taille |
|-----------|-------------|--------|
| `navbar_logo` | Logo principal navbar | 40px |
| `navbar_logo_mobile` | Version mobile | 32px |

### 🏠 GENERAL (Logos principaux)
| Asset Key | Description | Taille |
|-----------|-------------|--------|
| `escudo_deportivo` | Escudo officiel CABJ | 80px |
| `escudo_grande` | Version grande | 120px |
| `logo_cabj_text` | Logo avec texte | 100px |
| `login_background` | Fond page login | - |
| `dashboard_background` | Fond dashboard | - |
| `hero_image` | Image hero | - |

### 🎨 ICONS (Icônes)
| Asset Key | Description | Taille |
|-----------|-------------|--------|
| `favicon` | Favicon 32x32 | 32px |
| `favicon_192` | PWA Android 192x192 | 192px |
| `favicon_512` | PWA splash 512x512 | 512px |
| `apple_touch_icon` | iOS icon 180x180 | 180px |
| `loader_spinner` | Spinner chargement | 40px |
| `loader_logo` | Logo animé | 60px |

### 📄 FOOTER (Pied de page)
| Asset Key | Description | Taille |
|-----------|-------------|--------|
| `footer_logo` | Logo footer | 50px |
| `footer_logo_white` | Version blanche | 50px |

### 🖼️ PLACEHOLDER (Images par défaut)
| Asset Key | Description | Taille |
|-----------|-------------|--------|
| `placeholder_user` | Avatar par défaut | 100px |
| `placeholder_consulado` | Logo consulado défaut | 80px |
| `placeholder_team` | Logo équipe défaut | 60px |
| `placeholder_image` | Image générique | 100px |

### 📧 EMAIL (Templates)
| Asset Key | Description | Taille |
|-----------|-------------|--------|
| `email_header_logo` | Logo header email | 60px |
| `email_footer_logo` | Logo footer email | 40px |

### 📱 SOCIAL (Réseaux sociaux)
| Asset Key | Description | Taille |
|-----------|-------------|--------|
| `social_og_image` | Open Graph 1200x630 | - |
| `social_twitter_card` | Twitter card 1200x600 | - |

### 🖨️ PRINT (Impression)
| Asset Key | Description | Taille |
|-----------|-------------|--------|
| `logo_print_color` | Logo couleur HD | - |
| `logo_print_bw` | Logo noir & blanc | - |

---

## 🚀 Installation

### Étape 1 : Créer la table

```sql
-- Exécuter dans Supabase SQL Editor
-- Fichier: CREATE_APP_ASSETS_TABLE.sql
```

Cela va créer :
- ✅ Table `app_assets` avec 30+ assets pré-configurés
- ✅ Index pour performance
- ✅ Trigger auto-update
- ✅ SVG fallbacks pour chaque asset

### Étape 2 : Charger les assets au démarrage

Dans votre `App.tsx` ou point d'entrée :

```typescript
import { dataService } from './services/dataService';

useEffect(() => {
  // Charger les assets au démarrage
  dataService.loadAppAssets();
}, []);
```

---

## 💻 Utilisation dans le code

### 1. Récupérer l'URL d'un asset

```typescript
import { dataService } from './services/dataService';

// Dans un composant
const logoUrl = dataService.getAssetUrl('navbar_logo');

<img src={logoUrl} alt="Logo" />
```

### 2. Utiliser dans le Navbar

```typescript
// components/Navbar.tsx
import { dataService } from '../services/dataService';

export const Navbar = () => {
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    // Charger le logo
    const url = dataService.getAssetUrl('navbar_logo');
    setLogoUrl(url);

    // S'abonner aux changements
    const unsubscribe = dataService.subscribe(() => {
      const newUrl = dataService.getAssetUrl('navbar_logo');
      setLogoUrl(newUrl);
    });

    return () => unsubscribe();
  }, []);

  return (
    <nav>
      <img src={logoUrl} alt="Logo" className="h-10" />
    </nav>
  );
};
```

### 3. Utiliser un placeholder

```typescript
// Si l'utilisateur n'a pas d'avatar
const avatarUrl = user.avatar || dataService.getAssetUrl('placeholder_user');

<img src={avatarUrl} alt="Avatar" />
```

### 4. Récupérer un asset complet

```typescript
const asset = dataService.getAssetByKey('navbar_logo');

console.log(asset.name);          // "Logo Navbar"
console.log(asset.display_size);  // 40
console.log(asset.category);      // "navbar"
```

### 5. Récupérer tous les assets

```typescript
const allAssets = dataService.getAppAssets();

// Filtrer par catégorie
const navbarAssets = allAssets.filter(a => a.category === 'navbar');
const icons = allAssets.filter(a => a.category === 'icons');
```

---

## 🔄 Mise à jour des assets

### Via l'interface admin (à créer)

```typescript
// Uploader un nouveau logo
const handleUpload = async (file: File) => {
  try {
    await dataService.uploadAssetFile('navbar_logo', file);
    alert('Logo mis à jour !');
  } catch (error) {
    alert('Erreur : ' + error.message);
  }
};
```

### Via SQL direct

```sql
-- Mettre à jour l'URL d'un asset
UPDATE app_assets
SET file_url = 'assets/nouveau_logo.png',
    uploaded_at = NOW()
WHERE asset_key = 'navbar_logo';
```

### Créer un nouvel asset

```typescript
await dataService.createAppAsset({
  asset_key: 'custom_banner',
  name: 'Bannière Personnalisée',
  description: 'Bannière pour événements',
  category: 'general',
  file_url: null,
  fallback_svg: '<svg>...</svg>',
  fallback_color: '#003B94',
  display_size: 100,
  is_active: true,
  file_type: null,
  file_size: null,
  width: null,
  height: null,
  uploaded_at: null
});
```

---

## 🎨 Avantages de cette approche

### ✅ Centralisation
- Tous les assets au même endroit
- Plus de SVG hardcodés dans le code
- Facile à gérer

### ✅ Performance
- Chargement au démarrage
- Cache en mémoire
- Pas de requêtes répétées

### ✅ Temps réel
- Modification immédiate
- Tous les composants se mettent à jour
- Pas besoin de redéployer

### ✅ Fallback automatique
- SVG par défaut si fichier manquant
- Pas d'images cassées
- Toujours quelque chose à afficher

### ✅ Flexibilité
- Upload via admin
- Modification SQL
- Versionning facile

---

## 🔧 Créer une interface d'administration

Exemple de composant pour gérer les assets :

```typescript
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { AppAsset } from '../types';

export const AssetsManager = () => {
  const [assets, setAssets] = useState<AppAsset[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    setAssets(dataService.getAppAssets());
    const unsubscribe = dataService.subscribe(() => {
      setAssets(dataService.getAppAssets());
    });
    return () => unsubscribe();
  }, []);

  const handleUpload = async (assetKey: string, file: File) => {
    setUploading(assetKey);
    try {
      await dataService.uploadAssetFile(assetKey, file);
      alert('Asset mis à jour !');
    } catch (error: any) {
      alert('Erreur : ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {assets.map(asset => (
        <div key={asset.id} className="border rounded-lg p-4">
          <h3 className="font-bold">{asset.name}</h3>
          <p className="text-sm text-gray-600">{asset.description}</p>
          
          <img 
            src={dataService.getAssetUrl(asset.asset_key)}
            alt={asset.name}
            className="w-full h-32 object-contain bg-gray-100 rounded my-3"
          />
          
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(asset.asset_key, file);
            }}
            disabled={uploading === asset.asset_key}
            className="text-sm"
          />
          
          {uploading === asset.asset_key && (
            <p className="text-sm text-blue-600 mt-2">Upload en cours...</p>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## 📝 Requêtes SQL utiles

### Voir tous les assets

```sql
SELECT asset_key, name, category, 
       CASE 
         WHEN file_url IS NOT NULL THEN '✅ Uploadé'
         ELSE '⚠️ Fallback'
       END AS status
FROM app_assets
ORDER BY category, name;
```

### Assets sans fichier uploadé

```sql
SELECT asset_key, name, category
FROM app_assets
WHERE file_url IS NULL
ORDER BY category;
```

### Statistiques

```sql
SELECT 
  category,
  COUNT(*) AS total,
  COUNT(file_url) AS avec_fichier,
  COUNT(*) - COUNT(file_url) AS sans_fichier
FROM app_assets
GROUP BY category
ORDER BY category;
```

---

## 🔄 Migration depuis les assets hardcodés

Si vous avez des SVG hardcodés dans `constants.tsx`, vous pouvez les migrer :

```typescript
// Avant (constants.tsx)
export const BocaLogoSVG = () => <svg>...</svg>;

// Après (utiliser app_assets)
const logoUrl = dataService.getAssetUrl('navbar_logo');
<img src={logoUrl} alt="Logo" />
```

---

## ✅ Checklist d'implémentation

- [ ] Exécuter `CREATE_APP_ASSETS_TABLE.sql`
- [ ] Vérifier que 30+ assets sont créés
- [ ] Ajouter `dataService.loadAppAssets()` au démarrage
- [ ] Remplacer les SVG hardcodés par `getAssetUrl()`
- [ ] Créer une interface admin pour uploader
- [ ] Tester la mise à jour en temps réel
- [ ] Uploader les vrais logos dans Storage

---

## 🎉 Résultat

Avec cette table, **tous vos logos se chargent au démarrage** et **se mettent à jour instantanément** quand vous les modifiez, sans redéploiement ! 🚀
