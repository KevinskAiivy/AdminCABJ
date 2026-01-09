
import React, { useState, useEffect, useRef } from 'react';
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

  // Dragging logic
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  
  const [position2, setPosition2] = useState({ x: 0, y: 0 });
  const [isDragging2, setIsDragging2] = useState(false);
  const dragStart2 = useRef({ x: 0, y: 0 });

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

  // Drag handlers
  useEffect(() => {
      if (editingMatch) setPosition({ x: 0, y: 0 });
  }, [editingMatch]);

  useEffect(() => {
      if (deletingMatch) setPosition2({ x: 0, y: 0 });
  }, [deletingMatch]);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging) return;
          setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
      };
      const handleMouseUp = () => setIsDragging(false);
      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging2) return;
          setPosition2({ x: e.clientX - dragStart2.current.x, y: e.clientY - dragStart2.current.y });
      };
      const handleMouseUp = () => setIsDragging2(false);
      if (isDragging2) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging2]);

  const handleDragStart2 = (e: React.MouseEvent) => {
      setIsDragging2(true);
      dragStart2.current = { x: e.clientX - position2.x, y: e.clientY - position2.y };
  };

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
          aperturaDate: '', aperturaHour: '10:00', cierreDate: '', cierreHour: '20:00'
      });
      setRivalCountryFilter('AR');
  };

  const handleEdit = (m: Match) => {
      setEditingMatch({ ...m });
      // Find country of rival to set filter
      const team = teams.find(t => t.name === m.rival);
      if(team) setRivalCountryFilter(team.country_id);
  };

  const handleDelete = async () => {
      if (deletingMatch) {
          setIsSaving(true);
          await dataService.deleteMatch(deletingMatch.id);
          setIsSaving(false);
          setDeletingMatch(null);
      }
  };

  const verifyAndOpenSave = async () => {
      if (!editingMatch?.rival || !editingMatch.date) return;
      setIsSaving(true);
      
      const payload = editingMatch as Match;
      // If ID exists in current matches, update, else add
      if (matches.some(m => m.id === payload.id)) {
          await dataService.updateMatch(payload);
      } else {
          await dataService.addMatch(payload);
      }
      setIsSaving(false);
      setEditingMatch(null);
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
      setEditingMatch(prev => {
          const updated = { ...prev, [field]: value };
          // Auto-calculate habilitation window if is_home
          if (updated.is_home && updated.date && updated.hour) {
              // Simple logic: Open 5 days before, Close 1 day before
              // This logic can be more complex
              // For now just keeping user input or default
          }
          return updated;
      });
  };

  const handleNeutralStadiumChange = (stadium: string) => {
      const team = teams.find(t => t.stadium === stadium);
      setEditingMatch(prev => ({ ...prev, venue: stadium, city: team?.city || '' }));
  };

  const distinctStadiums = [...new Set(teams.map(t => t.stadium))].map(s => ({ stadium: s }));

  return (
    <div className="space-y-6 pb-20">
       {/* Toolbar */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex justify-between items-center gap-4">
           <div className="flex items-center gap-2 text-[#003B94]">
               <Sword size={20} />
               <h3 className="text-sm font-black uppercase tracking-widest">Partidos</h3>
           </div>
           <button onClick={handleCreate} className="bg-[#FCB131] text-[#001d4a] px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-[#FFD23F] transition-all">
               <Plus size={14} /> Nuevo
           </button>
       </div>

       {/* Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {matches.map(m => (
               <GlassCard key={m.id} className="p-5 border-l-4 border-l-[#003B94]">
                   {/* Content */}
                   <div className="flex justify-between items-start mb-3">
                       <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{m.competition}</span>
                       <div className="flex gap-2">
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

      {/* Editing Modal (Draggable, Centered, No BG, Z-1000) */}
      {editingMatch && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
          <div 
            style={{ transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.2s' }}
            className="pointer-events-auto bg-white/95 backdrop-blur-xl w-full max-w-4xl rounded-[1.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/60 relative max-h-[90vh] animate-in fade-in zoom-in-95 duration-300"
          >
            <div 
                onMouseDown={handleDragStart}
                className="p-4 flex items-center justify-between border-b border-gray-100 bg-[#003B94] text-white cursor-move select-none active:cursor-grabbing"
            >
               <div className="flex items-center gap-3">
                  <Edit2 size={18} className="text-[#FCB131]" />
                  <h2 className="oswald text-lg font-black uppercase tracking-tighter">
                      {matches.some(m => m.id === editingMatch.id) ? 'Editar Partido' : 'Nuevo Partido'}
                  </h2>
               </div>
               <button onClick={(e) => { e.stopPropagation(); if(!isSaving) setEditingMatch(null); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <X size={18} />
               </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white">
                {/* 1. Condition (Location Switcher) */}
                <div>
                    <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1 mb-1 block">Condición</label>
                    <div className="bg-gray-100 p-1 rounded-xl flex">
                        {['LOCAL', 'NEUTRAL', 'VISITANTE'].map((tab) => {
                            const isActive = (tab === 'LOCAL' && editingMatch.is_home && !editingMatch.is_neutral) || (tab === 'NEUTRAL' && editingMatch.is_neutral) || (tab === 'VISITANTE' && !editingMatch.is_home && !editingMatch.is_neutral);
                            return (<button key={tab} onClick={() => handleLocationChange(tab as any)} className={`flex-1 py-2 text-[9px] font-black tracking-widest uppercase transition-all rounded-lg ${isActive ? 'bg-white text-[#003B94] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{tab}</button>);
                        })}
                    </div>
                </div>

                {/* 2. Competition & Jornada */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Competición</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.competition_id || ''} onChange={e => handleCompetitionChange(e.target.value)}><option value="">Seleccionar...</option>{competitions.map(comp => <option key={comp.id} value={comp.id}>{comp.name}</option>)}</select></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha/Jornada</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.fecha_jornada || ''} onChange={e => setEditingMatch({...editingMatch, fecha_jornada: e.target.value})}>{FECHAS.map(f => <option key={f} value={f}>{f}</option>)}</select></div>
                </div>

                {/* 3. Rival Selector */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">País del Rival</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={rivalCountryFilter} onChange={e => handleRivalCountryChange(e.target.value)}>{COUNTRY_OPTIONS.map(c => (<option key={c.code} value={c.code}>{c.flag} {c.name}</option>))}</select></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Equipo Rival</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.rival_id || ''} onChange={e => handleRivalIdChange(e.target.value)}><option value="">Seleccionar Equipo...</option>{teams.filter(t => t.country_id === rivalCountryFilter).sort((a,b) => a.name.localeCompare(b.name)).map(r => (<option key={r.id} value={r.id}>{r.name} ({r.short_name})</option>))}</select></div>
                </div>

                {/* 5. Date & Hour */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha</label><input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.date?.split('/').reverse().join('-')} onChange={e => { const val = e.target.value; if(val) { const [y, m, d] = val.split('-'); handleMatchDateTimeChange('date', `${d}/${m}/${y}`); } }} /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Hora</label><input type="time" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.hour || ''} onChange={e => handleMatchDateTimeChange('hour', e.target.value)} /></div>
                </div>

                {/* 6. Stadium & City */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Estadio</label>{editingMatch.is_neutral ? (<select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.venue || ''} onChange={e => handleNeutralStadiumChange(e.target.value)}><option value="">Seleccionar Estadio Neutral...</option>{distinctStadiums.map(s => <option key={s.stadium} value={s.stadium}>{s.stadium}</option>)}</select>) : (<input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.venue || ''} onChange={e => setEditingMatch({...editingMatch, venue: e.target.value})} />)}</div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Ciudad</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] text-[#001d4a] outline-none" value={editingMatch.city || ''} onChange={e => setEditingMatch({...editingMatch, city: e.target.value})} /></div>
                </div>

               {/* 7. Habilitation Window */}
               {(editingMatch.is_home || editingMatch.is_neutral) && (
                <div className="bg-gradient-to-br from-[#001d4a] to-[#003B94] border border-[#FCB131]/30 rounded-xl p-4 relative overflow-hidden mt-4 shadow-lg">
                    <Ticket className="absolute top-2 right-2 text-white/5 w-24 h-24 rotate-12" />
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                        <div className="bg-[#FCB131] p-1.5 rounded-lg text-[#001d4a] shadow-sm"><Ticket size={12} strokeWidth={3} /></div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Ventana de Habilitación (Automática)</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 relative z-10">
                        <div className="space-y-1">
                            <span className="text-[8px] font-black text-white/70 uppercase tracking-widest block mb-1">Apertura</span>
                            <div className="flex gap-2">
                                <input type="date" className="flex-1 bg-white border border-transparent rounded-lg py-2 px-2 font-bold text-[10px] text-[#001d4a] outline-none focus:border-[#FCB131] transition-colors shadow-sm" value={editingMatch.apertura_date?.split('/').reverse().join('-')} onChange={e => { const val = e.target.value; if(val) { const [y, m, d] = val.split('-'); setEditingMatch({...editingMatch, apertura_date: `${d}/${m}/${y}`}) } }} />
                                <input type="time" className="w-20 bg-white border border-transparent rounded-lg py-2 px-1 font-bold text-[10px] text-[#001d4a] outline-none text-center focus:border-[#FCB131] transition-colors shadow-sm" value={editingMatch.apertura_hour || ''} onChange={e => setEditingMatch({...editingMatch, apertura_hour: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[8px] font-black text-white/70 uppercase tracking-widest block mb-1">Cierre</span>
                            <div className="flex gap-2">
                                <input type="date" className={`flex-1 bg-white border rounded-lg py-2 px-2 font-bold text-[10px] text-[#001d4a] outline-none transition-colors shadow-sm ${closingDateError ? 'border-red-500' : 'border-transparent focus:border-[#FCB131]'}`} value={editingMatch.cierre_date?.split('/').reverse().join('-')} onChange={e => { const val = e.target.value; if(val) { const [y, m, d] = val.split('-'); setEditingMatch({...editingMatch, cierre_date: `${d}/${m}/${y}`}) } }} />
                                <input type="time" className="w-20 bg-white border border-transparent rounded-lg py-2 px-1 font-bold text-[10px] text-[#001d4a] outline-none text-center focus:border-[#FCB131] transition-colors shadow-sm" value={editingMatch.cierre_hour || ''} onChange={e => setEditingMatch({...editingMatch, cierre_hour: e.target.value})} />
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

            <div className="p-6 bg-[#FCB131] border-t border-[#e5a02d] flex justify-end gap-4 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 relative">
               <button onClick={() => !isSaving && setEditingMatch(null)} disabled={isSaving} className="px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-[#001d4a] bg-white border border-white/50 hover:bg-white/90 transition-all">Cancelar</button>
               <button onClick={verifyAndOpenSave} disabled={!!closingDateError || isSaving} className={`px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-lg transition-all ${!!closingDateError ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#001d4a] hover:bg-[#003B94]'}`}>{isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - CENTERED & FIXED */}
      {deletingMatch && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 pointer-events-none">
              <div 
                style={{ transform: `translate(${position2.x}px, ${position2.y}px)`, transition: isDragging2 ? 'none' : 'transform 0.2s' }}
                className="pointer-events-auto relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-[0_50px_150px_rgba(0,29,74,0.3)] text-center border border-white animate-in zoom-in-95 overflow-hidden"
              >
                  <div 
                    onMouseDown={handleDragStart2}
                    className="absolute inset-0 h-12 cursor-move z-10"
                  ></div>
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100 relative z-0">
                      <AlertTriangle size={32} />
                  </div>
                  <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter relative z-0">Eliminar Partido</h2>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6 relative z-0 leading-relaxed">
                      ¿Estás seguro de eliminar el partido <br/>
                      <strong className="text-[#001d4a]">vs {deletingMatch.rival}</strong>?
                  </p>
                  <div className="flex gap-4 relative z-0">
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
