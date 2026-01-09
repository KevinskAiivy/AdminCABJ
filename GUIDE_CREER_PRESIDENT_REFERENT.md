# Guide : Créer un utilisateur Président/Référent

## Méthode 1 : Via l'interface de l'application (Recommandé)

1. **Connectez-vous en tant qu'administrateur**
   - Utilisez les identifiants : `admin` / `admin` (SUPERADMIN)

2. **Accédez à la gestion des utilisateurs**
   - Dans le menu admin, cliquez sur "Usuarios"

3. **Créez un nouvel utilisateur**
   - Cliquez sur le bouton "Nuevo"
   - Remplissez le formulaire :
     - **Username** : Choisissez un nom d'utilisateur (ex: `presidente` ou `referente`)
     - **Password** : Définissez un mot de passe sécurisé
     - **Email** : Entrez l'adresse email
     - **Full Name** : Nom complet de l'utilisateur
     - **Role** : Sélectionnez `PRESIDENTE` ou `REFERENTE`
     - **Consulado** : **IMPORTANT** - Sélectionnez un consulado dans la liste déroulante (requis pour PRESIDENTE et REFERENTE)
     - **Active** : Cochez la case pour activer l'utilisateur
   - Cliquez sur "Guardar"

4. **Vérifiez la création**
   - L'utilisateur apparaît dans la liste des utilisateurs
   - Vous pouvez maintenant vous connecter avec ces identifiants

## Méthode 2 : Via SQL dans Supabase

1. **Accédez à Supabase**
   - Ouvrez votre projet Supabase
   - Allez dans "SQL Editor"

2. **Exécutez le script SQL**
   - Ouvrez le fichier `CREATE_PRESIDENT_REFERENT_USER.sql`
   - Modifiez les valeurs selon vos besoins :
     - Remplacez `'presidente'` par votre nom d'utilisateur
     - Remplacez `'presidente123'` par votre mot de passe
     - Remplacez l'email
     - Remplacez le nom complet
     - Remplacez `(SELECT id FROM consulados LIMIT 1)` par l'ID d'un consulado spécifique si nécessaire

3. **Exécutez le script**
   - Cliquez sur "Run" dans l'éditeur SQL

## Vérifier les consulados disponibles

Pour voir tous les consulados et leurs IDs, exécutez cette requête SQL :

```sql
SELECT id, name, city, country FROM consulados ORDER BY name;
```

## Identifiants de test créés

Si vous avez exécuté le script SQL avec les valeurs par défaut :

### Président
- **Username** : `presidente`
- **Password** : `presidente123`
- **Rôle** : `PRESIDENTE`

### Référent
- **Username** : `referente`
- **Password** : `referente123`
- **Rôle** : `REFERENTE`

⚠️ **Important** : Changez ces mots de passe après la première connexion !

## Permissions selon le rôle

### PRESIDENTE
- Accès au dashboard président
- Gestion des habilitaciones (demandes d'accès)
- Gestion des socios de son consulado
- Visualisation de son consulado
- Accès limité aux données de son consulado uniquement

### REFERENTE
- Accès similaire au président
- Gestion des socios de son consulado
- Visualisation de son consulado
- Accès limité aux données de son consulado uniquement

## Modifier un utilisateur existant

### Via l'interface
1. Allez dans "Usuarios"
2. Cliquez sur l'icône d'édition (crayon) sur la carte de l'utilisateur
3. Modifiez les champs nécessaires
4. Cliquez sur "Guardar"

### Via SQL
```sql
-- Modifier le rôle
UPDATE users 
SET role = 'PRESIDENTE'
WHERE username = 'nom_utilisateur';

-- Modifier le consulado
UPDATE users 
SET consulado_id = 'id_du_consulado'
WHERE username = 'nom_utilisateur';
```

## Dépannage

### L'utilisateur ne peut pas se connecter
1. Vérifiez que `active = true` dans la base de données
2. Vérifiez que le nom d'utilisateur et le mot de passe sont corrects
3. Vérifiez que le consulado_id est défini pour PRESIDENTE/REFERENTE

### Erreur "Consulado requis"
- Les rôles PRESIDENTE et REFERENTE nécessitent un `consulado_id`
- Assurez-vous qu'un consulado existe dans la base de données
- Assignez un consulado à l'utilisateur
