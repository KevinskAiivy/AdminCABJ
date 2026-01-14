# 🎨 Guide du Système de Gestion des Logos

## 📋 Vue d'ensemble

Le système de gestion des logos permet de **centraliser tous les assets** de l'application dans la base de données, avec stockage dans Supabase Storage.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MarcaLogotipos.tsx (Interface Admin)                │  │
│  │  - Upload de fichiers                                 │  │
│  │  - Aperçu des logos                                   │  │
│  │  - Gestion des assets                                 │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │  dataService.ts                                       │  │
│  │  - uploadAssetFile()                                  │  │
│  │  - getAssetUrl()                                      │  │
│  │  - loadAppAssets()                                    │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐
│  SUPABASE       │      │  SUPABASE       │
│  STORAGE        │      │  DATABASE       │
│                 │      │                 │
│  Bucket: Logo   │◄────►│  Table:         │
│  ├─ assets/     │      │  app_assets     │
│  ├─ consulados/ │      │                 │
│  └─ socios/     │      │  - asset_key    │
│                 │      │  - file_url ────┤
│                 │      │  - fallback_svg │
│                 │      │  - category     │
└─────────────────┘      └─────────────────┘
```

---

## 🔄 Flux de données

### 1️⃣ Au démarrage de l'application

```
Application démarre
       │
       ▼
dataService.constructor()
       │
       ▼
loadAppAssets()
       │
       ▼
SELECT * FROM app_assets
       │
       ▼
Cache local (this.appAssets)
       │
       ▼
Application prête ✓
```

**Résultat** : Tous les assets sont chargés en mémoire, prêts à être utilisés.

---

### 2️⃣ Affichage d'un logo

```
Composant demande un logo
       │
       ▼
dataService.getAssetUrl('navbar_logo_main')
       │
       ├─ Asset trouvé dans cache ?
       │  │
       │  ├─ OUI ──► file_url existe ?
       │  │          │
       │  │          ├─ OUI ──► getConsuladoLogoUrl(file_url)
       │  │          │          │
       │  │          │          ▼
       │  │          │    https://supabase.co/storage/.../assets/logo.png?t=123456
       │  │          │
       │  │          └─ NON ──► Utiliser fallback_svg
       │  │                     │
       │  │                     ▼
       │  │               data:image/svg+xml,...
       │  │
       │  └─ NON ──► Placeholder par défaut
       │
       ▼
Logo affiché ✓
```

**Résultat** : Le logo s'affiche depuis Storage, ou fallback SVG si pas uploadé.

---

### 3️⃣ Upload d'un nouveau logo

```
Admin clique "Upload"
       │
       ▼
Sélectionne fichier (logo.png)
       │
       ▼
dataService.uploadAssetFile('navbar_logo_main', file)
       │
       ├─ 1. Upload vers Storage
       │    │
       │    ▼
       │    supabase.storage.from('Logo').upload('assets/navbar_logo_main_1705234567890.png', file)
       │    │
       │    ▼
       │    Fichier stocké ✓
       │
       ├─ 2. Mise à jour de la base de données
       │    │
       │    ▼
       │    UPDATE app_assets SET
       │      file_url = 'assets/navbar_logo_main_1705234567890.png',
       │      file_type = 'image/png',
       │      file_size = 45678,
       │      uploaded_at = NOW()
       │    WHERE asset_key = 'navbar_logo_main'
       │    │
       │    ▼
       │    Base de données mise à jour ✓
       │
       ├─ 3. Recharger les assets
       │    │
       │    ▼
       │    loadAppAssets()
       │    │
       │    ▼
       │    Cache mis à jour ✓
       │
       └─ 4. Notification
            │
            ▼
            notifySubscribers()
            │
            ▼
            Composants se re-rendent automatiquement ✓
```

**Résultat** : Le nouveau logo s'affiche immédiatement partout dans l'application.

---

## 📊 Structure de la table `app_assets`

```sql
CREATE TABLE app_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  asset_key TEXT UNIQUE NOT NULL,        -- Ex: 'navbar_logo_main'
  name TEXT NOT NULL,                     -- Ex: 'Logo Navigation Principal'
  description TEXT,                       -- Description pour l'admin
  category TEXT NOT NULL,                 -- Ex: 'navbar', 'general', 'icons'
  
  -- Fichier uploadé (Storage)
  file_url TEXT,                          -- Ex: 'assets/navbar_logo_main_1705234567890.png'
  file_type TEXT,                         -- Ex: 'image/png'
  file_size INTEGER,                      -- En bytes
  uploaded_at TIMESTAMPTZ,                -- Date d'upload
  
  -- Fallback SVG (si pas de fichier)
  fallback_svg TEXT,                      -- Code SVG complet
  
  -- Métadonnées
  display_size INTEGER,                   -- Taille d'affichage recommandée (px)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎯 Exemple concret

### Avant l'upload

```json
{
  "asset_key": "navbar_logo_main",
  "name": "Logo Navigation Principal",
  "category": "navbar",
  "file_url": null,
  "fallback_svg": "<svg>...</svg>",
  "display_size": 40
}
```

**Affichage** : SVG fallback (bleu avec texte "CABJ")

---

### Après l'upload

```json
{
  "asset_key": "navbar_logo_main",
  "name": "Logo Navigation Principal",
  "category": "navbar",
  "file_url": "assets/navbar_logo_main_1705234567890.png",
  "file_type": "image/png",
  "file_size": 45678,
  "uploaded_at": "2025-01-14T10:30:00Z",
  "fallback_svg": "<svg>...</svg>",
  "display_size": 40
}
```

**Affichage** : Image PNG depuis Storage

**URL générée** :
```
https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/Logo/assets/navbar_logo_main_1705234567890.png?t=1705234567890
```

---

## ✅ Avantages du système

### 1. **Centralisation**
- ✅ Tous les logos dans une seule table
- ✅ Un seul endroit pour gérer les assets
- ✅ Pas de logos hardcodés dans le code

### 2. **Flexibilité**
- ✅ Modification sans redéploiement
- ✅ Upload direct depuis l'interface admin
- ✅ Fallback automatique si pas de fichier

### 3. **Performance**
- ✅ Chargement au démarrage (une seule requête)
- ✅ Cache local en mémoire
- ✅ Pas de requête à chaque affichage

### 4. **Sécurité**
- ✅ Stockage dans Supabase Storage (sécurisé)
- ✅ RLS policies pour contrôler l'accès
- ✅ Upload uniquement pour les authentifiés

### 5. **Traçabilité**
- ✅ Date d'upload enregistrée
- ✅ Type et taille du fichier
- ✅ Historique des modifications

---

## 🔧 Utilisation dans le code

### Afficher un logo dans un composant

```tsx
import { dataService } from '../services/dataService';

export const Navbar = () => {
  // Récupérer l'URL du logo
  const logoUrl = dataService.getAssetUrl('navbar_logo_main');
  
  return (
    <img 
      src={logoUrl} 
      alt="Logo" 
      className="h-10"
    />
  );
};
```

### Récupérer un asset complet

```tsx
const asset = dataService.getAssetByKey('navbar_logo_main');

if (asset) {
  console.log(asset.name);          // "Logo Navigation Principal"
  console.log(asset.file_url);      // "assets/navbar_logo_main_1705234567890.png"
  console.log(asset.display_size);  // 40
}
```

### S'abonner aux changements

```tsx
useEffect(() => {
  const unsubscribe = dataService.subscribe(() => {
    // Les assets ont changé, re-render
    setAssets(dataService.getAppAssets());
  });
  
  return () => unsubscribe();
}, []);
```

---

## 🎨 Assets disponibles par défaut

### Navbar (3)
- `navbar_logo_main` - Logo principal
- `navbar_logo_alt` - Logo alternatif
- `navbar_logo_mobile` - Logo mobile

### General (6)
- `app_logo_main` - Logo principal de l'app
- `login_logo` - Logo page de connexion
- `loading_logo` - Logo de chargement
- `match_logo` - Logo pour les matchs
- `rival_logo` - Logo équipe adverse
- `background_habilitaciones` - Fond habilitaciones

### Icons (8)
- `favicon` - Favicon
- `favicon_16` - Favicon 16x16
- `favicon_32` - Favicon 32x32
- `apple_touch_icon` - Icon iOS
- `android_chrome_192` - Icon Android 192
- `android_chrome_512` - Icon Android 512
- `mstile_150` - Tile Windows
- `safari_pinned_tab` - Icon Safari

### Footer (3)
- `footer_logo_main` - Logo footer principal
- `footer_logo_secondary` - Logo footer secondaire
- `footer_background` - Fond footer

**Total : 20+ assets pré-configurés**

---

## 🚀 Workflow de modification

1. **Admin se connecte** à l'application
2. **Va dans Centro de Control** → Identidad & Logos
3. **Voit tous les logos** organisés par catégorie
4. **Clique sur Upload** pour le logo à modifier
5. **Sélectionne le nouveau fichier**
6. **Upload automatique** vers Storage
7. **Mise à jour automatique** de la base de données
8. **Affichage immédiat** du nouveau logo partout

**Temps total : < 10 secondes** ⚡

---

## 📝 Notes importantes

1. **Nommage des fichiers** : Chaque upload génère un nom unique avec timestamp
2. **Cache navigateur** : Les URLs incluent `?t=timestamp` pour bypass le cache
3. **Fallback SVG** : Toujours présent pour éviter les logos cassés
4. **Organisation** : Utilisez le dossier `assets/` dans Storage
5. **Permissions** : Seuls les admins peuvent uploader

---

## 🎉 Résultat

✅ **Tous les logos dans la base de données**  
✅ **Stockés dans Supabase Storage**  
✅ **Modification sans redéploiement**  
✅ **Interface admin moderne**  
✅ **Fallback automatique**  
✅ **Performance optimale**  

**Le système est prêt à l'emploi !** 🚀
