# 📋 Guide - Système de Solicitudes (Demandes d'Habilitations)

## 🎯 Qu'est-ce qu'une Solicitud ?

Une **solicitud** est une demande d'habilitation faite par un socio (ou pour un socio) pour assister à un match. Le système gère tout le cycle de vie de ces demandes : création, approbation, rejet, annulation.

---

## 📊 Structure de la Table `solicitudes`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | UUID | Identifiant unique (généré automatiquement) |
| `match_id` | BIGINT | ID du match concerné |
| `socio_id` | UUID | ID du socio |
| `socio_name` | TEXT | Nom complet du socio |
| `socio_dni` | TEXT | DNI du socio |
| `socio_category` | TEXT | Catégorie (ACTIVO, ADHERENTE, etc.) |
| `consulado` | TEXT | Nom du consulado |
| `status` | TEXT | PENDING, APPROVED, REJECTED, CANCELLATION_REQUESTED |
| `timestamp` | TIMESTAMPTZ | Date et heure de la demande |
| `created_at` | TIMESTAMPTZ | Date de création |
| `updated_at` | TIMESTAMPTZ | Date de dernière modification |

---

## 🚀 Installation

### Étape 1 : Créer la table dans Supabase

1. Ouvrir Supabase Dashboard
2. Aller dans **SQL Editor**
3. Copier le contenu du fichier `CREATE_SOLICITUDES_TABLE.sql`
4. Exécuter le script
5. Vérifier que la table a été créée avec succès

### Étape 2 : Vérification

```sql
-- Vérifier que la table existe
SELECT * FROM public.solicitudes LIMIT 1;

-- Vérifier les politiques RLS
SELECT * FROM pg_policies WHERE tablename = 'solicitudes';
```

---

## 📱 Utilisation dans l'Application

### Pour les SUPERADMIN / ADMIN

**Pages disponibles :**
- `pages/Habilitaciones.tsx` - Gestion complète de toutes les habilitaciones
  - Vue de toutes les solicitudes
  - Filtres par match, consulado, statut
  - Approbation/Rejet en masse
  - Export PDF des habilitaciones

**Actions possibles :**
- ✅ Voir toutes les solicitudes
- ✅ Approuver des solicitudes
- ✅ Rejeter des solicitudes
- ✅ Supprimer des solicitudes
- ✅ Créer des solicitudes pour n'importe quel socio

### Pour les PRESIDENTE / REFERENTE

**Pages disponibles :**
- `pages/president/HabilitacionesPresident.tsx` - Vue des habilitaciones de leur consulado
- `pages/president/SolicitudesDeHabilitaciones.tsx` - Gestion des demandes

**Actions possibles :**
- ✅ Voir les solicitudes de leur consulado
- ✅ Créer des solicitudes pour les socios de leur consulado
- ✅ Modifier le statut des solicitudes de leur consulado
- ❌ Ne peuvent pas voir/modifier les solicitudes d'autres consulados

### Pour les SOCIO

**Actions possibles :**
- ✅ Voir leurs propres solicitudes
- ✅ Créer des solicitudes pour eux-mêmes
- ✅ Annuler leurs solicitudes (status → CANCELLATION_REQUESTED)
- ❌ Ne peuvent pas voir les solicitudes d'autres socios

---

## 🔄 Cycle de Vie d'une Solicitud

```
1. CRÉATION
   ↓
2. PENDING (En attente)
   ↓
   ├─→ APPROVED (Approuvé) ✅
   ├─→ REJECTED (Rejeté) ❌
   └─→ CANCELLATION_REQUESTED (Annulation demandée) 🔄
```

### Statuts disponibles

| Statut | Description | Qui peut le définir |
|--------|-------------|---------------------|
| `PENDING` | En attente d'approbation | Automatique à la création |
| `APPROVED` | Approuvé | ADMIN, PRESIDENTE, REFERENTE |
| `REJECTED` | Rejeté | ADMIN, PRESIDENTE, REFERENTE |
| `CANCELLATION_REQUESTED` | Annulation demandée | SOCIO (pour ses propres solicitudes) |

---

## 💻 Utilisation dans le Code

### Récupérer les solicitudes

```typescript
import { dataService } from '../services/dataService';

// Toutes les solicitudes
const allSolicitudes = dataService.getSolicitudes();

// Solicitudes pour un match spécifique
const matchSolicitudes = dataService.getSolicitudes(matchId);

// Solicitudes pour un consulado spécifique
const consuladoSolicitudes = dataService.getSolicitudes(undefined, 'Consulado Buenos Aires');

// Solicitudes pour un match ET un consulado
const filteredSolicitudes = dataService.getSolicitudes(matchId, 'Consulado Buenos Aires');

// Une solicitud par ID
const solicitud = dataService.getSolicitudById(solicitudId);
```

### Créer une solicitud

```typescript
import { dataService } from '../services/dataService';
import { Solicitud } from '../types';

const newSolicitud: Solicitud = {
  id: crypto.randomUUID(), // Généré automatiquement
  match_id: 123,
  socio_id: 'uuid-du-socio',
  socio_name: 'Juan Pérez',
  socio_dni: '12345678',
  socio_category: 'ACTIVO',
  consulado: 'Consulado Buenos Aires',
  status: 'PENDING',
  timestamp: new Date().toISOString()
};

await dataService.createSolicitud(newSolicitud);
```

### Mettre à jour le statut

```typescript
// Approuver une solicitud
await dataService.updateSolicitudStatus(solicitudId, 'APPROVED');

// Rejeter une solicitud
await dataService.updateSolicitudStatus(solicitudId, 'REJECTED');

// Demander l'annulation (par le socio)
await dataService.updateSolicitudStatus(solicitudId, 'CANCELLATION_REQUESTED');
```

### Supprimer une solicitud

```typescript
await dataService.deleteSolicitud(solicitudId);
```

---

## 🔒 Sécurité (Row Level Security)

La table `solicitudes` utilise RLS pour garantir que :

1. **SUPERADMIN / ADMIN** : Accès complet à toutes les solicitudes
2. **PRESIDENTE / REFERENTE** : Accès uniquement aux solicitudes de leur consulado
3. **SOCIO** : Accès uniquement à leurs propres solicitudes

Les politiques RLS sont automatiquement appliquées par Supabase, vous n'avez rien à faire dans le code.

---

## 📈 Statistiques et Rapports

### Compter les solicitudes par statut

```sql
SELECT 
  status,
  COUNT(*) as total
FROM public.solicitudes
GROUP BY status
ORDER BY total DESC;
```

### Solicitudes par consulado

```sql
SELECT 
  consulado,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
  COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
  COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected
FROM public.solicitudes
GROUP BY consulado
ORDER BY total DESC;
```

### Solicitudes par match

```sql
SELECT 
  m.rival,
  m.date,
  COUNT(s.*) as total_solicitudes,
  COUNT(*) FILTER (WHERE s.status = 'APPROVED') as approved
FROM public.solicitudes s
JOIN public.matches m ON s.match_id = m.id
GROUP BY m.id, m.rival, m.date
ORDER BY m.date DESC;
```

---

## 🐛 Dépannage

### La table n'existe pas

**Erreur :** `relation "solicitudes" does not exist`

**Solution :** Exécuter le script `CREATE_SOLICITUDES_TABLE.sql` dans Supabase SQL Editor

### Impossible de créer une solicitud

**Erreur :** Permission denied

**Solution :** Vérifier que :
1. L'utilisateur est authentifié
2. L'utilisateur a le bon rôle (dans la table `users`)
3. Les politiques RLS sont correctement configurées

### Les solicitudes ne s'affichent pas

**Solution :** 
1. Vérifier que la table contient des données : `SELECT * FROM solicitudes;`
2. Vérifier que l'utilisateur a les permissions de lecture
3. Vérifier les filtres appliqués dans l'interface

---

## 📝 Notes Importantes

1. **Synchronisation automatique** : Les solicitudes sont automatiquement synchronisées entre Supabase et le stockage local
2. **Temps réel** : Les changements sont propagés immédiatement à tous les utilisateurs connectés
3. **Sauvegarde** : Toutes les solicitudes sont stockées dans Supabase et peuvent être exportées
4. **Historique** : Les champs `created_at` et `updated_at` permettent de suivre l'historique

---

## 🆘 Support

Si vous rencontrez des problèmes :
1. Vérifier les logs dans la console du navigateur
2. Vérifier les logs dans Supabase Dashboard → Logs
3. Vérifier que toutes les tables nécessaires existent (socios, matches, consulados, users)
