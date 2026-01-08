
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { GlassCard } from '../../components/GlassCard';
import { Calendar, Plus, Edit2, Trash2, X, Save, Building2, Star, Trophy, Globe, Users, Gift, MapPin, AlertTriangle, Loader2, Clock } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { AgendaEvent } from '../../types';

// Icons mapping for visual
const EVENT_TYPES = [
    { id: 'EVENTO', label: 'Institucional', icon: Building2 },
    { id: 'EFEMERIDE', label: 'Efeméride', icon: Star },
    { id: 'IDOLO', label: 'Ídolo', icon: Trophy },
    { id: 'INTERNACIONAL', label: 'Internacional', icon: Globe },
    { id: 'ENCUENTRO', label: 'Encuentro', icon: Users },
    { id: 'CUMPLEAÑOS', label: 'Cumpleaños', icon: Gift }
];

const formatDateHeader = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    // Adjust for UTC if needed, assuming input is YYYY-MM-DD local
    const [y, m, d] = dateStr.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    return localDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatDateCard = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
};

export const Agenda = () => {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<AgendaEvent>>({
      title: '', date: '', startDate: '', endDate: '', type: 'EVENTO', description: '', location: '', isSpecialDay: false
  });
  
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
      const load = () => setEvents(dataService.getAgendaEvents());
      load();
      const unsub = dataService.subscribe(load);
      return () => unsub();
  }, []);

  const handleCreate = () => {
      setEditingId(null);
      setFormData({ title: '', date: '', startDate: '', endDate: '', type: 'EVENTO', description: '', location: '', isSpecialDay: false });
      setDateError(null);
      setIsModalOpen(true);
  };

  const handleEdit = (evt: AgendaEvent) => {
      setEditingId(evt.id);
      setFormData({ ...evt });
      setDateError(null);
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if(confirm("¿Eliminar este evento?")) {
          dataService.deleteAgendaEvent(id);
      }
  };

  const requestSave = () => {
      if (!formData.title || !formData.startDate) return;
      if (formData.endDate && formData.startDate > formData.endDate) {
          setDateError("La fecha final debe ser posterior a la inicial");
          return;
      }

      const payload: AgendaEvent = { 
          id: editingId || crypto.randomUUID(),
          title: formData.title || '',
          date: formData.startDate || formData.date || '', // Ensure main date sort field matches start
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          type: formData.type || 'EVENTO',
          description: formData.description || undefined,
          location: formData.location || undefined,
          isSpecialDay: formData.isSpecialDay !== undefined ? formData.isSpecialDay : false
      };

      if (editingId) {
          dataService.updateAgendaEvent(payload);
      } else {
          dataService.addAgendaEvent(payload);
      }
      setIsModalOpen(false);
  };

  // Group events by Date
  const groupedEvents = useMemo(() => {
      const sorted = [...events].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const groups: Record<string, AgendaEvent[]> = {};
      sorted.forEach(evt => {
          if (!groups[evt.date]) groups[evt.date] = [];
          groups[evt.date].push(evt);
      });
      return groups;
  }, [events]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        {/* Harmonized Header */}
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none"><Calendar size={300} className="text-white" /></div>
            <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-4 rounded-xl border border-white/20"><Calendar size={28} className="text-[#FCB131]" /></div>
                <div><h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Agenda Institucional</h1><p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Gestión de Eventos</p></div>
            </div>
            <button onClick={handleCreate} className="relative z-10 bg-[#FCB131] text-[#001d4a] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-[#FFD23F] transition-all"><Plus size={16} /> Nuevo Evento</button>
        </div>

        {/* Grouped Events */}
        <div className="space-y-8">
            {Object.keys(groupedEvents).length > 0 ? Object.keys(groupedEvents).map(dateKey => (
                <div key={dateKey} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Date Separator */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px bg-[#003B94]/10 flex-1"></div>
                        <div className="bg-white px-4 py-1.5 rounded-full border border-[#003B94]/10 shadow-sm text-[#001d4a] text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={12} className="text-[#FCB131]" />
                            {formatDateHeader(dateKey)}
                        </div>
                        <div className="h-px bg-[#003B94]/10 flex-1"></div>
                    </div>

                    {/* Small Cards Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {groupedEvents[dateKey].map(evt => {
                            const typeConfig = EVENT_TYPES.find(t => t.id === evt.type) || EVENT_TYPES[0];
                            const Icon = typeConfig.icon;
                            return (
                                <GlassCard key={evt.id} className="p-3 bg-white border border-gray-100 hover:border-[#003B94]/30 hover:shadow-md transition-all group relative overflow-hidden">
                                    {evt.isSpecialDay && <div className="absolute top-0 right-0 w-8 h-8 bg-[#FCB131]/10 rounded-bl-xl flex items-center justify-center"><Star size={10} className="text-[#FCB131] fill-[#FCB131]" /></div>}
                                    
                                    <div className="mb-2">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${evt.type === 'EFEMERIDE' ? 'bg-[#FCB131]/10 text-[#FCB131]' : 'bg-[#003B94]/5 text-[#003B94]'}`}>
                                            <Icon size={14} />
                                        </div>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">{typeConfig.label}</span>
                                        <h4 className="font-bold text-[#001d4a] text-[10px] leading-tight line-clamp-2 min-h-[2.5em]" title={evt.title}>{evt.title}</h4>
                                    </div>

                                    <div className="pt-2 border-t border-gray-50 flex items-center justify-between text-[8px] font-bold text-gray-400">
                                        <span className="flex items-center gap-1"><Clock size={8}/> {formatDateCard(evt.startDate)}</span>
                                        {evt.location && <MapPin size={8} className="text-gray-300" />}
                                    </div>

                                    {/* Quick Actions Overlay */}
                                    <div className="absolute inset-0 bg-white/90 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(evt)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-100"><Edit2 size={12}/></button>
                                        <button onClick={() => handleDelete(evt.id)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-100"><Trash2 size={12}/></button>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                </div>
            )) : (
                <div className="py-20 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                    <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">No hay eventos programados</p>
                </div>
            )}
        </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
             <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/60 animate-in zoom-in-95 duration-300 max-h-[calc(100vh-7rem-2rem)]">
                <div className="liquid-glass-dark p-5 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm"><Calendar size={20} className="text-[#FCB131]" /></div>
                        <h2 className="oswald text-xl font-black uppercase tracking-tight">{editingId ? 'Editar' : 'Nuevo'} Evento</h2>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Título</label>
                        <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94] transition-all text-[#001d4a] placeholder:text-gray-300 h-10" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: Aniversario Fundación" autoFocus />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Tipo de Evento</label>
                        <div className="grid grid-cols-2 gap-2">
                            {EVENT_TYPES.map(t => {
                                const isSelected = formData.type === t.id;
                                const Icon = t.icon;
                                return ( <button key={t.id} onClick={() => setFormData({...formData, type: t.id as any})} className={`flex items-center gap-2 px-3 h-10 rounded-lg border transition-all ${ isSelected ? `bg-[#003B94] text-white border-[#003B94] shadow-md` : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50' }`}><Icon size={14} className={isSelected ? 'text-[#FCB131]' : 'opacity-70'} /> <span className="text-[9px] font-black uppercase tracking-widest truncate">{t.label}</span></button> );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Inicio</label>
                            <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94] transition-all text-[#001d4a] h-10" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value, date: e.target.value})} />
                        </div>
                        <div className="space-y-1 relative">
                            <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Fin (Opcional)</label>
                            <input type="date" className={`w-full bg-gray-50 border rounded-xl px-3 font-bold text-xs outline-none transition-all text-[#001d4a] h-10 ${dateError ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:bg-white focus:border-[#003B94]'}`} value={formData.endDate} min={formData.startDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                        </div>
                    </div>
                    {dateError && <div className="text-red-500 text-[9px] font-bold flex items-center gap-1"><AlertTriangle size={10} /> {dateError}</div>}

                    <div className="flex gap-3">
                        <div className="space-y-1 flex-1">
                            <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Ubicación</label>
                            <div className="relative"><input type="text" placeholder="Ej: Brandsen 805" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 pl-8 font-bold text-xs outline-none focus:border-[#003B94] transition-all text-[#001d4a] h-10" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /><MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /></div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1 text-center block">Especial</label>
                            <div onClick={() => setFormData({...formData, isSpecialDay: !formData.isSpecialDay})} className={`flex items-center justify-center px-4 rounded-xl border cursor-pointer transition-all h-10 w-14 ${formData.isSpecialDay ? 'bg-[#FCB131]/10 border-[#FCB131]' : 'bg-gray-50 border-gray-200'}`}><Star size={16} className={formData.isSpecialDay ? 'text-[#FCB131] fill-[#FCB131]' : 'text-gray-300'} /></div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Notas Adicionales</label>
                        <textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94] transition-all h-20 resize-none text-[#001d4a]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detalles..." />
                    </div>
                </div>

                <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest text-gray-500 bg-white border border-gray-200 hover:bg-gray-100 transition-colors">Cancelar</button>
                    <button onClick={requestSave} disabled={!!dateError} className={`bg-[#003B94] text-white px-6 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-[#001d4a] transition-all ${dateError ? 'opacity-50 cursor-not-allowed' : ''}`}><Save size={14} /> {editingId ? 'Guardar' : 'Crear'}</button>
                </div>
             </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Agenda;
