# Guide de Dépannage - Problèmes d'Initialisation

## Problème : L'application ne s'initialise pas sur Vercel

### ✅ Corrections appliquées

Les corrections suivantes ont été appliquées :

1. **Initialisation toujours effectuée** : L'application initialise maintenant `dataService` même sans utilisateur connecté
2. **Variables d'environnement** : Support des variables d'environnement Vercel avec fallback sur les valeurs par défaut
3. **Gestion des erreurs** : Meilleure gestion des erreurs pour ne pas bloquer complètement l'application

### 🔍 Vérification des Variables d'Environnement sur Vercel

1. **Allez sur le Dashboard Vercel** :
   - https://vercel.com/kevinskaiivys-projects/admin-cabj/settings/environment-variables

2. **Vérifiez que ces variables sont définies** :
   ```
   VITE_SUPABASE_URL = https://mihvnjyicixelzdwztet.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1paHZuanlpY2l4ZWx6ZHd6dGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTMzMTAsImV4cCI6MjA4MzA2OTMxMH0.3vljeLGeWPyKZvV9qRVwxHrDk2ERJRfRxxdbL_L2mqg
   ```

3. **Vérifiez que les variables sont disponibles pour** :
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

4. **Redéployez après avoir ajouté les variables** :
   - Allez dans "Deployments"
   - Cliquez sur les 3 points du dernier déploiement
   - Sélectionnez "Redeploy"

### 🐛 Vérification des Erreurs dans la Console

1. **Ouvrez la console du navigateur** (F12 → Console)
2. **Recherchez ces logs** :
   - `🚀 Initialisation de l'application...`
   - `✅ DataService initialisé`
   - `✅ Session utilisateur restaurée` (si connecté)
   - `ℹ️ Aucune session utilisateur trouvée - Affichage de la page de login` (si non connecté)

3. **Si vous voyez des erreurs** :
   - `❌ Variables d'environnement Supabase manquantes !` → Les variables ne sont pas configurées sur Vercel
   - `❌ Erreur lors de l'initialisation Supabase` → Problème de connexion à Supabase
   - `❌ Erreur lors de l'initialisation de l'application` → Erreur générale

### 🔧 Solutions aux Problèmes Courants

#### Problème 1 : Variables d'environnement non définies

**Symptômes** : Console affiche "Variables d'environnement Supabase manquantes"

**Solution** :
1. Allez sur Vercel → Settings → Environment Variables
2. Ajoutez les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
3. Redéployez l'application

#### Problème 2 : Application reste sur l'écran de chargement

**Symptômes** : L'application affiche "Inicializando..." indéfiniment

**Solution** :
1. Ouvrez la console du navigateur
2. Vérifiez s'il y a des erreurs JavaScript
3. Vérifiez que `dataService.initializeData()` se termine (attendre les logs ✅ ou ❌)
4. Si erreur, vérifiez la connexion Supabase

#### Problème 3 : Page blanche

**Symptômes** : La page est complètement blanche

**Solution** :
1. Ouvrez la console du navigateur
2. Vérifiez s'il y a des erreurs de syntaxe JavaScript
3. Vérifiez si le build Vercel a réussi (allez dans Deployments)
4. Vérifiez que le fichier `dist/index.html` existe dans le build

### 📋 Checklist de Déploiement

- [ ] Variables d'environnement configurées sur Vercel
- [ ] Build Vercel réussi (statut "Ready")
- [ ] Console navigateur affiche les logs d'initialisation
- [ ] Page de login s'affiche si non connecté
- [ ] Connexion à Supabase fonctionne

### 🔗 Liens Utiles

- [Dashboard Vercel](https://vercel.com/kevinskaiivys-projects/admin-cabj)
- [Variables d'environnement](https://vercel.com/kevinskaiivys-projects/admin-cabj/settings/environment-variables)
- [Logs de déploiement](https://vercel.com/kevinskaiivys-projects/admin-cabj/deployments)
- [Dépôt GitHub](https://github.com/KevinskAiivy/AdminCABJ)
