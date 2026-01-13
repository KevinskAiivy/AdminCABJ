# 🔍 Diagnostic - Logos ne chargent pas sur tablette

## ✅ Checklist rapide

### 1. Vider le cache de la tablette

**Sur iPad/iPhone (Safari) :**
- Réglages → Safari → Effacer historique et données de sites
- OU : Maintenir le bouton refresh ⟳ → Recharger sans cache

**Sur Android (Chrome) :**
- Paramètres → Confidentialité → Effacer les données de navigation
- Cocher "Images et fichiers en cache"

---

### 2. Vérifier les permissions du bucket Supabase

**Dans Supabase Dashboard :**

1. Allez sur **Storage** → Bucket **`Logo`**
2. Cliquez sur **Settings** (roue dentée)
3. Vérifiez que **"Public bucket"** est **ACTIVÉ** ✅
4. Si ce n'est pas le cas, activez-le

**Commande SQL pour vérifier :**
```sql
SELECT * FROM storage.buckets WHERE name = 'Logo';
```

La colonne `public` doit être `true`.

**Commande SQL pour rendre le bucket public :**
```sql
UPDATE storage.buckets 
SET public = true 
WHERE name = 'Logo';
```

---

### 3. Tester l'URL directement

**Ouvrez cette URL dans le navigateur de votre tablette :**

```
https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/Logo/
```

**Résultats possibles :**

✅ **Vous voyez une liste de fichiers** → Le bucket est accessible  
❌ **"Bucket not found"** → Le bucket n'existe pas ou n'est pas public  
❌ **Erreur 403** → Problème de permissions  
❌ **Page blanche/timeout** → Problème réseau/firewall

---

### 4. Tester un logo spécifique

Si vous avez un logo dans `Logo/consulados/test.png`, testez :

```
https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/Logo/consulados/test.png
```

**Remplacez `test.png` par le nom d'un vrai fichier dans votre bucket.**

---

### 5. Vérifier les CORS

**Dans Supabase Dashboard :**

1. **Settings** → **API**
2. Vérifiez que **CORS** est configuré
3. Ajoutez `*` dans **Allowed origins** (pour tester)

**OU exécutez ce SQL :**

```sql
-- Vérifier la configuration CORS du bucket
SELECT * FROM storage.buckets WHERE name = 'Logo';
```

---

### 6. Problème de réseau/pays

Certains pays bloquent certains services cloud. Testez :

**A. Utilisez un VPN**
- Activez un VPN sur votre tablette
- Reconnectez-vous à l'application

**B. Testez avec données mobiles**
- Désactivez le WiFi
- Utilisez les données mobiles 4G/5G
- Rechargez l'application

**C. Testez depuis un autre appareil**
- Même pays, même réseau
- Si ça marche → Problème spécifique à la tablette
- Si ça ne marche pas → Problème réseau/pays

---

### 7. Vérifier dans la console du navigateur

**Sur tablette (Safari/Chrome) :**

1. Activez le mode développeur
2. Ouvrez la console
3. Rechargez la page
4. Cherchez les erreurs rouges liées aux images

**Erreurs courantes :**

```
Failed to load resource: net::ERR_BLOCKED_BY_CLIENT
→ Bloqué par un adblocker ou privacy shield

Failed to load resource: net::ERR_CONNECTION_REFUSED
→ Problème réseau/firewall

403 Forbidden
→ Bucket pas public ou CORS mal configuré

404 Not Found
→ Fichier n'existe pas ou mauvais chemin
```

---

## 🛠️ Solutions par type d'erreur

### Erreur : "Bucket not found"

**Solution :**
```sql
-- Vérifier que le bucket existe
SELECT * FROM storage.buckets WHERE name = 'Logo';

-- Si vide, créer le bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('Logo', 'Logo', true);
```

---

### Erreur : 403 Forbidden

**Solution 1 : Rendre le bucket public**
```sql
UPDATE storage.buckets 
SET public = true 
WHERE name = 'Logo';
```

**Solution 2 : Ajouter une policy RLS**
```sql
-- Policy pour lecture publique
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'Logo' );
```

---

### Erreur : Images ne chargent pas (pas d'erreur visible)

**Solution : Forcer le rechargement sans cache**

Ajoutez un timestamp à l'URL :

```typescript
const logoUrl = getConsuladoLogoUrl(filePath) + '?t=' + Date.now();
```

---

### Erreur : Bloqué par adblocker/privacy shield

**Solution :**
- Désactivez les adblockers sur la tablette
- Désactivez "Prevent Cross-Site Tracking" (Safari)
- Désactivez "Enhanced Tracking Protection" (Firefox)

---

## 🧪 Script de test rapide

**Copiez ce code dans la console du navigateur de la tablette :**

```javascript
// Test 1 : Connexion Supabase
console.log('🔍 Test connexion Supabase...');
fetch('https://mihvnjyicixelzdwztet.supabase.co/rest/v1/')
  .then(r => console.log('✅ Supabase accessible'))
  .catch(e => console.error('❌ Supabase inaccessible:', e));

// Test 2 : Bucket Logo
console.log('🔍 Test bucket Logo...');
fetch('https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/Logo/')
  .then(r => r.ok ? console.log('✅ Bucket Logo accessible') : console.error('❌ Bucket Logo erreur:', r.status))
  .catch(e => console.error('❌ Bucket Logo inaccessible:', e));

// Test 3 : Charger une image test
console.log('🔍 Test chargement image...');
const img = new Image();
img.onload = () => console.log('✅ Image chargée avec succès');
img.onerror = (e) => console.error('❌ Erreur chargement image:', e);
img.src = 'https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/Logo/consulados/test.png?t=' + Date.now();
```

---

## 📊 Rapport à fournir

Si le problème persiste, notez :

1. **Type de tablette** : iPad/Android, modèle, version OS
2. **Navigateur** : Safari/Chrome/Firefox, version
3. **Pays/Réseau** : Quel pays ? WiFi ou 4G ?
4. **Erreurs console** : Copier les messages d'erreur
5. **Test URL directe** : L'URL du bucket fonctionne-t-elle ?
6. **Avec VPN** : Le problème persiste avec un VPN ?

---

## ✅ Solution finale si rien ne marche

**Utiliser un CDN ou proxy d'images :**

```typescript
// Dans lib/supabase.ts
export const getConsuladoLogoUrl = (filePath: string | null | undefined): string => {
  const placeholderUrl = '...';
  
  if (!filePath || filePath.trim() === '') {
    return placeholderUrl;
  }
  
  const { data } = supabase.storage.from('Logo').getPublicUrl(filePath);
  
  // Si problème de pays/réseau, utiliser un proxy
  // return `https://images.weserv.nl/?url=${encodeURIComponent(data.publicUrl)}`;
  
  return data.publicUrl;
};
```

---

**Commencez par les étapes 1 et 2, puis testez !** 🎯
