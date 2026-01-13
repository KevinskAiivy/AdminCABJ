# Utilisation de `getConsuladoLogoUrl`

## Description

La fonction `getConsuladoLogoUrl` permet de récupérer l'URL publique d'un logo de consulado stocké dans Supabase Storage, avec un fallback automatique vers une image placeholder si aucun logo n'est défini.

## Import

```typescript
import { getConsuladoLogoUrl } from './lib/supabase';
```

## Signature

```typescript
getConsuladoLogoUrl(filePath: string | null | undefined): string
```

## Paramètres

- **filePath** (string | null | undefined) : Le chemin **complet** du fichier dans le bucket Supabase Storage `'logo'` (incluant les sous-dossiers)
  - Exemples valides :
    - `"consulados/consulado_abc123_logo_1234567890.png"` (logo de consulado)
    - `"consulados/consulado_xyz456_banner_1234567890.jpg"` (bannière de consulado)
    - `"12345678_1234567890.jpg"` (photo de socio à la racine)
  - Si `null`, `undefined` ou chaîne vide → retourne un placeholder

## Retour

- **string** : L'URL publique du logo ou une image placeholder SVG avec les couleurs Boca Juniors (#003B94 et #FCB131)

## Structure du bucket

Le bucket Supabase Storage utilisé est : **`'logo'`**

### Organisation des dossiers :

```
logo/ (bucket)
├── consulados/
│   ├── consulado_abc123_logo_1234567890.png
│   ├── consulado_abc123_banner_1234567890.jpg
│   ├── consulado_xyz456_logo_1234567890.png
│   └── consulado_xyz456_banner_1234567890.jpg
└── (racine - photos socios)
    ├── 12345678_1234567890.jpg
    ├── 87654321_1234567891.jpg
    └── ...
```

**Important** : Le paramètre `filePath` doit inclure le sous-dossier dans le chemin !

## Exemples d'utilisation

### 1. Afficher le logo d'un consulado

```tsx
import { getConsuladoLogoUrl } from './lib/supabase';
import { Consulado } from './types';

const ConsuladoCard = ({ consulado }: { consulado: Consulado }) => {
  const logoUrl = getConsuladoLogoUrl(consulado.logo);
  
  return (
    <div className="consulado-card">
      <img 
        src={logoUrl} 
        alt={`Logo ${consulado.name}`}
        className="w-24 h-24 object-contain"
      />
      <h3>{consulado.name}</h3>
    </div>
  );
};
```

### 2. Liste de consulados avec logos

```tsx
import { getConsuladoLogoUrl } from './lib/supabase';

const ConsuladosList = ({ consulados }: { consulados: Consulado[] }) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      {consulados.map(consulado => (
        <div key={consulado.id} className="card">
          <img 
            src={getConsuladoLogoUrl(consulado.logo)}
            alt={consulado.name}
            onError={(e) => {
              // Fallback supplémentaire en cas d'erreur de chargement
              e.currentTarget.src = getConsuladoLogoUrl(null);
            }}
          />
          <p>{consulado.name}</p>
          <p className="text-sm text-gray-500">{consulado.city}</p>
        </div>
      ))}
    </div>
  );
};
```

### 3. Dans un select/dropdown

```tsx
import { getConsuladoLogoUrl } from './lib/supabase';

const ConsuladoSelect = ({ consulados }: { consulados: Consulado[] }) => {
  return (
    <select className="consulado-select">
      {consulados.map(consulado => (
        <option key={consulado.id} value={consulado.id}>
          <img src={getConsuladoLogoUrl(consulado.logo)} className="inline w-4 h-4" />
          {consulado.name}
        </option>
      ))}
    </select>
  );
};
```

### 4. Avec préchargement

```tsx
import { useEffect, useState } from 'react';
import { getConsuladoLogoUrl } from './lib/supabase';

const ConsuladoImage = ({ logoPath }: { logoPath: string | null }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const logoUrl = getConsuladoLogoUrl(logoPath);
  
  useEffect(() => {
    // Précharger l'image
    const img = new Image();
    img.src = logoUrl;
    img.onload = () => setImageLoaded(true);
  }, [logoUrl]);
  
  return (
    <div className="relative">
      {!imageLoaded && (
        <div className="absolute inset-0 animate-pulse bg-gray-200 rounded" />
      )}
      <img 
        src={logoUrl}
        className={`transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        alt="Logo consulado"
      />
    </div>
  );
};
```

## Placeholder par défaut

Si aucun logo n'est fourni, la fonction retourne un SVG inline avec :
- Fond : Bleu Boca (#003B94)
- Texte : Or Boca (#FCB131)
- Texte affiché : "LOGO"
- Dimensions : 200x200px
- Coins arrondis : 20px

## Notes importantes

1. **Bucket name** : Le bucket utilisé est `'logo'`. Si votre bucket a un nom différent, modifiez la ligne 44 dans `lib/supabase.ts`

2. **Permissions** : Assurez-vous que le bucket `'logo'` a les permissions publiques activées dans Supabase

3. **Performance** : La fonction utilise `getPublicUrl()` qui ne fait pas de requête réseau, elle génère simplement l'URL publique

4. **Gestion d'erreurs** : Utilisez `onError` sur les balises `<img>` pour gérer les cas où l'image ne charge pas

## Testez la fonction

```typescript
// Cas 1 : Avec un logo de consulado (dans le sous-dossier)
console.log(getConsuladoLogoUrl('consulados/consulado_abc123_logo_1234567890.png'));
// → "https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/logo/consulados/consulado_abc123_logo_1234567890.png"

// Cas 2 : Avec une bannière de consulado
console.log(getConsuladoLogoUrl('consulados/consulado_xyz456_banner_1234567890.jpg'));
// → "https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/logo/consulados/consulado_xyz456_banner_1234567890.jpg"

// Cas 3 : Photo de socio (racine du bucket)
console.log(getConsuladoLogoUrl('12345678_1234567890.jpg'));
// → "https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/logo/12345678_1234567890.jpg"

// Cas 4 : Sans logo (null)
console.log(getConsuladoLogoUrl(null));
// → "data:image/svg+xml,%3Csvg..."

// Cas 5 : Chaîne vide
console.log(getConsuladoLogoUrl(''));
// → "data:image/svg+xml,%3Csvg..."

// Cas 6 : Undefined
console.log(getConsuladoLogoUrl(undefined));
// → "data:image/svg+xml,%3Csvg..."
```

## Modification du bucket

Si votre bucket s'appelle différemment (par exemple `'consulados'`, `'logos'` ou `'images'`), modifiez la ligne 44 dans `lib/supabase.ts` :

```typescript
// Remplacez 'logo' par le nom de votre bucket
const { data } = supabase.storage
  .from('votre-nom-de-bucket')  // ← Changez ici
  .getPublicUrl(filePath);
```
