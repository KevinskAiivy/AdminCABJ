
import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Ticket, Send, Trash2, Calendar, MapPin, AlertCircle, Clock, CheckCircle2, X, Search, Users, TrendingUp, ArrowLeft } from 'lucide-react';
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

export const HabilitacionesPresident = ({ consulado_id, consuladoName = '' }: { consulado_id: string, consuladoName?: string }) => {
  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [availableMatches, setAvailableMatches] = useState<ProcessedMatch[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [stagedSocios, setStagedSocios] = useState<StagedSocio[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedRequests, setSubmittedRequests] = useState<Solicitud[]>([]);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showCancelAllModal, setShowCancelAllModal] = useState(false);
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);
  const [showSolicitarModal, setShowSolicitarModal] = useState(false);
  const [now, setNow] = useState(new Date());
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [settings, setSettings] = useState(dataService.getAppSettings());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AL DÍA' | 'EN DEUDA' | 'DE BAJA'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  // Vérifier si la liste a été envoyée
  const isListSent = submittedRequests.length > 0 && submittedRequests.some(r => 
      r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'CANCELLATION_REQUESTED'
  );
  
  // Vérifier si une demande d'annulation est en cours
  const hasCancellationRequest = submittedRequests.some(r => r.status === 'CANCELLATION_REQUESTED');

  // Statistiques calculées
  const stats = useMemo(() => {
    const total = submittedRequests.filter(r => r.status !== 'CANCELLATION_REQUESTED').length;
    const approved = submittedRequests.filter(r => r.status === 'APPROVED').length;
    const rejected = submittedRequests.filter(r => r.status === 'REJECTED').length;
    const pending = submittedRequests.filter(r => r.status === 'PENDING').length;
    return { total, approved, rejected, pending };
  }, [submittedRequests]);

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
          
          if (selectedMatch) {
              const matchId = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
              if (!isNaN(matchId)) {
                  const reqs = consuladoName ? dataService.getSolicitudes(matchId, consuladoName) : dataService.getSolicitudes(matchId);
                  setSubmittedRequests(reqs || []);
                  
                  const hasSentRequests = (reqs || []).some(r => 
                      r && (r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED')
                  );
                  const hasCancellationRequest = (reqs || []).some(r => r && r.status === 'CANCELLATION_REQUESTED');
                  
                  if (hasSentRequests && !hasCancellationRequest) {
                      setStagedSocios([]);
                  }
              } else {
                  setSubmittedRequests([]);
              }
          } else {
              setSubmittedRequests([]);
              setStagedSocios([]);
          }
      };
      
      loadMatches();
      const unsub = dataService.subscribe(loadMatches);
      const interval = setInterval(loadMatches, 30000);
      
      return () => {
          unsub();
          clearInterval(interval);
      };
  }, [consulado_id, consuladoName, selectedMatch]);
  
  // Charger les socios
  useEffect(() => {
      const loadSocios = () => {
          try {
              if (!consulado_id || !consulado_id.trim()) {
                  console.warn('⚠️ consulado_id est vide, impossible de charger les socios');
                  setSocios([]);
                  return;
              }
              
              const mySocios = dataService.getSocios(consulado_id);
              setSocios(Array.isArray(mySocios) ? mySocios : []);
          } catch (error) {
              console.error('❌ Erreur lors du chargement des socios:', error);
              setSocios([]);
          }
      };
      
      loadSocios();
      const unsub = dataService.subscribe(loadSocios);
      return () => unsub();
  }, [consulado_id]);
  
  // Gérer la sélection d'un match
  const handleMatchSelection = (match: ProcessedMatch) => {
      try {
          console.log('🔄 handleMatchSelection appelé avec:', match);
          
          if (!match || (match.status !== 'OPEN' && match.status !== 'SCHEDULED')) {
              console.warn('⚠️ Match invalide ou statut incorrect:', match);
              return;
          }
          
          if (!match.id) {
              console.error('❌ Match sans ID:', match);
              return;
          }
          
          const matchId = typeof match.id === 'string' ? parseInt(match.id, 10) : match.id;
          if (isNaN(matchId)) {
              console.error('❌ Match ID invalide:', match.id);
              return;
          }
          
          const reqs = consuladoName && consuladoName.trim() 
              ? dataService.getSolicitudes(matchId, consuladoName) 
              : dataService.getSolicitudes(matchId);
          
          console.log('✅ Définition de selectedMatch et showSolicitarModal');
          setSelectedMatch(match);
          setSubmittedRequests(Array.isArray(reqs) ? reqs : []);
          setStagedSocios([]);
          setShowSolicitarModal(true);
          console.log('✅ États mis à jour - selectedMatch:', match, 'showSolicitarModal: true');
      } catch (error) {
          console.error('❌ Erreur lors de la sélection du match:', error);
          alert('Erreur lors de l\'ouverture de la modal. Veuillez réessayer.');
      }
  };
  
  const handleCloseSolicitarModal = () => {
      try {
          setShowSolicitarModal(false);
          setSelectedMatch(null);
          setSearchQuery('');
          setStatusFilter('ALL');
          setCategoryFilter('ALL');
          setStagedSocios([]);
      } catch (error) {
          console.error('❌ Erreur lors de la fermeture de la modal:', error);
      }
  };

  const toggleStageSocio = (socio: Socio) => {
      if (!selectedMatch) return;
      if (isListSent && !hasCancellationRequest) return;
      
      const matchId = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
      
      if (stagedSocios.find(s => s.id === socio.id)) {
          setStagedSocios(prev => prev.filter(s => s.id !== socio.id));
      } else {
          const existingRequest = submittedRequests.find(r => 
              r.socio_id === socio.id && 
              r.match_id === matchId &&
              (r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED')
          );
          if (existingRequest) return;
          setStagedSocios(prev => [...prev, socio]);
      }
  };

  const confirmSubmit = async () => {
      if (!selectedMatch || stagedSocios.length === 0 || !consuladoName) {
          setShowConfirmSubmit(false);
          return;
      }
      
      try {
          const matchId = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
          if (isNaN(matchId)) {
              console.error('❌ Match ID invalide:', selectedMatch.id);
              setShowConfirmSubmit(false);
              return;
          }
          
          for (const socio of stagedSocios) {
              if (!socio || !socio.id) {
                  console.warn('⚠️ Socio invalide ignoré:', socio);
                  continue;
              }
              
              const existingRequest = submittedRequests.find(r => 
                  r.socio_id === socio.id && 
                  r.match_id === matchId &&
                  r.status !== 'CANCELLATION_REQUESTED'
              );
              if (existingRequest) continue;
              
              await dataService.createSolicitud({
                  id: crypto.randomUUID(),
                  match_id: matchId,
                  socio_id: socio.id,
                  socio_name: socio.name || `${socio.first_name || ''} ${socio.last_name || ''}`.trim(),
                  socio_dni: socio.dni || '',
                  socio_category: socio.category || 'ACTIVO',
                  consulado: consuladoName,
                  status: 'PENDING',
                  timestamp: new Date().toISOString()
              });
          }
          
          const reqs = consuladoName ? dataService.getSolicitudes(matchId, consuladoName) : dataService.getSolicitudes(matchId);
          setSubmittedRequests(reqs || []);
          setStagedSocios([]);
          setShowConfirmSubmit(false);
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
              if (req && req.id && (req.status === 'PENDING' || req.status === 'APPROVED' || req.status === 'REJECTED')) {
                  await dataService.updateSolicitudStatus(req.id, 'CANCELLATION_REQUESTED');
              }
          }
          
          const matchId = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
          if (isNaN(matchId)) {
              console.error('❌ Match ID invalide:', selectedMatch.id);
              setShowCancelRequestModal(false);
              return;
          }
          
          const reqs = consuladoName ? dataService.getSolicitudes(matchId, consuladoName) : dataService.getSolicitudes(matchId);
          setSubmittedRequests(reqs || []);
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
  }, [socios, searchQuery, statusFilter, categoryFilter]);

  // Catégories uniques pour le filtre
  const uniqueCategories = useMemo(() => {
      return Array.from(new Set(socios.map(s => s.category).filter(Boolean)));
  }, [socios]);

  // Calculer les logos pour le match sélectionné (mémorisé)
  const selectedMatchCompLogo = useMemo(() => {
    if (!selectedMatch) return null;
    try {
      return getCompetitionLogo(selectedMatch);
    } catch (error) {
      console.error('Error getting competition logo:', error);
      return null;
    }
  }, [selectedMatch, competitions]);
  
  // Rendre la liste des matchs et la modale (si elle doit être affichée)
  return (
    <>
      {/* Liste des matchs - toujours affichée */}
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
                          const isOpen = match.status === 'OPEN';
                          const isScheduled = match.status === 'SCHEDULED';
                          const matchId = typeof match.id === 'string' ? parseInt(match.id, 10) : match.id;
                          const matchRequests = (!isNaN(matchId) && consuladoName) 
                              ? dataService.getSolicitudes(matchId, consuladoName) 
                              : (!isNaN(matchId)) 
                                  ? dataService.getSolicitudes(matchId)
                                  : [];
                          const hasSubmitted = (matchRequests || []).some(r => 
                              r && (r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED')
                          );
                          
                          const rivalLogo = getRivalLogo(match);
                          const compLogo = getCompetitionLogo(match);
                          
                          return (
                              <GlassCard
                                  key={match.id}
                                  onClick={() => handleMatchSelection(match)}
                                  className={`relative overflow-hidden transition-all duration-300 ${
                                      isOpen 
                                          ? 'liquid-glass-dark text-white border-2 border-[#FCB131]/40 shadow-[0_0_30px_rgba(252,177,49,0.2)]' 
                                          : isScheduled
                                          ? 'bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 text-[#003B94] shadow-lg'
                                          : 'bg-gray-50 border-2 border-gray-200 text-gray-500 opacity-60 cursor-not-allowed'
                                  } ${match.status === 'CLOSED' ? '' : 'hover:scale-[1.02] hover:shadow-2xl cursor-pointer'}`}
                              >
                                  {/* Background pattern pour OPEN */}
                                  {isOpen && (
                                      <div className="absolute inset-0 opacity-5">
                                          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FCB131] rounded-full blur-[100px]"></div>
                                          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400 rounded-full blur-[80px]"></div>
                                      </div>
                                  )}
                                  
                                  <div className="relative z-10 p-5">
                                      {/* Badges de statut */}
                                      <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                                          <div className="flex gap-2 flex-wrap">
                                              {isOpen && (
                                                  <span className="bg-[#FCB131] text-[#001d4a] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase animate-pulse flex items-center gap-1.5 shadow-lg border border-[#001d4a]/20">
                                                      <Ticket size={12} strokeWidth={3} /> ABIERTO
                                                  </span>
                                              )}
                                              {isScheduled && (
                                                  <span className="bg-blue-100 text-[#003B94] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 border-2 border-blue-300 shadow-sm">
                                                      <Clock size={12} strokeWidth={3} /> PROGRAMADO
                                                  </span>
                                              )}
                                              {match.status === 'CLOSED' && (
                                                  <span className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 border border-gray-300">
                                                      CERRADO
                                                  </span>
                                              )}
                                          </div>
                                          {hasSubmitted && (
                                              <span className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-md border border-emerald-600">
                                                  <CheckCircle2 size={10} className="inline mr-1" /> Enviadas
                                              </span>
                                          )}
                                      </div>
                                      
                                      {/* Logos des équipes */}
                                      <div className="flex items-center justify-center gap-4 mb-4 py-3">
                                          {/* Logo Boca */}
                                          <div className="flex flex-col items-center gap-2">
                                              <div className="w-16 h-16 flex items-center justify-center">
                                                  {settings.matchLogoUrl ? (
                                                      <img 
                                                          src={settings.matchLogoUrl} 
                                                          alt="Boca Juniors" 
                                                          className="w-full h-full object-contain"
                                                      />
                                                  ) : (
                                                      <BocaLogoSVG className="w-full h-full" />
                                                  )}
                                              </div>
                                              <span className={`text-[9px] font-black uppercase ${isOpen ? 'text-white/90' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`}>
                                                  Boca
                                              </span>
                                          </div>
                                          
                                          {/* VS */}
                                          <div className="flex flex-col items-center">
                                              <span className={`text-xl font-black ${isOpen ? 'text-[#FCB131]' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`}>
                                                  VS
                                              </span>
                                          </div>
                                          
                                          {/* Logo Rival */}
                                          <div className="flex flex-col items-center gap-2">
                                              <div className="w-16 h-16 flex items-center justify-center bg-white/10 rounded-lg border border-white/20">
                                                  {rivalLogo ? (
                                                      <img 
                                                          src={rivalLogo} 
                                                          alt={match.rival} 
                                                          className="w-full h-full object-contain p-1"
                                                      />
                                                  ) : (
                                                      <span className={`text-xs font-black italic ${isOpen ? 'text-white/20' : isScheduled ? 'text-[#003B94]/20' : 'text-gray-300'}`}>
                                                          {match.rival_short || match.rival?.substring(0, 3).toUpperCase()}
                                                      </span>
                                                  )}
                                              </div>
                                              <span className={`text-[9px] font-black uppercase truncate max-w-[60px] ${isOpen ? 'text-white/90' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`} title={match.rival}>
                                                  {match.rival}
                                              </span>
                                          </div>
                                      </div>
                                      
                                      {/* Info du match */}
                                      <div className="mb-4 space-y-2">
                                          {/* Competition avec logo */}
                                          <div className="flex items-center gap-2 justify-center">
                                              {compLogo && (
                                                  <img src={compLogo} alt={match.competition} className="w-5 h-5 object-contain" />
                                              )}
                                              <p className={`text-[10px] font-bold uppercase ${isOpen ? 'text-white/70' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>
                                                  {match.competition}
                                              </p>
                                          </div>
                                          
                                          {/* Date et heure */}
                                          <div className={`flex items-center justify-center gap-3 text-[11px] font-bold ${isOpen ? 'text-white/90' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`}>
                                              <span className="flex items-center gap-1.5">
                                                  <Calendar size={14} /> {formatDateDisplay(match.date || '')}
                                              </span>
                                              <span className="flex items-center gap-1.5">
                                                  <Clock size={14} /> {formatHourDisplay(match.hour || '')}
                                              </span>
                                          </div>
                                          
                                          {/* Venue */}
                                          {match.venue && (
                                              <div className={`flex items-center justify-center gap-1.5 text-[10px] font-bold ${isOpen ? 'text-white/70' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>
                                                  <MapPin size={12} /> {match.venue}
                                              </div>
                                          )}
                                      </div>
                                      
                                      {/* Fenêtres d'ouverture/fermeture */}
                                      <div className="grid grid-cols-2 gap-3 mb-4">
                                          <div className={`text-center p-3 rounded-xl border-2 flex flex-col items-center justify-center backdrop-blur-sm ${
                                              isOpen ? 'bg-black/30 border-white/20' : isScheduled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                                          }`}>
                                              <span className={`text-[8px] font-black uppercase block mb-1.5 ${isOpen ? 'text-white/60' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>
                                                  Apertura
                                              </span>
                                              <div className="flex flex-col items-center leading-tight">
                                                  <span className={`text-sm font-black ${isOpen ? 'text-[#FCB131]' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`}>
                                                      {formatDateDisplay(match.apertura_date || '')}
                                                  </span>
                                                  <span className={`text-[10px] font-bold mt-0.5 ${isOpen ? 'text-white/90' : isScheduled ? 'text-[#003B94]/90' : 'text-gray-400'}`}>
                                                      {formatHourDisplay(match.apertura_hour || '')}
                                                  </span>
                                              </div>
                                          </div>
                                          <div className={`text-center p-3 rounded-xl border-2 flex flex-col items-center justify-center backdrop-blur-sm ${
                                              isOpen ? 'bg-black/30 border-white/20' : isScheduled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                                          }`}>
                                              <span className={`text-[8px] font-black uppercase block mb-1.5 ${isOpen ? 'text-white/60' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>
                                                  Cierre
                                              </span>
                                              <div className="flex flex-col items-center leading-tight">
                                                  <span className={`text-sm font-black ${isOpen ? 'text-white' : isScheduled ? 'text-[#003B94]' : 'text-gray-400'}`}>
                                                      {formatDateDisplay(match.cierre_date || '')}
                                                  </span>
                                                  <span className={`text-[10px] font-bold mt-0.5 ${isOpen ? 'text-white/80' : isScheduled ? 'text-[#003B94]/90' : 'text-gray-400'}`}>
                                                      {formatHourDisplay(match.cierre_hour || '')}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                      
                                      {/* Bouton d'action */}
                                      {match.status !== 'CLOSED' && (
                                          <button
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMatchSelection(match);
                                              }}
                                              className={`w-full py-3.5 rounded-xl font-black uppercase text-xs shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                                                  isOpen
                                                      ? 'bg-[#FCB131] text-[#001d4a] hover:bg-white hover:shadow-[0_0_30px_rgba(252,177,49,0.5)] transform hover:scale-[1.02]'
                                                      : 'bg-[#003B94] text-white hover:bg-[#001d4a] hover:shadow-[0_0_20px_rgba(0,59,148,0.4)] transform hover:scale-[1.02]'
                                              }`}
                                          >
                                              <Ticket size={16} strokeWidth={2.5} /> 
                                              {isOpen ? 'Solicitar Habilitaciones' : 'Ver Detalles'}
                                          </button>
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
          </div>

      {/* Modal de sélection - affichée par-dessus la liste */}
      {showSolicitarModal && selectedMatch && selectedMatch.id && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto z-[9999]" 
          style={{ 
            backgroundColor: 'rgba(0, 29, 74, 0.92)', 
            backdropFilter: 'blur(8px)', 
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseSolicitarModal();
            }
          }}
        >
          <div 
            className="relative w-full max-w-7xl rounded-2xl shadow-2xl overflow-hidden flex flex-col bg-white transform transition-all duration-300 scale-100 z-[10000]"
            style={{ 
              maxHeight: 'calc(100vh - 2rem)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header amélioré */}
            <div className="liquid-glass-dark p-6 text-white relative overflow-hidden border-b border-white/10">
              <div className="absolute top-0 right-0 p-6 opacity-5"><Ticket size={160} /></div>
              
              {/* Bouton retour */}
              <button
                onClick={handleCloseSolicitarModal}
                className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all z-20"
                title="Volver"
              >
                <ArrowLeft size={18} />
              </button>
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1 pr-10">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    {selectedMatch?.status === 'OPEN' && (
                      <span className="bg-[#FCB131] text-[#001d4a] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg">
                        Habilitación Abierta
                      </span>
                    )}
                    {selectedMatch?.status === 'SCHEDULED' && (
                      <span className="bg-blue-100 text-[#003B94] px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border-2 border-blue-300">
                        Programado
                      </span>
                    )}
                    {selectedMatchCompLogo && selectedMatch?.competition && (
                      <img src={selectedMatchCompLogo} alt={selectedMatch.competition || 'Competition'} className="h-6 object-contain opacity-80" />
                    )}
                    {selectedMatch?.competition && (
                      <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                        {selectedMatch.competition}
                      </span>
                    )}
                  </div>
                  {selectedMatch?.rival && (
                    <h1 className="oswald text-3xl font-black uppercase tracking-tighter leading-none mb-2">
                      vs {selectedMatch.rival}
                    </h1>
                  )}
                  <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wide opacity-90 flex-wrap">
                    {selectedMatch?.date && (
                      <span className="flex items-center gap-2">
                        <Calendar size={14}/> {formatDateDisplay(selectedMatch.date)}
                      </span>
                    )}
                    {selectedMatch?.hour && (
                      <span className="flex items-center gap-2">
                        <Clock size={14}/> {formatHourDisplay(selectedMatch.hour)}
                      </span>
                    )}
                    {selectedMatch?.venue && (
                      <span className="flex items-center gap-2">
                        <MapPin size={14}/> {selectedMatch.venue}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Statistiques en temps réel */}
                <div className="flex gap-3 flex-wrap">
                  <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl text-center min-w-[90px] border border-white/20">
                    <div className="text-2xl font-black text-[#FCB131] mb-1">
                      {stats?.total ?? 0}
                    </div>
                    <div className="text-[8px] font-black uppercase tracking-widest opacity-80">
                      Total
                    </div>
                  </div>
                  {!isListSent && (
                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl text-center min-w-[90px] border border-white/20">
                      <div className="text-2xl font-black text-white mb-1">
                        {stagedSocios?.length ?? 0}
                      </div>
                      <div className="text-[8px] font-black uppercase tracking-widest opacity-80">
                        Seleccionados
                      </div>
                    </div>
                  )}
                  {(stats?.approved ?? 0) > 0 && (
                    <div className="bg-emerald-500/20 backdrop-blur-sm p-3 rounded-xl text-center min-w-[90px] border border-emerald-400/30">
                      <div className="text-2xl font-black text-emerald-300 mb-1">
                        {stats?.approved ?? 0}
                      </div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-emerald-200">
                        Aprobados
                      </div>
                    </div>
                  )}
                  {hasCancellationRequest && (
                    <div className="bg-amber-500/30 backdrop-blur-sm p-3 rounded-xl text-center min-w-[120px] border border-amber-400/40">
                      <div className="text-[9px] font-black text-amber-200 uppercase tracking-widest mb-1">
                        Cancelación
                      </div>
                      <div className="text-[8px] font-bold text-amber-300">
                        Pendiente
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Colonne gauche : Liste des socios */}
                <div className="space-y-4">
                  {/* Barre de recherche et filtres */}
                  <GlassCard className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest flex items-center gap-2">
                        <Users size={16}/> Socios del Consulado
                      </h3>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-3 py-1 rounded-lg">
                        {filteredSocios.length} {filteredSocios.length === 1 ? 'socio' : 'socios'}
                      </span>
                    </div>
                    
                    {/* Barre de recherche */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Buscar por nombre, DNI o número de socio..." 
                        className="w-full bg-white border-2 border-gray-200 rounded-xl py-2.5 pl-10 pr-4 outline-none text-sm font-bold text-[#001d4a] focus:border-[#003B94] transition-all" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                      />
                    </div>
                    
                    {/* Filtres */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-600 mb-1 block">Estado</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as any)}
                          className="w-full bg-white border-2 border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-[#001d4a] focus:border-[#003B94] outline-none"
                        >
                          <option value="ALL">Todos</option>
                          <option value="AL DÍA">Al Día</option>
                          <option value="EN DEUDA">En Deuda</option>
                          <option value="DE BAJA">De Baja</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-600 mb-1 block">Categoría</label>
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="w-full bg-white border-2 border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-[#001d4a] focus:border-[#003B94] outline-none"
                        >
                          <option value="ALL">Todas</option>
                          {uniqueCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </GlassCard>
                  
                  {/* Liste des socios */}
                  <GlassCard className="overflow-hidden p-0">
                    {isListSent && !hasCancellationRequest ? (
                      <div className="p-8 text-center">
                        <AlertCircle size={48} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-black uppercase text-[#001d4a] mb-2">Lista Enviada</p>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                          La lista ha sido enviada y está bloqueada.<br/>
                          Debe solicitar una cancelación para modificarla.
                        </p>
                      </div>
                    ) : filteredSocios.length > 0 && selectedMatch ? (
                      <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-gray-100">
                        {filteredSocios.map(socio => {
                          if (!selectedMatch || !socio || !socio.id) return null;
                          const isSelected = stagedSocios.some(s => s && s.id === socio.id);
                          const matchId = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
                          if (isNaN(matchId)) return null;
                          const existingRequest = submittedRequests.find(r => r && r.socio_id === socio.id && r.match_id === matchId);
                          const isAlreadySubmitted = existingRequest && 
                              (existingRequest.status === 'PENDING' || existingRequest.status === 'APPROVED' || existingRequest.status === 'REJECTED');
                          const isCancellationRequested = existingRequest && existingRequest.status === 'CANCELLATION_REQUESTED';
                          
                          return (
                            <div 
                              key={socio.id} 
                              className={`p-4 transition-all duration-200 flex items-center justify-between group ${
                                isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 
                                isAlreadySubmitted ? 'bg-emerald-50/50 border-l-4 border-emerald-400' : 
                                isCancellationRequested ? 'bg-amber-50/50 border-l-4 border-amber-400' :
                                'hover:bg-gray-50 border-l-4 border-transparent'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
                                    socio.status === 'AL DÍA' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                                    socio.status === 'EN DEUDA' ? 'bg-red-100 text-red-700 border border-red-300' :
                                    'bg-gray-100 text-gray-700 border border-gray-300'
                                  }`}>
                                    {socio.status || 'N/A'}
                                  </span>
                                  <p className={`text-sm font-bold truncate ${
                                    isSelected ? 'text-[#003B94]' : 
                                    isAlreadySubmitted ? 'text-emerald-700' : 
                                    isCancellationRequested ? 'text-amber-700' :
                                    'text-[#001d4a]'
                                  }`}>
                                    <span className="uppercase">{socio.last_name || ''}</span>{socio.last_name && socio.first_name ? ' ' : ''}
                                    <span className="capitalize">{socio.first_name?.toLowerCase() || ''}</span>
                                    {!socio.last_name && !socio.first_name && (socio.name || 'Sin nombre')}
                                  </p>
                                  {isAlreadySubmitted && existingRequest && (
                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                                      existingRequest.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                                      existingRequest.status === 'REJECTED' ? 'bg-red-100 text-red-700 border border-red-300' :
                                      'bg-amber-100 text-amber-700 border border-amber-300'
                                    }`}>
                                      {existingRequest.status === 'APPROVED' ? '✓ Aprobado' : 
                                       existingRequest.status === 'REJECTED' ? '✗ Rechazado' : 
                                       '⏳ Pendiente'}
                                    </span>
                                  )}
                                  {isCancellationRequested && (
                                    <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-amber-100 text-amber-700 border border-amber-300">
                                      Cancelación Solicitada
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
                                  <span>N° {socio.numero_socio || socio.dni || 'N/A'}</span>
                                  <span className="text-gray-400">•</span>
                                  <span>CAT: {socio.category}</span>
                                </div>
                              </div>
                              
                              <div className="flex-shrink-0 ml-4">
                                {isAlreadySubmitted || (isListSent && !hasCancellationRequest) ? (
                                  <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center shadow-sm" title="Ya enviado">
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                  </div>
                                ) : isCancellationRequested ? (
                                  <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center shadow-sm" title="Cancelación solicitada">
                                    <AlertCircle size={16} className="text-amber-600" />
                                  </div>
                                ) : isSelected ? (
                                  <button 
                                    onClick={() => toggleStageSocio(socio)}
                                    className="w-10 h-10 rounded-full bg-[#003B94] border-2 border-[#003B94] flex items-center justify-center transition-all hover:bg-[#001d4a] hover:scale-110 shadow-md"
                                    title="Retirar de la lista"
                                  >
                                    <X size={16} className="text-white" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => toggleStageSocio(socio)}
                                    className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center transition-all hover:bg-blue-50 hover:border-[#003B94] hover:scale-110 group shadow-sm"
                                    title="Agregar a la lista"
                                  >
                                    <Send size={14} className="text-gray-400 group-hover:text-[#003B94] transition-colors" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <Search size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-bold uppercase">No se encontraron socios</p>
                        <p className="text-xs mt-1">Intente cambiar los filtros de búsqueda</p>
                      </div>
                    )}
                  </GlassCard>
                </div>

                {/* Colonne droite : Lista de envío */}
                <div className="space-y-4">
                  <GlassCard className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest flex items-center gap-2">
                        <Send size={16}/> {isListSent && !hasCancellationRequest ? 'Lista Enviada' : 'Lista de Envío'}
                      </h3>
                      <div className="flex gap-2">
                        {stagedSocios.length > 0 && !isListSent && (
                          <button 
                            onClick={() => setShowCancelAllModal(true)} 
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
                            title="Vaciar lista"
                          >
                            <Trash2 size={18}/>
                          </button>
                        )}
                        {isListSent && !hasCancellationRequest && (
                          <button 
                            onClick={() => setShowCancelRequestModal(true)} 
                            className="text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-lg transition-all text-xs font-black uppercase tracking-widest border-2 border-amber-300 shadow-sm"
                          >
                            Solicitar Cancelación
                          </button>
                        )}
                      </div>
                    </div>

                    {isListSent && !hasCancellationRequest ? (
                      <div className="flex flex-col items-center justify-center text-center py-12">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                          <CheckCircle2 size={40} className="text-emerald-500" />
                        </div>
                        <p className="text-base font-black uppercase text-[#001d4a] mb-2">Lista Enviada Correctamente</p>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-relaxed mb-4 max-w-md">
                          La lista ha sido enviada y está esperando aprobación de los administradores.
                        </p>
                        <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-4">
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <div className="text-xl font-black text-blue-600">{stats?.pending ?? 0}</div>
                            <div className="text-[9px] font-black uppercase text-blue-600">Pendientes</div>
                          </div>
                          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                            <div className="text-xl font-black text-emerald-600">{stats?.approved ?? 0}</div>
                            <div className="text-[9px] font-black uppercase text-emerald-600">Aprobados</div>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                            <div className="text-xl font-black text-red-600">{stats?.rejected ?? 0}</div>
                            <div className="text-[9px] font-black uppercase text-red-600">Rechazados</div>
                          </div>
                        </div>
                      </div>
                    ) : stagedSocios.length > 0 ? (
                      <>
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 mb-4">
                          {stagedSocios.map(socio => (
                            <div key={socio.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl flex items-center justify-between border-2 border-blue-200 shadow-sm">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${
                                    socio.status === 'AL DÍA' ? 'bg-emerald-100 text-emerald-700' :
                                    socio.status === 'EN DEUDA' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {socio.status || 'N/A'}
                                  </span>
                                  <p className="text-[#001d4a] text-sm font-bold truncate">
                                    <span className="uppercase">{socio.last_name || ''}</span>{socio.last_name && socio.first_name ? ' ' : ''}
                                    <span className="capitalize">{socio.first_name?.toLowerCase() || ''}</span>
                                    {!socio.last_name && !socio.first_name && (socio.name || 'Sin nombre')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-500">
                                  <span>N° {socio.numero_socio || socio.dni || 'N/A'}</span>
                                  <span>•</span>
                                  <span>CAT: {socio.category}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => toggleStageSocio(socio)} 
                                className="text-gray-400 hover:text-red-500 transition-colors ml-3 flex-shrink-0 p-1 hover:bg-red-50 rounded-lg"
                                title="Retirar"
                              >
                                <X size={18}/>
                              </button>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => setShowConfirmSubmit(true)} 
                          className="w-full bg-gradient-to-r from-[#003B94] to-[#001d4a] text-white py-4 rounded-xl font-black uppercase text-sm tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02]"
                        >
                          <Send size={18} /> Enviar {stagedSocios.length} Solicitud{stagedSocios.length !== 1 ? 'es' : ''}
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-12">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                          <AlertCircle size={32} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-widest text-gray-500 mb-1">Lista Vacía</p>
                        <p className="text-xs text-gray-400">Seleccione socios del panel izquierdo</p>
                      </div>
                    )}
                  </GlassCard>

                  {/* Historial */}
                  {submittedRequests.filter(r => r.status !== 'CANCELLATION_REQUESTED').length > 0 && (
                    <GlassCard className="p-4">
                      <h4 className="text-[#003B94] font-black uppercase text-sm tracking-widest mb-3 flex items-center gap-2">
                        <TrendingUp size={16} /> Historial ({stats?.total ?? 0})
                      </h4>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {submittedRequests
                          .filter(req => req.status !== 'CANCELLATION_REQUESTED')
                          .map(req => (
                            <div key={req.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <span className="text-xs font-bold text-[#001d4a] truncate flex-1">{req.socio_name}</span>
                              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ml-3 ${
                                req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 
                                req.status === 'REJECTED' ? 'bg-red-100 text-red-700 border border-red-300' : 
                                'bg-amber-100 text-amber-700 border border-amber-300'
                              }`}>
                                {req.status === 'APPROVED' ? '✓ Aprobado' : 
                                 req.status === 'REJECTED' ? '✗ Rechazado' : 
                                 '⏳ Pendiente'}
                              </span>
                            </div>
                          ))}
                      </div>
                    </GlassCard>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modales de confirmation améliorées */}
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
            <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
              <AlertCircle size={36} />
            </div>
            <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase mb-3">Solicitar Cancelación</h2>
            <p className="text-gray-600 text-sm font-bold uppercase tracking-wide mb-6 leading-relaxed">
              ¿Desea solicitar la cancelación de todas las solicitudes enviadas?<br/>
              Esta solicitud será <strong>revisada por los administradores</strong>. Una vez aprobada, podrá modificar la lista de socios.
            </p>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-xs font-black text-amber-800 uppercase mb-1">Total de solicitudes afectadas:</p>
              <p className="text-2xl font-black text-amber-600">{stats?.total ?? 0}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowCancelRequestModal(false)} 
                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={requestCancellation} 
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
              >
                Solicitar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HabilitacionesPresident;
