
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { ShieldCheck, Plus, Edit2, Trash2, Search, Save, X, AlertTriangle, Image as ImageIcon, Upload, Flag, RotateCcw } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Team } from '../../types';
import { COUNTRY_OPTIONS } from '../../constants';

const CONFEDERATIONS_CONFIG = [
    { id: 'CONMEBOL', name: 'CONMEBOL (Sudamérica)' },
    { id: 'UEFA', name: 'UEFA (Europa)' },
    { id: 'OTHER', name: 'Otras Confederaciones' }
];

export const Equipos = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filterConfederation, setFilterConfederation] = useState<string>('ALL');
  const [filterCountry, setFilterCountry] = useState<string>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  
  const [formData, setFormData] = useState<Partial<Team>>({
    name: '', short_name: '', country_id: 'AR', confederation: 'CONMEBOL', city: '', stadium: '', logo: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const load = () => setTeams(dataService.getTeams());
      load();
      const unsub = dataService.subscribe(load);
      return () => unsub();
  }, []);

  const handleCreate = () => {
      setEditingId(null);
      setFormData({ name: '', short_name: '', country_id: 'AR', confederation: 'CONMEBOL', city: '', stadium: '', logo: '' });
      setIsModalOpen(true);
  };

  const handleEdit = (team: Team) => {
      setEditingId(team.id);
      setFormData({ ...team });
      setIsModalOpen(true);
  };

  const handleSave = async () => {
      if (!formData.name) return;
      const payload: Team = {
          id: editingId || crypto.randomUUID(),
          name: formData.name || '',
          short_name: formData.short_name || '',
          country_id: formData.country_id || 'AR',
          confederation: formData.confederation || 'CONMEBOL',
          city: formData.city || '',
          stadium: formData.stadium || '',
          logo: formData.logo || undefined
      };
      try {
        if (editingId) {
            await dataService.updateTeam(payload);
        } else {
            await dataService.addTeam(payload);
        }
        setIsModalOpen(false);
      } catch(e) {
        alert("Error al guardar el equipo.");
      }
  };

  const confirmDelete = async () => {
      if(deletingTeam) {
        try {
          await dataService.deleteTeam(deletingTeam.id);
          setDeletingTeam(null);
        } catch(e) {
          alert("Error al eliminar el equipo.");
        }
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
              if (e.target?.result) setFormData(prev => ({ ...prev, logo: e.target!.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const resetFilters = () => {
      setSearchQuery('');
      setFilterConfederation('ALL');
      setFilterCountry('ALL');
  };

  // Pays disponibles selon la confédération sélectionnée (basé sur les teams existants)
  const availableCountries = useMemo(() => {
      if (filterConfederation === 'ALL') {
          // Si pas de filtre de confédération, montrer tous les pays qui ont des teams
          const countriesWithTeams = new Set(teams.map(t => t.country_id));
          return COUNTRY_OPTIONS.filter(c => countriesWithTeams.has(c.code))
              .sort((a,b) => a.name.localeCompare(b.name));
      }
      // Si confédération sélectionnée, montrer uniquement les pays des teams de cette confédération
      const countriesInConfederation = new Set(
          teams
              .filter(t => t.confederation === filterConfederation)
              .map(t => t.country_id)
      );
      return COUNTRY_OPTIONS.filter(c => countriesInConfederation.has(c.code))
          .sort((a,b) => a.name.localeCompare(b.name));
  }, [filterConfederation, teams]);

  const sortedCountries = useMemo(() => {
      return availableCountries;
  }, [availableCountries]);

  const filteredTeams = teams.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.short_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConfederation = filterConfederation === 'ALL' || t.confederation === filterConfederation;
      const matchesCountry = filterCountry === 'ALL' || t.country_id === filterCountry;
      return matchesSearch && matchesConfederation && matchesCountry;
  });

  return (
    <div className="space-y-8 pb-20">
        <div className="mx-4 bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 text-[#001d4a]/60 items-center shrink-0">
                <ShieldCheck size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Base de Datos</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
                    <div className="relative min-w-[180px]">
                        <select 
                            value={filterConfederation} 
                            onChange={(e) => {
                                setFilterConfederation(e.target.value);
                                setFilterCountry('ALL'); // Reset country filter when confederation changes
                            }} 
                            className="w-full bg-[#003B94]/5 border border-transparent rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:bg-white focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide transition-all"
                        >
                            <option value="ALL">Todas las Confederaciones</option>
                            {CONFEDERATIONS_CONFIG.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="relative min-w-[180px]">
                        <select 
                            value={filterCountry} 
                            onChange={(e) => setFilterCountry(e.target.value)} 
                            className="w-full bg-[#003B94]/5 border border-transparent rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:bg-white focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide transition-all"
                        >
                            <option value="ALL">Todos los Países</option>
                            {sortedCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                        <Flag className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94]/30 pointer-events-none" size={12} />
                    </div>
                    
                    {(filterConfederation !== 'ALL' || filterCountry !== 'ALL' || searchQuery) && (
                        <button onClick={resetFilters} className="p-2.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors" title="Limpiar Filtros">
                            <RotateCcw size={14} />
                        </button>
                    )}
                </div>

                <div className="relative group flex-1 xl:w-64">
                    <input type="text" placeholder="Buscar equipo..." className="w-full bg-white border border-gray-200 rounded-lg py-2.5 pl-10 pr-4 outline-none text-xs font-bold text-[#001d4a] transition-all focus:border-[#003B94] placeholder:text-gray-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#003B94]" size={16} />
                </div>
                
                <button onClick={handleCreate} className="bg-[#FCB131] text-[#001d4a] px-4 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-md flex items-center gap-2 hover:bg-[#FFD23F] transition-all whitespace-nowrap">
                    <Plus size={14} /> Nuevo
                </button>
            </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeams.map(team => {
                const countryData = COUNTRY_OPTIONS.find(c => c.code === team.country_id);
                const countryName = countryData ? countryData.name : team.country_id;

                return (
                <GlassCard key={team.id} className="p-5 bg-white border border-[#003B94]/10 hover:shadow-lg transition-all group relative">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center p-2 border border-gray-100 shrink-0 overflow-hidden shadow-sm">
                            {team.logo ? <img src={team.logo} className="w-full h-full object-contain" /> : <ShieldCheck size={24} className="text-gray-300" />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${team.confederation === 'CONMEBOL' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                    {team.confederation}
                                </span>
                                <span className="text-[7px] font-black px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600 border-gray-200 uppercase tracking-widest truncate max-w-[80px]">
                                    {countryName}
                                </span>
                            </div>
                            <h3 className="oswald text-lg font-black text-[#001d4a] uppercase leading-tight truncate">{team.name}</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1 truncate">{team.city} • {team.stadium}</p>
                        </div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => handleEdit(team)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit2 size={12}/></button>
                        <button onClick={() => setDeletingTeam(team)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={12}/></button>
                    </div>
                </GlassCard>
                );
            })}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
                <div className="relative w-full max-w-2xl bg-white rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-7rem-2rem)] animate-in zoom-in-95 duration-300">
                    <div className="liquid-glass-dark p-4 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-[#FCB131]" /><h2 className="oswald text-lg font-black uppercase tracking-tight">{editingId ? 'Editar Equipo' : 'Nuevo Equipo'}</h2></div>
                        <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50/50 flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* Left Column: Logo & Main Info */}
                            <div className="md:col-span-4 flex flex-col items-center gap-4">
                                <div className="w-32 h-32 bg-white rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-[#003B94] transition-colors shadow-sm" onClick={() => fileInputRef.current?.click()}>
                                    {(formData.logo || '').startsWith('data:image') || (formData.logo || '').startsWith('http') ? (<img src={formData.logo} className="w-full h-full object-contain p-2" />) : (<div className="flex flex-col items-center text-gray-300 group-hover:text-[#003B94]"><ImageIcon size={24} /><span className="text-[7px] font-black uppercase mt-1">Logo</span></div>)}
                                    <div className="absolute inset-0 bg-[#003B94]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload size={16} className="text-white mb-1" /><span className="text-[7px] font-black text-white uppercase tracking-widest">Subir</span></div>
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                <div className="w-full">
                                    <input className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-[10px] outline-none focus:border-[#003B94] text-[#001d4a] text-center" placeholder="URL Logo (Opcional)" value={formData.logo} onChange={e => setFormData({...formData, logo: e.target.value})} />
                                </div>
                            </div>

                            {/* Right Column: Details Form */}
                            <div className="md:col-span-8 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Oficial</label>
                                        <input className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94] text-[#001d4a]" placeholder="Ej: River Plate" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Sigla</label>
                                        <input className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94] text-[#001d4a]" placeholder="Ej: RIV" value={formData.short_name || ''} onChange={e => setFormData({...formData, short_name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Confederación</label>
                                        <select className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94]" value={formData.confederation} onChange={e => setFormData({...formData, confederation: e.target.value as any})}>{CONFEDERATIONS_CONFIG.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">País</label>
                                    <div className="relative">
                                        <select className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-3 pr-8 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] appearance-none" value={formData.country_id || 'AR'} onChange={e => setFormData({...formData, country_id: e.target.value})}>{COUNTRY_OPTIONS.sort((a,b) => (a.name || '').localeCompare(b.name || '')).map(c => (<option key={c.code} value={c.code}>{c.flag} {c.name}</option>))}</select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><Flag size={10} /></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Ciudad</label>
                                        <input className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94] text-[#001d4a]" placeholder="Ej: Buenos Aires" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Estadio</label>
                                        <input className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94] text-[#001d4a]" placeholder="Ej: Monumental" value={formData.stadium} onChange={e => setFormData({...formData, stadium: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-100 border-t border-gray-200 flex justify-end gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-[10px] text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 transition-colors uppercase tracking-wide">Cancelar</button>
                        <button onClick={handleSave} className="px-6 py-2 rounded-lg font-bold text-[10px] text-white bg-[#003B94] shadow-lg hover:bg-[#001d4a] flex items-center gap-2 uppercase tracking-wide transition-all transform active:scale-95"><Save size={14} /> Guardar</button>
                    </div>
                </div>
            </div>
        )}

        {deletingTeam && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
                <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-2xl text-center border border-white animate-in zoom-in-95 overflow-hidden">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter">Eliminar Equipo</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6">
                        ¿Estás seguro de eliminar a <strong>{deletingTeam.name}</strong>?
                    </p>
                    <div className="flex gap-4">
                        <button onClick={() => setDeletingTeam(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white uppercase text-[10px] font-black tracking-widest shadow-2xl hover:bg-red-600 transition-all">Eliminar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Equipos;
