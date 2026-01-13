# Structure du Storage Supabase - Bucket 'logo'

## 📁 Organisation des fichiers

Le bucket **`'logo'`** contient deux types de fichiers organisés de la manière suivante :

```
logo/ (bucket Supabase)
│
├── consulados/                                    ← Sous-dossier des consulados
│   ├── consulado_abc123_logo_1234567890.png     ← Logo d'un consulado
│   ├── consulado_abc123_banner_1234567890.jpg   ← Bannière d'un consulado
│   ├── consulado_xyz456_logo_1234567891.png
│   ├── consulado_xyz456_banner_1234567891.jpg
│   └── ...
│
└── (racine - photos des socios)                   ← Photos à la racine
    ├── 12345678_1234567890.jpg                   ← Photo d'un socio (DNI_timestamp)
    ├── 87654321_1234567891.jpg
    └── ...
```

## 🔧 Fonctions disponibles

### 1. `getConsuladoLogoUrl(filePath)`

Retourne l'URL publique d'une image stockée dans le bucket 'logo'.

**Paramètre :**
- `filePath` : Chemin **complet** incluant le sous-dossier (ex: `"consulados/consulado_123_logo.png"`)

**Retour :**
- URL publique si le fichier existe
- Image placeholder SVG (bleu/or Boca) si `filePath` est null/undefined/vide

**Exemples :**

```typescript
import { getConsuladoLogoUrl } from './lib/supabase';

// Logo de consulado
const url1 = getConsuladoLogoUrl('consulados/consulado_abc123_logo_1234567890.png');
// → "https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/logo/consulados/consulado_abc123_logo_1234567890.png"

// Photo de socio (racine)
const url2 = getConsuladoLogoUrl('12345678_1234567890.jpg');
// → "https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/logo/12345678_1234567890.jpg"

// Sans image (placeholder)
const url3 = getConsuladoLogoUrl(null);
// → "data:image/svg+xml,..." (placeholder SVG)
```

### 2. `listStorageFiles(folderPath, options)`

Liste tous les fichiers images d'un sous-dossier spécifique.

**Paramètres :**
- `folderPath` : Chemin du dossier (`"consulados"`, `""` pour la racine)
- `options` : Limit, offset, sortBy (optionnel)

**Retour :**
- `{ data: fichiers[], error: null }` en cas de succès
- `{ data: [], error }` en cas d'erreur

**Exemples :**

```typescript
import { listStorageFiles } from './lib/supabase';

// Lister tous les logos de consulados
const { data: consuladoLogos } = await listStorageFiles('consulados');

// Lister les photos de socios (racine)
const { data: socioPhotos } = await listStorageFiles('');

// Avec options
const { data: recent } = await listStorageFiles('consulados', {
  limit: 50,
  sortBy: { column: 'created_at', order: 'desc' }
});
```

## 💼 Utilisation dans les composants

### Afficher un logo de consulado

```tsx
import { getConsuladoLogoUrl } from './lib/supabase';

const ConsuladoCard = ({ consulado }) => (
  <div>
    <img 
      src={getConsuladoLogoUrl(consulado.logo)}
      alt={consulado.name}
      className="w-24 h-24 object-contain"
    />
    <h3>{consulado.name}</h3>
  </div>
);
```

### Afficher une photo de socio

```tsx
import { getConsuladoLogoUrl } from './lib/supabase';

const SocioProfile = ({ socio }) => (
  <div>
    <img 
      src={getConsuladoLogoUrl(socio.foto)}
      alt={socio.name}
      className="w-32 h-32 rounded-full object-cover"
    />
    <h2>{socio.name}</h2>
  </div>
);
```

### Galerie d'images avec listStorageFiles

```tsx
import { listStorageFiles } from './lib/supabase';
import { useEffect, useState } from 'react';

const ImageGallery = () => {
  const [images, setImages] = useState([]);

  useEffect(() => {
    const loadImages = async () => {
      const { data } = await listStorageFiles('consulados');
      setImages(data);
    };
    loadImages();
  }, []);

  return (
    <div className="grid grid-cols-4 gap-4">
      {images.map(img => (
        <img key={img.fullPath} src={img.publicUrl} alt={img.name} />
      ))}
    </div>
  );
};
```

## 🎨 Placeholder par défaut

Quand aucune image n'est fournie, `getConsuladoLogoUrl(null)` retourne un SVG inline :

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect fill="#003B94" width="200" height="200" rx="20"/>
  <text fill="#FCB131" x="50%" y="50%" text-anchor="middle" dy=".3em" 
        font-family="Arial, sans-serif" font-size="24" font-weight="bold">
    LOGO
  </text>
</svg>
```

- **Fond** : Bleu Boca (#003B94)
- **Texte** : Or Boca (#FCB131)
- **Dimensions** : 200x200px
- **Coins arrondis** : 20px

## 📊 Onglet "Imágenes y Logos" dans le Centro de Control

L'onglet affiche maintenant :

1. **Toutes les images du bucket 'logo'** organisées par sous-dossier
2. **Informations affichées** :
   - Dossier (Consulados / Socios)
   - Nom du fichier
   - Chemin complet (ex: `consulados/fichier.png`)
   - Taille du fichier
   - Date de création
   - URL publique

3. **Actions disponibles** :
   - 🔗 Ouvrir dans un nouvel onglet
   - 📋 Copier l'URL
   - 🗑️ Supprimer l'image

4. **Actualisation** : Bouton pour recharger la galerie

## ⚠️ Points importants

1. **Chemins complets** : Toujours inclure le sous-dossier dans le `filePath`
   - ✅ Correct : `"consulados/consulado_123_logo.png"`
   - ❌ Incorrect : `"consulado_123_logo.png"` (si le fichier est dans consulados/)

2. **Permissions** : Assurez-vous que le bucket `'logo'` a les permissions publiques activées dans Supabase

3. **Formats supportés** : `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`

4. **Performance** : `getConsuladoLogoUrl()` ne fait pas de requête réseau, elle génère juste l'URL

## 🧪 Tests

```typescript
// Test 1 : Logo de consulado avec sous-dossier
console.log(getConsuladoLogoUrl('consulados/consulado_123_logo_1234567890.png'));
// Expected: URL complète avec /consulados/ dans le chemin

// Test 2 : Photo de socio (racine)
console.log(getConsuladoLogoUrl('12345678_1234567890.jpg'));
// Expected: URL sans sous-dossier

// Test 3 : Placeholder
console.log(getConsuladoLogoUrl(null));
// Expected: data:image/svg+xml,...

// Test 4 : Liste des fichiers consulados
const { data } = await listStorageFiles('consulados');
console.log(data.length, 'fichiers trouvés');
// Expected: Nombre de fichiers dans le dossier consulados

// Test 5 : Liste des fichiers socios (racine)
const { data: socios } = await listStorageFiles('');
console.log(socios.length, 'photos de socios');
// Expected: Nombre de fichiers à la racine
```

## 📝 Fichiers modifiés

1. **`lib/supabase.ts`** :
   - ✅ `getConsuladoLogoUrl()` - Fonction principale
   - ✅ `listStorageFiles()` - Fonction de listage

2. **`pages/admin/Configuracion.tsx`** :
   - ✅ Onglet "Imágenes y Logos" mis à jour
   - ✅ Support des sous-dossiers
   - ✅ Affichage du chemin complet

3. **`USAGE_CONSULADO_LOGOS.md`** :
   - ✅ Documentation complète avec exemples

4. **`STORAGE_STRUCTURE.md`** (ce fichier) :
   - ✅ Vue d'ensemble de la structure

---

✨ **Tout est prêt à être utilisé !** Le projet compile sans erreurs.
