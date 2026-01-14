import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { GlassCard } from '../../components/GlassCard';
import { Ticket, Send, Trash2, Calendar, MapPin, AlertCircle, Clock, CheckCircle2, X, Search, Users, TrendingUp, ArrowLeft, Loader2 } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Match, Solicitud, Socio, Team, Competition } from '../../types';
import { formatDateDisplay } from '../../utils/dateFormat';
import { BocaLogoSVG } from '../../constants';

interface StagedSocio extends Socio {
    submissionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface ProcessedMatch extends Match {
  status: 'OPEN' | 'SCHEDULED' | 'CLOSED';
}

export const SolicitudesDeHabilitaciones = ({ consulado_id, consuladoName = '' }: { consulado_id: string, consuladoName?: string }) => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  
  // Fonction locale pour formater l'heure
  const formatHourDisplay = (hourStr: string) => {
    if (!hourStr) return '--:-- hs';
    const cleaned = hourStr.replace(/\s*hs\s*/i, '').trim();
    
    if (cleaned.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
      const [h, m] = cleaned.split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')} hs`;
    }
    
    if (cleaned.match(/^\d{1,2}:\d{2}$/)) {
      const [h, m] = cleaned.split(':');
      return `${h.padStart(2, '0')}:${m.padStart(2, '0')} hs`;
    }
    
    return `${cleaned} hs`;
  };
  
  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [stagedSocios, setStagedSocios] = useState<StagedSocio[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedRequests, setSubmittedRequests] = useState<Solicitud[]>([]);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showCancelAllModal, setShowCancelAllModal] = useState(false);
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [settings, setSettings] = useState(dataService.getAppSettings());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AL DÍA' | 'EN DEUDA' | 'DE BAJA'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  // Vérifier si la liste a été envoyée
  const isListSent = submittedRequests.length > 0 && submittedRequests.some(r => 
      r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED'
  );
  
  // Vérifier si une demande d'annulation est en cours
  const hasCancellationRequest = submittedRequests.some(r => r.cancellation_requested === true);

  // Statistiques calculées
  const stats = useMemo(() => {
    const total = submittedRequests.filter(r => !r.cancellation_requested).length;
    const approved = submittedRequests.filter(r => r.status === 'APPROVED').length;
    const rejected = submittedRequests.filter(r => r.status === 'REJECTED').length;
    const pending = submittedRequests.filter(r => r.status === 'PENDING').length;
    return { total, approved, rejected, pending };
  }, [submittedRequests]);

  // Fonction de parsing des dates
  const parseDate = (d: string, h: string): Date => {
    if (!d || !h) return new Date();
    const [day, month, year] = d.split('/').map(Number);
    const [hours, minutes] = h.replace('hs', '').trim().split(':').map(Number);
    return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1, hours || 0, minutes || 0);
  };

  // Charger les données du match et des socios
  useEffect(() => {
    if (!matchId) {
      navigate('/habilitaciones');
      return;
    }

    const loadData = () => {
      try {
        const matches = dataService.getMatches();
        
        // Décoder le matchId (peut être un UUID encodé ou un nombre)
        const decodedMatchId = decodeURIComponent(matchId);
        const isUUID = decodedMatchId.includes('-');
        
        let match: Match | undefined;
        
        if (isUUID) {
          // Si c'est un UUID, chercher par _originalId
          match = matches.find(m => {
            const matchAny = m as any;
            return matchAny._originalId === decodedMatchId || matchAny._originalId === matchId;
          });
        } else {
          // Si c'est un nombre, chercher par id
          const numericMatchId = parseInt(decodedMatchId, 10);
          if (isNaN(numericMatchId)) {
            console.error('❌ matchId invalide (ni UUID ni nombre):', matchId);
            navigate('/habilitaciones');
            return;
          }
          match = matches.find(m => {
            const mId = typeof m.id === 'string' ? parseInt(m.id, 10) : m.id;
            return mId === numericMatchId || mId === 0;
          });
        }

        if (!match) {
          console.error('❌ Match non trouvé pour matchId:', matchId);
          navigate('/habilitaciones');
          return;
        }

        const now = new Date();
        const ap = parseDate(match.apertura_date || '', match.apertura_hour || '');
        const ci = parseDate(match.cierre_date || '', match.cierre_hour || '');
        
        let status: 'OPEN' | 'SCHEDULED' | 'CLOSED' = 'CLOSED';
        if (now >= ap && now <= ci) status = 'OPEN';
        else if (now < ap) status = 'SCHEDULED';

        const processedMatch: ProcessedMatch = { ...match, status };
        setSelectedMatch(processedMatch);

        // Charger les socios du consulado
        const allSocios = consulado_id ? dataService.getSocios(consulado_id) : [];
        setSocios(allSocios);

        // Fonction helper pour créer un hash unique d'un UUID string en nombre (même fonction que dans confirmSubmit)
        const hashUUID = (uuid: string): number => {
          let hash = 0;
          for (let i = 0; i < uuid.length; i++) {
            const char = uuid.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir en 32-bit integer
          }
          return Math.abs(hash) % 2147483647; // Max safe integer
        };
        
        // Pour getSolicitudes, utiliser le hash de l'UUID si c'est un UUID, sinon utiliser match.id
        // IMPORTANT: Utiliser le même hash que lors de la création pour trouver les solicitudes
        const matchAny = match as any;
        const hasOriginalId = matchAny._originalId !== undefined && matchAny._originalId !== null;
        const isMatchUUID = typeof match.id === 'number' && match.id === 0 && hasOriginalId;
        
        let matchIdForRequests: number;
        if (isMatchUUID && typeof matchAny._originalId === 'string') {
          // Utiliser le même hash que lors de la création pour trouver les solicitudes
          matchIdForRequests = hashUUID(matchAny._originalId);
          console.log('🔑 Chargement solicitudes pour match avec UUID, hash utilisé:', matchIdForRequests, 'depuis UUID:', matchAny._originalId);
        } else {
          const solicitudesMatchId = typeof match.id === 'string' ? parseInt(match.id, 10) : match.id;
          matchIdForRequests = typeof solicitudesMatchId === 'number' && !isNaN(solicitudesMatchId) ? solicitudesMatchId : 0;
        }
        
        // Charger les requêtes existantes POUR CE MATCH (avec hash si UUID) ET CE CONSULADO UNIQUEMENT
        if (!consuladoName || !consuladoName.trim()) {
          console.error('❌ consuladoName manquant pour filtrer les solicitudes');
        }
        
        // Pour compatibilité : si c'est un UUID, chercher avec le hash ET avec 0 (anciennes solicitudes)
        let reqs: Solicitud[] = [];
        if (consuladoName && consuladoName.trim()) {
          // Chercher avec le hash (nouvelles solicitudes)
          const reqsWithHash = dataService.getSolicitudes(matchIdForRequests, consuladoName);
          // Si c'est un UUID (match_id = 0 dans l'interface mais hash dans les solicitudes), aussi chercher avec 0 pour compatibilité
          if (isMatchUUID) {
            const reqsWithZero = dataService.getSolicitudes(0, consuladoName);
            // Combiner et dédupliquer par id
            const allReqs = [...(Array.isArray(reqsWithHash) ? reqsWithHash : []), ...(Array.isArray(reqsWithZero) ? reqsWithZero : [])];
            const uniqueReqs = Array.from(new Map(allReqs.map(r => [r.id, r])).values());
            reqs = uniqueReqs;
          } else {
            reqs = Array.isArray(reqsWithHash) ? reqsWithHash : [];
          }
        } else {
          // Sans consuladoName, chercher normalement (ne devrait pas arriver)
          reqs = Array.isArray(dataService.getSolicitudes(matchIdForRequests)) ? dataService.getSolicitudes(matchIdForRequests) : [];
        }
        
        // FILTRAGE ADDITIONNEL: S'assurer que les solicitudes correspondent bien à ce match spécifique
        const filteredReqs = Array.isArray(reqs) ? reqs.filter(req => {
          // Vérifier que match_id correspond (hash pour nouvelles solicitudes, ou 0 pour anciennes si UUID)
          if (isMatchUUID) {
            // Pour UUID, accepter soit le hash, soit 0 (anciennes solicitudes)
            if (req.match_id !== matchIdForRequests && req.match_id !== 0) return false;
          } else {
            // Pour les matches normaux, vérifier l'égalité exacte
            if (req.match_id !== matchIdForRequests) return false;
          }
          // Vérifier que consulado correspond
          if (consuladoName && consuladoName.trim() && req.consulado !== consuladoName.trim()) return false;
          return true;
        }) : [];
        
        setSubmittedRequests(filteredReqs);

        // Vérifier si une cancellation a été approuvée et restaurer les socios précédemment sélectionnés
        // Si il n'y a plus de requêtes actives (pas de PENDING, APPROVED, REJECTED),
        // mais qu'il y avait des requêtes stockées dans localStorage, restaurer la liste
        // Utiliser le matchId original (UUID ou nombre) pour la clé localStorage
        const storedMatchId = isUUID ? decodedMatchId : (typeof match.id === 'number' ? match.id : parseInt(String(match.id), 10));
        const storedSociosKey = `habilitaciones_socios_${storedMatchId}_${consulado_id}`;
        const storedSociosIds = localStorage.getItem(storedSociosKey);
        
        // Si aucune requête active n'existe et qu'il y a des socios stockés, cela signifie que la cancellation a été approuvée
        const hasActiveRequests = filteredReqs && Array.isArray(filteredReqs) && filteredReqs.length > 0 && 
          filteredReqs.some(r => r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED');
        
        if (!hasActiveRequests && storedSociosIds) {
          try {
            const socioIdsArray: string[] = JSON.parse(storedSociosIds);
            const restoredSocios = allSocios.filter(s => s.id && socioIdsArray.includes(s.id));
            if (restoredSocios.length > 0) {
              setStagedSocios(restoredSocios);
              // Nettoyer le localStorage après restauration
              localStorage.removeItem(storedSociosKey);
            }
          } catch (error) {
            console.error('Erreur lors de la restauration des socios:', error);
          }
        }

        setTeams(dataService.getTeams());
        setCompetitions(dataService.getCompetitions());
      } catch (error) {
        console.error('❌ Erreur lors du chargement des données:', error);
        navigate('/habilitaciones');
      }
    };

    loadData();
    const unsubscribe = dataService.subscribe(loadData);
    
    // Recharger les solicitudes depuis Supabase toutes les 10 secondes pour vérifier en permanence
    const reloadSolicitudesFromDB = async () => {
      try {
        await dataService.reloadSolicitudes();
        // Recharger les données pour mettre à jour submittedRequests
        loadData();
      } catch (error) {
        console.error("❌ Erreur lors du rechargement des solicitudes:", error);
      }
    };
    
    // Recharger immédiatement au démarrage
    reloadSolicitudesFromDB();
    
    // Puis recharger toutes les 10 secondes
    const reloadInterval = setInterval(reloadSolicitudesFromDB, 10000);
    
    return () => {
      unsubscribe();
      clearInterval(reloadInterval);
    };
  }, [matchId, consulado_id, consuladoName, navigate]);

  const toggleStageSocio = (socio: Socio) => {
    if (!selectedMatch) return;
    // Bloquer si la liste est envoyée OU si une demande d'annulation est en cours
    if (isListSent || hasCancellationRequest) return;
    
    // Fonction helper pour créer un hash unique d'un UUID string en nombre (même fonction que dans confirmSubmit)
    const hashUUID = (uuid: string): number => {
      let hash = 0;
      for (let i = 0; i < uuid.length; i++) {
        const char = uuid.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir en 32-bit integer
      }
      return Math.abs(hash) % 2147483647; // Max safe integer
    };
    
    // Calculer le matchId pour la vérification : utiliser le hash de l'UUID si c'est un UUID, sinon match.id
    const selectedMatchAny = selectedMatch as any;
    const hasOriginalId = selectedMatchAny._originalId !== undefined && selectedMatchAny._originalId !== null;
    const isMatchUUID = typeof selectedMatch.id === 'number' && selectedMatch.id === 0 && hasOriginalId;
    
    let matchIdNum: number;
    if (isMatchUUID && typeof selectedMatchAny._originalId === 'string') {
      matchIdNum = hashUUID(selectedMatchAny._originalId);
    } else {
      matchIdNum = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
    }
    
    if (typeof matchIdNum !== 'number' || isNaN(matchIdNum)) {
      console.error('❌ matchIdNum invalide dans toggleStageSocio:', matchIdNum, 'depuis selectedMatch.id:', selectedMatch.id);
      return;
    }
    
    if (stagedSocios.find(s => s.id === socio.id)) {
      // Retirer le socio de la lista de envío
      setStagedSocios(prev => prev.filter(s => s.id !== socio.id));
    } else {
      // Vérifier les solicitudes existantes pour ce match (avec hash si UUID) ET ce consulado
      const existingRequest = submittedRequests.find(r => {
        // Vérifier que match_id correspond (hash pour nouvelles, ou 0 pour anciennes si UUID)
        const matchIdMatches = isMatchUUID 
          ? (r.match_id === matchIdNum || r.match_id === 0) // Compatibilité avec anciennes solicitudes
          : (r.match_id === matchIdNum);
        return r.socio_id === socio.id && 
               matchIdMatches &&
               r.consulado === consuladoName &&
               (r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED');
      });
      
      // Si une demande existe déjà (déjà envoyée), ne pas permettre d'ajouter à nouveau
      // SAUF si une demande d'annulation a été approuvée (dans ce cas, la demande n'existe plus)
      if (existingRequest && !hasCancellationRequest) {
        // Ne pas ajouter si déjà envoyé, mais le socio reste visible dans la liste
        return;
      }
      
      // Ajouter le socio à la lista de envío
      setStagedSocios(prev => [...prev, socio]);
    }
  };

  const confirmSubmit = async () => {
    if (!selectedMatch || stagedSocios.length === 0 || !consuladoName) {
      setShowConfirmSubmit(false);
      return;
    }
    
    // Bloquer l'envoi si une demande d'annulation est en cours
    if (hasCancellationRequest) {
      alert('No puede enviar nuevas solicitudes mientras hay una solicitud de anulación pendiente. Por favor, espere la respuesta de los administradores.');
      setShowConfirmSubmit(false);
      return;
    }
    
    try {
      // Fonction helper pour créer un hash unique d'un UUID string en nombre
      const hashUUID = (uuid: string): number => {
        let hash = 0;
        for (let i = 0; i < uuid.length; i++) {
          const char = uuid.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convertir en 32-bit integer
        }
        // Utiliser la valeur absolue et s'assurer que c'est un nombre positif
        return Math.abs(hash) % 2147483647; // Max safe integer pour éviter les problèmes
      };
      
      // Pour les matches avec UUID, créer un hash unique de l'UUID pour éviter que tous les matches avec UUID (match_id=0) partagent les mêmes solicitudes
      const selectedMatchAny = selectedMatch as any;
      const hasOriginalId = selectedMatchAny._originalId !== undefined && selectedMatchAny._originalId !== null;
      const isUUID = typeof selectedMatch.id === 'number' && selectedMatch.id === 0 && hasOriginalId;
      
      // Si c'est un UUID, créer un hash unique, sinon utiliser match.id normalement
      let matchIdNum: number;
      if (isUUID && typeof selectedMatchAny._originalId === 'string') {
        // Créer un hash unique de l'UUID pour ce match spécifique
        matchIdNum = hashUUID(selectedMatchAny._originalId);
        console.log('🔑 Match avec UUID détecté, hash créé:', matchIdNum, 'depuis UUID:', selectedMatchAny._originalId);
      } else {
        matchIdNum = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
      }
      
      if (typeof matchIdNum !== 'number' || isNaN(matchIdNum)) {
        console.error('❌ Match ID invalide:', selectedMatch.id);
        setShowConfirmSubmit(false);
        return;
      }
      
      // IMPORTANT: Pour les matches avec UUID, on doit aussi filtrer par _originalId dans getSolicitudes
      // Mais comme getSolicitudes filtre seulement par match_id (number), on utilise le hash pour distinguer
      if (!consuladoName || !consuladoName.trim()) {
        console.error('❌ consuladoName manquant lors de la création des solicitudes');
        setShowConfirmSubmit(false);
        return;
      }
      
      // Utiliser un Set pour éviter les doublons dans la liste des socios à envoyer
      const uniqueSocioIds = new Set<string>();
      const sociosToSend = stagedSocios.filter(socio => {
        if (!socio || !socio.id) {
          console.warn('⚠️ Socio invalide ignoré:', socio);
          return false;
        }
        
        // Vérifier si le socio est déjà dans le Set (doublon dans stagedSocios)
        if (uniqueSocioIds.has(socio.id)) {
          console.warn('⚠️ Socio en double ignoré dans stagedSocios:', socio.id, socio.name);
          return false;
        }
        
        // Vérifier les requêtes existantes pour ce match (avec hash si UUID) ET ce consulado uniquement
        const existingRequest = submittedRequests.find(r => 
          r.socio_id === socio.id && 
          r.match_id === matchIdNum &&
          r.consulado === consuladoName.trim() &&
          !r.cancellation_requested
        );
        
        if (existingRequest) {
          console.warn('⚠️ Solicitud déjà existante pour socio:', socio.id, socio.name);
          return false;
        }
        
        // Ajouter au Set et retourner true
        uniqueSocioIds.add(socio.id);
        return true;
      });
      
      // Envoyer les solicitudes pour les socios uniques
      for (const socio of sociosToSend) {
        await dataService.createSolicitud({
          id: crypto.randomUUID(),
          match_id: matchIdNum, // Utiliser le hash pour les UUIDs, match.id normalement
          socio_id: socio.id,
          socio_name: socio.name || `${socio.first_name || ''} ${socio.last_name || ''}`.trim(),
          socio_dni: socio.dni || '',
          socio_category: socio.category || 'ACTIVO',
          consulado: consuladoName.trim(), // IMPORTANT: toujours spécifier le consulado pour le filtrage
          status: 'PENDING',
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`✅ ${sociosToSend.length} solicitudes envoyées (${stagedSocios.length - sociosToSend.length} doublons ignorés)`);
      
      // Stocker les IDs des socios envoyés dans localStorage pour restauration ultérieure si cancellation approuvée
      // Utiliser le matchId original pour la clé (UUID si disponible, sinon le nombre)
      const matchWithAnyType = selectedMatch as any;
      const storedMatchId = (selectedMatch.id === 0 && matchWithAnyType._originalId) 
        ? matchWithAnyType._originalId 
        : matchIdNum;
      const socioIdsToStore = stagedSocios.map(s => s.id).filter(Boolean);
      if (socioIdsToStore.length > 0) {
        const storageKey = `habilitaciones_socios_${storedMatchId}_${consulado_id}`;
        localStorage.setItem(storageKey, JSON.stringify(socioIdsToStore));
      }

      // Recharger les données pour afficher la liste envoyée
      const loadData = async () => {
        await dataService.reloadSolicitudes();
        const reqs = dataService.getSolicitudes();
        const filteredReqs = Array.isArray(reqs) ? reqs.filter(r => {
          if (isUUID) {
            return (r.match_id === matchIdNum || r.match_id === 0) && r.consulado === consuladoName;
          }
          return r.match_id === matchIdNum && r.consulado === consuladoName;
        }) : [];
        setSubmittedRequests(filteredReqs);
      };
      await loadData();
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi des demandes:', error);
      setShowConfirmSubmit(false);
    }
  };

  const requestCancellation = async () => {
    if (!selectedMatch || submittedRequests.length === 0) {
      setShowCancelRequestModal(false);
      return;
    }
    
    try {
      for (const req of submittedRequests) {
        if (req && req.id) {
          // Marquer la solicitude comme ayant une demande d'annulation (sans changer le status)
          await dataService.updateCancellationRequested(req.id, true);
        }
      }
      
      // Utiliser match.id directement (peut être 0 pour UUIDs, ce qui est valide)
      const matchIdNum = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
      if (typeof matchIdNum !== 'number' || isNaN(matchIdNum)) {
        console.error('❌ Match ID invalide dans requestCancellation:', selectedMatch.id);
        setShowCancelRequestModal(false);
        return;
      }
      
      // Filtrer les requêtes POUR CE MATCH ET CE CONSULADO UNIQUEMENT
      if (!consuladoName || !consuladoName.trim()) {
        console.error('❌ consuladoName manquant pour filtrer les solicitudes lors de la cancellation');
        setShowCancelRequestModal(false);
        return;
      }
      const reqs = dataService.getSolicitudes(matchIdNum, consuladoName);
      
      // FILTRAGE ADDITIONNEL: S'assurer que les solicitudes correspondent bien à ce match spécifique
      const filteredReqs = Array.isArray(reqs) ? reqs.filter(req => {
        // Vérifier que match_id correspond exactement
        if (req.match_id !== matchIdNum) return false;
        // Vérifier que consulado correspond
        if (req.consulado !== consuladoName.trim()) return false;
        return true;
      }) : [];
      
      setSubmittedRequests(filteredReqs);
      setShowCancelRequestModal(false);
    } catch (error) {
      console.error('❌ Erreur lors de la demande d\'annulation:', error);
      setShowCancelRequestModal(false);
    }
  };

  const confirmClearStage = () => {
    setStagedSocios([]);
    setShowCancelAllModal(false);
  };

  // Obtenir le logo de Boca Juniors depuis la table teams
  const getBocaLogo = () => {
    const bocaTeam = teams.find(t => 
      t.name && (
        t.name.toLowerCase().includes('boca') || 
        t.name.toLowerCase().includes('club atlético boca juniors')
      )
    );
    return bocaTeam?.logo || null;
  };

  // Obtenir le logo de l'équipe rivale
  const getRivalLogo = (match: Match) => {
    const foundTeam = teams.find(t => 
      (match.rival_id && t.id === match.rival_id) || 
      (match.rival && t.name && t.name.trim().toLowerCase() === match.rival.trim().toLowerCase())
    ) || teams.find(t => 
      match.rival && t.name && (
        t.name.trim().toLowerCase().includes(match.rival.trim().toLowerCase()) ||
        match.rival.trim().toLowerCase().includes(t.name.trim().toLowerCase())
      )
    );
    return foundTeam?.logo || null;
  };

  // Obtenir le logo de la compétition
  const getCompetitionLogo = (match: Match) => {
    const foundComp = competitions.find(c => c.name === match.competition) || 
                     competitions.find(c => match.competition?.includes(c.name));
    return foundComp?.logo || null;
  };

  // Filtrer les socios
  const filteredSocios = useMemo(() => {
    if (!Array.isArray(socios)) return [];
    
    return socios.filter(s => {
      if (!s || !s.id) return false;
      
      try {
        // Exclure les socios qui sont déjà dans la lista de envío (stagedSocios)
        const isInStaged = stagedSocios.some(staged => staged && staged.id === s.id);
        if (isInStaged) return false;
        
        const searchLower = (searchQuery || '').toLowerCase();
        const matchesSearch = (s.name && s.name.toLowerCase().includes(searchLower)) || 
                             (s.numero_socio && s.numero_socio.includes(searchQuery)) ||
                             (s.dni && s.dni.includes(searchQuery));
        const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
        const matchesCategory = categoryFilter === 'ALL' || (s.category && s.category === categoryFilter);
        return matchesSearch && matchesStatus && matchesCategory;
      } catch (error) {
        console.error('❌ Erreur lors du filtrage d\'un socio:', error, s);
        return false;
      }
    });
  }, [socios, searchQuery, statusFilter, categoryFilter, stagedSocios]);

  // Catégories uniques pour le filtre
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(socios.map(s => s.category).filter(Boolean)));
  }, [socios]);

  if (!selectedMatch) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 animate-boca-entrance flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-8 text-center">
          <Loader2 className="mx-auto mb-4 text-[#003B94] animate-spin" size={40} />
          <p className="text-gray-600 font-bold">Cargando información del partido...</p>
        </GlassCard>
      </div>
    );
  }

  const rivalLogo = getRivalLogo(selectedMatch);
  const compLogo = getCompetitionLogo(selectedMatch);
  const isOpen = selectedMatch.status === 'OPEN';
  const isScheduled = selectedMatch.status === 'SCHEDULED';

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 animate-boca-entrance">
      {/* Header avec informations du match - Bandeau bleu foncé dégradé */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#001d4a] via-[#003B94] to-[#001d4a] shadow-2xl border border-white/10">
        {/* Effets de lumière animés en arrière-plan */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FCB131] rounded-full blur-[120px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#FCB131] rounded-full blur-[100px] opacity-15 animate-pulse"></div>
        </div>
        
        <div className="relative z-10 p-8">
          {/* Bouton retour */}
          <button
            onClick={() => navigate('/habilitaciones')}
            className="absolute top-6 left-6 p-3 rounded-xl transition-all duration-300 z-20 hover:scale-105 group"
            title="Volver"
          >
            <ArrowLeft size={20} className="text-[#FCB131] transition-transform group-hover:-translate-x-1" />
          </button>

          <div className="pl-16 pr-4">
            {/* Compétition et Fecha - Ligne du haut avec meilleur espacement */}
            <div className="flex items-center gap-4 mb-6">
              {compLogo && (
                <img 
                  src={compLogo} 
                  alt={selectedMatch.competition} 
                  className="h-10 w-10 object-contain" 
                />
              )}
              <div className="flex items-center gap-3">
                <span className="text-xl font-black uppercase text-white tracking-tight">
                  {selectedMatch.competition}
                </span>
                {selectedMatch?.fecha_jornada && (
                  <>
                    <span className="text-xl font-black text-white/40">•</span>
                    <span className="text-xl font-black uppercase text-white/90 tracking-tight">
                      {selectedMatch.fecha_jornada}
                    </span>
                  </>
                )}
              </div>
            </div>
            
            {/* Date, heure et stade - Sans fonds */}
            <div className="flex items-center gap-4 flex-wrap mb-6">
              {selectedMatch?.date && (
                <div className="flex items-center gap-2.5 transition-all duration-200 group">
                  <Calendar size={18} className="text-[#FCB131] group-hover:scale-110 transition-transform"/> 
                  <span className="text-sm font-bold uppercase text-white tracking-wide">{formatDateDisplay(selectedMatch.date)}</span>
                </div>
              )}
              {selectedMatch?.hour && (
                <div className="flex items-center gap-2.5 transition-all duration-200 group">
                  <Clock size={18} className="text-[#FCB131] group-hover:scale-110 transition-transform"/> 
                  <span className="text-sm font-bold uppercase text-white tracking-wide">{formatHourDisplay(selectedMatch.hour || '')}</span>
                </div>
              )}
              {selectedMatch?.venue && (
                <div className="flex items-center gap-2.5 transition-all duration-200 group">
                  <MapPin size={18} className="text-[#FCB131] group-hover:scale-110 transition-transform"/> 
                  <span className="text-sm font-bold uppercase text-white tracking-wide">{selectedMatch.venue}</span>
                </div>
              )}
            </div>
            
            {/* Logos des équipes - Sans fonds */}
            {selectedMatch?.rival && (
              <div className="flex items-center gap-6 mb-2">
                {/* Logo Boca Juniors */}
                <div className="w-20 h-20 flex items-center justify-center">
                  {getBocaLogo() ? (
                    <img 
                      src={getBocaLogo()!} 
                      alt="Boca Juniors" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <BocaLogoSVG className="w-full h-full" />
                  )}
                </div>
                
                {/* Séparateur moderne */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-0.5 h-8 bg-gradient-to-b from-white/40 to-transparent"></div>
                  <div className="w-2 h-2 rounded-full bg-[#FCB131] shadow-lg shadow-[#FCB131]/50"></div>
                  <div className="w-0.5 h-8 bg-gradient-to-t from-white/40 to-transparent"></div>
                </div>
                
                {/* Logo équipe adverse */}
                <div className="w-20 h-20 flex items-center justify-center">
                  {rivalLogo ? (
                    <img 
                      src={rivalLogo} 
                      alt={selectedMatch.rival} 
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs font-black italic text-white/50">
                        {selectedMatch.rival_short || selectedMatch.rival?.substring(0, 3).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenu : Liste des socios et Lista de Envío côte à côte */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Colonne gauche : Liste des socios */}
        <div className="space-y-3">
          {/* Barre de recherche et filtres */}
          <GlassCard className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[#001d4a] font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <Users size={14}/> Socios ({filteredSocios.length})
              </h3>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="w-full bg-white border-2 border-gray-200 rounded-lg py-2 pl-8 pr-3 outline-none text-xs font-bold text-[#001d4a] focus:border-[#003B94] transition-all" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-white border-2 border-gray-200 rounded-lg py-1.5 px-2 text-xs font-bold text-[#001d4a] focus:border-[#003B94] outline-none"
              >
                <option value="ALL">Todos</option>
                <option value="AL DÍA">Al Día</option>
                <option value="EN DEUDA">En Deuda</option>
                <option value="DE BAJA">De Baja</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full bg-white border-2 border-gray-200 rounded-lg py-1.5 px-2 text-xs font-bold text-[#001d4a] focus:border-[#003B94] outline-none"
              >
                <option value="ALL">Todas</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </GlassCard>
          
          {/* Liste des socios */}
          <GlassCard className="overflow-hidden p-0">
            {/* Bandeau d'information si une demande d'annulation est en cours */}
            {hasCancellationRequest && (
              <div className="p-3 bg-orange-50 border-b border-orange-200">
                <div className="flex items-center gap-2 text-orange-700">
                  <AlertCircle size={16} className="text-orange-600 animate-pulse" />
                  <p className="text-xs font-black uppercase">⚠️ Solicitud de Anulación Pendiente</p>
                </div>
                <p className="text-[9px] font-bold text-orange-600 mt-1">
                  Su solicitud de anulación está siendo revisada por los administradores. No puede realizar nuevas solicitudes hasta que sea procesada.
                </p>
              </div>
            )}
            
            {/* Bandeau d'information si la liste a été envoyée */}
            {isListSent && !hasCancellationRequest && (
              <div className="p-3 bg-emerald-50 border-b border-emerald-200">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <p className="text-xs font-black uppercase">Lista Enviada</p>
                </div>
                <p className="text-[9px] font-bold text-emerald-600 mt-1">
                  Los socios ya enviados están marcados. Solicite una cancelación para modificarla.
                </p>
              </div>
            )}
            
            {/* Liste des socios - TOUJOURS affichée, même si la liste a été envoyée */}
            {filteredSocios.length > 0 && selectedMatch ? (
              <div className={`max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-gray-100 ${isListSent && !hasCancellationRequest ? '' : ''}`}>
                {filteredSocios.map(socio => {
                  if (!socio || !socio.id || !selectedMatch) return null;
                  const isSelected = stagedSocios.some(s => s && s.id === socio.id);
                  
                  // Pour les matches avec UUID, utiliser le hash pour trouver les solicitudes
                  const matchAny = selectedMatch as any;
                  const hasOriginalId = matchAny._originalId !== undefined && matchAny._originalId !== null;
                  const isMatchUUID = typeof selectedMatch.id === 'number' && selectedMatch.id === 0 && hasOriginalId;
                  
                  let matchIdNum: number;
                  if (isMatchUUID && typeof matchAny._originalId === 'string') {
                    // Fonction helper pour créer un hash unique d'un UUID string en nombre
                    const hashUUID = (uuid: string): number => {
                      let hash = 0;
                      for (let i = 0; i < uuid.length; i++) {
                        const char = uuid.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash;
                      }
                      return Math.abs(hash) % 2147483647;
                    };
                    matchIdNum = hashUUID(matchAny._originalId);
                  } else {
                    matchIdNum = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
                  }
                  
                  if (isNaN(matchIdNum)) return null;
                  
                  // Vérifier les solicitudes existantes POUR CE MATCH ET CE CONSULADO UNIQUEMENT
                  const existingRequest = submittedRequests.find(r => {
                    if (!r || r.socio_id !== socio.id || r.consulado !== consuladoName) return false;
                    // Pour les matches avec UUID, chercher avec hash OU 0 (compatibilité)
                    if (isMatchUUID) {
                      return r.match_id === matchIdNum || r.match_id === 0;
                    }
                    return r.match_id === matchIdNum;
                  });
                  
                  const isAlreadySubmitted = existingRequest && 
                      (existingRequest.status === 'PENDING' || existingRequest.status === 'APPROVED' || existingRequest.status === 'REJECTED');
                  const isCancellationRequested = existingRequest && existingRequest.cancellation_requested === true;
                  
                  return (
                    <div 
                      key={socio.id} 
                      className={`p-3 transition-all duration-200 flex items-center justify-between ${
                        isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 
                        isAlreadySubmitted ? 'bg-emerald-50/50 border-l-4 border-emerald-400' : 
                        isCancellationRequested ? 'bg-amber-50/50 border-l-4 border-amber-400' :
                        'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        {/* Nom du socio */}
                        <p className={`text-xs font-bold truncate mb-1.5 ${
                          isSelected ? 'text-[#003B94]' : 
                          isAlreadySubmitted ? 'text-emerald-700' : 
                          isCancellationRequested ? 'text-amber-700' :
                          'text-[#001d4a]'
                        }`}>
                          <span className="uppercase">{socio.last_name || ''}</span>{socio.last_name && socio.first_name ? ' ' : ''}
                          <span className="capitalize">{socio.first_name?.toLowerCase() || ''}</span>
                          {!socio.last_name && !socio.first_name && (socio.name || 'Sin nombre')}
                        </p>
                        {/* Pastilles : Numéro de socio, Catégorie, Rôle */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Numéro de socio */}
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 border border-blue-300">
                            N° {socio.numero_socio || socio.dni || 'N/A'}
                          </span>
                          {/* Catégorie */}
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700 border border-purple-300">
                            {socio.category || 'N/A'}
                          </span>
                          {/* Rôle */}
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-300">
                            {socio.role || 'SOCIO'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-2">
                        {/* Si le socio a déjà été envoyé (dans submittedRequests), montrer "Ya enviado" */}
                        {isAlreadySubmitted ? (
                          <div className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center shadow-sm" title="Ya enviado">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                          </div>
                        ) : isCancellationRequested ? (
                          <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center shadow-sm" title="Cancelación solicitada">
                            <AlertCircle size={14} className="text-amber-600" />
                          </div>
                        ) : isSelected ? (
                          /* Le socio est dans stagedSocios (lista de envío) - toujours visible et retirable (sauf si liste envoyée) */
                          isListSent && !hasCancellationRequest ? (
                            /* Si la liste a été envoyée, le socio dans stagedSocios ne peut plus être retiré */
                            <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center shadow-sm" title="En lista de envío (ya enviada)">
                              <CheckCircle2 size={14} className="text-blue-600" />
                            </div>
                          ) : (
                            /* Liste non envoyée : permet de retirer le socio de stagedSocios */
                            <button 
                              onClick={() => toggleStageSocio(socio)}
                              className="w-8 h-8 rounded-full bg-[#003B94] border-2 border-[#003B94] flex items-center justify-center transition-all hover:bg-[#001d4a] hover:scale-110 shadow-md"
                              title="Retirar de la lista de envío"
                            >
                              <X size={14} className="text-white" />
                            </button>
                          )
                        ) : (
                          /* Le socio n'est pas dans stagedSocios - permet de l'ajouter (sauf si liste envoyée ou annulation en cours) */
                          <button
                            onClick={() => toggleStageSocio(socio)}
                            disabled={isListSent || hasCancellationRequest}
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${
                              isListSent || hasCancellationRequest
                                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                                : 'border-gray-300 hover:bg-blue-50 hover:border-[#003B94] hover:scale-110'
                            }`}
                            title={hasCancellationRequest ? "Solicitud de anulación pendiente" : (isListSent ? "Lista ya enviada" : "Agregar a la lista de envío")}
                          >
                            <Send size={12} className={`transition-colors ${
                              isListSent || hasCancellationRequest
                                ? 'text-gray-300'
                                : 'text-gray-400 group-hover:text-[#003B94]'
                            }`} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400">
                <Search size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold uppercase">No se encontraron socios</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Colonne droite : Lista de envío */}
        <div className="space-y-3">
          <GlassCard className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[#001d4a] font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <Send size={14}/> {hasCancellationRequest ? 'Anulación Pendiente' : (isListSent ? 'Lista Enviada' : 'Lista de Envío')}
              </h3>
              {stagedSocios.length > 0 && !isListSent && !hasCancellationRequest && (
                <button 
                  onClick={() => setShowCancelAllModal(true)} 
                  className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                  title="Vaciar"
                >
                  <Trash2 size={16}/>
                </button>
              )}
              {isListSent && !hasCancellationRequest && (
                <button 
                  onClick={() => setShowCancelRequestModal(true)} 
                  className="text-amber-600 hover:bg-amber-50 px-3 py-1 rounded-lg transition-all text-[10px] font-black uppercase tracking-widest border border-amber-300"
                >
                  Cancelar
                </button>
              )}
            </div>

            {hasCancellationRequest ? (
              <div className="text-center py-8">
                <AlertCircle size={32} className="mx-auto mb-2 text-orange-500 animate-pulse" />
                <p className="text-xs font-black uppercase text-orange-600 mb-1">⚠️ Solicitud de Anulación Pendiente</p>
                <p className="text-[9px] text-orange-600 mt-2 max-w-xs mx-auto">
                  Los administradores están revisando su solicitud de anulación. No puede realizar cambios hasta que sea procesada.
                </p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                    <div className="text-lg font-black text-blue-600">{stats?.pending ?? 0}</div>
                    <div className="text-[8px] font-bold text-blue-500 uppercase">Pendientes</div>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                    <div className="text-lg font-black text-emerald-600">{stats?.approved ?? 0}</div>
                    <div className="text-[8px] font-bold text-emerald-500 uppercase">Aprobados</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded border border-red-200">
                    <div className="text-lg font-black text-red-600">{stats?.rejected ?? 0}</div>
                    <div className="text-[8px] font-bold text-red-500 uppercase">Rechazados</div>
                  </div>
                </div>
              </div>
            ) : isListSent ? (
              <div className="text-center py-8">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-xs font-black uppercase text-[#001d4a] mb-1">Lista Enviada</p>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                    <div className="text-lg font-black text-blue-600">{stats?.pending ?? 0}</div>
                    <div className="text-[8px] font-black uppercase text-blue-600">Pendientes</div>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                    <div className="text-lg font-black text-emerald-600">{stats?.approved ?? 0}</div>
                    <div className="text-[8px] font-black uppercase text-emerald-600">Aprobados</div>
                  </div>
                  <div className="bg-red-50 p-2 rounded border border-red-200">
                    <div className="text-lg font-black text-red-600">{stats?.rejected ?? 0}</div>
                    <div className="text-[8px] font-black uppercase text-red-600">Rechazados</div>
                  </div>
                </div>
              </div>
            ) : (stagedSocios.length > 0) ? (
              <>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 mb-3">
                  {stagedSocios.map(socio => (
                    <div key={socio.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-lg flex items-center justify-between border border-blue-200">
                      <div className="flex-1 min-w-0">
                        {/* Nom du socio */}
                        <p className="text-xs font-bold text-[#001d4a] truncate mb-1.5">
                          <span className="uppercase">{socio.last_name || ''}</span>{socio.last_name && socio.first_name ? ' ' : ''}
                          <span className="capitalize">{socio.first_name?.toLowerCase() || ''}</span>
                          {!socio.last_name && !socio.first_name && (socio.name || 'Sin nombre')}
                        </p>
                        {/* Pastilles : Numéro de socio, Catégorie, Rôle */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Numéro de socio */}
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 border border-blue-300">
                            N° {socio.numero_socio || socio.dni || 'N/A'}
                          </span>
                          {/* Catégorie */}
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-purple-100 text-purple-700 border border-purple-300">
                            {socio.category || 'N/A'}
                          </span>
                          {/* Rôle */}
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-300">
                            {socio.role || 'SOCIO'}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => toggleStageSocio(socio)} 
                        className="text-gray-400 hover:text-red-500 transition-colors ml-2 p-1"
                        title="Retirar"
                      >
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setShowConfirmSubmit(true)} 
                  className="w-full bg-gradient-to-r from-[#003B94] to-[#001d4a] text-white py-3 rounded-lg font-black uppercase text-xs tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Send size={16} /> Enviar {stagedSocios.length} Solicitud{stagedSocios.length !== 1 ? 'es' : ''}
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle size={24} className="mx-auto mb-2 text-gray-400" />
                <p className="text-[10px] font-black uppercase text-gray-500 mb-1">Lista Vacía</p>
                <p className="text-[9px] text-gray-400">Seleccione socios</p>
              </div>
            )}
          </GlassCard>

          {/* Historial */}
          {submittedRequests.filter(r => {
            const mId = typeof selectedMatch?.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch?.id;
            return !r.cancellation_requested && 
                   r.match_id === mId && 
                   r.consulado === consuladoName;
          }).length > 0 && (
            <GlassCard className="p-3">
              <h4 className="text-[#003B94] font-black uppercase text-xs tracking-widest mb-2 flex items-center gap-2">
                <TrendingUp size={14} /> Historial
              </h4>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                {submittedRequests
                  .filter(req => {
                    const mId = typeof selectedMatch?.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch?.id;
                    return !req.cancellation_requested && 
                           req.match_id === mId && 
                           req.consulado === consuladoName;
                  })
                  .map(req => (
                    <div key={req.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200">
                      <span className="text-[10px] font-bold text-[#001d4a] truncate flex-1">{req.socio_name}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ml-2 ${
                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 
                        req.status === 'REJECTED' ? 'bg-red-100 text-red-700 border border-red-300' : 
                        'bg-amber-100 text-amber-700 border border-amber-300'
                      }`}>
                        {req.status === 'APPROVED' ? '✓' : req.status === 'REJECTED' ? '✗' : '⏳'}
                      </span>
                    </div>
                  ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Modales de confirmation */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl text-center border-2 border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-[#003B94] to-[#001d4a] rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
              <Send size={36} />
            </div>
            <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase mb-4">Confirmar Envío</h2>
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-5 mb-6">
              <p className="text-gray-800 text-sm font-bold uppercase tracking-wide mb-3 leading-relaxed">
                Se enviarán <strong className="text-[#001d4a] text-lg">{stagedSocios.length} solicitud{stagedSocios.length !== 1 ? 'es' : ''}</strong> para habilitación.
              </p>
              <div className="border-t-2 border-amber-300 pt-4 mt-4">
                <p className="text-amber-800 text-xs font-black uppercase tracking-wide leading-relaxed">
                  ⚠️ IMPORTANTE
                </p>
                <p className="text-amber-700 text-xs font-bold mt-2 leading-relaxed">
                  Una vez enviadas, las solicitudes <strong>NO podrán ser modificadas</strong> directamente.<br/>
                  Para agregar más socios, deberá <strong>solicitar una cancelación</strong> que será revisada por los administradores.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmSubmit(false)} 
                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-sm"
              >
                Revisar
              </button>
              <button 
                onClick={confirmSubmit} 
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#001d4a] to-[#003B94] text-white text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelAllModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl text-center border-2 border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner">
              <Trash2 size={36} />
            </div>
            <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase mb-3">Vaciar Lista</h2>
            <p className="text-gray-600 text-sm font-bold uppercase tracking-wide mb-6 leading-relaxed">
              ¿Está seguro que desea eliminar todos los socios de la lista de envío?<br/>
              Esta acción <strong className="text-red-600">no se puede deshacer</strong>.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelAllModal(false)} 
                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmClearStage} 
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
              >
                Eliminar Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelRequestModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl text-center border-2 border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-600 shadow-inner">
              <AlertCircle size={36} />
            </div>
            <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase mb-3">Solicitar Cancelación</h2>
            <p className="text-gray-600 text-sm font-bold uppercase tracking-wide mb-6 leading-relaxed">
              ¿Está seguro que desea solicitar la cancelación de todas las solicitudes enviadas?<br/>
              Esta solicitud será <strong className="text-amber-600">revisada por los administradores</strong> antes de ser aprobada.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelRequestModal(false)} 
                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-sm"
              >
                Revisar
              </button>
              <button 
                onClick={requestCancellation} 
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolicitudesDeHabilitaciones;
