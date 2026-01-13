# 🚨 DIAGNOSTIC RAPIDE - Logos non visibles sur tablette

## ✅ VÉRIFICATIONS PRIORITAIRES (5 minutes)

### 1. 🔓 Permissions du bucket Supabase (CAUSE #1 - 90% des cas)

**Action immédiate** :
1. Allez sur https://supabase.com
2. Ouvrez votre projet
3. Menu : **Storage** > Cliquez sur le bucket **`logo`**
4. Cliquez sur l'icône **Settings** (⚙️ engrenage) en haut à droite
5. Activez : **"Public bucket"** ✅
6. Cliquez sur **Save**

**Test** :
Ouvrez cette URL directement dans le navigateur de votre tablette :
```
https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/logo/consulados/nom-fichier.png
```
(Remplacez `nom-fichier.png` par un vrai nom de fichier)

- ✅ Si l'image s'affiche → Le bucket est public, passez à l'étape 2
- ❌ Si erreur 403/401 → Le bucket n'est PAS public, répétez l'étape 1

---

### 2. 🧹 Videz le cache de votre tablette

**Sur iPad/iPhone (Safari)** :
1. Paramètres > Safari
2. **"Effacer historique et données de sites"**
3. Confirmez

**Sur Android (Chrome)** :
1. Chrome > Menu (⋮) > Paramètres
2. Confidentialité et sécurité
3. **"Effacer les données de navigation"**
4. Cochez : Cache et Images
5. Effacer

**Test rapide** :
Ouvrez votre app en **navigation privée/incognito** - si ça marche, c'était un problème de cache.

---

### 3. 🔒 Désactivez les bloqueurs (iOS uniquement)

**Sur iPad/iPhone** :
1. Paramètres > Safari
2. **"Bloquer tous les cookies"** → Désactivez (OFF)
3. **"Prévention du suivi avancée"** → Désactivez (OFF)
4. Rechargez l'application

---

### 4. 🌐 Testez votre connexion réseau

- Essayez en **Wi-Fi**
- Essayez en **4G/5G**
- Si ça marche avec l'une mais pas l'autre → Problème de réseau/proxy

---

## 🧪 TEST AVEC LA PAGE DE DIAGNOSTIC

Si les étapes ci-dessus ne fonctionnent pas :

1. Sur votre tablette, ouvrez l'application
2. Allez dans le menu Admin
3. Ajoutez `/admin/diagnostic-images` à l'URL
4. Lancez le diagnostic automatique
5. Notez les erreurs et envoyez-moi les résultats

---

## 📋 CHECKLIST RAPIDE

Cochez ce qui fonctionne :

- [ ] Le bucket `logo` est configuré en **Public** dans Supabase
- [ ] L'URL directe de l'image fonctionne dans le navigateur de la tablette
- [ ] Le cache a été vidé
- [ ] Les bloqueurs de cookies sont désactivés (iOS)
- [ ] L'application fonctionne en navigation privée
- [ ] Les logos s'affichent sur ordinateur (pour comparaison)

---

## 🆘 SI RIEN NE FONCTIONNE

Envoyez-moi ces informations :

1. **Type de tablette** : iPad/Android/autre ?
2. **Navigateur** : Safari/Chrome/autre ?
3. **Résultat du test d'URL directe** : L'image s'affiche ou erreur ?
4. **Message d'erreur** : Si vous voyez une erreur dans la console
5. **Navigation privée** : Ça fonctionne en mode privé ?

---

## 💡 SOLUTION TEMPORAIRE

En attendant de résoudre le problème, vous pouvez :

1. Utiliser l'application depuis un ordinateur
2. Essayer un autre navigateur sur la tablette
3. Vérifier que JavaScript est activé

---

## ⚡ SOLUTION RAPIDE LA PLUS PROBABLE

**90% des cas** : Le bucket n'est pas public.

➡️ Allez dans Supabase Storage > bucket `logo` > Settings > Cochez "Public bucket" > Save

Puis videz le cache de la tablette et rechargez.

C'est généralement suffisant ! 🎉
