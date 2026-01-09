
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Trophy, Plus, Edit2, Trash2, Search, Save, X, Globe, Map, Upload, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Competition } from '../../types';

export const Competitions = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Competition>>({
    name: '',
    organization: 'AFA',
    type: 'Liga',
    category: 'NACIONAL',
    logo: ''
  });
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const load = () => {
          const comps = dataService.getCompetitions();
          setCompetitions(comps || []);
      };
      load();
      const unsub = dataService.subscribe(load);
      return () => unsub();
  }, []);

  const handleCreate = () => {
      setEditingId(null);
      setFormData({ name: '', organization: 'AFA', type: 'Liga', category: 'NACIONAL', logo: '' });
      setIsModalOpen(true);
  };

  const handleEdit = (comp: Competition) => {
      setEditingId(comp.id);
      setFormData({ ...comp });
      setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
      if (confirm('¿Eliminar esta competición?')) {
        try {
          await dataService.deleteCompetition(id);
        } catch(e) {
          alert("Error al eliminar la competición.");
        }
      }
  };

  const executeSave = async () => {
      if (!formData.name) {
          setShowSaveConfirm(false);
          return;
      }
      
      const payload: Competition = {
          id: editingId || crypto.randomUUID(),
          name: formData.name || '',
          organization: formData.organization || '',
          type: formData.type || '',
          logo: formData.logo || '',
          category: formData.category || 'NACIONAL'
      };
      
      try {
        if (editingId) {
            await dataService.updateCompetition(payload);
        } else {
            await dataService.addCompetition(payload);
        }
        setIsModalOpen(false);
        setShowSaveConfirm(false);
      } catch(e) {
        alert("Error al guardar la competición.");
      }
  };

  const handleSave = () => {
      if (!formData.name) return;
      setShowSaveConfirm(true);
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

  const filteredCompetitions = (competitions || []).filter(c => 
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (c.organization || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = useMemo(() => {
      if (!competitions) return { total: 0, national: 0, international: 0 };
      return {
          total: competitions.length,
          national: competitions.filter(c => c.category === 'NACIONAL').length,
          international: competitions.filter(c => c.category === 'INTERNACIONAL').length
      };
  }, [competitions]);

  const renderSection = (title: string, Icon: any, comps: Competition[], colorClass: string) => {
      if (!comps || comps.length === 0) return null;
      return (
          <div className="space-y-4 mb-8">
              <div className={`flex items-center gap-2 border-b pb-2 ${colorClass} border-opacity-20`}>
                  <Icon size={18} />
                  <h3 className="oswald text-xl font-black uppercase tracking-tight">{title}</h3>
                  <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">{comps.length}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {comps.map(comp => (
                      <GlassCard key={comp.id} className={`p-4 bg-white border hover:shadow-lg transition-all group relative overflow-hidden flex flex-col items-center text-center ${comp.category === 'INTERNACIONAL' ? 'border-indigo-100 hover:border-indigo-300' : 'border-emerald-100 hover:border-emerald-300'}`}>
                          
                          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center p-2 border border-gray-100 shrink-0 shadow-inner mb-3">
                              {comp.logo ? <img src={comp.logo} className="w-full h-full object-contain" /> : <Trophy size={20} className="text-gray-300" />}
                          </div>
                          
                          <div className="w-full">
                              <h3 className="oswald text-sm font-black text-[#001d4a] uppercase leading-tight truncate mb-1" title={comp.name}>{comp.name}</h3>
                              <div className="flex flex-col items-center">
                                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{comp.organization}</span>
                                  <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded mt-1 border ${comp.category === 'INTERNACIONAL' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                      {comp.type}
                                  </span>
                              </div>
                          </div>

                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-y-[-5px] group-hover:translate-y-0">
                              <button onClick={() => handleEdit(comp)} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit2 size={10}/></button>
                              <button onClick={() => handleDelete(comp.id)} className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={10}/></button>
                          </div>
                      </GlassCard>
                  ))}
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-8 pb-20">
        <div className="mx-4 space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 text-[#001d4a]/60 items-center">
                    <Trophy size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Base de Torneos</span>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-64">
                        <input 
                            type="text" 
                            placeholder="Buscar competición..." 
                            className="w-full bg-[#003B94]/5 border-transparent rounded-lg py-2.5 pl-10 pr-4 outline-none text-xs font-bold text-[#001d4a] transition-all focus:bg-white focus:ring-2 focus:ring-[#003B94]/10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#003B94]/30" size={16} />
                    </div>
                    <button onClick={handleCreate} className="bg-[#FCB131] text-[#001d4a] px-4 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-md flex items-center gap-2 hover:bg-[#FFD23F] transition-all whitespace-nowrap">
                        <Plus size={14} /> Nueva
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <GlassCard className="p-3 flex items-center gap-3 bg-white border-blue-100">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Trophy size={16} /></div>
                    <div><span className="block text-xl font-black text-[#001d4a] oswald leading-none">{stats.total}</span><span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Total</span></div>
                </GlassCard>
                <GlassCard className="p-3 flex items-center gap-3 bg-white border-indigo-100">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Globe size={16} /></div>
                    <div><span className="block text-xl font-black text-[#001d4a] oswald leading-none">{stats.international}</span><span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Internacionales</span></div>
                </GlassCard>
                <GlassCard className="p-3 flex items-center gap-3 bg-white border-emerald-100">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Map size={16} /></div>
                    <div><span className="block text-xl font-black text-[#001d4a] oswald leading-none">{stats.national}</span><span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Nacionales</span></div>
                </GlassCard>
            </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
            {renderSection('Competiciones Internacionales', Globe, filteredCompetitions.filter(c => c.category === 'INTERNACIONAL'), 'text-indigo-600')}
            {renderSection('Torneos Nacionales', Map, filteredCompetitions.filter(c => c.category === 'NACIONAL'), 'text-emerald-600')}
            {filteredCompetitions.length === 0 && (
                <div className="py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <Trophy size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-black uppercase tracking-widest">Sin competiciones encontradas</p>
                </div>
            )}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" >
                <div className="relative w-full max-w-lg bg-white rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                    <div className="liquid-glass-dark p-4 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3"><Trophy size={18} className="text-[#FCB131]" /><h2 className="oswald text-lg font-black uppercase tracking-tight">{editingId ? 'Editar' : 'Nueva'} Competición</h2></div>
                        <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X size={18} /></button>
                    </div>
                    
                    <div className="p-6 space-y-4 bg-gray-50/50">
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 bg-white rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-[#003B94] transition-colors shadow-sm" onClick={() => fileInputRef.current?.click()}>
                                {formData.logo ? (<img src={formData.logo} className="w-full h-full object-contain p-2"/>) : (<div className="flex flex-col items-center text-gray-300 group-hover:text-[#003B94]"><ImageIcon size={20} /><span className="text-[7px] font-black mt-1 uppercase">Logo</span></div>)}
                                <div className="absolute inset-0 bg-[#003B94]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload size={16} className="text-white mb-1" /><span className="text-[7px] font-black text-white uppercase tracking-widest">Subir</span></div>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload}/>
                            <div className="flex-1 space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre de la Competición</label>
                                <input type="text" className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94] text-[#001d4a]" placeholder="Ej: Liga Profesional de Fútbol" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Organización</label>
                                <select className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94] text-[#001d4a]" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})}>
                                    <option>AFA</option><option>CONMEBOL</option><option>FIFA</option><option>UEFA</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo</label>
                                <select className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94] text-[#001d4a]" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                    <option>Liga</option><option>Copa Nacional</option><option>Copa Internacional</option><option>Amistoso</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoría</label>
                            <div className="flex gap-2">
                                <button onClick={() => setFormData({...formData, category: 'NACIONAL'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${formData.category === 'NACIONAL' ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400'}`}>Nacional</button>
                                <button onClick={() => setFormData({...formData, category: 'INTERNACIONAL'})} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${formData.category === 'INTERNACIONAL' ? 'bg-indigo-500 text-white' : 'bg-white text-gray-400'}`}>Internacional</button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-100 border-t border-gray-200 flex justify-end gap-3">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-[10px] text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 uppercase transition-colors">Cancelar</button>
                        <button onClick={handleSave} className="px-6 py-2 rounded-lg font-bold text-[10px] text-white bg-[#003B94] shadow-lg hover:bg-[#001d4a] flex items-center gap-2 uppercase transition-all transform active:scale-95"><Save size={14} /> Guardar</button>
                    </div>
                </div>
            </div>
        )}

        {showSaveConfirm && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/60 backdrop-blur-sm animate-in fade-in duration-300" >
                <div className="relative w-full max-w-md bg-white rounded-[2rem] p-10 shadow-[0_50px_150px_rgba(0,29,74,0.3)] text-center border border-white animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-[#FCB131]/10 text-[#FCB131] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle2 size={40} /></div>
                    <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter">¿Guardar Cambios?</h2>
                    <p className="text-[#003B94]/70 font-bold mb-10 text-[10px] leading-relaxed uppercase tracking-widest">Se guardará la información de la competición en el sistema.</p>
                    <div className="flex gap-4">
                        <button onClick={() => setShowSaveConfirm(false)} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 uppercase text-[9px] font-black tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                        <button onClick={executeSave} className="flex-1 py-4 rounded-xl bg-[#003B94] text-white uppercase text-[9px] font-black tracking-widest shadow-2xl hover:opacity-90 transition-all">Confirmar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Competitions;
