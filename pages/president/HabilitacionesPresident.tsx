
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/GlassCard';
import { Ticket, Clock, MapPin, CheckCircle2, X, XCircle, AlertCircle } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Match, Solicitud, Team, Competition } from '../../types';
import { formatDateDisplay } from '../../utils/dateFormat';
import { BocaLogoSVG } from '../../constants';

interface ProcessedMatch extends Match {
  status: 'OPEN' | 'SCHEDULED' | 'CLOSED';
  _originalId?: string | number; // Pour gérer les UUIDs convertis en 0
}

export const HabilitacionesPresident = ({ consulado_id, consuladoName = '' }: { consulado_id: string, consuladoName?: string }) => {
  const navigate = useNavigate();
  const [availableMatches, setAvailableMatches] = useState<ProcessedMatch[]>([]);
  const [now, setNow] = useState(new Date());
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [settings, setSettings] = useState(dataService.getAppSettings());
  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [matchRequests, setMatchRequests] = useState<Solicitud[]>([]);
  const [localConsuladoName, setLocalConsuladoName] = useState<string>(consuladoName);

  // Récupérer le nom du consulado si pas fourni en prop
  useEffect(() => {
    if (!localConsuladoName && consulado_id) {
      const consulado = dataService.getConsuladoById(consulado_id);
      if (consulado?.name) {
        console.log('📍 Nom du consulado récupéré:', consulado.name);
        setLocalConsuladoName(consulado.name);
      } else {
        console.warn('⚠️ Consulado non trouvé pour ID:', consulado_id);
      }
    }
  }, [consulado_id, localConsuladoName]);

  // Fonction de parsing des dates
  const parseDate = (d: string, h: string) => {
      if (!d) return new Date(0);
      let day, month, year;
      
      if (d.includes('/')) {
          [day, month, year] = d.split('/').map(Number);
      } else if (d.includes('-')) {
          const parts = d.split('-');
          if (parts[0].length === 4) {
              [year, month, day] = parts.map(Number);
          } else {
              [day, month, year] = parts.map(Number);
          }
      } else {
          return new Date(0);
      }

      const cleanedHour = (h || '00:00').replace(/\s*hs\s*/i, '').trim();
      const [hours, minutes] = cleanedHour.split(':').map(Number);
      return new Date(year, month - 1, day, hours || 0, minutes || 0);
  };

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

  // Charger les données
  useEffect(() => {
      const loadMatches = () => {
          const matches = dataService.getMatches();
          const currentTime = new Date();
          setNow(currentTime);
          setTeams(dataService.getTeams());
          setCompetitions(dataService.getCompetitions());
          setSettings(dataService.getAppSettings());
          
          const eligibleMatches = matches.filter(m => {
              return m.apertura_date && m.cierre_date && m.apertura_hour && m.cierre_hour 
                  && !m.is_suspended && (m.is_home || m.is_neutral);
          });
          
          const processedMatches: ProcessedMatch[] = eligibleMatches.map(m => {
              try {
                  const openTime = parseDate(m.apertura_date!, m.apertura_hour!);
                  const closeTime = parseDate(m.cierre_date!, m.cierre_hour!);
                  
                  if (isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
                      return null;
                  }
                  
                  let status: 'OPEN' | 'SCHEDULED' | 'CLOSED' = 'CLOSED';
                  if (currentTime >= openTime && currentTime <= closeTime) {
                      status = 'OPEN';
                  } else if (currentTime < openTime) {
                      status = 'SCHEDULED';
                  }
                  
                  return { ...m, status };
              } catch (error) {
                  console.error(`❌ Erreur lors du parsing des dates pour le match ${m.id}:`, error);
                  return null;
              }
          }).filter((m): m is ProcessedMatch => m !== null)
            .sort((a, b) => {
                const priority = { 'OPEN': 0, 'SCHEDULED': 1, 'CLOSED': 2 };
                if (priority[a.status] !== priority[b.status]) {
                    return priority[a.status] - priority[b.status];
                }
                const dateA = parseDate(a.date, a.hour).getTime();
                const dateB = parseDate(b.date, b.hour).getTime();
                return dateA - dateB;
            });
          
          setAvailableMatches(processedMatches);
      };
      
      // Vérifier les solicitudes dans la base de données dès l'arrivée sur la page
      const loadSolicitudesFromDB = async () => {
          try {
              await dataService.reloadSolicitudes();
              console.log('✅ Solicitudes rechargées depuis la base de données');
          } catch (error) {
              console.error('❌ Erreur lors du rechargement des solicitudes:', error);
          }
      };
      
      // Charger immédiatement les solicitudes au démarrage
      loadSolicitudesFromDB();
      
      loadMatches();
      const unsub = dataService.subscribe(loadMatches);
      const interval = setInterval(loadMatches, 30000);
      
      // Recharger les solicitudes toutes les 15 secondes pour garder les boutons à jour
      const solicitudesInterval = setInterval(loadSolicitudesFromDB, 15000);
      
      return () => {
          unsub();
          clearInterval(interval);
          clearInterval(solicitudesInterval);
      };
  }, [consulado_id, localConsuladoName]);
  
  
  // Gérer l'ouverture du modal pour voir les demandes
  const handleViewRequests = async (match: ProcessedMatch) => {
    console.log('🚀 handleViewRequests appelé avec:', match);
    if (!match) {
      console.error('❌ Match est null/undefined dans handleViewRequests');
      alert('Error: Match no válido');
      return;
    }
    
    try {
      // ✅ Vérifier que localConsuladoName est disponible, sinon le récupérer
      let currentConsuladoName = localConsuladoName;
      if (!currentConsuladoName || currentConsuladoName.trim() === '') {
        console.log('⚠️ localConsuladoName vide, tentative de récupération...');
        if (consulado_id) {
          const consulado = dataService.getConsuladoById(consulado_id);
          if (consulado?.name) {
            currentConsuladoName = consulado.name;
            setLocalConsuladoName(currentConsuladoName);
            console.log('✅ Nom du consulado récupéré:', currentConsuladoName);
          } else {
            console.error('❌ Impossible de récupérer le nom du consulado');
            alert('Error: Nombre del consulado no disponible. Por favor, recargue la página.');
            return;
          }
        } else {
          console.error('❌ consulado_id manquant');
          alert('Error: ID del consulado no disponible. Por favor, recargue la página.');
          return;
        }
      }
      
      console.log('🏛️ Consulado:', currentConsuladoName);
      
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
      
      // Accéder à _originalId pour les UUIDs
      const matchAny = match as any;
      const hasOriginalId = matchAny._originalId !== undefined && matchAny._originalId !== null;
      const isMatchUUID = typeof match.id === 'number' && match.id === 0 && hasOriginalId;
      
      // Calculer le matchId pour getSolicitudes
      let solicitudesMatchId: number;
      if (isMatchUUID && typeof matchAny._originalId === 'string') {
        solicitudesMatchId = hashUUID(matchAny._originalId);
        console.log('🔑 UUID hash calculé:', solicitudesMatchId);
      } else {
        solicitudesMatchId = match.id;
        console.log('🔑 Match ID normal:', solicitudesMatchId);
      }
      
      // Charger les solicitudes depuis la base de données
      console.log('📥 Rechargement des solicitudes depuis Supabase...');
      await dataService.reloadSolicitudes();
      
      // Récupérer les solicitudes pour ce match
      const allSolicitudes = dataService.getSolicitudes(solicitudesMatchId);
      console.log('📋 Solicitudes trouvées pour match_id', solicitudesMatchId, ':', Array.isArray(allSolicitudes) ? allSolicitudes.length : 0);
      
      // Filtrer par consulado (utiliser currentConsuladoName qui est garanti d'être valide)
      let filteredRequests = Array.isArray(allSolicitudes) 
        ? allSolicitudes.filter(r => {
            const matches = r.consulado && r.consulado.trim() === currentConsuladoName.trim();
            if (!matches && r.consulado) {
              console.log('🔍 Consulado ne correspond pas:', r.consulado, 'vs', currentConsuladoName);
            }
            return matches;
          })
        : [];
      console.log('🔍 Solicitudes filtrées par consulado:', filteredRequests.length);
      
      // Pour compatibilité avec les anciennes solicitudes (match_id = 0)
      if (isMatchUUID) {
        const oldSolicitudes = dataService.getSolicitudes(0);
        const oldFiltered = Array.isArray(oldSolicitudes)
          ? oldSolicitudes.filter(r => r.consulado && r.consulado.trim() === currentConsuladoName.trim())
          : [];
        filteredRequests.push(...oldFiltered);
        console.log('📋 + anciennes solicitudes:', oldFiltered.length);
      }
      
      // Dédupliquer par ID
      const uniqueRequests = Array.from(new Map(filteredRequests.map(r => [r.id, r])).values());
      console.log('✅ Solicitudes uniques:', uniqueRequests.length);
      
      if (uniqueRequests.length === 0) {
        console.warn('⚠️ Aucune solicitude trouvée pour ce match et ce consulado');
      }
      
      setMatchRequests(uniqueRequests);
      setSelectedMatch(match);
      console.log('✅ Modal ouvert avec', uniqueRequests.length, 'solicitudes');
    } catch (error) {
      console.error('❌ Erreur dans handleViewRequests:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
      alert('Error al cargar los resultados. Por favor, intente nuevamente.');
    }
  };
  
  // Gérer la navigation vers la page de solicitudes (fonction conservée pour compatibilité mais non utilisée directement)
  const handleSolicitarHabilitaciones = (match: ProcessedMatch) => {
    console.log('🚀 handleSolicitarHabilitaciones appelé avec:', match);
    if (!match) {
      console.error('❌ Match est null/undefined dans handleSolicitarHabilitaciones');
      alert('Erreur: Match invalide');
      return;
    }
    // match.id est de type number selon l'interface Match, mais peut être 0 (valide pour UUIDs)
    if (typeof match.id !== 'number' || isNaN(match.id)) {
      console.error('❌ match.id est invalide dans handleSolicitarHabilitaciones:', match.id);
      alert('Erreur: ID du match invalide');
      return;
    }
    // Accéder à _originalId si disponible (pour les UUIDs)
    const matchAny = match as any;
    const routeIdentifier = (match.id === 0 && matchAny._originalId) 
      ? encodeURIComponent(String(matchAny._originalId))
      : String(match.id);
    const routePath = `/habilitaciones/solicitudes/${routeIdentifier}`;
    console.log('🔄 Navigation vers:', routePath);
    try {
      navigate(routePath);
      console.log('✅ Navigate appelé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la navigation:', error);
      alert('Erreur lors de la navigation. Veuillez réessayer.');
    }
  };

  // Gérer la demande de cancellation
  const handleSolicitarCancelacion = async (match: ProcessedMatch) => {
    console.log('🔴🔴🔴 ========================================');
    console.log('🔴 DÉBUT handleSolicitarCancelacion');
    console.log('🔴 Match reçu:', JSON.stringify(match, null, 2));
    console.log('🔴 consulado_id:', consulado_id);
    console.log('🔴 localConsuladoName:', localConsuladoName);
    console.log('🔴🔴🔴 ========================================');
    
    if (!match) {
      console.error('❌ Match est null/undefined dans handleSolicitarCancelacion');
      alert('Error: Partido no disponible. Por favor, recargue la página.');
      return;
    }
    
    console.log('✅ Match valide, type match.id:', typeof match.id, 'valeur:', match.id);
    
    // match.id est de type number selon l'interface Match, mais peut être 0 (valide pour UUIDs)
    if (typeof match.id !== 'number' || isNaN(match.id)) {
      console.error('❌ match.id est invalide dans handleSolicitarCancelacion:', match.id);
      alert('Error: ID del partido inválido. Por favor, recargue la página.');
      return;
    }
    
    console.log('✅ match.id valide');

    // ✅ Vérifier que localConsuladoName est disponible AVANT de continuer
    let currentConsuladoName = localConsuladoName;
    if (!currentConsuladoName || currentConsuladoName.trim() === '') {
      console.log('⚠️ localConsuladoName vide, tentative de récupération...');
      if (consulado_id) {
        const consulado = dataService.getConsuladoById(consulado_id);
        if (consulado?.name) {
          currentConsuladoName = consulado.name;
          setLocalConsuladoName(currentConsuladoName);
          console.log('✅ Nom du consulado récupéré:', currentConsuladoName);
        } else {
          console.error('❌ Impossible de récupérer le nom du consulado');
          alert('Error: Nombre del consulado no disponible. Por favor, recargue la página.');
          return;
        }
      } else {
        console.error('❌ consulado_id manquant');
        alert('Error: ID del consulado no disponible. Por favor, recargue la página.');
        return;
      }
    }
    
    // Fonction helper pour créer un hash unique d'un UUID string en nombre (même fonction que dans le map)
    const hashUUID = (uuid: string): number => {
      let hash = 0;
      for (let i = 0; i < uuid.length; i++) {
        const char = uuid.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir en 32-bit integer
      }
      return Math.abs(hash) % 2147483647; // Max safe integer
    };
    
    // Accéder à _originalId pour les UUIDs
    const matchAny = match as any;
    const hasOriginalId = matchAny._originalId !== undefined && matchAny._originalId !== null;
    const isMatchUUID = typeof match.id === 'number' && match.id === 0 && hasOriginalId;
    
    // Calculer le matchId pour getSolicitudes : utiliser le hash de l'UUID si c'est un UUID, sinon match.id
    let solicitudesMatchId: number;
    if (isMatchUUID && typeof matchAny._originalId === 'string') {
      solicitudesMatchId = hashUUID(matchAny._originalId);
      console.log('🔑 Cancellation pour match avec UUID, hash utilisé:', solicitudesMatchId, 'depuis UUID:', matchAny._originalId);
    } else {
      solicitudesMatchId = match.id;
    }

    console.log('🔔 Affichage de la confirmation...');
    const confirmed = window.confirm('¿Está seguro que desea solicitar la cancelación de todas las solicitudes enviadas para este partido? Esta solicitud será revisada por los administradores.');
    console.log('🔔 Utilisateur a confirmé:', confirmed);
    
    if (!confirmed) {
      console.log('❌ Utilisateur a annulé');
      return;
    }

    console.log('✅ Confirmation OK, début du traitement...');

    try {
      // Recharger d'abord les solicitudes depuis la base de données
      console.log('📥 Rechargement des solicitudes depuis Supabase...');
      await dataService.reloadSolicitudes();
      console.log('✅ Solicitudes rechargées');
      
      // Utiliser currentConsuladoName qui est maintenant garanti d'être valide
      console.log('🏛️ Filtrage avec consulado:', currentConsuladoName);
      console.log('🔑 Match ID pour filtrage:', solicitudesMatchId);
      console.log('🔍 UUID match:', isMatchUUID);
      
      // Pour compatibilité : si c'est un UUID, chercher avec le hash ET avec 0 (anciennes solicitudes)
      let matchRequests: Solicitud[] = [];
      
      if (isMatchUUID) {
        // Chercher avec le hash (nouvelles solicitudes)
        const reqsWithHash = dataService.getSolicitudes(solicitudesMatchId, currentConsuladoName);
        console.log('📋 Solicitudes avec hash:', Array.isArray(reqsWithHash) ? reqsWithHash.length : 0);
        
        // Aussi chercher avec 0 pour compatibilité avec anciennes solicitudes
        const reqsWithZero = dataService.getSolicitudes(0, currentConsuladoName);
        console.log('📋 Solicitudes avec match_id=0:', Array.isArray(reqsWithZero) ? reqsWithZero.length : 0);
        
        // Combiner et dédupliquer par id
        const allReqs = [
          ...(Array.isArray(reqsWithHash) ? reqsWithHash : []), 
          ...(Array.isArray(reqsWithZero) ? reqsWithZero : [])
        ];
        const uniqueReqs = Array.from(new Map(allReqs.map(r => [r.id, r])).values());
        matchRequests = uniqueReqs;
      } else {
        // Pour les matches normaux (non-UUID), utiliser match.id directement
        matchRequests = dataService.getSolicitudes(solicitudesMatchId, currentConsuladoName);
        matchRequests = Array.isArray(matchRequests) ? matchRequests : [];
      }
      
      console.log('📊 Total solicitudes avant filtrage additionnel:', matchRequests.length);
      
      // FILTRAGE ADDITIONNEL: S'assurer que les solicitudes correspondent bien à ce match spécifique
      const filteredReqs = matchRequests.filter(req => {
        // Pour UUID, accepter soit le hash, soit 0 (anciennes solicitudes)
        if (isMatchUUID) {
          if (req.match_id !== solicitudesMatchId && req.match_id !== 0) {
            console.log('🔍 Rejet: match_id', req.match_id, 'ne correspond pas à', solicitudesMatchId, 'ou 0');
            return false;
          }
        } else {
          // Pour les matches normaux, vérifier l'égalité exacte
          if (req.match_id !== solicitudesMatchId) {
            console.log('🔍 Rejet: match_id', req.match_id, 'ne correspond pas à', solicitudesMatchId);
            return false;
          }
        }
        
        // Vérifier que consulado correspond
        if (req.consulado?.trim() !== currentConsuladoName.trim()) {
          console.log('🔍 Rejet: consulado', req.consulado, 'ne correspond pas à', currentConsuladoName);
          return false;
        }
        
        console.log('✅ Accepté:', req.id, '- Socio:', req.socio_name, '- Status:', req.status);
        return true;
      });
      
      console.log('📊 Total solicitudes après filtrage:', filteredReqs.length);
      
      if (filteredReqs.length === 0) {
        console.warn('⚠️ Aucune solicitude trouvée pour ce match et ce consulado');
        console.warn('⚠️ Détails:', { 
          matchId: solicitudesMatchId, 
          consulado: currentConsuladoName,
          isUUID: isMatchUUID,
          totalSolicitudesInDataService: dataService.getSolicitudes().length
        });
        alert('No se encontraron solicitudes para cancelar. Asegúrese de haber enviado solicitudes primero.');
        return;
      }

      console.log(`✅ ${filteredReqs.length} solicitudes trouvées, marquage en cours...`);
      
      // Marquer chaque solicitude comme ayant une demande d'annulation
      let successCount = 0;
      let errorCount = 0;
      
      for (const req of filteredReqs) {
        if (req && req.id) {
          try {
            console.log('🔄 Marquage cancellation_requested=true pour:', req.id);
            await dataService.updateCancellationRequested(req.id, true);
            successCount++;
            console.log('✅ Marqué:', req.socio_name);
          } catch (err) {
            errorCount++;
            console.error('❌ Erreur pour:', req.id, err);
          }
        }
      }
      
      console.log(`✅ Marquage terminé: ${successCount} réussies, ${errorCount} erreurs`);
      
      // Recharger les solicitudes pour mettre à jour l'affichage
      await dataService.reloadSolicitudes();
      console.log('✅ Solicitudes rechargées');
      
      // Message de confirmation
      if (successCount > 0) {
        alert(`Solicitud de cancelación enviada con éxito para ${successCount} socio(s). Los administradores revisarán su solicitud.`);
      } else {
        alert('Error: No se pudo marcar ninguna solicitud para cancelación.');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la demande d\'annulation:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
      alert('Error al solicitar la cancelación. Por favor, intente nuevamente.');
    }
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
  
  // Rendre la liste des matchs
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 px-4 animate-boca-entrance">
        {/* Header amélioré */}
        <GlassCard variant="dark" className="p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><Ticket size={240} /></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="oswald text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-2">
                        Solicitar Habilitaciones
                    </h1>
                    <p className="text-[#FCB131] text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2">
                        <Ticket size={14} /> Seleccione un Partido
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                        <div className="text-[8px] font-black uppercase tracking-widest text-white/60 mb-1">Partidos Disponibles</div>
                        <div className="text-2xl font-black text-[#FCB131]">{availableMatches.filter(m => m.status !== 'CLOSED').length}</div>
                    </div>
                </div>
            </div>
        </GlassCard>
        
        {availableMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                {availableMatches.map(match => {
                    // Vérifier que match existe
                    if (!match) {
                      console.warn('⚠️ Match invalide dans le map:', match);
                      return null;
                    }
                    
                    // match.id est de type number selon l'interface Match, mais peut être 0 (valide pour UUIDs)
                    if (typeof match.id !== 'number' || isNaN(match.id)) {
                      console.warn('⚠️ match.id invalide dans le map:', match.id);
                      return null;
                    }
                    
                    const isOpen = match.status === 'OPEN';
                    const isScheduled = match.status === 'SCHEDULED';
                    
                    // Fonction helper pour créer un hash unique d'un UUID string en nombre (même fonction que dans SolicitudesDeHabilitaciones)
                    const hashUUID = (uuid: string): number => {
                      let hash = 0;
                      for (let i = 0; i < uuid.length; i++) {
                        const char = uuid.charCodeAt(i);
                        hash = ((hash << 5) - hash) + char;
                        hash = hash & hash; // Convertir en 32-bit integer
                      }
                      return Math.abs(hash) % 2147483647; // Max safe integer
                    };
                    
                    // Accéder à _originalId pour les UUIDs
                    const matchAny = match as any;
                    const hasOriginalId = matchAny._originalId !== undefined && matchAny._originalId !== null;
                    const isMatchUUID = typeof match.id === 'number' && match.id === 0 && hasOriginalId;
                    
                    // Pour la navigation : utiliser _originalId si match.id === 0 (UUID), sinon match.id
                    // Pour getSolicitudes : utiliser le hash de l'UUID si c'est un UUID, sinon match.id
                    const matchId = typeof match.id === 'string' ? parseInt(match.id, 10) : match.id;
                    
                    // Vérifier que matchId est valide (peut être 0 pour UUIDs)
                    if (typeof matchId !== 'number' || isNaN(matchId)) {
                      console.warn('⚠️ matchId invalide pour le match:', match.id, 'matchId calculé:', matchId);
                      return null;
                    }
                    
                    // Identifier pour la route : utiliser _originalId si disponible et match.id === 0, sinon match.id
                    const routeIdentifier = (match.id === 0 && hasOriginalId) 
                        ? encodeURIComponent(String(matchAny._originalId))
                        : String(matchId);
                    
                    // Calculer le matchId pour getSolicitudes : utiliser le hash de l'UUID si c'est un UUID, sinon match.id
                    let solicitudesMatchId: number;
                    if (isMatchUUID && typeof matchAny._originalId === 'string') {
                      // Utiliser le même hash que lors de la création des solicitudes pour trouver les solicitudes existantes
                      solicitudesMatchId = hashUUID(matchAny._originalId);
                    } else {
                      solicitudesMatchId = matchId;
                    }
                    
                    // Vérifier les requêtes existantes pour CE MATCH (avec hash si UUID) ET CE CONSULADO UNIQUEMENT
                    // IMPORTANT: Filtrer toujours par consulado pour éviter que les matches avec UUID partagent les mêmes solicitudes
                    if (!localConsuladoName || !localConsuladoName.trim()) {
                      console.warn('⚠️ localConsuladoName manquant pour filtrer les solicitudes du match:', solicitudesMatchId);
                    }
                    
                    // Pour compatibilité : si c'est un UUID, chercher avec le hash ET avec 0 (anciennes solicitudes)
                    let matchRequests: Solicitud[] = [];
                    if (localConsuladoName && localConsuladoName.trim()) {
                      // Chercher avec le hash (nouvelles solicitudes)
                      const reqsWithHash = dataService.getSolicitudes(solicitudesMatchId, localConsuladoName);
                      // Si c'est un UUID, aussi chercher avec 0 pour compatibilité avec anciennes solicitudes
                      if (isMatchUUID) {
                        const reqsWithZero = dataService.getSolicitudes(0, localConsuladoName);
                        // Combiner et dédupliquer par id
                        const allReqs = [...(Array.isArray(reqsWithHash) ? reqsWithHash : []), ...(Array.isArray(reqsWithZero) ? reqsWithZero : [])];
                        const uniqueReqs = Array.from(new Map(allReqs.map(r => [r.id, r])).values());
                        matchRequests = uniqueReqs;
                      } else {
                        matchRequests = Array.isArray(reqsWithHash) ? reqsWithHash : [];
                      }
                    } else {
                      matchRequests = Array.isArray(dataService.getSolicitudes(solicitudesMatchId)) ? dataService.getSolicitudes(solicitudesMatchId) : [];
                    }
                    
                    // FILTRAGE ADDITIONNEL: S'assurer que les solicitudes correspondent bien à ce match spécifique
                    const filteredMatchRequests = Array.isArray(matchRequests) ? matchRequests.filter(req => {
                      // Vérifier que match_id correspond (hash pour nouvelles solicitudes, ou 0 pour anciennes si UUID)
                      if (isMatchUUID) {
                        // Pour UUID, accepter soit le hash, soit 0 (anciennes solicitudes créées avant le hash)
                        if (req.match_id !== solicitudesMatchId && req.match_id !== 0) return false;
                      } else {
                        // Pour les matches normaux, vérifier l'égalité exacte
                        if (req.match_id !== solicitudesMatchId) return false;
                      }
                      // Vérifier que consulado correspond
                      if (localConsuladoName && localConsuladoName.trim() && req.consulado !== localConsuladoName.trim()) return false;
                      return true;
                    }) : [];
                    
                    // Vérifier si la liste a été envoyée (PENDING, APPROVED, REJECTED)
                    const hasListSent = filteredMatchRequests.some(r => 
                        r && (r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED')
                    );
                    
                    // Vérifier si une cancellation est en cours
                    const hasCancellationRequest = filteredMatchRequests.some(r => r.cancellation_requested === true);
                    
                    // Vérifier si les admins ont traité les demandes (au moins une APPROVED ou REJECTED)
                    const hasProcessedRequests = filteredMatchRequests.some(r => 
                        r.status === 'APPROVED' || r.status === 'REJECTED'
                    );
                    
                    // Vérifier si toutes les demandes sont encore PENDING (sans demande d'annulation)
                    const allPending = filteredMatchRequests.length > 0 && 
                        filteredMatchRequests.every(r => r.status === 'PENDING' && !r.cancellation_requested);
                    
                    // Si la cancellation a été approuvée (pas de CANCELLATION_REQUESTED et pas de requêtes actives), on peut à nouveau solicitar
                    const canSolicitarAgain = hasListSent && !hasCancellationRequest && 
                        filteredMatchRequests.length === 0;
                    
                    // ✅ CORRECTION: Afficher le bouton de cancelación dès qu'une liste est envoyée, 
                    // PEU IMPORTE le statut (PENDING, APPROVED, REJECTED)
                    // La demande d'annulation peut avoir lieu même après traitement par les admins
                    const shouldShowCancelButton = hasListSent && !hasCancellationRequest;
                    
                    // Afficher le bouton "Ver Resultados" si les admins ont traité les demandes
                    const shouldShowViewResults = hasListSent && !hasCancellationRequest && hasProcessedRequests;
                    
                    const rivalLogo = getRivalLogo(match);
                    const compLogo = getCompetitionLogo(match);
                    
                    return (
                      <GlassCard
                        key={match.id || `match-${matchId}`}
                        className={`relative overflow-hidden h-full ${
                          isOpen 
                              ? 'liquid-glass-dark text-white border-2 border-[#FCB131]/40 shadow-[0_0_30px_rgba(252,177,49,0.2)]' 
                              : isScheduled
                              ? 'bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 text-[#003B94] shadow-lg'
                              : 'bg-gray-50 border-2 border-gray-200 text-gray-500 opacity-60 cursor-not-allowed'
                        } ${match.status === 'CLOSED' ? '' : 'hover:scale-[1.02] hover:shadow-2xl'}`}
                      >
                        {/* Background pattern pour OPEN */}
                        {isOpen && (
                          <div className="absolute inset-0 opacity-5">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FCB131] rounded-full blur-[100px]"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400 rounded-full blur-[80px]"></div>
                          </div>
                        )}
                        
                        <div className="relative z-10 p-2.5">
                          {/* Compétition et Fecha - Centrées en haut */}
                          <div className="flex flex-col items-center mb-1.5">
                            {/* Competition avec logo */}
                            <div className="flex items-center gap-1.5 justify-center mb-0.5">
                              {compLogo && (
                                <img src={compLogo} alt={match.competition} className="w-4 h-4 object-contain" />
                              )}
                              <p className={`text-[9px] font-bold uppercase ${isOpen ? 'text-white/70' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>
                                {match.competition}
                              </p>
                            </div>
                            
                            {/* Fecha/Jornada sous la compétition */}
                            {match.fecha_jornada && (
                              <div className={`flex items-center justify-center ${isOpen ? 'text-white/80' : isScheduled ? 'text-[#003B94]/80' : 'text-gray-400'}`}>
                                <span className="text-[9px] font-bold uppercase">
                                  {match.fecha_jornada}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Badges de statut - À gauche */}
                          <div className="flex justify-between items-start mb-1 flex-wrap gap-1.5">
                            <div className="flex gap-1.5 flex-wrap">
                              {isOpen && (
                                <span className="bg-[#FCB131] text-[#001d4a] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase animate-pulse flex items-center gap-1 shadow-lg border border-[#001d4a]/20">
                                  <Ticket size={10} strokeWidth={3} /> ABIERTO
                                </span>
                              )}
                              {isScheduled && (
                                <span className="bg-blue-100 text-[#003B94] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border-2 border-blue-300 shadow-sm">
                                  <Clock size={10} strokeWidth={3} /> PROGRAMADO
                                </span>
                              )}
                              {match.status === 'CLOSED' && (
                                <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 border border-gray-300">
                                  CERRADO
                                </span>
                              )}
                            </div>
                            {shouldShowCancelButton && (
                              <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase shadow-md border border-emerald-600">
                                <CheckCircle2 size={9} className="inline mr-0.5" /> Enviadas
                              </span>
                            )}
                          </div>
                          
                          {/* Logos des équipes */}
                          <div className="flex items-center justify-center gap-3 mb-1.5 py-1">
                            {/* Logo Boca */}
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-14 h-14 flex items-center justify-center">
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
                              <span className={`text-[8px] font-black uppercase ${isOpen ? 'text-white/90' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`}>
                                Boca
                              </span>
                            </div>
                            
                            {/* VS */}
                            <div className="flex flex-col items-center">
                              <span className={`text-lg font-black ${isOpen ? 'text-[#FCB131]' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`}>
                                VS
                              </span>
                            </div>
                            
                            {/* Logo Rival */}
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="w-14 h-14 flex items-center justify-center">
                                {rivalLogo ? (
                                  <img 
                                    src={rivalLogo} 
                                    alt={match.rival} 
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <span className={`text-[10px] font-black italic ${isOpen ? 'text-white/20' : isScheduled ? 'text-[#003B94]/20' : 'text-gray-300'}`}>
                                    {match.rival_short || match.rival?.substring(0, 3).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <span className={`text-[8px] font-black uppercase truncate max-w-[60px] ${isOpen ? 'text-white/90' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`} title={match.rival}>
                                {match.rival}
                              </span>
                            </div>
                          </div>
                          
                          {/* Heure */}
                          <div className={`flex items-center justify-center text-[9px] font-bold mb-1.5 ${isOpen ? 'text-white/90' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`}>
                            <span className="flex items-center gap-1">
                              <Clock size={11} /> {formatHourDisplay(match.hour || '')}
                            </span>
                          </div>
                          
                          {/* Venue */}
                          {match.venue && (
                            <div className={`flex items-center justify-center gap-1 text-[9px] font-bold mb-1.5 ${isOpen ? 'text-white/70' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>
                              <MapPin size={10} /> {match.venue}
                            </div>
                          )}
                          
                          {/* Fenêtres d'ouverture/fermeture */}
                          <div className="grid grid-cols-2 gap-2 mb-2.5">
                            <div className={`text-center p-1.5 rounded-lg border-2 flex flex-col items-center justify-center backdrop-blur-sm ${
                              isOpen ? 'bg-black/30 border-white/20' : isScheduled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <span className={`text-[7px] font-black uppercase block mb-0.5 ${isOpen ? 'text-white/60' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>
                                Apertura
                              </span>
                              <div className="flex flex-col items-center leading-tight">
                                <span className={`text-[10px] font-black ${isOpen ? 'text-[#FCB131]' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`}>
                                  {formatDateDisplay(match.apertura_date || '')}
                                </span>
                                <span className={`text-[8px] font-bold mt-0.5 ${isOpen ? 'text-white/90' : isScheduled ? 'text-[#003B94]/90' : 'text-gray-400'}`}>
                                  {formatHourDisplay(match.apertura_hour || '')}
                                </span>
                              </div>
                            </div>
                            <div className={`text-center p-1.5 rounded-lg border-2 flex flex-col items-center justify-center backdrop-blur-sm ${
                              isOpen ? 'bg-black/30 border-white/20' : isScheduled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <span className={`text-[7px] font-black uppercase block mb-0.5 ${isOpen ? 'text-white/60' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>
                                Cierre
                              </span>
                              <div className="flex flex-col items-center leading-tight">
                                <span className={`text-[10px] font-black ${isOpen ? 'text-white' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`}>
                                  {formatDateDisplay(match.cierre_date || '')}
                                </span>
                                <span className={`text-[8px] font-bold mt-0.5 ${isOpen ? 'text-white/80' : isScheduled ? 'text-[#003B94]/90' : 'text-gray-400'}`}>
                                  {formatHourDisplay(match.cierre_hour || '')}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Boutons d'action */}
                          {match.status !== 'CLOSED' && match.status !== 'SCHEDULED' && typeof matchId === 'number' && !isNaN(matchId) && routeIdentifier && (
                            <div className="flex gap-1.5">
                              {/* Si résultats disponibles : bouton Ver Resultados */}
                            {hasCancellationRequest ? (
                                /* Bouton Cancelación Pendiente (désactivé) quand annulation en cours */
                                <button
                                  type="button"
                                  disabled
                                  className="w-full py-2 rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-1.5 bg-orange-100 text-orange-700 border-2 border-orange-300 cursor-not-allowed opacity-90 animate-pulse"
                                >
                                  <Clock size={13} strokeWidth={2.5} /> Cancelación Pendiente
                                </button>
                              ) : shouldShowCancelButton ? (
                                <div className="flex flex-col gap-2 w-full">
                                  {/* Bouton Ver Resultados si résultats disponibles */}
                                  {shouldShowViewResults && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleViewRequests(match);
                                      }}
                                      className="w-full py-2 rounded-xl font-black uppercase text-[10px] shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:scale-[1.02]"
                                    >
                                      <CheckCircle2 size={13} strokeWidth={2.5} /> Ver Resultados
                                    </button>
                                  )}
                                  {/* Boutons Lista Enviada + Cancelar */}
                                  <div className="flex gap-2 w-full">
                                    <button
                                      type="button"
                                      disabled
                                      className="flex-1 py-2 rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-1.5 bg-emerald-100 text-emerald-700 border-2 border-emerald-300 cursor-not-allowed opacity-80"
                                    >
                                      <CheckCircle2 size={13} strokeWidth={2.5} /> Lista Enviada
                                    </button>
                                    {/* Bouton Solicitar Cancelación - TOUJOURS visible si liste envoyée */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('🔴 CLIC Cancelar - Match:', match);
                                        handleSolicitarCancelacion(match);
                                      }}
                                      className="flex-1 py-2 rounded-xl font-black uppercase text-[10px] shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5 bg-amber-500 text-white hover:bg-amber-600 hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transform hover:scale-[1.02]"
                                    >
                                      <XCircle size={13} strokeWidth={2.5} /> Cancelar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Bouton Solicitar Habilitaciones (état initial) */
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    if (!routeIdentifier) {
                                      console.error('❌ routeIdentifier est null/undefined');
                                      alert('Error: ID del partido no válido');
                                      return;
                                    }
                                    
                                    const routePath = `/habilitaciones/solicitudes/${routeIdentifier}`;
                                    console.log('🔄 Navigation vers:', routePath);
                                    console.log('Match:', { id: match.id, rival: match.rival, routeIdentifier });
                                    
                                    try {
                                      navigate(routePath);
                                      console.log('✅ Navigation réussie');
                                    } catch (error) {
                                      console.error('❌ Erreur lors de navigate:', error);
                                      alert('Error al navegar. Por favor, intente nuevamente.');
                                    }
                                  }}
                                  className={`w-full py-2 rounded-xl font-black uppercase text-[10px] shadow-lg transition-all duration-300 flex items-center justify-center gap-1.5 ${
                                    isOpen
                                      ? 'bg-[#FCB131] text-[#001d4a] hover:bg-white hover:shadow-[0_0_30px_rgba(252,177,49,0.5)] transform hover:scale-[1.02]'
                                      : 'bg-[#003B94] text-white hover:bg-[#001d4a] hover:shadow-[0_0_20px_rgba(0,59,148,0.4)] transform hover:scale-[1.02]'
                                  }`}
                                >
                                  <Ticket size={13} strokeWidth={2.5} /> 
                                  {isOpen ? 'Solicitar Habilitaciones' : 'Ver Detalles'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}
            </div>
        ) : (
            <GlassCard className="max-w-4xl mx-auto py-20 px-4 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6 mx-auto shadow-inner">
                    <Ticket size={48} className="text-gray-400" />
                </div>
                <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase tracking-tight mb-3">
                    No hay Partidos Disponibles
                </h2>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">
                    No hay partidos disponibles para solicitar habilitaciones en este momento.
                </p>
            </GlassCard>
        )}
        
        {/* Modal pour voir les résultats des demandes */}
        {selectedMatch && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/60 max-h-[80vh] animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="liquid-glass-dark p-5 text-white flex justify-between items-center shrink-0">
                <div>
                  <h2 className="oswald text-xl font-black uppercase">Resultados: vs {selectedMatch.rival}</h2>
                  <p className="text-[10px] font-bold text-[#FCB131] uppercase tracking-widest">
                    {formatDateDisplay(selectedMatch.date)} - {formatHourDisplay(selectedMatch.hour || '')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="opacity-60 hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Contenu */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
                {matchRequests.length > 0 ? (
                  <div className="space-y-3">
                    {/* Statistiques */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                        <div className="text-2xl font-black text-emerald-600">
                          {matchRequests.filter(r => r.status === 'APPROVED').length}
                        </div>
                        <div className="text-[9px] font-black uppercase text-emerald-600">Aprobadas</div>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                        <div className="text-2xl font-black text-red-600">
                          {matchRequests.filter(r => r.status === 'REJECTED').length}
                        </div>
                        <div className="text-[9px] font-black uppercase text-red-600">Rechazadas</div>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-2xl font-black text-blue-600">
                          {matchRequests.filter(r => r.status === 'PENDING').length}
                        </div>
                        <div className="text-[9px] font-black uppercase text-blue-600">Pendientes</div>
                      </div>
                    </div>
                    
                    {/* Socios Aprobados */}
                    {matchRequests.filter(r => r.status === 'APPROVED').length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase text-emerald-700 flex items-center gap-2 px-2">
                          <CheckCircle2 size={14} />
                          Socios Aprobados ({matchRequests.filter(r => r.status === 'APPROVED').length})
                        </h3>
                        <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
                          <div className="divide-y divide-emerald-100">
                            {matchRequests
                              .filter(r => r.status === 'APPROVED')
                              .map(req => (
                                <div key={req.id} className="p-3 flex items-center justify-between hover:bg-emerald-100/50 transition-colors">
                                  <div className="flex-1">
                                    <p className="font-black text-emerald-900 uppercase text-xs">{req.socio_name}</p>
                                    <p className="text-[9px] text-emerald-600 font-mono">DNI: {req.socio_dni}</p>
                                  </div>
                                  <CheckCircle2 size={20} className="text-emerald-600" />
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Socios Rechazados */}
                    {matchRequests.filter(r => r.status === 'REJECTED').length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase text-red-700 flex items-center gap-2 px-2">
                          <XCircle size={14} />
                          Socios Rechazados ({matchRequests.filter(r => r.status === 'REJECTED').length})
                        </h3>
                        <div className="bg-red-50/50 rounded-xl border border-red-200 overflow-hidden shadow-sm">
                          <div className="divide-y divide-red-100">
                            {matchRequests
                              .filter(r => r.status === 'REJECTED')
                              .map(req => (
                                <div key={req.id} className="p-3 flex items-center justify-between hover:bg-red-100/50 transition-colors">
                                  <div className="flex-1">
                                    <p className="font-black text-red-900 uppercase text-xs">{req.socio_name}</p>
                                    <p className="text-[9px] text-red-600 font-mono">DNI: {req.socio_dni}</p>
                                  </div>
                                  <XCircle size={20} className="text-red-600" />
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Socios Pendientes */}
                    {matchRequests.filter(r => r.status === 'PENDING').length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-black uppercase text-blue-700 flex items-center gap-2 px-2">
                          <Clock size={14} />
                          Socios Pendientes ({matchRequests.filter(r => r.status === 'PENDING').length})
                        </h3>
                        <div className="bg-blue-50/50 rounded-xl border border-blue-200 overflow-hidden shadow-sm">
                          <div className="divide-y divide-blue-100">
                            {matchRequests
                              .filter(r => r.status === 'PENDING')
                              .map(req => (
                                <div key={req.id} className="p-3 flex items-center justify-between hover:bg-blue-100/50 transition-colors">
                                  <div className="flex-1">
                                    <p className="font-black text-blue-900 uppercase text-xs">{req.socio_name}</p>
                                    <p className="text-[9px] text-blue-600 font-mono">DNI: {req.socio_dni}</p>
                                  </div>
                                  <Clock size={20} className="text-blue-600" />
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      No hay solicitudes para este partido
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default HabilitacionesPresident;
