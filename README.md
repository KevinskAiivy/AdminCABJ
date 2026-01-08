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
- Consulado "SEDE CENTRAL" automatique pour les socios sans consulado

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

### Sur GitHub Pages

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

### Sur Vercel / Netlify

1. Connecter votre dépôt GitHub
2. Configurer les variables d'environnement
3. Déployer automatiquement

## 📝 Notes

- Le consulado "SEDE CENTRAL" est créé automatiquement s'il n'existe pas
- Les socios sans consulado sont automatiquement assignés à "SEDE CENTRAL"
- Les données sont synchronisées en temps réel avec Supabase

## 📄 Licence

Propriétaire - Consulados CABJ
