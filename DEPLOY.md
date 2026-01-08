# Guide de Déploiement sur Vercel

## 🚀 Méthode 1 : Interface Web (Recommandé)

### Étape 1 : Créer un compte Vercel
1. Allez sur [https://vercel.com/signup](https://vercel.com/signup)
2. Cliquez sur "Continue with GitHub"
3. Autorisez Vercel à accéder à vos dépôts GitHub

### Étape 2 : Importer le projet
1. Une fois connecté, allez sur [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Cliquez sur le bouton **"Add New Project"** (ou "New Project")
3. Dans la liste des dépôts, trouvez et sélectionnez **`AdminCABJ`**
4. Cliquez sur **"Import"**

### Étape 3 : Configuration du projet
Vercel détectera automatiquement :
- **Framework Preset** : Vite
- **Build Command** : `npm run build`
- **Output Directory** : `dist`
- **Install Command** : `npm install`

**Vous n'avez rien à modifier !** ✅

### Étape 4 : Variables d'environnement
1. Dans la section **"Environment Variables"**, cliquez sur **"Add"**
2. Ajoutez les variables suivantes :

   **Variable 1 :**
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://mihvnjyicixelzdwztet.supabase.co`
   - Environment: Production, Preview, Development (cochez les 3)

   **Variable 2 :**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1paHZuanlpY2l4ZWx6ZHd6dGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTMzMTAsImV4cCI6MjA4MzA2OTMxMH0.3vljeLGeWPyKZvV9qRVwxHrDk2ERJRfRxxdbL_L2mqg`
   - Environment: Production, Preview, Development (cochez les 3)

   **Variable 3 (Optionnelle) :**
   - Name: `GEMINI_API_KEY`
   - Value: (votre clé API Gemini si vous l'utilisez)
   - Environment: Production, Preview, Development

### Étape 5 : Déployer
1. Cliquez sur le bouton **"Deploy"** en bas de la page
2. Attendez 1-2 minutes que le build se termine
3. Votre application sera disponible sur : `https://admin-cabj.vercel.app` (ou un nom similaire)

### Étape 6 : Déploiement automatique
✅ **C'est fait !** Désormais, chaque fois que vous pousserez du code sur la branche `main` de GitHub, Vercel déploiera automatiquement une nouvelle version.

---

## 🖥️ Méthode 2 : Via CLI (Alternative)

Si vous préférez utiliser la ligne de commande :

```bash
# Se connecter à Vercel
npx vercel login

# Déployer (première fois)
npx vercel

# Déployer en production
npx vercel --prod
```

---

## 📝 Notes importantes

- ✅ Le fichier `vercel.json` est déjà configuré dans votre projet
- ✅ Les routes React Router sont configurées pour fonctionner avec Vercel
- ✅ Le cache des assets est optimisé
- ⚠️ Assurez-vous que vos variables d'environnement sont bien configurées

## 🔗 Liens utiles

- [Dashboard Vercel](https://vercel.com/dashboard)
- [Documentation Vercel](https://vercel.com/docs)
- [Votre dépôt GitHub](https://github.com/KevinskAiivy/AdminCABJ)
