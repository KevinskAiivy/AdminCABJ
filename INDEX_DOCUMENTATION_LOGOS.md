# 📖 Index de la Documentation - Logos & Storage

Bienvenue dans la documentation complète sur la gestion des logos et images avec Supabase Storage.

## 🗂️ Fichiers de documentation disponibles

### 1. 🚀 **README_LOGOS_STORAGE.md** (COMMENCEZ ICI)
**Vue d'ensemble et démarrage rapide**

- Aperçu général du système
- Structure du bucket 'logo'
- Démarrage rapide (2 minutes)
- Exemples basiques
- Points importants à retenir

👉 **Idéal pour** : Comprendre rapidement le système et commencer à l'utiliser

---

### 2. 📚 **USAGE_CONSULADO_LOGOS.md**
**Guide d'utilisation détaillé de `getConsuladoLogoUrl()`**

- Signature complète de la fonction
- Description des paramètres
- 4 exemples d'utilisation détaillés :
  1. Afficher le logo d'un consulado
  2. Liste de consulados avec logos
  3. Select/dropdown avec logos
  4. Préchargement d'images
- Tests unitaires
- Comment modifier le nom du bucket

👉 **Idéal pour** : Apprendre à utiliser la fonction dans différents contextes

---

### 3. 🏗️ **STORAGE_STRUCTURE.md**
**Architecture et structure complète du Storage**

- Organisation détaillée des dossiers
- Vue d'ensemble des sous-dossiers
- Fonctions disponibles (`getConsuladoLogoUrl`, `listStorageFiles`)
- Utilisation dans les composants React
- Placeholder par défaut (SVG)
- Onglet "Imágenes y Logos" du Centro de Control
- Points d'attention et warnings
- Tests complets

👉 **Idéal pour** : Comprendre l'architecture globale et les bonnes pratiques

---

### 4. 💻 **EXEMPLES_PRATIQUES_LOGOS.tsx**
**10 composants React prêts à l'emploi**

Exemples concrets avec code complet :

1. **ConsuladoCardSimple** - Card basique avec logo
2. **ConsuladosList** - Liste avec logos ET bannières
3. **SocioProfile** - Profil de socio avec photo
4. **ConsuladoSelect** - Select simple
5. **ConsuladoSelectWithImages** - Select custom avec images
6. **ConsuladosImageGallery** - Galerie d'images
7. **ImageUploadPreview** - Upload avec prévisualisation
8. **LazyLoadedConsuladoLogo** - Lazy loading
9. **LogoComparison** - Comparaison avant/après
10. **ConsuladoBadge** - Badge avec logo miniature
11. **AllConsuladosLogosGrid** - Grid de tous les logos

👉 **Idéal pour** : Copier-coller du code et l'adapter à vos besoins

---

## 🎯 Par cas d'usage

### Vous voulez afficher un logo de consulado ?
1. Lisez **README_LOGOS_STORAGE.md** (section "Démarrage rapide")
2. Consultez l'exemple 1 dans **EXEMPLES_PRATIQUES_LOGOS.tsx**

### Vous voulez afficher une photo de socio ?
1. Lisez **README_LOGOS_STORAGE.md** (section "Exemples pratiques")
2. Consultez l'exemple 3 dans **EXEMPLES_PRATIQUES_LOGOS.tsx**

### Vous voulez créer une galerie d'images ?
1. Lisez **STORAGE_STRUCTURE.md** (section "`listStorageFiles()`")
2. Consultez l'exemple 6 dans **EXEMPLES_PRATIQUES_LOGOS.tsx**

### Vous voulez comprendre la structure du bucket ?
1. Lisez **STORAGE_STRUCTURE.md** (section "Organisation des dossiers")
2. Consultez **README_LOGOS_STORAGE.md** (section "Structure du bucket")

### Vous voulez gérer les images dans l'admin ?
1. Lisez **STORAGE_STRUCTURE.md** (section "Onglet 'Imágenes y Logos'")
2. Allez dans Admin > Configuración > Imágenes y Logos

### Vous voulez créer un dropdown avec logos ?
1. Consultez l'exemple 4 ou 5 dans **EXEMPLES_PRATIQUES_LOGOS.tsx**

### Vous avez des erreurs de chargement d'images ?
1. Lisez **README_LOGOS_STORAGE.md** (section "Points importants")
2. Vérifiez les permissions du bucket dans Supabase

---

## 📊 Structure du bucket 'logo'

```
logo/                                    ← Bucket Supabase
│
├── consulados/                          ← Sous-dossier
│   ├── consulado_abc123_logo_*.png     ← Logos
│   └── consulado_abc123_banner_*.jpg   ← Bannières
│
└── (racine)                             ← Photos socios
    └── 12345678_1234567890.jpg
```

---

## 🔧 Fonctions principales

### `getConsuladoLogoUrl(filePath)`
```typescript
// Avec un consulado
getConsuladoLogoUrl('consulados/consulado_123_logo.png')
// → URL publique complète

// Avec un socio (racine)
getConsuladoLogoUrl('12345678_1234567890.jpg')
// → URL publique complète

// Sans image
getConsuladoLogoUrl(null)
// → Placeholder SVG (bleu/or Boca)
```

### `listStorageFiles(folderPath, options)`
```typescript
// Lister les logos de consulados
const { data } = await listStorageFiles('consulados');

// Lister les photos de socios
const { data } = await listStorageFiles('');
```

---

## 🎨 Onglet Admin

**Accès** : Admin > Configuración > Imágenes y Logos

**Fonctionnalités** :
- Visualisation de toutes les images
- Organisation par dossiers
- Copie d'URL
- Ouverture dans nouvel onglet
- Suppression d'images
- Actualisation

---

## ⚠️ Points importants à retenir

1. **Chemins complets** : Toujours inclure le sous-dossier
   - ✅ `"consulados/fichier.png"`
   - ❌ `"fichier.png"` (si le fichier est dans consulados/)

2. **Placeholder automatique** : Si filePath est null/undefined/vide, un SVG est retourné

3. **Gestion d'erreurs** : Utilisez `onError` sur les balises `<img>`

4. **Permissions** : Le bucket `'logo'` doit avoir l'accès public

5. **Formats supportés** : .jpg, .jpeg, .png, .gif, .webp, .svg

---

## 🧭 Navigation rapide

| Document | Description | Quand l'utiliser |
|----------|-------------|------------------|
| **README_LOGOS_STORAGE.md** | Vue d'ensemble | Début, référence rapide |
| **USAGE_CONSULADO_LOGOS.md** | Guide fonction | Utilisation de getConsuladoLogoUrl() |
| **STORAGE_STRUCTURE.md** | Architecture | Comprendre la structure |
| **EXEMPLES_PRATIQUES_LOGOS.tsx** | Code React | Copier-coller des exemples |

---

## ✅ Checklist de démarrage

- [ ] Lire **README_LOGOS_STORAGE.md** (5 min)
- [ ] Vérifier les permissions du bucket 'logo' dans Supabase
- [ ] Tester `getConsuladoLogoUrl()` avec un logo existant
- [ ] Tester avec `null` pour voir le placeholder
- [ ] Parcourir les exemples dans **EXEMPLES_PRATIQUES_LOGOS.tsx**
- [ ] Visiter l'onglet "Imágenes y Logos" dans l'admin
- [ ] Copier un exemple et l'adapter à votre besoin

---

## 🆘 Aide et support

### Problème : L'image ne s'affiche pas
1. Vérifiez que le `filePath` inclut le sous-dossier (ex: `consulados/...`)
2. Vérifiez les permissions publiques du bucket dans Supabase
3. Utilisez `onError` pour afficher un placeholder en cas d'échec

### Problème : Placeholder au lieu du logo
1. Vérifiez que `consulado.logo` n'est pas null
2. Vérifiez que le chemin est correct avec le sous-dossier
3. Testez l'URL directement dans le navigateur

### Problème : Erreur "bucket not found"
1. Vérifiez que le bucket s'appelle bien `'logo'` dans Supabase
2. Si différent, modifiez la ligne 44 dans `lib/supabase.ts`

### Besoin d'un exemple spécifique ?
Consultez **EXEMPLES_PRATIQUES_LOGOS.tsx** - 10 exemples couvrant tous les cas

---

## 📝 Fichiers modifiés dans le projet

### Code
- `lib/supabase.ts` - Fonctions exportées
- `pages/admin/Configuracion.tsx` - Nouvel onglet

### Documentation
- `README_LOGOS_STORAGE.md` - Vue d'ensemble
- `USAGE_CONSULADO_LOGOS.md` - Guide d'utilisation
- `STORAGE_STRUCTURE.md` - Architecture
- `EXEMPLES_PRATIQUES_LOGOS.tsx` - Exemples React
- `INDEX_DOCUMENTATION_LOGOS.md` - Ce fichier

---

**Tout est prêt ! Commencez par lire README_LOGOS_STORAGE.md** 🚀
