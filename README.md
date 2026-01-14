# Consulados CABJ - Système de Gestion

Application web complète pour la gestion des consulados, socios, partidos, equipos et competitions de Boca Juniors.

## 🚀 Technologies

- **React 19** avec TypeScript
- **Vite** pour le build et le développement
- **Supabase** pour la base de données
- **React Router** pour la navigation
- **Tailwind CSS** pour le styling
- **Lucide React** pour les icônes

## 📦 Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour la production
npm run build

# Prévisualiser le build
npm run preview
```

## 🔧 Configuration

1. Créer un fichier `.env.local` à la racine du projet
2. Ajouter vos credentials Supabase :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon
```

## 📁 Structure du Projet

```
├── components/          # Composants réutilisables
├── pages/              # Pages de l'application
│   ├── admin/         # Pages administrateur
│   └── president/     # Pages président
├── services/          # Services (dataService, etc.)
├── lib/               # Configuration Supabase
├── types.ts           # Types TypeScript
├── utils/             # Utilitaires
└── constants.tsx      # Constantes de l'application
```

## 🎯 Fonctionnalités

### Gestion des Consulados
- Création, modification et suppression de consulados
- Gestion de la directiva (président, vice-président, secrétaire, trésorier, vocales)
- Gestion des réseaux sociaux et informations de contact
- Consulado "CONSULADO CENTRAL" automatique pour les socios sans consulado

### Gestion des Socios
- CRUD complet des socios
- Filtres par consulado, catégorie, statut de cotisation, rôle
- Export PDF
- Gestion des transferts entre consulados

### Gestion du Football
- **Partidos** : Gestion des matchs avec fenêtres d'habilitation
- **Equipos** : Gestion des équipes avec filtres par confédération et pays
- **Competitions** : Gestion des compétitions

### Autres Fonctionnalités
- Dashboard avec statistiques
- Système de messages
- Agenda des événements
- Gestion des utilisateurs et accès
- Base de données avec vérification d'intégrité

## 🔐 Rôles Utilisateurs

- **SUPERADMIN** : Accès complet
- **ADMIN** : Gestion administrative
- **PRESIDENTE** : Gestion de son consulado
- **REFERENTE** : Accès limité
- **SOCIO** : Accès en lecture

## 🚢 Déploiement

### Option 1 : Vercel (Recommandé)

1. **Créer un compte** sur [Vercel](https://vercel.com)

2. **Connecter votre dépôt GitHub** :
   - Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
   - Cliquez sur "Add New Project"
   - Sélectionnez votre dépôt `AdminCABJ`
   - Vercel détectera automatiquement Vite

3. **Configurer les variables d'environnement** :
   - Dans les paramètres du projet, allez dans "Environment Variables"
   - Ajoutez :
     - `VITE_SUPABASE_URL` : Votre URL Supabase
     - `VITE_SUPABASE_ANON_KEY` : Votre clé anonyme Supabase
   - (Optionnel) `GEMINI_API_KEY` si vous utilisez Gemini

4. **Déployer** :
   - Cliquez sur "Deploy"
   - Vercel déploiera automatiquement à chaque push sur `main`

5. **Votre application sera disponible** sur : `https://votre-projet.vercel.app`

### Option 2 : Netlify

1. **Créer un compte** sur [Netlify](https://netlify.com)

2. **Connecter votre dépôt GitHub** :
   - Allez sur [Netlify Dashboard](https://app.netlify.com)
   - Cliquez sur "Add new site" → "Import an existing project"
   - Sélectionnez votre dépôt `AdminCABJ`

3. **Configurer le build** :
   - Build command : `npm run build`
   - Publish directory : `dist`
   - Netlify détectera automatiquement le fichier `netlify.toml`

4. **Configurer les variables d'environnement** :
   - Dans "Site settings" → "Environment variables"
   - Ajoutez :
     - `VITE_SUPABASE_URL` : Votre URL Supabase
     - `VITE_SUPABASE_ANON_KEY` : Votre clé anonyme Supabase

5. **Déployer** :
   - Cliquez sur "Deploy site"
   - Netlify déploiera automatiquement à chaque push sur `main`

6. **Votre application sera disponible** sur : `https://votre-projet.netlify.app`

### Option 3 : GitHub Pages

1. Installer `gh-pages` :
```bash
npm install --save-dev gh-pages
```

2. Ajouter dans `package.json` :
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

3. Déployer :
```bash
npm run deploy
```

**Note** : Pour GitHub Pages, vous devrez configurer la base URL dans `vite.config.ts` :
```typescript
base: '/AdminCABJ/'
```

## 📝 Notes

- Le consulado "CONSULADO CENTRAL" est créé automatiquement s'il n'existe pas
- Les socios sans consulado sont automatiquement assignés à "CONSULADO CENTRAL"
- Les données sont synchronisées en temps réel avec Supabase

## 📄 Licence

Propriétaire - Consulados CABJ
