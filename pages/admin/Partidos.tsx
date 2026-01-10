
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Sword, Calendar, MapPin, Edit2, Trash2, Plus, Search, X, Save, Ticket, AlertTriangle, Loader2, CheckCircle2, Ban } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Match, Team, Competition } from '../../types';
import { COUNTRY_OPTIONS, BocaLogoSVG } from '../../constants';
import { formatDateDisplay, formatDateToDB } from '../../utils/dateFormat';

// Constants for dropdowns
const FECHAS = Array.from({ length: 27 }, (_, i) => `Fecha ${i + 1}`);

// Fonction pour formater l'heure au format hh:mm hs (sans secondes)
const formatHourDisplay = (hourStr: string) => {
    if (!hourStr) return '--:-- hs';
    // Si l'heure contient déjà "hs", on la nettoie
    const cleaned = hourStr.replace(/\s*hs\s*/i, '').trim();
    
    // Si l'heure est au format HH:mm:ss, on supprime les secondes
    if (cleaned.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
        const [h, m] = cleaned.split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')} hs`;
    }
    
    // Si l'heure est au format HH:mm, on l'utilise directement
    if (cleaned.match(/^\d{1,2}:\d{2}$/)) {
        const [h, m] = cleaned.split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')} hs`;
    }
    
    // Sinon, on retourne tel quel avec "hs"
    return `${cleaned} hs`;
};

export const Partidos = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [settings, setSettings] = useState(dataService.getAppSettings());
  
  // Modal States
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [deletingMatch, setDeletingMatch] = useState<Match | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [closingDateError, setClosingDateError] = useState<string | null>(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Filters for Edit Form
  const [rivalCountryFilter, setRivalCountryFilter] = useState('AR');

  // Load Data
  useEffect(() => {
      const load = () => {
          setMatches(dataService.getMatches());
          setTeams(dataService.getTeams());
          setCompetitions(dataService.getCompetitions());
          setSettings(dataService.getAppSettings());
      };
      load();
      const unsub = dataService.subscribe(load);
      return () => unsub();
  }, []);

  // Sort Matches: Fecha Number then Date
  const sortedMatches = useMemo(() => {
      return [...matches].sort((a, b) => {
          const getFechaNum = (str?: string) => {
              if(!str) return 999;
              const match = str.match(/\d+/);
              return match ? parseInt(match[0], 10) : 999;
          };

          const numA = getFechaNum(a.fecha_jornada);
          const numB = getFechaNum(b.fecha_jornada);

          if (numA !== numB) return numA - numB;
          
          return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [matches]);


  // Handlers
  const handleCreate = () => {
      setEditingMatch({
          id: Date.now(), // Temp ID
          is_home: true,
          is_neutral: false,
          is_suspended: false,
          date: '', hour: '', venue: 'La Bombonera', city: 'Buenos Aires',
          rival: '', rival_short: '', rival_country: 'AR', competition: '',
          fecha_jornada: '',
          apertura_date: '', apertura_hour: '10:00', cierre_date: '', cierre_hour: '20:00',
          competition_id: undefined,
          rival_id: undefined
      });
      setRivalCountryFilter('AR');
  };

  const handleEdit = (m: Match) => {
      // Convertir les dates depuis le format DB (YYYY-MM-DD) vers le format du formulaire (DD/MM/YYYY)
      const convertDateFromDB = (dateStr: string | undefined): string => {
          if (!dateStr) return '';
          // Si déjà au format DD/MM/YYYY, on le garde
          if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr;
          // Si au format YYYY-MM-DD, on le convertit en DD/MM/YYYY
          if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [y, m, d] = dateStr.split('-');
              return `${d}/${m}/${y}`;
          }
          // Si au format jj-mm-aaaa, on le convertit en DD/MM/YYYY
          if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
              const [d, m, y] = dateStr.split('-');
              return `${d}/${m}/${y}`;
          }
          return dateStr;
      };
      
      // Préserver l'ID original (UUID) pour les mises à jour
      const originalId = (m as any)._originalId;
      
      setEditingMatch({ 
          ...m,
          _originalId: originalId, // Préserver l'ID original
          date: convertDateFromDB(m.date),
          apertura_date: convertDateFromDB(m.apertura_date),
          cierre_date: convertDateFromDB(m.cierre_date)
      } as any);
      const team = teams.find(t => t.name === m.rival);
      if(team) setRivalCountryFilter(team.country_id);
  };

  const handleDelete = async () => {
      if (deletingMatch) {
          setIsSaving(true);
          try {
              await dataService.deleteMatch(deletingMatch.id);
          } catch(e) {
              alert("Error al eliminar el partido.");
          } finally {
              setIsSaving(false);
              setDeletingMatch(null);
          }
      }
  };

  const handleSave = async () => {
      if (!editingMatch?.rival || !editingMatch.date) return;
      setIsSaving(true);
      
      // Convertir les dates au format YYYY-MM-DD pour la base de données
      const convertDateToDB = (dateStr: string | undefined): string => {
          if (!dateStr) return '';
          // Utiliser formatDateToDB qui gère tous les formats
          const converted = formatDateToDB(dateStr);
          return converted || '';
      };
      
      // Préserver l'ID original si disponible (pour les matchs existants)
      const originalId = (editingMatch as any)._originalId;
      
      const payload: Match & { _originalId?: string | number } = {
          id: editingMatch.id || Date.now(),
          _originalId: originalId, // Préserver l'ID original pour les mises à jour
          rival: editingMatch.rival || '',
          rival_short: editingMatch.rival_short || '',
          rival_country: editingMatch.rival_country || 'AR',
          competition: editingMatch.competition || '',
          date: convertDateToDB(editingMatch.date) || '',
          hour: editingMatch.hour || '',
          venue: editingMatch.venue || 'La Bombonera',
          city: editingMatch.city || 'Buenos Aires',
          is_home: editingMatch.is_home !== undefined ? editingMatch.is_home : true,
          is_neutral: editingMatch.is_neutral !== undefined ? editingMatch.is_neutral : false,
          fecha_jornada: editingMatch.fecha_jornada || '',
          is_suspended: editingMatch.is_suspended !== undefined ? editingMatch.is_suspended : false,
          apertura_date: convertDateToDB(editingMatch.apertura_date) || '',
          apertura_hour: editingMatch.apertura_hour || '10:00',
          cierre_date: convertDateToDB(editingMatch.cierre_date) || '',
          cierre_hour: editingMatch.cierre_hour || '20:00',
          competition_id: editingMatch.competition_id || undefined,
          rival_id: editingMatch.rival_id || undefined
      };
      
      try {
        // Vérifier si c'est un nouveau match ou une mise à jour
        // Un match existe si :
        // 1. Il a un _originalId (UUID) - c'est un match existant
        // 2. Son ID correspond à un match existant dans la liste
        const isExistingMatch = originalId !== undefined || matches.some(m => {
            const mOriginalId = (m as any)._originalId;
            
            // Si le match en mémoire a un _originalId, comparer avec ça
            if (mOriginalId !== undefined && originalId !== undefined) {
                return mOriginalId === originalId;
            }
            
            // Si le match en mémoire a un _originalId mais pas le payload, comparer l'ID converti
            if (mOriginalId !== undefined) {
                return false; // Le payload n'a pas d'originalId, donc c'est un nouveau match
            }
            
            // Comparer avec l'ID converti, mais seulement si ce n'est pas un ID temporaire (Date.now())
            // Les IDs Date.now() sont > 1000000000000 (13 chiffres)
            if (payload.id && payload.id < 1000000000000) {
                return m.id === payload.id;
            }
            
            return false;
        });
        
        if (isExistingMatch) {
            // Match existant : mise à jour
            await dataService.updateMatch(payload);
        } else {
            // Nouveau match : création (sans ID, Supabase le générera)
            const newMatch = { ...payload };
            delete (newMatch as any).id;
            delete (newMatch as any)._originalId;
            await dataService.addMatch(newMatch);
        }
      } catch(e: any) {
          console.error("Error al guardar el partido:", e);
          alert(`Error al guardar el partido: ${e.message || 'Error desconocido'}`);
      } finally {
        setIsSaving(false);
        setEditingMatch(null);
      }
  };

  const handleLocationChange = (loc: 'LOCAL' | 'VISITANTE' | 'NEUTRAL') => {
      if (!editingMatch) return;
      if (loc === 'LOCAL') setEditingMatch({ ...editingMatch, is_home: true, is_neutral: false, venue: 'La Bombonera', city: 'Buenos Aires' });
      else if (loc === 'VISITANTE') setEditingMatch({ ...editingMatch, is_home: false, is_neutral: false, venue: '', city: '' });
      else setEditingMatch({ ...editingMatch, is_home: false, is_neutral: true, venue: '', city: '' });
  };

  const handleCompetitionChange = (id: string) => {
      const comp = competitions.find(c => c.id === id);
      setEditingMatch(prev => ({ ...prev, competition_id: id, competition: comp?.name || '' }));
  };

  const handleRivalCountryChange = (code: string) => {
      setRivalCountryFilter(code);
      setEditingMatch(prev => ({ ...prev, rival_id: '', rival: '', rival_short: '', rival_country: code }));
  };

  const handleRivalIdChange = (id: string) => {
      const team = teams.find(t => t.id === id);
      if(team) {
          setEditingMatch(prev => ({ 
              ...prev, 
              rival_id: id, 
              rival: team.name, 
              rival_short: team.short_name,
              venue: (!prev?.is_home && !prev?.is_neutral) ? team.stadium : prev?.venue,
              city: (!prev?.is_home && !prev?.is_neutral) ? team.city : prev?.city
          }));
      }
  };

  const handleMatchDateTimeChange = (field: 'date' | 'hour', value: string) => {
      setEditingMatch(prev => ({ ...prev, [field]: value }));
  };

  const handleNeutralStadiumChange = (stadium: string) => {
      const team = teams.find(t => t.stadium === stadium);
      setEditingMatch(prev => ({ ...prev, venue: stadium, city: team?.city || '' }));
  };

  const distinctStadiums = [...new Set(teams.map(t => t.stadium))].map(s => ({ stadium: s }));

  return (
    <div className="space-y-6 pb-20">
       <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex justify-between items-center gap-4">
           <div className="flex items-center gap-2 text-[#003B94]">
               <Sword size={20} />
               <h3 className="text-sm font-black uppercase tracking-widest">Partidos</h3>
           </div>
           <button onClick={handleCreate} className="bg-[#FCB131] text-[#001d4a] px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-[#FFD23F] transition-all">
               <Plus size={14} /> Nuevo
           </button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {sortedMatches.map(m => {
               const isHome = m.is_home && !m.is_neutral;
               const rivalTeam = teams.find(t => t.id === m.rival_id || t.name === m.rival);
               const rivalLogo = rivalTeam?.logo;
               const bocaLogo = settings.matchLogoUrl || null;
               // Réduire la taille des logos pour que tout rentre dans la carte
               const logoMatchSize = Math.min(settings.logoMatchSize || 48, 48);
               const logoRivalSize = Math.min(settings.logoRivalSize || 48, 48);
               
               // Déterminer quelle équipe est locale et laquelle est visiteuse
               const localTeamName = isHome ? 'Boca Juniors' : m.rival;
               const localTeamLogo = isHome ? bocaLogo : rivalLogo;
               const localLogoSize = isHome ? logoMatchSize : logoRivalSize;
               const visitorTeamName = isHome ? m.rival : 'Boca Juniors';
               const visitorTeamLogo = isHome ? rivalLogo : bocaLogo;
               const visitorLogoSize = isHome ? logoRivalSize : logoMatchSize;
               
               return (
               <GlassCard 
                   key={m.id} 
                   className={`relative p-5 group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${
                       isHome 
                           ? 'liquid-glass-dark text-white border-l-[#FCB131]' 
                           : 'liquid-glass border-l-[#003B94]'
                   } ${m.is_suspended ? 'opacity-75' : ''}`}
               >
                   {/* Effets de glow futuristes */}
                   <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                       isHome 
                           ? 'bg-gradient-to-r from-[#FCB131]/10 via-transparent to-[#FCB131]/10' 
                           : 'bg-gradient-to-r from-[#003B94]/10 via-transparent to-[#003B94]/10'
                   }`}></div>
                   
                   {/* Bordure animée */}
                   <div className={`absolute top-0 left-0 w-1 h-full ${
                       isHome ? 'bg-gradient-to-b from-[#FCB131] to-[#FFD23F]' : 'bg-gradient-to-b from-[#003B94] to-[#001d4a]'
                   } shadow-[0_0_20px_rgba(252,177,49,0.5)] group-hover:shadow-[0_0_30px_rgba(252,177,49,0.8)] transition-all duration-500`}></div>
                   
                   {/* Lignes de grille futuristes */}
                   <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                       <div className="absolute inset-0" style={{
                           backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                           backgroundSize: '20px 20px'
                       }}></div>
                   </div>
                   
                   <div className="relative z-10 flex items-center gap-6">
                       {/* GAUCHE: Actions et Competition, Fecha, Date */}
                       <div className="flex-shrink-0 w-48 space-y-2">
                           {/* Actions (stylo, corbeille, suspendre) au-dessus */}
                           <div className="flex items-center gap-2 mb-1">
                               <button 
                                   onClick={() => handleEdit(m)} 
                                   className={`${isHome ? 'text-white hover:bg-white/10' : 'text-[#003B94] hover:bg-blue-50'} p-1.5 rounded transition-all`}
                                   title="Editar"
                               >
                                   <Edit2 size={14}/>
                               </button>
                               <button 
                                   onClick={() => setDeletingMatch(m)} 
                                   className={`${isHome ? 'text-red-300 hover:bg-red-500/20' : 'text-red-500 hover:bg-red-50'} p-1.5 rounded transition-all`}
                                   title="Eliminar"
                               >
                                   <Trash2 size={14}/>
                               </button>
                               {/* Bouton suspendre uniquement pour les matchs locaux */}
                               {isHome && (
                                   <button 
                                       onClick={async () => {
                                           const updatedMatch = { ...m, is_suspended: !m.is_suspended };
                                           const originalId = (m as any)._originalId;
                                           if (originalId) {
                                               await dataService.updateMatch({ ...updatedMatch, _originalId: originalId } as any);
                                           } else {
                                               await dataService.updateMatch(updatedMatch as any);
                                           }
                                           setMatches(dataService.getMatches());
                                       }}
                                       className={`${m.is_suspended 
                                           ? 'text-yellow-300 hover:bg-yellow-500/20' 
                                           : 'text-white/70 hover:bg-white/10'
                                       } p-1.5 rounded transition-all`}
                                       title={m.is_suspended ? "Activar habilitaciones" : "Suspendre habilitaciones"}
                                   >
                                       <Ban size={14} className={m.is_suspended ? 'fill-current' : ''}/>
                                   </button>
                               )}
                           </div>
                           
                           {/* Competition sur une ligne */}
                           <div className="relative">
                               <span className={`text-[9px] font-bold uppercase tracking-widest ${isHome ? 'text-white/70' : 'text-gray-400'}`}>{m.competition}</span>
                               <div className={`absolute -left-2 top-0 bottom-0 w-0.5 ${isHome ? 'bg-[#FCB131]/30' : 'bg-[#003B94]/30'} group-hover:bg-opacity-100 transition-all duration-500`}></div>
                           </div>
                           
                           {/* Fecha en dessous, plus grande et colorée */}
                           {m.fecha_jornada && (
                               <div className="relative">
                                   <span className={`oswald text-3xl md:text-4xl font-black uppercase tracking-tighter drop-shadow-lg ${
                                       isHome 
                                           ? 'text-[#FCB131] [text-shadow:0_0_20px_rgba(252,177,49,0.5),0_2px_4px_rgba(0,0,0,0.3)]' 
                                           : '[text-shadow:0_0_15px_rgba(0,29,74,0.4),0_2px_4px_rgba(0,0,0,0.2)]'
                                   }`} style={!isHome ? { color: 'rgba(0, 29, 74, 1)' } : undefined}>
                                       {m.fecha_jornada}
                                   </span>
                               </div>
                           )}
                           
                           {/* Date en dessous */}
                           <div className={`text-xs font-bold flex items-center gap-2 ${isHome ? 'text-white/80' : 'text-gray-500'}`} style={!isHome ? { color: 'rgba(0, 0, 0, 1)' } : undefined}>
                               <Calendar size={12} className={isHome ? 'text-[#FCB131]/70' : 'text-[#003B94]/70'} /> 
                               {formatDateDisplay(m.date)}
                           </div>
                           
                           {m.is_suspended && (
                               <div className="text-[8px] font-black uppercase tracking-widest text-red-500 bg-red-50/80 backdrop-blur-sm px-2 py-1 rounded border border-red-200/50 inline-block shadow-lg">
                                   Habilitaciones Suspendidas
                               </div>
                           )}
                       </div>

                       {/* CENTRE: Logos des équipes avec noms en dessous */}
                       <div className="flex-1 flex items-center justify-center gap-3">
                           {/* Équipe locale (à gauche) */}
                           <div className="flex flex-col items-center gap-3">
                               {/* Logo de l'équipe locale */}
                               <div className="relative flex-shrink-0 group/logo">
                                   {/* Glow effect autour du logo */}
                                   <div className={`absolute inset-0 rounded-full blur-xl opacity-0 group-hover/logo:opacity-50 transition-opacity duration-500 ${
                                       isHome ? 'bg-[#FCB131]/30' : 'bg-[#003B94]/30'
                                   }`} style={{ transform: 'scale(1.5)' }}></div>
                                   
                                   <div className="relative z-10 p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 group-hover:border-white/20 transition-all duration-300">
                                       {isHome ? (
                                           bocaLogo ? (
                                               <img 
                                                   src={bocaLogo} 
                                                   alt="Boca Juniors" 
                                                   style={{ width: `${logoMatchSize}px`, height: `${logoMatchSize}px` }}
                                                   className="object-contain drop-shadow-[0_0_20px_rgba(252,177,49,0.3)] group-hover/logo:scale-110 transition-transform duration-300"
                                               />
                                           ) : (
                                               <div className="drop-shadow-[0_0_20px_rgba(252,177,49,0.3)] group-hover/logo:scale-110 transition-transform duration-300">
                                                   <BocaLogoSVG 
                                                       style={{ width: `${logoMatchSize}px`, height: `${logoMatchSize}px` }}
                                                   />
                                               </div>
                                           )
                                       ) : (
                                           rivalLogo ? (
                                               <img 
                                                   src={rivalLogo} 
                                                   alt={m.rival} 
                                                   style={{ width: `${logoRivalSize}px`, height: `${logoRivalSize}px` }}
                                                   className="object-contain drop-shadow-lg group-hover/logo:scale-110 transition-transform duration-300"
                                                   onError={(e) => {
                                                       (e.target as HTMLImageElement).style.display = 'none';
                                                   }}
                                               />
                                           ) : (
                                               <div style={{ width: `${logoRivalSize}px`, height: `${logoRivalSize}px` }} className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center border border-gray-300/50 shadow-inner">
                                                   <span className="text-[10px] font-bold text-gray-500">{m.rival_short || m.rival.substring(0, 3).toUpperCase()}</span>
                                               </div>
                                           )
                                       )}
                                   </div>
                               </div>
                               {/* Nom de l'équipe locale en dessous */}
                               <span className={`text-xs font-black uppercase tracking-tight text-center max-w-[120px] truncate ${
                                   isHome 
                                       ? 'text-white drop-shadow-md' 
                                       : 'text-[#001d4a]'
                               }`}>
                                   {localTeamName}
                               </span>
                           </div>
                           
                           {/* VS avec style futuriste */}
                           <div className="relative flex-shrink-0">
                               <div className={`absolute inset-0 blur-xl opacity-30 ${
                                   isHome ? 'bg-[#FCB131]' : 'bg-[#003B94]'
                               }`}></div>
                               <span className={`relative text-xl font-black ${
                                   isHome ? 'text-white/90' : 'text-[#003B94]'
                               } drop-shadow-lg`}>VS</span>
                           </div>
                           
                           {/* Équipe visiteuse (à droite) */}
                           <div className="flex flex-col items-center gap-3">
                               {/* Logo de l'équipe visiteuse */}
                               <div className="relative flex-shrink-0 group/logo">
                                   {/* Glow effect autour du logo */}
                                   <div className={`absolute inset-0 rounded-full blur-xl opacity-0 group-hover/logo:opacity-50 transition-opacity duration-500 ${
                                       isHome ? 'bg-[#FCB131]/30' : 'bg-[#003B94]/30'
                                   }`} style={{ transform: 'scale(1.5)' }}></div>
                                   
                                   <div className="relative z-10 p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 group-hover:border-white/20 transition-all duration-300">
                                       {isHome ? (
                                           rivalLogo ? (
                                               <img 
                                                   src={rivalLogo} 
                                                   alt={m.rival} 
                                                   style={{ width: `${logoRivalSize}px`, height: `${logoRivalSize}px` }}
                                                   className="object-contain drop-shadow-lg group-hover/logo:scale-110 transition-transform duration-300"
                                                   onError={(e) => {
                                                       (e.target as HTMLImageElement).style.display = 'none';
                                                   }}
                                               />
                                           ) : (
                                               <div style={{ width: `${logoRivalSize}px`, height: `${logoRivalSize}px` }} className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center border border-gray-300/50 shadow-inner">
                                                   <span className="text-[10px] font-bold text-gray-500">{m.rival_short || m.rival.substring(0, 3).toUpperCase()}</span>
                                               </div>
                                           )
                                       ) : (
                                           bocaLogo ? (
                                               <img 
                                                   src={bocaLogo} 
                                                   alt="Boca Juniors" 
                                                   style={{ width: `${logoMatchSize}px`, height: `${logoMatchSize}px` }}
                                                   className="object-contain drop-shadow-[0_0_20px_rgba(0,59,148,0.3)] group-hover/logo:scale-110 transition-transform duration-300"
                                               />
                                           ) : (
                                               <div className="drop-shadow-[0_0_20px_rgba(0,59,148,0.3)] group-hover/logo:scale-110 transition-transform duration-300">
                                                   <BocaLogoSVG 
                                                       style={{ width: `${logoMatchSize}px`, height: `${logoMatchSize}px` }}
                                                   />
                                               </div>
                                           )
                                       )}
                                   </div>
                               </div>
                               {/* Nom de l'équipe visiteuse en dessous */}
                               <span className={`text-xs font-black uppercase tracking-tight text-center max-w-[120px] truncate ${
                                   isHome 
                                       ? 'text-white drop-shadow-md' 
                                       : 'text-[#001d4a]'
                               }`}>
                                   {visitorTeamName}
                               </span>
                       </div>
                   </div>
                   </div>
               </GlassCard>
           )})}
       </div>

      {editingMatch && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="liquid-glass-dark p-3 flex items-center justify-between text-white">
               <div className="flex items-center gap-2">
                  <Edit2 size={16} className="text-[#FCB131]" />
                  <h2 className="oswald text-base font-black uppercase tracking-tighter">
                      {matches.some(m => m.id === editingMatch.id) ? 'Editar Partido' : 'Nuevo Partido'}
                  </h2>
               </div>
               <button onClick={() => !isSaving && setEditingMatch(null)} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <X size={16} />
               </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                {/* 1. Condition (Location Switcher) */}
                <div>
                    <label className="text-[8px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1 mb-0.5 block">Condición</label>
                    <div className="bg-gradient-to-br from-[#001d4a] to-[#003B94] p-0.5 rounded-lg flex shadow-lg">
                        {['LOCAL', 'NEUTRAL', 'VISITANTE'].map((tab) => {
                            const isActive = (tab === 'LOCAL' && editingMatch.is_home && !editingMatch.is_neutral) || (tab === 'NEUTRAL' && editingMatch.is_neutral) || (tab === 'VISITANTE' && !editingMatch.is_home && !editingMatch.is_neutral);
                            return (<button key={tab} onClick={() => handleLocationChange(tab as any)} className={`flex-1 py-1.5 text-[8px] font-black tracking-widest uppercase transition-all rounded-md ${isActive ? 'bg-white text-[#003B94] shadow-sm' : 'text-white/70 hover:text-white'}`}>{tab}</button>);
                        })}
                    </div>
                </div>

                {/* 2. Competition & Jornada */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Competición</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-[9px] text-[#001d4a] outline-none" value={editingMatch.competition_id || ''} onChange={e => handleCompetitionChange(e.target.value)}><option value="">Seleccionar...</option>{competitions.map(comp => <option key={comp.id} value={comp.id}>{comp.name}</option>)}</select></div>
                    <div className="space-y-0.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha/Jornada</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-[9px] text-[#001d4a] outline-none" value={editingMatch.fecha_jornada || ''} onChange={e => setEditingMatch({...editingMatch, fecha_jornada: e.target.value})}>{FECHAS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                </div>

                {/* 3. Rival Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-0.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">País</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-[9px] text-[#001d4a] outline-none" value={rivalCountryFilter} onChange={e => handleRivalCountryChange(e.target.value)}>{COUNTRY_OPTIONS.map(c => (<option key={c.code} value={c.code}>{c.name}</option>))}</select></div>
                    <div className="space-y-0.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Equipo Rival</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-[9px] text-[#001d4a] outline-none" value={editingMatch.rival_id || ''} onChange={e => handleRivalIdChange(e.target.value)}><option value="">Seleccionar Equipo...</option>{teams.filter(t => t.country_id === rivalCountryFilter).sort((a,b) => a.name.localeCompare(b.name)).map(r => (<option key={r.id} value={r.id}>{r.name} ({r.short_name})</option>))}</select></div>
                </div>

                {/* 5. Date & Hour */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha</label><input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-[9px] text-[#001d4a] outline-none" value={editingMatch.date?.split('/').reverse().join('-')} onChange={e => { const val = e.target.value; if(val) { const [y, m, d] = val.split('-'); handleMatchDateTimeChange('date', `${d}/${m}/${y}`); } }} /></div>
                    <div className="space-y-0.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Hora</label><input type="time" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-[9px] text-[#001d4a] outline-none" value={editingMatch.hour || ''} onChange={e => handleMatchDateTimeChange('hour', e.target.value)} /></div>
                </div>

                {/* 6. Stadium & City */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Estadio</label>{editingMatch.is_neutral ? (<select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-[9px] text-[#001d4a] outline-none" value={editingMatch.venue || ''} onChange={e => handleNeutralStadiumChange(e.target.value)}><option value="">Seleccionar Estadio Neutral...</option>{distinctStadiums.map(s => <option key={s.stadium} value={s.stadium}>{s.stadium}</option>)}</select>) : (<input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-[9px] text-[#001d4a] outline-none" value={editingMatch.venue || ''} onChange={e => setEditingMatch({...editingMatch, venue: e.target.value})} />)}</div>
                    <div className="space-y-0.5"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Ciudad</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-[9px] text-[#001d4a] outline-none" value={editingMatch.city || ''} onChange={e => setEditingMatch({...editingMatch, city: e.target.value})} /></div>
                </div>

                {/* 7. Habilitation Window */}
                {(editingMatch.is_home || editingMatch.is_neutral) && (
                    <div className="bg-[#001d4a] border border-[#FCB131]/30 rounded-lg p-3 relative overflow-hidden mt-2 shadow-lg">
                        <Ticket className="absolute top-1 right-1 text-white/5 w-16 h-16 rotate-12" />
                        <div className="flex items-center gap-1.5 mb-2 relative z-10">
                            <div className="bg-[#FCB131] p-1 rounded-md text-[#001d4a] shadow-sm"><Ticket size={10} strokeWidth={3} /></div>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">Ventana de Habilitación</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <div className="space-y-0.5">
                                <span className="text-[7px] font-black text-white/70 uppercase tracking-widest block mb-0.5">Apertura</span>
                                <div className="flex gap-1.5">
                                    <input type="date" className="flex-1 bg-white/90 border border-transparent rounded-lg py-1 px-1.5 font-bold text-[9px] text-[#001d4a] outline-none focus:border-[#FCB131] transition-colors shadow-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" value={editingMatch.apertura_date?.split('/').reverse().join('-')} onChange={e => { const val = e.target.value; if(val) { const [y, m, d] = val.split('-'); setEditingMatch({...editingMatch, apertura_date: `${d}/${m}/${y}`}) } }} />
                                    <input type="time" className="w-16 bg-white/90 border border-transparent rounded-lg py-1 px-1 font-bold text-[9px] text-[#001d4a] outline-none text-center focus:border-[#FCB131] transition-colors shadow-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" value={editingMatch.apertura_hour || ''} onChange={e => setEditingMatch({...editingMatch, apertura_hour: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-0.5">
                                <span className="text-[7px] font-black text-white/70 uppercase tracking-widest block mb-0.5">Cierre</span>
                                <div className="flex gap-1.5">
                                    <input type="date" className={`flex-1 bg-white/90 border rounded-lg py-1 px-1.5 font-bold text-[9px] text-[#001d4a] outline-none transition-colors shadow-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden ${closingDateError ? 'border-red-500' : 'border-transparent focus:border-[#FCB131]'}`} value={editingMatch.cierre_date?.split('/').reverse().join('-')} onChange={e => { const val = e.target.value; if(val) { const [y, m, d] = val.split('-'); setEditingMatch({...editingMatch, cierre_date: `${d}/${m}/${y}`}) } }} />
                                    <input type="time" className="w-16 bg-white/90 border border-transparent rounded-lg py-1 px-1 font-bold text-[9px] text-[#001d4a] outline-none text-center focus:border-[#FCB131] transition-colors shadow-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" value={editingMatch.cierre_hour || ''} onChange={e => setEditingMatch({...editingMatch, cierre_hour: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        
                        {closingDateError && (
                            <div className="mt-2 flex items-center gap-1.5 text-white bg-red-500/20 p-1.5 rounded-lg border border-red-500/30 animate-pulse">
                                <AlertTriangle size={10} />
                                <span className="text-[7px] font-bold uppercase tracking-wide">{closingDateError}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
               <button onClick={() => !isSaving && setEditingMatch(null)} disabled={isSaving} className="px-4 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest text-[#001d4a] bg-white border border-gray-200 hover:bg-gray-100 transition-all">Cancelar</button>
               <button onClick={() => setShowSaveConfirm(true)} disabled={!!closingDateError || isSaving} className={`px-5 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest text-white shadow-lg transition-all ${!!closingDateError ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#003B94] hover:bg-[#001d4a]'}`}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {showSaveConfirm && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="relative w-full max-w-md bg-white rounded-[2rem] p-10 shadow-[0_50px_150px_rgba(0,29,74,0.3)] text-center border border-white animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-[#FCB131]/10 text-[#FCB131] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle2 size={40} /></div>
                  <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter">¿Guardar Cambios?</h2>
                  <p className="text-[#003B94]/70 font-bold mb-10 text-[10px] leading-relaxed uppercase tracking-widest">Se guardará la información del partido en el sistema.</p>
                  <div className="flex gap-4">
                      <button onClick={() => setShowSaveConfirm(false)} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 uppercase text-[9px] font-black tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                      <button onClick={() => { setShowSaveConfirm(false); handleSave(); }} className="flex-1 py-4 rounded-xl bg-[#003B94] text-white uppercase text-[9px] font-black tracking-widest shadow-2xl hover:opacity-90 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {deletingMatch && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl text-center border border-white animate-in zoom-in-95 overflow-hidden">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100">
                      <AlertTriangle size={32} />
                  </div>
                  <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter">Eliminar Partido</h2>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6 leading-relaxed">
                      ¿Estás seguro de eliminar el partido <br/>
                      <strong className="text-[#001d4a]">vs {deletingMatch.rival}</strong>?
                  </p>
                  <div className="flex gap-4">
                      <button onClick={() => setDeletingMatch(null)} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                      <button 
                          onClick={handleDelete} 
                          disabled={isSaving}
                          className="flex-1 py-3 rounded-xl bg-red-500 text-white uppercase text-[9px] font-black tracking-widest shadow-2xl hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                      >
                          {isSaving ? <Loader2 size={14} className="animate-spin"/> : 'Eliminar'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Partidos;
