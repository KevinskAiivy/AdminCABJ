
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Sword, Calendar, MapPin, Edit2, Trash2, Plus, Search, X, Save, Ticket, AlertTriangle, Loader2 } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Match, Team, Competition } from '../../types';
import { COUNTRY_OPTIONS } from '../../constants';

// Constants for dropdowns
const FECHAS = Array.from({ length: 27 }, (_, i) => `Fecha ${i + 1}`);

export const Partidos = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  
  // Modal States
  const [editingMatch, setEditingMatch] = useState<Partial<Match> | null>(null);
  const [deletingMatch, setDeletingMatch] = useState<Match | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [closingDateError, setClosingDateError] = useState<string | null>(null);

  // Filters for Edit Form
  const [rivalCountryFilter, setRivalCountryFilter] = useState('AR');

  // Load Data
  useEffect(() => {
      const load = () => {
          setMatches(dataService.getMatches());
          setTeams(dataService.getTeams());
          setCompetitions(dataService.getCompetitions());
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

          const numA = getFechaNum(a.fechaJornada);
          const numB = getFechaNum(b.fechaJornada);

          if (numA !== numB) return numA - numB;
          
          return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [matches]);


  // Handlers
  const handleCreate = () => {
      setEditingMatch({
          id: Date.now(), // Temp ID
          isHome: true,
          isNeutral: false,
          isSuspended: false,
          date: '', hour: '', venue: 'La Bombonera', city: 'Buenos Aires',
          rival: '', rivalShort: '', rivalCountry: 'AR', competition: '',
          fechaJornada: '',
          aperturaDate: '', aperturaHour: '10:00', cierreDate: '', cierreHour: '20:00',
          competitionId: undefined,
          rivalId: undefined
      });
      setRivalCountryFilter('AR');
  };

  const handleEdit = (m: Match) => {
      setEditingMatch({ ...m });
      const team = teams.find(t => t.name === m.rival);
      if(team) setRivalCountryFilter(team.countryId);
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
      
      const payload: Match = {
          id: editingMatch.id || Date.now(),
          rival: editingMatch.rival || '',
          rivalShort: editingMatch.rivalShort || '',
          rivalCountry: editingMatch.rivalCountry || 'AR',
          competition: editingMatch.competition || '',
          date: editingMatch.date || '',
          hour: editingMatch.hour || '',
          venue: editingMatch.venue || 'La Bombonera',
          city: editingMatch.city || 'Buenos Aires',
          isHome: editingMatch.isHome !== undefined ? editingMatch.isHome : true,
          isNeutral: editingMatch.isNeutral !== undefined ? editingMatch.isNeutral : false,
          fechaJornada: editingMatch.fechaJornada || '',
          isSuspended: editingMatch.isSuspended !== undefined ? editingMatch.isSuspended : false,
          aperturaDate: editingMatch.aperturaDate || '',
          aperturaHour: editingMatch.aperturaHour || '10:00',
          cierreDate: editingMatch.cierreDate || '',
          cierreHour: editingMatch.cierreHour || '20:00',
          competitionId: editingMatch.competitionId || undefined,
          rivalId: editingMatch.rivalId || undefined
      };
      try {
        if (matches.some(m => m.id === payload.id)) {
            await dataService.updateMatch(payload);
        } else {
            await dataService.addMatch(payload);
        }
      } catch(e) {
          alert("Error al guardar el partido.");
      } finally {
        setIsSaving(false);
        setEditingMatch(null);
      }
  };

  const handleLocationChange = (loc: 'LOCAL' | 'VISITANTE' | 'NEUTRAL') => {
      if (!editingMatch) return;
      if (loc === 'LOCAL') setEditingMatch({ ...editingMatch, isHome: true, isNeutral: false, venue: 'La Bombonera', city: 'Buenos Aires' });
      else if (loc === 'VISITANTE') setEditingMatch({ ...editingMatch, isHome: false, isNeutral: false, venue: '', city: '' });
      else setEditingMatch({ ...editingMatch, isHome: false, isNeutral: true, venue: '', city: '' });
  };

  const handleCompetitionChange = (id: string) => {
      const comp = competitions.find(c => c.id === id);
      setEditingMatch(prev => ({ ...prev, competitionId: id, competition: comp?.name || '' }));
  };

  const handleRivalCountryChange = (code: string) => {
      setRivalCountryFilter(code);
      setEditingMatch(prev => ({ ...prev, rivalId: '', rival: '', rivalShort: '', rivalCountry: code }));
  };

  const handleRivalIdChange = (id: string) => {
      const team = teams.find(t => t.id === id);
      if(team) {
          setEditingMatch(prev => ({ 
              ...prev, 
              rivalId: id, 
              rival: team.name, 
              rivalShort: team.shortName,
              venue: (!prev?.isHome && !prev?.isNeutral) ? team.stadium : prev?.venue,
              city: (!prev?.isHome && !prev?.isNeutral) ? team.city : prev?.city
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

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {sortedMatches.map(m => (
               <GlassCard key={m.id} className="p-5 border-l-4 border-l-[#003B94] group">
                   <div className="flex justify-between items-start mb-3">
                       <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{m.competition}</span>
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button onClick={() => handleEdit(m)} className="text-[#003B94] hover:bg-blue-50 p-1.5 rounded"><Edit2 size={14}/></button>
                           <button onClick={() => setDeletingMatch(m)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={14}/></button>
                       </div>
                   </div>
                   <h3 className="oswald text-xl font-black text-[#001d4a] uppercase mb-1">vs {m.rival}</h3>
                   <div className="text-xs font-bold text-gray-500 flex items-center gap-2">
                       <Calendar size={12} /> {m.date} <span className="text-[#FCB131]">•</span> {m.hour} hs
                   </div>
                   <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#003B94]">
                       <MapPin size={12} /> {m.venue}
                   </div>
               </GlassCard>
           ))}
       </div>

      {editingMatch && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
          <div className="relative w-full max-w-4xl bg-white rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-7rem-2rem)] animate-in zoom-in-95 duration-300">
            <div className="liquid-glass-dark p-4 flex items-center justify-between text-white">
               <div className="flex items-center gap-3">
                  <Edit2 size={18} className="text-[#FCB131]" />
                  <h2 className="oswald text-lg font-black uppercase tracking-tighter">
                      {matches.some(m => m.id === editingMatch.id) ? 'Editar Partido' : 'Nuevo Partido'}
                  </h2>
               </div>
               <button onClick={() => !isSaving && setEditingMatch(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <X size={18} />
               </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* 1. Condition (Location Switcher) */}
                <div>
                    <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1 mb-1 block">Condición</label>
                    <div className="bg-gray-100 p-1 rounded-xl flex">
                        {['LOCAL', 'NEUTRAL', 'VISITANTE'].map((tab) => {
                            const isActive = (tab === 'LOCAL' && editingMatch.isHome && !editingMatch.isNeutral) || (tab === 'NEUTRAL' && editingMatch.isNeutral) || (tab === 'VISITANTE' && !editingMatch.isHome && !editingMatch.isNeutral);
                            return (<button key={tab} onClick={() => handleLocationChange(tab as any)} className={`flex-1 py-2 text-[9px] font-black tracking-widest uppercase transition-all rounded-lg ${isActive ? 'bg-white text-[#003B94] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{tab}</button>);
                        })}
                    </div>
                </div>

                {/* 2. Competition & Jornada */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Competición</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.competitionId || ''} onChange={e => handleCompetitionChange(e.target.value)}><option value="">Seleccionar...</option>{competitions.map(comp => <option key={comp.id} value={comp.id}>{comp.name}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha/Jornada</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.fechaJornada || ''} onChange={e => setEditingMatch({...editingMatch, fechaJornada: e.target.value})}>{FECHAS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                </div>

                {/* 3. Rival Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">País</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={rivalCountryFilter} onChange={e => handleRivalCountryChange(e.target.value)}>{COUNTRY_OPTIONS.map(c => (<option key={c.code} value={c.code}>{c.name}</option>))}</select></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Equipo Rival</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.rivalId || ''} onChange={e => handleRivalIdChange(e.target.value)}><option value="">Seleccionar Equipo...</option>{teams.filter(t => t.countryId === rivalCountryFilter).sort((a,b) => a.name.localeCompare(b.name)).map(r => (<option key={r.id} value={r.id}>{r.name} ({r.shortName})</option>))}</select></div>
                </div>

                {/* 5. Date & Hour */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha</label><input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.date?.split('/').reverse().join('-')} onChange={e => { const val = e.target.value; if(val) { const [y, m, d] = val.split('-'); handleMatchDateTimeChange('date', `${d}/${m}/${y}`); } }} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Hora</label><input type="time" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.hour || ''} onChange={e => handleMatchDateTimeChange('hour', e.target.value)} /></div>
                </div>

                {/* 6. Stadium & City */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Estadio</label>{editingMatch.isNeutral ? (<select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.venue || ''} onChange={e => handleNeutralStadiumChange(e.target.value)}><option value="">Seleccionar Estadio Neutral...</option>{distinctStadiums.map(s => <option key={s.stadium} value={s.stadium}>{s.stadium}</option>)}</select>) : (<input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.venue || ''} onChange={e => setEditingMatch({...editingMatch, venue: e.target.value})} />)}</div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Ciudad</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.city || ''} onChange={e => setEditingMatch({...editingMatch, city: e.target.value})} /></div>
                </div>

                {/* 7. Habilitation Window */}
                {(editingMatch.isHome || editingMatch.isNeutral) && (
                    <div className="bg-[#001d4a] border border-[#FCB131]/30 rounded-xl p-4 relative overflow-hidden mt-4 shadow-lg">
                        <Ticket className="absolute top-2 right-2 text-white/5 w-24 h-24 rotate-12" />
                        <div className="flex items-center gap-2 mb-3 relative z-10">
                            <div className="bg-[#FCB131] p-1.5 rounded-lg text-[#001d4a] shadow-sm"><Ticket size={12} strokeWidth={3} /></div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Ventana de Habilitación</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-white/70 uppercase tracking-widest block mb-1">Apertura</span>
                                <div className="flex gap-2">
                                    <input type="date" className="flex-1 bg-white/90 border border-transparent rounded-lg py-2 px-2 font-bold text-[10px] text-[#001d4a] outline-none focus:border-[#FCB131] transition-colors shadow-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" value={editingMatch.aperturaDate?.split('/').reverse().join('-')} onChange={e => { const val = e.target.value; if(val) { const [y, m, d] = val.split('-'); setEditingMatch({...editingMatch, aperturaDate: `${d}/${m}/${y}`}) } }} />
                                    <input type="time" className="w-20 bg-white/90 border border-transparent rounded-lg py-2 px-1 font-bold text-[10px] text-[#001d4a] outline-none text-center focus:border-[#FCB131] transition-colors shadow-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" value={editingMatch.aperturaHour || ''} onChange={e => setEditingMatch({...editingMatch, aperturaHour: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-black text-white/70 uppercase tracking-widest block mb-1">Cierre</span>
                                <div className="flex gap-2">
                                    <input type="date" className={`flex-1 bg-white/90 border rounded-lg py-2 px-2 font-bold text-[10px] text-[#001d4a] outline-none transition-colors shadow-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden ${closingDateError ? 'border-red-500' : 'border-transparent focus:border-[#FCB131]'}`} value={editingMatch.cierreDate?.split('/').reverse().join('-')} onChange={e => { const val = e.target.value; if(val) { const [y, m, d] = val.split('-'); setEditingMatch({...editingMatch, cierreDate: `${d}/${m}/${y}`}) } }} />
                                    <input type="time" className="w-20 bg-white/90 border border-transparent rounded-lg py-2 px-1 font-bold text-[10px] text-[#001d4a] outline-none text-center focus:border-[#FCB131] transition-colors shadow-sm [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden" value={editingMatch.cierreHour || ''} onChange={e => setEditingMatch({...editingMatch, cierreHour: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        
                        {closingDateError && (
                            <div className="mt-3 flex items-center gap-2 text-white bg-red-500/20 p-2 rounded-lg border border-red-500/30 animate-pulse">
                                <AlertTriangle size={12} />
                                <span className="text-[8px] font-bold uppercase tracking-wide">{closingDateError}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-4 shrink-0">
               <button onClick={() => !isSaving && setEditingMatch(null)} disabled={isSaving} className="px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#001d4a] bg-white border border-gray-200 hover:bg-gray-100 transition-all">Cancelar</button>
               <button onClick={handleSave} disabled={!!closingDateError || isSaving} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg transition-all ${!!closingDateError ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#003B94] hover:bg-[#001d4a]'}`}>{isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {deletingMatch && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
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
