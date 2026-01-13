# 🔧 Guide de résolution - Images non visibles sur tablette

## 🎯 Problème

Les images (logos de navbar, logos de consulados, photos de socios) ne s'affichent pas sur tablette, alors qu'elles fonctionnent sur ordinateur.

---

## 📋 Diagnostic rapide

### Page de diagnostic automatique

Une page de diagnostic est maintenant disponible :

**Accès** : `/admin/diagnostic-images` (ou créer un lien dans le menu admin)

Cette page va tester automatiquement :
- ✅ Connexion à Supabase
- ✅ Accès au bucket Storage
- ✅ Permissions publiques
- ✅ Chargement d'images réelles
- ✅ Configuration CORS
- ✅ Informations sur l'appareil

---

## 🔍 Causes possibles

### 1. ❌ Permissions du bucket Storage non publiques

**Symptôme** : Les images retournent une erreur 403 ou 401

**Solution** :
1. Allez sur [supabase.com](https://supabase.com)
2. Ouvrez votre projet
3. Menu : **Storage** > **Buckets**
4. Cliquez sur le bucket **`logo`**
5. Cliquez sur **Settings** (engrenage)
6. Activez : **Public bucket** ✅
7. Sauvegardez

**Vérification** :
```bash
# Testez cette URL dans le navigateur de la tablette
https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/logo/consulados/nom-fichier.png
```

Si l'image s'affiche → Le bucket est bien public ✅

---

### 2. 📱 Cache du navigateur sur tablette

**Symptôme** : Les images fonctionnent sur PC mais pas sur tablette

**Solution iPad/iPhone (Safari)** :
1. Paramètres > Safari
2. Effacer historique et données de sites
3. OU : Appui long sur le bouton actualiser > Recharger sans cache

**Solution Android (Chrome)** :
1. Paramètres > Confidentialité et sécurité
2. Effacer les données de navigation
3. Cochez : Cache et Images
4. OU : Dans Chrome, Menu (⋮) > Paramètres > Confidentialité > Effacer les données

**Solution rapide** :
- Ouvrez l'URL en navigation privée/incognito

---

### 3. 🔒 Bloqueur de contenu / Mode strict (iOS)

**Symptôme** : Images bloquées uniquement sur iPad/iPhone

**Solution** :
1. Paramètres > Safari > Avancé
2. Désactivez : **Bloquer les cookies** (ou mettez sur "Autoriser des sites web visités")
3. Désactivez temporairement : **Prévention du suivi avancée**

---

### 4. 🌐 Configuration CORS de Supabase

**Symptôme** : Erreur CORS dans la console du navigateur

**Solution** :
1. Dans Supabase : **Settings** > **API**
2. Section **CORS Configuration**
3. Ajoutez votre domaine à la liste autorisée :
   - Pour dev local : `http://localhost:5173`
   - Pour production : `https://votre-domaine.com`
   - Pour tout autoriser (test uniquement) : `*`

---

### 5. 📶 Connexion réseau faible

**Symptôme** : Images ne chargent pas ou partiellement

**Solution** :
- Testez avec une connexion Wi-Fi stable
- Vérifiez la force du signal
- Essayez avec des données mobiles (4G/5G)
- Attendez que la page charge complètement

**Optimisation** :
```typescript
// Ajouter un timeout et fallback
<img 
  src={getConsuladoLogoUrl(consulado.logo)}
  onError={(e) => {
    e.currentTarget.src = getConsuladoLogoUrl(null); // Placeholder
  }}
  loading="lazy" // Lazy loading
/>
```

---

### 6. 🖼️ Format d'image incompatible

**Symptôme** : Certaines images ne s'affichent pas

**Solution** :
- Privilégiez : **PNG**, **JPG**, **WebP**
- Évitez : **SVG** avec des dépendances externes
- Vérifiez que les images ne sont pas corrompues

**Test** :
```bash
# Téléchargez l'image et vérifiez son format
file nom-image.png
```

---

### 7. 🔗 URLs locales vs. production

**Symptôme** : Fonctionne en local mais pas en production

**Solution** :
- Vérifiez que les URLs ne pointent pas vers `localhost`
- Vérifiez les variables d'environnement :

```env
# .env ou variables Netlify/Vercel
VITE_SUPABASE_URL=https://mihvnjyicixelzdwztet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon
```

---

### 8. 🛡️ Politique de sécurité du contenu (CSP)

**Symptôme** : Erreur "Content Security Policy" dans la console

**Solution** :
Ajoutez dans `index.html` :

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               img-src 'self' data: https://mihvnjyicixelzdwztet.supabase.co; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline';">
```

---

## ✅ Checklist de résolution

### Sur la tablette

- [ ] Videz le cache du navigateur
- [ ] Essayez en navigation privée
- [ ] Désactivez les bloqueurs de publicité/contenu
- [ ] Testez avec une autre connexion (Wi-Fi vs. 4G)
- [ ] Testez avec un autre navigateur (Chrome vs. Safari)
- [ ] Vérifiez que JavaScript est activé
- [ ] Ouvrez la console et notez les erreurs

### Dans Supabase

- [ ] Vérifiez que le bucket `logo` est **Public** ✅
- [ ] Vérifiez que les fichiers existent bien
- [ ] Testez une URL d'image directement dans le navigateur
- [ ] Vérifiez la configuration CORS
- [ ] Vérifiez les permissions RLS (Row Level Security)

### Dans le code

- [ ] Vérifiez que `getConsuladoLogoUrl()` est utilisé partout
- [ ] Ajoutez des `onError` handlers sur toutes les `<img>`
- [ ] Vérifiez les variables d'environnement
- [ ] Utilisez le composant `DiagnosticImages` pour tester

---

## 🧪 Tests manuels

### Test 1 : URL directe

1. Copiez une URL d'image depuis l'onglet "Imágenes y Logos"
2. Collez-la dans le navigateur de la tablette
3. Si l'image ne s'affiche pas → Problème de permissions Supabase

### Test 2 : Placeholder

1. Sur tablette, ouvrez la console (si possible)
2. Tapez :
```javascript
console.log(getConsuladoLogoUrl(null));
```
3. Le placeholder SVG devrait s'afficher

### Test 3 : Logs réseau

1. Sur tablette, activez les outils de développement
2. Onglet **Network/Réseau**
3. Rechargez la page
4. Cherchez les requêtes vers `supabase.co`
5. Statut 200 = OK, 403/401 = Problème de permissions

---

## 🚀 Solutions avancées

### 1. Forcer le rechargement des images

Ajoutez un paramètre de cache-busting :

```typescript
export const getConsuladoLogoUrl = (filePath: string | null | undefined): string => {
  // ... code existant ...
  
  // Ajouter un timestamp pour forcer le rechargement
  const timestamp = new Date().getTime();
  return `${data.publicUrl}?t=${timestamp}`;
};
```

### 2. Préchargement des images

```typescript
const preloadImages = (urls: string[]) => {
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
};

// Utilisation
useEffect(() => {
  const logoUrls = consulados.map(c => getConsuladoLogoUrl(c.logo));
  preloadImages(logoUrls);
}, [consulados]);
```

### 3. Service Worker pour le cache

Créez un Service Worker pour mettre en cache les images :

```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('supabase.co/storage')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
```

---

## 📞 Support

### Commandes de diagnostic

```bash
# Tester la connexion à Supabase
curl -I https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/logo/

# Tester une image spécifique
curl -I https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/logo/consulados/fichier.png
```

### Informations à fournir en cas de problème

1. **Appareil** : Modèle de tablette, version de l'OS
2. **Navigateur** : Chrome/Safari, version
3. **Réseau** : Wi-Fi/4G, force du signal
4. **Console** : Copie des erreurs JavaScript
5. **Network** : Statut HTTP des requêtes d'images
6. **URL de test** : Une URL d'image qui ne fonctionne pas

---

## 📱 Spécificités par appareil

### iPad / iPhone (iOS/iPadOS)

**Problème fréquent** : Safari bloque les cookies tiers
**Solution** : Paramètres > Safari > Bloquer tous les cookies : **OFF**

### Android

**Problème fréquent** : Chrome économise les données
**Solution** : Paramètres > Économiseur de données : **OFF**

### Kindle Fire

**Problème fréquent** : Navigateur Silk limité
**Solution** : Installez Chrome ou Firefox depuis l'App Store Amazon

---

## ✨ Prévention

Pour éviter ces problèmes à l'avenir :

1. ✅ Toujours utiliser `getConsuladoLogoUrl()` pour générer les URLs
2. ✅ Ajouter `onError` handlers sur toutes les images
3. ✅ Utiliser `loading="lazy"` pour optimiser le chargement
4. ✅ Tester sur plusieurs appareils avant de déployer
5. ✅ Documenter les URLs Supabase dans les variables d'environnement
6. ✅ Mettre en place un système de monitoring des erreurs

---

**Page de diagnostic créée** : `pages/admin/DiagnosticImages.tsx`

Utilisez cette page pour diagnostiquer automatiquement les problèmes ! 🚀
