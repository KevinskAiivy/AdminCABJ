
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Ticket, Send, Trash2, Calendar, MapPin, AlertCircle, Clock, CheckCircle2, X } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Match, Solicitud, Socio } from '../../types';
import { formatDateDisplay } from '../../utils/dateFormat';

interface StagedSocio extends Socio {
    submissionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export const HabilitacionesPresident = ({ consulado_id, consuladoName }: { consulado_id: string, consuladoName: string }) => {
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [stagedSocios, setStagedSocios] = useState<StagedSocio[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedRequests, setSubmittedRequests] = useState<Solicitud[]>([]);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showCancelAllModal, setShowCancelAllModal] = useState(false);
  const [showCancelRequestModal, setShowCancelRequestModal] = useState(false);
  
  // Vérifier si la liste a été envoyée (au moins une demande avec status PENDING, APPROVED, REJECTED ou CANCELLATION_REQUESTED)
  const isListSent = submittedRequests.length > 0 && submittedRequests.some(r => 
      r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED' || r.status === 'CANCELLATION_REQUESTED'
  );
  
  // Vérifier si une demande d'annulation est en cours
  const hasCancellationRequest = submittedRequests.some(r => r.status === 'CANCELLATION_REQUESTED');

  // Fonction de parsing des dates compatible avec différents formats
  const parseDate = (d: string, h: string) => {
      if (!d) return new Date(0);
      let day, month, year;
      
      if (d.includes('/')) {
          // Format DD/MM/YYYY
          [day, month, year] = d.split('/').map(Number);
      } else if (d.includes('-')) {
          // Format YYYY-MM-DD (DB) ou DD-MM-YYYY
          const parts = d.split('-');
          if (parts[0].length === 4) {
              // Format YYYY-MM-DD
              [year, month, day] = parts.map(Number);
          } else {
              // Format DD-MM-YYYY
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

  useEffect(() => {
      const loadMatches = () => {
          const matches = dataService.getMatches();
          const now = new Date();
          
          // Filtrer d'abord les matchs qui ont les champs requis et ne sont pas suspendus
          const eligibleMatches = matches.filter(m => {
              return m.apertura_date && m.cierre_date && m.apertura_hour && m.cierre_hour 
                  && !m.is_suspended && (m.is_home || m.is_neutral);
          });
          
          if (import.meta.env.DEV && eligibleMatches.length > 0) {
              console.log(`📊 ${eligibleMatches.length} match(s) éligibles trouvés sur ${matches.length} total`);
          }
          
          const openMatch = eligibleMatches.find(m => {
              try {
                  const openTime = parseDate(m.apertura_date!, m.apertura_hour!);
                  const closeTime = parseDate(m.cierre_date!, m.cierre_hour!);
                  
                  // Vérifier que les dates sont valides
                  if (isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
                      if (import.meta.env.DEV) {
                          console.warn(`⚠️ Date invalide pour le match ${m.id}:`, {
                              rival: m.rival,
                              apertura_date: m.apertura_date,
                              apertura_hour: m.apertura_hour,
                              cierre_date: m.cierre_date,
                              cierre_hour: m.cierre_hour,
                              openTimeParsed: openTime.toISOString(),
                              closeTimeParsed: closeTime.toISOString()
                          });
                      }
                      return false;
                  }

                  const isOpen = now >= openTime && now <= closeTime;
                  
                  if (import.meta.env.DEV) {
                      if (isOpen) {
                          console.log(`✅ Match OUVERT trouvé: ${m.id} - vs ${m.rival}`, {
                              openTime: openTime.toISOString(),
                              closeTime: closeTime.toISOString(),
                              now: now.toISOString(),
                              apertura_date: m.apertura_date,
                              apertura_hour: m.apertura_hour,
                              cierre_date: m.cierre_date,
                              cierre_hour: m.cierre_hour
                          });
                      } else {
                          console.log(`⏳ Match pas encore ouvert ou fermé: ${m.id} - vs ${m.rival}`, {
                              openTime: openTime.toISOString(),
                              closeTime: closeTime.toISOString(),
                              now: now.toISOString(),
                              isBefore: now < openTime,
                              isAfter: now > closeTime
                          });
                      }
                  }
                  
                  return isOpen;
              } catch (error) {
                  console.error(`❌ Erreur lors du parsing des dates pour le match ${m.id}:`, error, m);
                  return false;
              }
          });

          setActiveMatch(openMatch || null);

          const mySocios = dataService.getSocios(consulado_id);
          setSocios(mySocios.filter(s => s.status === 'AL DÍA'));

          if (openMatch) {
              const reqs = dataService.getSolicitudes(openMatch.id, consuladoName);
              setSubmittedRequests(reqs);
              
              // Si la liste a déjà été envoyée (au moins une demande avec status PENDING, APPROVED ou REJECTED)
              // et qu'il n'y a pas de demande d'annulation, vider stagedSocios
              const hasSentRequests = reqs.some(r => 
                  r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED'
              );
              const hasCancellationRequest = reqs.some(r => r.status === 'CANCELLATION_REQUESTED');
              
              if (hasSentRequests && !hasCancellationRequest) {
                  // La liste a été envoyée, vider stagedSocios
                  setStagedSocios([]);
              } else if (!hasSentRequests) {
                  // Si aucune demande n'a été envoyée, garder les socios dans stagedSocios
                  // Ne pas réinitialiser stagedSocios si l'utilisateur est en train de construire sa liste
              }
          } else {
              setSubmittedRequests([]);
              setStagedSocios([]);
              if (import.meta.env.DEV && eligibleMatches.length > 0) {
                  console.log(`ℹ️ Aucun match ouvert actuellement. ${eligibleMatches.length} match(s) éligibles mais pas dans la fenêtre d'ouverture.`);
              }
          }
      };
      
      // Charger immédiatement
      loadMatches();
      
      // S'abonner aux mises à jour du dataService
      const unsub = dataService.subscribe(loadMatches);
      
      // Recharger périodiquement pour mettre à jour les matchs ouverts (toutes les 30 secondes)
      const interval = setInterval(loadMatches, 30000);
      
      return () => {
          unsub();
          clearInterval(interval);
      };
  }, [consulado_id, consuladoName]);

  const toggleStageSocio = (socio: Socio) => {
      // Si la liste a été envoyée, ne plus permettre l'ajout
      if (isListSent) {
          console.warn('⚠️ La liste a déjà été envoyée. Demandez une annulation pour modifier.');
          return;
      }
      
      // Vérifier si le socio est déjà dans la liste
      if (stagedSocios.find(s => s.id === socio.id)) {
          setStagedSocios(prev => prev.filter(s => s.id !== socio.id));
      } else {
          // Vérifier si le socio a déjà une demande envoyée
          const existingRequest = submittedRequests.find(r => r.socio_id === socio.id && 
              (r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED'));
          if (existingRequest) {
              console.warn(`⚠️ Le socio ${socio.name} a déjà une demande envoyée`);
              return;
          }
          // Ajouter à la liste définitive (qui sera validée avant l'envoi)
          setStagedSocios(prev => [...prev, socio]);
      }
  };

  const confirmSubmit = async () => {
      if (!activeMatch || stagedSocios.length === 0) {
          setShowConfirmSubmit(false);
          return;
      }
      
      try {
          // Envoyer toutes les demandes avec status PENDING
          for (const socio of stagedSocios) {
              // Vérifier si le socio a déjà une demande
              const existingRequest = submittedRequests.find(r => r.socio_id === socio.id);
              if (existingRequest && existingRequest.status !== 'CANCELLATION_REQUESTED') {
                  console.warn(`⚠️ Le socio ${socio.name} a déjà une demande, ignoré`);
                  continue;
              }
              
              await dataService.createSolicitud({
                  id: crypto.randomUUID(),
                  match_id: activeMatch.id,
                  socio_id: socio.id,
                  socio_name: socio.name,
                  socio_dni: socio.dni,
                  socio_category: socio.category,
                  consulado: consuladoName,
                  status: 'PENDING',
                  timestamp: new Date().toISOString()
              });
          }
          
          // Recharger les demandes
          const reqs = dataService.getSolicitudes(activeMatch.id, consuladoName);
          setSubmittedRequests(reqs);
          setStagedSocios([]);
          setShowConfirmSubmit(false);
      } catch (error) {
          console.error('❌ Erreur lors de l\'envoi des demandes:', error);
          setShowConfirmSubmit(false);
      }
  };

  const requestCancellation = async () => {
      if (!activeMatch || submittedRequests.length === 0) return;
      
      try {
          // Mettre toutes les demandes en status CANCELLATION_REQUESTED
          for (const req of submittedRequests) {
              if (req.status === 'PENDING' || req.status === 'APPROVED' || req.status === 'REJECTED') {
                  await dataService.updateSolicitudStatus(req.id, 'CANCELLATION_REQUESTED');
              }
          }
          
          // Recharger les demandes
          const reqs = dataService.getSolicitudes(activeMatch.id, consuladoName);
          setSubmittedRequests(reqs);
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

  if (!activeMatch) {
      return (
          <div className="max-w-4xl mx-auto py-20 px-4 text-center">
              <div className="bg-white rounded-[2.5rem] p-12 border border-[#003B94]/10 shadow-xl flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                      <Ticket size={48} className="text-gray-300" />
                  </div>
                  <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase tracking-tight mb-2">No hay Habilitaciones Activas</h2>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">La ventana de habilitación se encuentra cerrada.</p>
              </div>
          </div>
      );
  }

  // Filtrer les socios par recherche (afficher TOUS les socios du consulado)
  const filteredSocios = socios.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (s.numero_socio && s.numero_socio.includes(searchQuery)) ||
      s.dni.includes(searchQuery)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        <div className="liquid-glass-dark p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Ticket size={200} /></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-[#FCB131] text-[#001d4a] px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest animate-pulse">Habilitación Abierta</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{activeMatch.competition}</span>
                    </div>
                    <h1 className="oswald text-4xl font-black uppercase tracking-tighter leading-none mb-1">vs {activeMatch.rival}</h1>
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wide opacity-80">
                        <span className="flex items-center gap-1"><Calendar size={14}/> {formatDateDisplay(activeMatch.date || '')}</span>
                        <span className="flex items-center gap-1"><Clock size={14}/> {formatHourDisplay(activeMatch.hour || '')}</span>
                        <span className="flex items-center gap-1"><MapPin size={14}/> {activeMatch.venue || 'N/A'}</span>
                    </div>
                </div>
                
                <div className="flex gap-4">
                    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm text-center min-w-[100px]">
                        <span className="block text-2xl font-black text-[#FCB131]">
                            {submittedRequests.filter(r => r.status !== 'CANCELLATION_REQUESTED').length}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest">
                            {isListSent ? 'Enviados' : 'Lista'}
                        </span>
                    </div>
                    {!isListSent && (
                        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm text-center min-w-[100px]">
                            <span className="block text-2xl font-black text-white">{stagedSocios.length}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest">Seleccionados</span>
                        </div>
                    )}
                    {hasCancellationRequest && (
                        <div className="bg-amber-500/20 p-4 rounded-xl backdrop-blur-sm text-center min-w-[120px] border border-amber-400/30">
                            <span className="block text-xs font-black text-amber-300 uppercase tracking-widest">Cancelación Solicitada</span>
                            <span className="text-[8px] font-bold text-amber-200 mt-1">Esperando aprobación</span>
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest flex items-center gap-2"><Ticket size={16}/> Socios del Consulado</h3>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                            {filteredSocios.length} {filteredSocios.length === 1 ? 'socio' : 'socios'}
                        </span>
                    </div>
                    <input type="text" placeholder="Buscar socio..." className="w-full bg-gray-50 border border-transparent rounded-lg py-2.5 px-4 outline-none text-xs font-bold text-[#001d4a] focus:bg-white focus:border-[#003B94]/30 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                
                <div className="bg-white border border-[#003B94]/10 rounded-[1.5rem] overflow-hidden shadow-sm max-h-[500px] overflow-y-auto custom-scrollbar">
                    {isListSent && !hasCancellationRequest ? (
                        <div className="p-8 text-center">
                            <AlertCircle size={48} className="mx-auto mb-3 text-gray-300" />
                            <p className="text-sm font-black uppercase text-[#001d4a] mb-2">Lista Enviada</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-relaxed">
                                La lista ha sido enviada y está bloqueada.<br/>
                                Debe solicitar una cancelación para modificarla.
                            </p>
                        </div>
                    ) : filteredSocios.length > 0 ? (
                        filteredSocios.map(socio => {
                            const isSelected = stagedSocios.some(s => s.id === socio.id);
                            const existingRequest = submittedRequests.find(r => r.socio_id === socio.id);
                            const isAlreadySubmitted = existingRequest && 
                                (existingRequest.status === 'PENDING' || existingRequest.status === 'APPROVED' || existingRequest.status === 'REJECTED');
                            const isCancellationRequested = existingRequest && existingRequest.status === 'CANCELLATION_REQUESTED';
                            
                            return (
                                <div key={socio.id} className={`p-4 border-b border-gray-50 transition-all flex items-center justify-between group ${
                                    isSelected ? 'bg-blue-50/50' : 
                                    isAlreadySubmitted ? 'bg-green-50/30' : 
                                    isCancellationRequested ? 'bg-amber-50/30' :
                                    isListSent && !hasCancellationRequest ? 'opacity-50 cursor-not-allowed' :
                                    'hover:bg-gray-50'
                                }`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                                socio.status === 'AL DÍA' ? 'bg-emerald-100 text-emerald-600' :
                                                socio.status === 'EN DEUDA' ? 'bg-red-100 text-red-600' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {socio.status === 'AL DÍA' ? 'AL DÍA' :
                                                 socio.status === 'EN DEUDA' ? 'EN DEUDA' :
                                                 'DE BAJA'}
                                            </span>
                                            <p className={`text-xs ${
                                                isSelected ? 'text-[#003B94]' : 
                                                isAlreadySubmitted ? 'text-green-700' : 
                                                isCancellationRequested ? 'text-amber-700' :
                                                'text-[#001d4a]'
                                            }`}>
                                                <span className="font-black uppercase">{socio.last_name}</span> <span className="capitalize">{socio.first_name.toLowerCase()}</span>
                                            </p>
                                            {isAlreadySubmitted && existingRequest && (
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                                    existingRequest.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                                                    existingRequest.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                                    'bg-amber-100 text-amber-600'
                                                }`}>
                                                    {existingRequest.status === 'APPROVED' ? 'Aprobado' : 
                                                     existingRequest.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
                                                </span>
                                            )}
                                            {isCancellationRequested && (
                                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-600">
                                                    Cancelación Solicitada
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <p className="text-[9px] font-bold text-gray-400">N° Socio: {socio.numero_socio || socio.dni || 'N/A'}</p>
                                            <p className="text-[9px] font-bold text-gray-400">CAT: {socio.category}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isAlreadySubmitted || (isListSent && !hasCancellationRequest) ? (
                                            <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center" title={isAlreadySubmitted ? "Ya enviado" : "Lista bloqueada"}>
                                                <CheckCircle2 size={12} className="text-green-600" />
                                            </div>
                                        ) : isCancellationRequested ? (
                                            <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center" title="Cancelación solicitada">
                                                <AlertCircle size={12} className="text-amber-600" />
                                            </div>
                                        ) : isSelected ? (
                                            <button 
                                                onClick={() => toggleStageSocio(socio)}
                                                className="w-8 h-8 rounded-full bg-[#003B94] border-2 border-[#003B94] flex items-center justify-center transition-all hover:bg-[#001d4a]"
                                                title="Retirar de la lista"
                                            >
                                                <X size={12} className="text-white" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => toggleStageSocio(socio)}
                                                className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center transition-all hover:bg-blue-50 hover:border-[#003B94] group"
                                                title="Agregar a la lista"
                                            >
                                                <Send size={12} className="text-gray-400 group-hover:text-[#003B94] transition-colors" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            <p className="text-xs font-bold uppercase">Aucun socio trouvé</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex items-center justify-between">
                    <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest flex items-center gap-2">
                        <Send size={16}/> {isListSent && !hasCancellationRequest ? 'Lista Enviada' : 'Lista de Envío'}
                    </h3>
                    {stagedSocios.length > 0 && !isListSent && (
                        <button onClick={() => setShowCancelAllModal(true)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"><Trash2 size={16}/></button>
                    )}
                    {isListSent && !hasCancellationRequest && (
                        <button onClick={() => setShowCancelRequestModal(true)} className="text-amber-600 hover:bg-amber-50 px-3 py-2 rounded-lg transition-all text-xs font-black uppercase tracking-widest border border-amber-300">
                            Solicitar Cancelación
                        </button>
                    )}
                </div>

                <div className="bg-white border border-[#003B94]/10 rounded-[1.5rem] overflow-hidden shadow-sm min-h-[300px] flex flex-col">
                    {isListSent && !hasCancellationRequest ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-8">
                            <CheckCircle2 size={48} className="mb-3 text-green-400 opacity-60" />
                            <p className="text-sm font-black uppercase text-[#001d4a] mb-2">Lista Enviada</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center leading-relaxed">
                                La lista ha sido enviada correctamente.<br/>
                                Está esperando aprobación de los administradores.
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 mt-4 uppercase tracking-wider">
                                {submittedRequests.filter(r => r.status === 'PENDING').length} solicitudes pendientes
                            </p>
                        </div>
                    ) : stagedSocios.length > 0 ? (
                        <>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                {stagedSocios.map(socio => (
                                    <div key={socio.id} className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                                    socio.status === 'AL DÍA' ? 'bg-emerald-100 text-emerald-600' :
                                                    socio.status === 'EN DEUDA' ? 'bg-red-100 text-red-600' :
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {socio.status === 'AL DÍA' ? 'AL DÍA' :
                                                     socio.status === 'EN DEUDA' ? 'EN DEUDA' :
                                                     'DE BAJA'}
                                                </span>
                                                <p className="text-[#001d4a] text-xs"><span className="font-black uppercase">{socio.last_name}</span> <span className="capitalize">{socio.first_name.toLowerCase()}</span></p>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-[9px] font-bold text-gray-400">N° Socio: {socio.numero_socio || socio.dni || 'N/A'}</p>
                                                <p className="text-[9px] font-bold text-gray-400">CAT: {socio.category}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => toggleStageSocio(socio)} className="text-gray-300 hover:text-red-500 transition-colors ml-2"><X size={16}/></button>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                <button 
                                    onClick={() => setShowConfirmSubmit(true)} 
                                    className="w-full bg-[#003B94] text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#001d4a] transition-all flex items-center justify-center gap-2"
                                >
                                    <Send size={14} /> Enviar Solicitudes ({stagedSocios.length})
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-8">
                            <AlertCircle size={48} className="mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">Lista Vacía</p>
                            <p className="text-[9px] mt-1">Seleccione socios del panel izquierdo</p>
                        </div>
                    )}
                </div>

                {submittedRequests.filter(r => r.status !== 'CANCELLATION_REQUESTED').length > 0 && (
                    <div className="mt-8 pt-8 border-t border-[#003B94]/10">
                        <h4 className="text-[#003B94] font-black uppercase text-xs tracking-widest mb-4">
                            Historial de Envío ({submittedRequests.filter(r => r.status !== 'CANCELLATION_REQUESTED').length})
                        </h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                            {submittedRequests
                                .filter(req => req.status !== 'CANCELLATION_REQUESTED')
                                .map(req => (
                                <div key={req.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 opacity-70">
                                    <span className="text-[10px] font-bold uppercase text-[#001d4a]">{req.socio_name}</span>
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : 
                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 
                                        'bg-amber-100 text-amber-600'
                                    }`}>
                                        {req.status === 'APPROVED' ? 'Aprobado' : 
                                         req.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {showConfirmSubmit && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200" >
                <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.3)] text-center border border-white">
                    <div className="w-16 h-16 bg-[#003B94] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-white shadow-lg"><Send size={32} /></div>
                    <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-3">Confirmar Envío</h2>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                        <p className="text-gray-700 text-[10px] font-bold uppercase tracking-widest mb-3 leading-relaxed">
                            Se enviarán <strong className="text-[#001d4a]">{stagedSocios.length} solicitudes</strong> para habilitación.
                        </p>
                        <p className="text-amber-700 text-[9px] font-black uppercase tracking-wider leading-relaxed border-t border-amber-200 pt-3 mt-3">
                            ⚠️ IMPORTANTE:<br/>
                            Una vez enviadas, las solicitudes <strong>NO podrán ser modificadas</strong>.<br/>
                            Para agregar más socios, deberá <strong>solicitar una cancelación</strong> que será revisada por los administradores.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowConfirmSubmit(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Revisar</button>
                        <button onClick={confirmSubmit} className="flex-1 py-3 rounded-xl bg-[#001d4a] text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-[#003B94] transition-all">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        {showCancelAllModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200" >
                <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.3)] text-center border border-white">
                    <div className="w-16 h-16 bg-red-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner"><Trash2 size={32} /></div>
                    <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-2">Vaciar Lista</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6 leading-relaxed">¿Seguro que deseas eliminar todos los socios de la lista de envío? Esta acción no se puede deshacer.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowCancelAllModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button onClick={confirmClearStage} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-red-600 transition-all">Eliminar Todo</button>
                    </div>
                </div>
            </div>
        )}

        {showCancelRequestModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200" >
                <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.3)] text-center border border-white">
                    <div className="w-16 h-16 bg-amber-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner"><AlertCircle size={32} /></div>
                    <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-2">Solicitar Cancelación</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6 leading-relaxed">
                        ¿Desea solicitar la cancelación de todas las solicitudes enviadas?<br/>
                        Esta solicitud será revisada por los administradores. Una vez aprobada, podrá modificar la lista de socios.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowCancelRequestModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button onClick={requestCancellation} className="flex-1 py-3 rounded-xl bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-amber-600 transition-all">Solicitar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default HabilitacionesPresident;
