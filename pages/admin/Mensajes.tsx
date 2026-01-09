
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GlassCard } from '../../components/GlassCard';
import { MessageSquare, Plus, Edit2, Trash2, Search, X, Save, Send, AlertTriangle, Check, Globe, Loader2, Archive, RotateCcw } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Mensaje, Consulado } from '../../types';

export const Mensajes = () => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [consulados, setConsulados] = useState<Consulado[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Mensaje>>({
      title: '', body: '', type: 'INSTITUCIONAL', target_ids: ['ALL'], target_consulado_id: 'ALL', target_consulado_name: 'Todos'
  });
  
  const [targetSearch, setTargetSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'DELETE' | 'ARCHIVE' | 'RESTORE' | 'EMPTY_TRASH', id?: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
      const load = () => {
          setMensajes(dataService.getMensajes());
          setConsulados(dataService.getConsulados());
      };
      load();
      const unsub = dataService.subscribe(load);
      return () => unsub();
  }, []);

  useEffect(() => {
      if (isModalOpen) {
          setShowSuccess(false);
      }
  }, [isModalOpen]);


  const handleCreate = () => {
      setEditingId(null);
      const today = new Date().toISOString().split('T')[0];
      setFormData({ 
          title: '', body: '', type: 'INSTITUCIONAL', 
          target_ids: ['ALL'], target_consulado_id: 'ALL', target_consulado_name: 'Todos',
          start_date: today, end_date: ''
      });
      setIsModalOpen(true);
  };

  const handleEdit = (msg: Mensaje) => {
      setEditingId(msg.id);
      setFormData({ ...msg, target_ids: msg.target_ids || (msg.target_consulado_id === 'ALL' ? ['ALL'] : [msg.target_consulado_id]) });
      setIsModalOpen(true);
  };

  const toggleTarget = (id: string) => {
      const current = new Set(formData.target_ids || []);
      if (id === 'ALL') {
          if (current.has('ALL')) current.clear();
          else { current.clear(); current.add('ALL'); }
      } else {
          current.delete('ALL');
          if (current.has(id)) current.delete(id);
          else current.add(id);
      }
      const newTargets = Array.from(current);
      setFormData({ 
          ...formData, 
          target_ids: newTargets,
          target_consulado_name: newTargets.includes('ALL') ? 'Todos' : `${newTargets.length} Seleccionados`
      });
  };

  const requestSave = async () => {
      if (!formData.title || !formData.body) return;
      if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
          setDateError("La fecha final no peut pas être antérieure à la date initiale");
          return;
      }

      setIsSending(true);
      await new Promise(r => setTimeout(r, 800)); // Simulate network

      const payload: Mensaje = {
          id: editingId || crypto.randomUUID(),
          title: formData.title || '',
          body: formData.body || '',
          type: formData.type || 'INSTITUCIONAL',
          date: new Date().toLocaleDateString(), // Display date
          created_at: Date.now(),
          target_ids: formData.target_ids || ['ALL'],
          target_consulado_id: formData.target_ids?.includes('ALL') ? 'ALL' : (formData.target_ids?.[0] || 'ALL'), // Legacy support
          target_consulado_name: formData.target_consulado_name || 'Todos',
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
          archived: formData.archived || false,
          is_automatic: formData.is_automatic || false
      };

      if (editingId) {
          dataService.updateMensaje(payload);
      } else {
          dataService.addMensaje(payload);
      }
      
      setIsSending(false);
      setShowSuccess(true);
      setTimeout(() => {
          setIsModalOpen(false);
          setShowSuccess(false);
      }, 500);
  };

  const executeAction = () => {
      if (!confirmAction) return;
      if (confirmAction.type === 'DELETE' && confirmAction.id) {
          dataService.deleteMensaje(confirmAction.id);
      }
      if (confirmAction.type === 'EMPTY_TRASH') {
          dataService.emptyTrash();
      }
      setConfirmAction(null);
  };

  const isFormValid = formData.title && formData.body && (formData.target_ids?.length || 0) > 0;
  
  const filteredConsuladosSelection = consulados.filter(c => c.name.toLowerCase().includes(targetSearch.toLowerCase()));
  const filteredMessages = mensajes.filter(m => m.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        {/* Harmonized Header */}
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none"><MessageSquare size={300} className="text-white" /></div>
            
            <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-4 rounded-xl border border-white/20"><MessageSquare size={28} className="text-[#FCB131]" /></div>
                <div><h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Centro de Mensajes</h1><p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Comunicación Oficial</p></div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                <div className="relative group w-full md:w-64">
                    <input type="text" placeholder="Buscar mensaje..." className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 outline-none text-xs font-bold text-white placeholder:text-white/40 transition-all focus:bg-white focus:text-[#001d4a]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#001d4a]" size={16} />
                </div>
                <button onClick={handleCreate} className="bg-[#FCB131] text-[#001d4a] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-[#FFD23F] transition-all whitespace-nowrap ml-2"><Plus size={16} /> Redactar</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMessages.map(msg => (
                <GlassCard key={msg.id} className="p-5 border-l-4 border-l-[#003B94] relative group">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${msg.type === 'URGENTE' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {msg.type}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEdit(msg)} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit2 size={12}/></button>
                            <button onClick={() => setConfirmAction({ type: 'DELETE', id: msg.id })} className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={12}/></button>
                        </div>
                    </div>
                    <h4 className="oswald text-lg font-black text-[#001d4a] uppercase leading-tight mb-2 truncate">{msg.title}</h4>
                    <p className="text-[10px] text-gray-500 line-clamp-2 mb-3">{msg.body}</p>
                    <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 border-t border-gray-100 pt-2">
                        <span className="flex items-center gap-1"><Globe size={10}/> {msg.target_consulado_name}</span>
                        <span>{msg.date}</span>
                    </div>
                </GlassCard>
            ))}
        </div>

      {confirmAction && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
              <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-xl text-center border border-white overflow-hidden animate-in zoom-in-95">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner relative z-0 ${ confirmAction.type === 'DELETE' || confirmAction.type === 'EMPTY_TRASH' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-[#003B94]' }`}>
                      <AlertTriangle size={32} />
                  </div>
                  <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter relative z-0">
                      {confirmAction.type === 'DELETE' ? 'Eliminar Definitivamente' : confirmAction.type === 'EMPTY_TRASH' ? 'Vaciar Papelera' : confirmAction.type === 'ARCHIVE' ? 'Archivar Mensaje' : 'Restaurar Mensaje'}
                  </h2>
                  <div className="flex gap-3 relative z-0">
                      <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200">Cancelar</button>
                      <button onClick={executeAction} className={`flex-1 py-3 rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-lg ${ confirmAction.type === 'DELETE' || confirmAction.type === 'EMPTY_TRASH' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#003B94] hover:bg-[#001d4a]' }`}>Confirmar</button>
                  </div>
              </div>
          </div>
      )}

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
             <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/60 max-h-[calc(100vh-7rem-2rem)] animate-in zoom-in-95 duration-300">
                <div className="liquid-glass-dark p-4 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/10 p-2 rounded-xl"><Send size={20} className="text-[#FCB131]" /></div>
                        <div>
                            <h2 className="oswald text-xl font-black uppercase tracking-tight">{editingId ? 'Editar Mensaje' : 'Nuevo Mensaje'}</h2>
                            <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest">Comunicación Oficial</p>
                        </div>
                    </div>
                    <X onClick={() => setIsModalOpen(false)} className="cursor-pointer opacity-60 hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-colors" size={24} />
                </div>
                
                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                    <div className="flex-1 p-5 overflow-y-auto custom-scrollbar border-r border-gray-100 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Asunto / Título</label>
                            <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 font-bold text-sm outline-none focus:bg-white focus:border-[#003B94] transition-all text-[#001d4a]" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: Apertura de Inscripciones" autoFocus />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Tipo</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setFormData({...formData, type: 'INSTITUCIONAL'})} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${formData.type === 'INSTITUCIONAL' ? 'bg-[#003B94] text-white border-[#003B94]' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>Normal</button>
                                    <button onClick={() => setFormData({...formData, type: 'URGENTE'})} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${formData.type === 'URGENTE' ? 'bg-[#FCB131] text-[#001d4a] border-[#FCB131]' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>Urgente</button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Vigencia (Hasta)</label>
                                <input type="date" className={`w-full bg-gray-50 border rounded-xl py-2.5 px-3 font-bold text-xs text-[#001d4a] outline-none ${dateError ? 'border-red-500' : 'border-gray-200'}`} value={formData.end_date || ''} min={formData.start_date || ''} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                            </div>
                        </div>
                        {dateError && <span className="text-[8px] text-red-500 font-bold block">{dateError}</span>}

                        <div className="space-y-1 flex-1 flex flex-col">
                            <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Cuerpo del Mensaje</label>
                            <textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 font-medium text-xs outline-none focus:bg-white focus:border-[#003B94] transition-all text-gray-600 h-32 resize-none leading-relaxed" value={formData.body} onChange={e => setFormData({...formData, body: e.target.value})} placeholder="Escriba su comunicado aquí..." />
                        </div>
                    </div>

                    <div className="w-full md:w-[280px] bg-gray-50/50 p-5 flex flex-col overflow-hidden border-t md:border-t-0 md:border-l border-gray-100">
                        <div className="mb-3">
                            <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1 mb-2 block">Destinatarios</label>
                            <div className="relative mb-2">
                                <input type="text" placeholder="Filtrar..." className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-8 pr-3 text-[10px] font-bold outline-none" value={targetSearch} onChange={e => setTargetSearch(e.target.value)} />
                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1">
                            <div onClick={() => toggleTarget('ALL')} className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${formData.target_ids?.includes('ALL') ? 'bg-[#003B94] border-[#003B94] text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-[#003B94]/30'}`}>
                                <div className="flex items-center gap-2"><Globe size={12} /><span className="text-[9px] font-black uppercase tracking-widest">Todos</span></div>
                                {formData.target_ids?.includes('ALL') && <Check size={12} strokeWidth={3} />}
                            </div>
                            
                            {filteredConsuladosSelection.map(c => {
                                const isSelected = formData.target_ids?.includes(c.id) && !formData.target_ids?.includes('ALL');
                                return ( <div key={c.id} onClick={() => toggleTarget(c.id)} className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${isSelected ? 'bg-white border-[#003B94] text-[#003B94] shadow-sm ring-1 ring-[#003B94]/20' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}> <span className="text-[9px] font-bold uppercase truncate max-w-[180px]">{c.name}</span> {isSelected && <Check size={10} strokeWidth={3} />} </div> );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-[#FCB131] border-t border-[#e5a02d] flex justify-between items-center shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 relative">
                    <span className="text-[9px] font-bold text-[#001d4a]/50 uppercase tracking-widest hidden md:block">* Campos obligatorios</span>
                    <div className="flex gap-3 w-full md:w-auto justify-end">
                        <button onClick={() => setIsModalOpen(false)} disabled={isSending} className="px-5 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest text-[#001d4a] bg-white border border-white/50 hover:bg-white/90 transition-colors shadow-sm">Cancelar</button>
                        <button onClick={requestSave} disabled={!isFormValid || !!dateError || isSending} className="bg-[#003B94] text-white px-6 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-[#001d4a] transition-all transform hover:translate-y-[-2px] disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed">
                            {isSending ? <Loader2 size={14} className="animate-spin" /> : showSuccess ? <Check size={14} /> : <Send size={14} />}
                            {isSending ? 'Enviando...' : showSuccess ? 'Enviado' : editingId ? 'Actualizar' : 'Publicar'}
                        </button>
                    </div>
                </div>
             </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Mensajes;
