
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { ShieldCheck, Plus, Edit2, Trash2, Search, Save, X, AlertTriangle, Image as ImageIcon, Upload, Flag, RotateCcw, CheckCircle2 } from 'lucide-react';
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
  
  const [filterCountry, setFilterCountry] = useState<string>('AR'); // Par défaut: Argentine

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  
  const [formData, setFormData] = useState<Partial<Team>>({
    name: '', short_name: '', country_id: 'AR', confederation: 'CONMEBOL', city: '', stadium: '', logo: ''
  });
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const load = () => {
          const loadedTeams = dataService.getTeams();
          setTeams(loadedTeams);
      };
      load();
      const unsub = dataService.subscribe(load);
      return () => unsub();
  }, []);

  // S'assurer que le pays sélectionné existe dans les équipes disponibles
  useEffect(() => {
      if (teams.length > 0) {
          const countriesWithTeams = new Set(teams.map(t => t.country_id).filter(Boolean));
          // Si le pays sélectionné n'existe pas dans les équipes, utiliser le premier pays disponible ou 'AR'
          if (!countriesWithTeams.has(filterCountry)) {
              const firstAvailableCountry = countriesWithTeams.has('AR') 
                  ? 'AR' 
                  : (countriesWithTeams.size > 0 ? Array.from(countriesWithTeams)[0] as string : 'AR');
              if (firstAvailableCountry) {
                  setFilterCountry(firstAvailableCountry);
              }
          }
      }
  }, [teams]); // Ne pas inclure filterCountry dans les dépendances pour éviter les boucles

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

  const executeSave = async () => {
      if (!formData.name) {
          setShowSaveConfirm(false);
          return;
      }
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
        setShowSaveConfirm(false);
      } catch(e) {
        alert("Error al guardar el equipo.");
      }
  };

  const handleSave = () => {
      if (!formData.name) return;
      setShowSaveConfirm(true);
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
      setFilterCountry('AR'); // Réinitialiser à Argentine
  };

  // Pays disponibles basés sur la colonne country_id de la table Teams dans la base de données
  const availableCountries = useMemo(() => {
      // Toujours afficher au moins tous les pays de COUNTRY_OPTIONS par défaut
      const defaultCountries = [...COUNTRY_OPTIONS].sort((a,b) => a.name.localeCompare(b.name));
      
      // Si pas d'équipes ou équipes vides, afficher tous les pays de COUNTRY_OPTIONS
      if (!teams || teams.length === 0) {
          return defaultCountries;
      }
      
      // Récupérer tous les country_id uniques depuis la colonne country_id de la table Teams
      const countriesWithTeams = Array.from(new Set(teams.map(t => t.country_id).filter(Boolean)));
      
      // Si aucun country_id valide, afficher tous les pays de COUNTRY_OPTIONS
      if (countriesWithTeams.length === 0) {
          return defaultCountries;
      }
      
      // Créer une liste de pays avec ceux de COUNTRY_OPTIONS qui existent dans la DB
      const countriesFromOptions = COUNTRY_OPTIONS.filter(c => countriesWithTeams.includes(c.code))
          .sort((a,b) => a.name.localeCompare(b.name));
      
      // Ajouter les pays qui existent dans la DB mais pas dans COUNTRY_OPTIONS
      const countriesNotInOptions = countriesWithTeams
          .filter(code => !COUNTRY_OPTIONS.find(c => c.code === code))
          .map(code => ({
              code: code,
              name: code, // Utiliser le code comme nom si pas trouvé dans COUNTRY_OPTIONS
              flag: '🏳️'
          }));
      
      const result = [...countriesFromOptions, ...countriesNotInOptions]
          .sort((a,b) => {
              // Trier par nom si disponible, sinon par code
              const nameA = a.name || a.code;
              const nameB = b.name || b.code;
              return nameA.localeCompare(nameB);
          });
      
      // Toujours retourner au moins les pays par défaut
      return result.length > 0 ? result : defaultCountries;
  }, [teams]);

  const filteredTeams = useMemo(() => {
      if (!filterCountry) return teams; // Si pas de pays sélectionné, retourner toutes les équipes
      
      return teams.filter(t => {
          const matchesSearch = searchQuery === '' || 
              t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              t.short_name.toLowerCase().includes(searchQuery.toLowerCase());
          // Filtrer par la colonne country_id de la table Teams
          const matchesCountry = t.country_id === filterCountry;
          return matchesSearch && matchesCountry;
      });
  }, [teams, searchQuery, filterCountry]);

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
                            value={filterCountry || 'AR'} 
                            onChange={(e) => setFilterCountry(e.target.value)} 
                            className="w-full bg-[#003B94]/5 border border-transparent rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:bg-white focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide transition-all"
                        >
                            {availableCountries && availableCountries.length > 0 ? (
                                availableCountries.map(c => (
                                    <option key={c.code} value={c.code}>{c.name}</option>
                                ))
                            ) : (
                                // Fallback: afficher au moins AR si availableCountries est vide
                                <option value="AR">Argentina</option>
                            )}
                        </select>
                        <Flag className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94]/30 pointer-events-none" size={12} />
                    </div>
                    
                    {(filterCountry !== 'AR' || searchQuery) && (
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
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" >
                <div className="relative w-full max-w-2xl bg-white rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
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
                                        <select className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94]" value={formData.confederation} onChange={e => setFormData({...formData, confederation: e.target.value as any})}>
                                            {availableConfederations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            {/* Si la confédération actuelle n'est pas dans la liste, l'ajouter */}
                                            {formData.confederation && !availableConfederations.find(c => c.id === formData.confederation) && (
                                                <option key={formData.confederation} value={formData.confederation}>{formData.confederation}</option>
                                            )}
                                        </select>
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

        {showSaveConfirm && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/60 backdrop-blur-sm animate-in fade-in duration-300" >
                <div className="relative w-full max-w-md bg-white rounded-[2rem] p-10 shadow-[0_50px_150px_rgba(0,29,74,0.3)] text-center border border-white animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-[#FCB131]/10 text-[#FCB131] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle2 size={40} /></div>
                    <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter">¿Guardar Cambios?</h2>
                    <p className="text-[#003B94]/70 font-bold mb-10 text-[10px] leading-relaxed uppercase tracking-widest">Se guardará la información del equipo en el sistema.</p>
                    <div className="flex gap-4">
                        <button onClick={() => setShowSaveConfirm(false)} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 uppercase text-[9px] font-black tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                        <button onClick={executeSave} className="flex-1 py-4 rounded-xl bg-[#003B94] text-white uppercase text-[9px] font-black tracking-widest shadow-2xl hover:opacity-90 transition-all">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        {deletingTeam && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" >
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
