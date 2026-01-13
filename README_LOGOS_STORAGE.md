# 📦 Gestion des Logos et Images - Bucket Supabase

## 🎯 Vue d'ensemble

Ce projet utilise Supabase Storage avec un bucket nommé **`'logo'`** qui contient des **sous-dossiers** pour organiser les différents types d'images.

## 📁 Structure du bucket 'logo'

```
logo/
├── consulados/                                    ← Logos et bannières des consulados
│   ├── consulado_abc123_logo_1234567890.png
│   ├── consulado_abc123_banner_1234567890.jpg
│   └── ...
└── (racine)                                       ← Photos des socios
    ├── 12345678_1234567890.jpg
    └── ...
```

## 🚀 Démarrage rapide

### Import de la fonction

```typescript
import { getConsuladoLogoUrl } from './lib/supabase';
```

### Utilisation basique

```tsx
// Avec un consulado
const logoUrl = getConsuladoLogoUrl(consulado.logo);
<img src={logoUrl} alt="Logo" />

// Avec un socio
const photoUrl = getConsuladoLogoUrl(socio.foto);
<img src={photoUrl} alt="Photo" />

// Sans image (placeholder automatique)
const placeholderUrl = getConsuladoLogoUrl(null);
<img src={placeholderUrl} alt="Placeholder" />
```

## 🔧 Fonctions disponibles

### 1. `getConsuladoLogoUrl(filePath)`

Génère l'URL publique d'une image ou retourne un placeholder.

**Paramètres :**
- `filePath` (string | null | undefined) : Chemin complet avec sous-dossier

**Exemples de filePath valides :**
- `"consulados/consulado_123_logo_1234567890.png"` ✅
- `"12345678_1234567890.jpg"` ✅ (socio à la racine)
- `null` ou `""` → Retourne un placeholder SVG ✅

**Retour :**
- URL publique complète ou placeholder SVG (bleu/or Boca)

### 2. `listStorageFiles(folderPath, options)`

Liste les fichiers images d'un sous-dossier.

**Paramètres :**
- `folderPath` : `"consulados"` ou `""` (racine)
- `options` : `{ limit, offset, sortBy }` (optionnel)

**Exemple :**
```typescript
const { data: logos } = await listStorageFiles('consulados');
console.log(logos); // Array d'objets avec publicUrl, fullPath, etc.
```

## 📚 Documentation complète

Le projet contient plusieurs fichiers de documentation :

1. **`USAGE_CONSULADO_LOGOS.md`** : Guide d'utilisation détaillé avec 4 exemples
2. **`STORAGE_STRUCTURE.md`** : Structure complète du storage et points importants
3. **`EXEMPLES_PRATIQUES_LOGOS.tsx`** : 10 composants React prêts à l'emploi

## 🎨 Onglet "Imágenes y Logos" (Centro de Control)

Accessible dans le menu Admin > Configuración > Imágenes y Logos

**Fonctionnalités :**
- ✅ Affichage de toutes les images du bucket 'logo'
- ✅ Organisation par sous-dossiers (Consulados / Socios)
- ✅ Prévisualisation des images
- ✅ Copie d'URL en un clic
- ✅ Ouverture dans un nouvel onglet
- ✅ Suppression d'images
- ✅ Affichage du chemin complet
- ✅ Informations (taille, date, dossier)

## 💡 Exemples pratiques

### Card de consulado avec logo

```tsx
import { getConsuladoLogoUrl } from './lib/supabase';

const ConsuladoCard = ({ consulado }) => (
  <div className="card">
    <img 
      src={getConsuladoLogoUrl(consulado.logo)}
      alt={consulado.name}
      className="w-24 h-24"
    />
    <h3>{consulado.name}</h3>
  </div>
);
```

### Profil de socio avec photo

```tsx
const SocioProfile = ({ socio }) => (
  <div className="profile">
    <img 
      src={getConsuladoLogoUrl(socio.foto)}
      alt={socio.name}
      className="rounded-full w-32 h-32"
    />
    <h2>{socio.name}</h2>
  </div>
);
```

### Galerie d'images

```tsx
import { listStorageFiles } from './lib/supabase';

const Gallery = () => {
  const [images, setImages] = useState([]);

  useEffect(() => {
    listStorageFiles('consulados').then(({ data }) => setImages(data));
  }, []);

  return (
    <div className="grid grid-cols-4 gap-4">
      {images.map(img => (
        <img key={img.fullPath} src={img.publicUrl} />
      ))}
    </div>
  );
};
```

## ⚠️ Points importants

### ✅ À faire

1. **Toujours inclure le sous-dossier** dans le filePath :
   ```typescript
   // ✅ CORRECT
   getConsuladoLogoUrl('consulados/fichier.png')
   
   // ❌ INCORRECT (si le fichier est dans consulados/)
   getConsuladoLogoUrl('fichier.png')
   ```

2. **Gérer les erreurs de chargement** :
   ```tsx
   <img 
     src={getConsuladoLogoUrl(consulado.logo)}
     onError={(e) => {
       e.currentTarget.src = getConsuladoLogoUrl(null);
     }}
   />
   ```

3. **Vérifier les permissions** du bucket `'logo'` dans Supabase (public access)

### ❌ À éviter

- Ne pas utiliser de chemins relatifs incomplets
- Ne pas oublier le sous-dossier `consulados/` pour les logos de consulados
- Ne pas mélanger les chemins (socios sont à la racine, consulados dans un sous-dossier)

## 🧪 Tests

```typescript
// Test 1 : Logo de consulado (avec sous-dossier)
console.log(getConsuladoLogoUrl('consulados/consulado_123_logo.png'));
// Expected: https://...supabase.co/storage/.../logo/consulados/consulado_123_logo.png

// Test 2 : Photo de socio (racine)
console.log(getConsuladoLogoUrl('12345678_1234567890.jpg'));
// Expected: https://...supabase.co/storage/.../logo/12345678_1234567890.jpg

// Test 3 : Placeholder
console.log(getConsuladoLogoUrl(null));
// Expected: data:image/svg+xml,... (SVG bleu/or)

// Test 4 : Liste des fichiers
const { data } = await listStorageFiles('consulados');
console.log(data.length + ' fichiers trouvés');
// Expected: Nombre de fichiers dans consulados/
```

## 📊 Placeholder par défaut

Quand `filePath` est null, undefined ou vide, un SVG est retourné :

- **Fond** : Bleu Boca (#003B94)
- **Texte** : Or Boca (#FCB131)  
- **Contenu** : "LOGO"
- **Dimensions** : 200x200px
- **Coins** : Arrondis 20px

## 🔄 Actualisation des images

Dans l'onglet "Imágenes y Logos" :
1. Cliquez sur le bouton **"Actualizar"**
2. Les images sont rechargées depuis Supabase
3. Tri automatique par date (plus récentes en premier)

## 📝 Fichiers créés/modifiés

### Fichiers de code

1. **`lib/supabase.ts`**
   - ✅ Fonction `getConsuladoLogoUrl()` exportée
   - ✅ Fonction `listStorageFiles()` exportée
   - ✅ Gestion du placeholder SVG

2. **`pages/admin/Configuracion.tsx`**
   - ✅ Nouvel onglet "Imágenes y Logos"
   - ✅ Onglets déplacés en haut (layout horizontal)
   - ✅ Support des sous-dossiers du bucket
   - ✅ Actions : copier URL, ouvrir, supprimer

### Documentation

3. **`USAGE_CONSULADO_LOGOS.md`**
   - Guide d'utilisation complet
   - 4 exemples détaillés
   - Signature et paramètres

4. **`STORAGE_STRUCTURE.md`**
   - Structure du bucket
   - Points importants
   - Tests et vérification

5. **`EXEMPLES_PRATIQUES_LOGOS.tsx`**
   - 10 composants React prêts à l'emploi
   - Cas d'usage variés
   - Code commenté

6. **`README_LOGOS_STORAGE.md`** (ce fichier)
   - Vue d'ensemble
   - Démarrage rapide
   - Référence complète

## ✨ Résumé

- ✅ Bucket `'logo'` avec sous-dossiers : `consulados/` et racine
- ✅ Fonction `getConsuladoLogoUrl()` avec placeholder automatique
- ✅ Fonction `listStorageFiles()` pour lister les images
- ✅ Onglet admin pour visualiser toutes les images
- ✅ Documentation complète avec exemples
- ✅ Compilation sans erreur
- ✅ Prêt à être utilisé en production

---

**Besoin d'aide ?** Consultez les fichiers de documentation listés ci-dessus ! 🚀
