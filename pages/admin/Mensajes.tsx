
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GlassCard } from '../../components/GlassCard';
import { MessageSquare, Plus, Edit2, Trash2, Search, X, Save, Send, AlertTriangle, Check, Globe, Loader2, Archive, RotateCcw, CheckCircle2, Star, MapPin } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Mensaje, Consulado } from '../../types';
import { formatDateDisplay } from '../../utils/dateFormat';

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
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [vigenciaWarning, setVigenciaWarning] = useState<string | null>(null);
  const [lastEditingId, setLastEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'archived'>('all');
  const [showEndDate, setShowEndDate] = useState(false);
  const [showConsulados, setShowConsulados] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);

  // Fonction pour archiver automatiquement les messages expirés
  const autoArchiveExpiredMessages = React.useCallback(async () => {
      const allMensajes = dataService.getMensajes();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const expiredMessages = allMensajes.filter(msg => {
          // Un message est expiré si end_date existe et est dépassée
          if (msg.end_date && !msg.archived) {
              const endDate = new Date(msg.end_date);
              endDate.setHours(0, 0, 0, 0);
              return endDate < today;
          }
          return false;
      });
      
      // Archiver tous les messages expirés
      for (const msg of expiredMessages) {
          try {
              await dataService.updateMensaje({ ...msg, archived: true });
          } catch (error) {
              console.error(`Erreur lors de l'archivage du message ${msg.id}:`, error);
          }
      }
  }, []);

  useEffect(() => {
      const load = async () => {
          // Archiver automatiquement les messages expirés au chargement
          await autoArchiveExpiredMessages();
          setMensajes(dataService.getMensajes());
          setConsulados(dataService.getConsulados());
      };
      load();
      const unsub = dataService.subscribe(async () => {
          await autoArchiveExpiredMessages();
          setMensajes(dataService.getMensajes());
          setConsulados(dataService.getConsulados());
      });
      return () => unsub();
  }, [autoArchiveExpiredMessages]);

  useEffect(() => {
      if (isModalOpen) {
          setShowSuccess(false);
          setVigenciaWarning(null);
          setDateError(null);
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
      setShowEndDate(false); // Par défaut, ne pas afficher le champ Hasta
      setShowConsulados(false); // Par défaut, ne pas afficher les consulados
      setIsModalOpen(true);
  };

  const handleEdit = (msg: Mensaje) => {
      setEditingId(msg.id);
      const today = new Date().toISOString().split('T')[0];
      // Si start_date n'existe pas ou est antérieure à aujourd'hui, utiliser aujourd'hui
      let startDate = msg.start_date || today;
      if (startDate < today) {
          startDate = today;
      }
      const targetIds = msg.target_ids || (msg.target_consulado_id === 'ALL' ? ['ALL'] : [msg.target_consulado_id]);
      setFormData({ 
          ...msg, 
          start_date: startDate,
          target_ids: targetIds
      });
      setShowEndDate(!!msg.end_date); // Afficher le champ si end_date existe déjà
      setShowConsulados(!targetIds.includes('ALL') && targetIds.length > 0); // Afficher les consulados si "Todos" n'est pas sélectionné
      setIsModalOpen(true);
  };

  const toggleTarget = (id: string) => {
      const current = new Set(formData.target_ids || []);
      if (id === 'ALL') {
          if (current.has('ALL')) current.clear();
          else { current.clear(); current.add('ALL'); }
          // Si on active "Todos", masquer les consulados
          if (current.has('ALL')) {
              setShowConsulados(false);
          }
      } else {
          current.delete('ALL');
          if (current.has(id)) current.delete(id);
          else current.add(id);
      }
      const newTargets = Array.from(current);
      
      // Construire le nom des destinataires
      let targetName = 'Todos';
      if (!newTargets.includes('ALL') && newTargets.length > 0) {
          const selectedNames = newTargets
              .map(targetId => {
                  const consulado = consulados.find(c => c.id === targetId);
                  return consulado ? consulado.name : targetId;
              })
              .filter(Boolean);
          targetName = selectedNames.length > 0 
              ? (selectedNames.length <= 3 
                  ? selectedNames.join(', ') 
                  : `${selectedNames.slice(0, 3).join(', ')} y ${selectedNames.length - 3} más`)
              : `${newTargets.length} Seleccionados`;
      }
      
      setFormData({ 
          ...formData, 
          target_ids: newTargets,
          target_consulado_name: targetName
      });
  };

  const handleShowConsulados = () => {
      setShowConsulados(true);
      // Désactiver "Todos" quand on active les consulados
      const current = new Set(formData.target_ids || []);
      current.delete('ALL');
      const newTargets = Array.from(current);
      setFormData({ 
          ...formData, 
          target_ids: newTargets.length > 0 ? newTargets : [],
          target_consulado_name: newTargets.length > 0 ? 'Seleccionados' : 'Todos'
      });
  };

  const executeSave = async () => {
      if (!formData.title || !formData.body) {
          setShowSaveConfirm(false);
          return;
      }
      if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
          setDateError("La fecha final no puede ser anterior a la fecha inicial");
          setShowSaveConfirm(false);
          return;
      }

      setIsSending(true);
      await new Promise(r => setTimeout(r, 800)); // Simulate network

      const payload: Mensaje = {
          id: editingId || crypto.randomUUID(),
          title: formData.title || '',
          body: formData.body || '',
          type: formData.type || 'INSTITUCIONAL',
          date: (() => {
            const today = new Date();
            const d = String(today.getDate()).padStart(2, '0');
            const m = String(today.getMonth() + 1).padStart(2, '0');
            const y = today.getFullYear();
            return `${d}-${m}-${y}`;
          })(), // Display date au format jj-mm-aaaa
          created_at: Date.now(),
          target_ids: formData.target_ids && formData.target_ids.length > 0 ? formData.target_ids : ['ALL'],
          target_consulado_id: formData.target_ids?.includes('ALL') ? 'ALL' : (formData.target_ids?.[0] || 'ALL'), // Legacy support
          target_consulado_name: formData.target_consulado_name || (formData.target_ids?.includes('ALL') ? 'Todos' : 'Seleccionados'),
          start_date: formData.start_date || undefined,
          end_date: formData.end_date || undefined,
          archived: false, // Les nouveaux messages ne sont jamais archivés par défaut
          is_automatic: formData.is_automatic || false
      };

      if (editingId) {
          dataService.updateMensaje(payload);
      } else {
          dataService.addMensaje(payload);
      }
      
      setIsSending(false);
      setShowSaveConfirm(false);
      // Stocker editingId avant de le réinitialiser pour l'afficher dans la modale de succès
      setLastEditingId(editingId);
      setShowSuccess(true);
      
      // Fermer automatiquement après 3 secondes
      setTimeout(() => {
          setShowSuccess(false);
          setIsModalOpen(false);
          setEditingId(null);
          setLastEditingId(null);
          setFormData({ 
              title: '', body: '', type: 'INSTITUCIONAL', 
              target_ids: ['ALL'], target_consulado_id: 'ALL', target_consulado_name: 'Todos',
              start_date: '', end_date: ''
          });
          setVigenciaWarning(null);
          setDateError(null);
      }, 3000);
  };

  const requestSave = () => {
      if (!formData.title || !formData.body) return;
      
      // Vérifier la validité des dates
      if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
          setDateError("La fecha final no puede ser anterior a la fecha inicial");
          return;
      }
      
      // Vérifier si la date de vigencia est inférieure au lendemain
      if (formData.end_date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const endDate = new Date(formData.end_date);
          endDate.setHours(0, 0, 0, 0);
          
          if (endDate < tomorrow) {
              setVigenciaWarning("⚠️ La fecha de vigencia es anterior o igual a mañana. El mensaje expirará pronto.");
          }
      }
      
      // Fermer la fenêtre d'édition et ouvrir la confirmation
      setIsModalOpen(false);
      setShowSaveConfirm(true);
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
  
  // Filtrer les messages selon l'onglet actif et la recherche
  const filteredMessages = mensajes.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'archived' 
          ? m.archived === true 
          : m.archived !== true; // Inclure les messages non archivés ou undefined
      return matchesSearch && matchesTab;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        {/* Harmonized Header */}
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none"><MessageSquare size={300} className="text-white" /></div>
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
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

            {/* Onglets */}
            <div className="relative z-10 flex gap-2">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${
                        activeTab === 'all'
                            ? 'bg-[#FCB131] text-[#001d4a] shadow-lg'
                            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }`}
                >
                    <MessageSquare size={14} />
                    Tous ({mensajes.filter(m => !m.archived).length})
                </button>
                <button
                    onClick={() => setActiveTab('archived')}
                    className={`px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 ${
                        activeTab === 'archived'
                            ? 'bg-[#FCB131] text-[#001d4a] shadow-lg'
                            : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }`}
                >
                    <Archive size={14} />
                    Archivés ({mensajes.filter(m => m.archived).length})
                </button>
            </div>
        </div>

        {filteredMessages.length > 0 ? (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {(showAllMessages ? filteredMessages : filteredMessages.slice(0, 5)).map(msg => (
                    <GlassCard key={msg.id} className={`p-4 border-l-4 relative group ${msg.archived ? 'border-l-gray-400 opacity-75' : 'border-l-[#003B94]'}`}>
                        {msg.archived && (
                            <div className="absolute top-2 right-2 bg-gray-200 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest text-gray-600 flex items-center gap-1">
                                <Archive size={8} />
                                Archivé
                            </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${msg.type === 'URGENTE' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                {msg.type}
                            </span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!msg.archived && (
                                    <button onClick={() => handleEdit(msg)} className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"><Edit2 size={10}/></button>
                                )}
                                <button onClick={() => setConfirmAction({ type: 'DELETE', id: msg.id })} className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100"><Trash2 size={10}/></button>
                            </div>
                        </div>
                        <h4 className="oswald text-sm font-black text-[#001d4a] uppercase leading-tight mb-1.5 truncate">{msg.title}</h4>
                        <p className="text-[9px] text-gray-500 line-clamp-2 mb-2">{msg.body}</p>
                        <div className="flex items-center justify-between text-[8px] font-bold text-gray-400 border-t border-gray-100 pt-2">
                            <span className="flex items-center gap-1 truncate max-w-[60%]"><Globe size={9}/> {msg.target_consulado_name}</span>
                            <span className="shrink-0">{formatDateDisplay(msg.date)}</span>
                        </div>
                        {msg.end_date && (
                            <div className="text-[7px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-100">
                                Hasta: {formatDateDisplay(msg.end_date)}
                            </div>
                        )}
                    </GlassCard>
                ))}
            </div>
            {filteredMessages.length > 5 && !showAllMessages && (
                <div className="flex justify-center mt-6">
                    <button 
                        onClick={() => setShowAllMessages(true)}
                        className="px-6 py-2.5 rounded-xl bg-[#003B94] text-white font-black uppercase text-[10px] tracking-widest hover:bg-[#001d4a] transition-all shadow-lg flex items-center gap-2"
                    >
                        Ver todos ({filteredMessages.length} mensajes)
                    </button>
                </div>
            )}
            {showAllMessages && filteredMessages.length > 5 && (
                <div className="flex justify-center mt-6">
                    <button 
                        onClick={() => setShowAllMessages(false)}
                        className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                        Ver menos
                    </button>
                </div>
            )}
            </>
        ) : (
            <div className="text-center py-12">
                <Archive size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold uppercase text-sm tracking-widest">
                    {activeTab === 'archived' ? 'Aucun message archivé' : 'Aucun message trouvé'}
                </p>
            </div>
        )}

      {confirmAction && (
          <div className="fixed inset-0 z-[900] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" >
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" >
             <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/60 max-h-[90vh] animate-in zoom-in-95 duration-300">
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
                        
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Tipo</label>
                            <div className="flex gap-2">
                                <button onClick={() => setFormData({...formData, type: 'INSTITUCIONAL'})} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${formData.type === 'INSTITUCIONAL' ? 'bg-[#003B94] text-white border-[#003B94]' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>Normal</button>
                                <button onClick={() => setFormData({...formData, type: 'URGENTE'})} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 ${formData.type === 'URGENTE' ? 'bg-[#FCB131] text-[#001d4a] border-[#FCB131]' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                                    <Star size={14} className={formData.type === 'URGENTE' ? 'fill-current' : ''} />
                                    Urgente
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest ml-1">Vigencia</label>
                            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-end">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-bold text-gray-500 uppercase tracking-wider ml-1">Desde</label>
                                    <input 
                                        type="date" 
                                        className={`w-full bg-gray-50 border rounded-xl py-2.5 px-3 font-bold text-xs text-[#001d4a] outline-none ${dateError ? 'border-red-500' : 'border-gray-200'} focus:border-[#003B94]`} 
                                        value={formData.start_date || new Date().toISOString().split('T')[0]} 
                                        min={new Date().toISOString().split('T')[0]}
                                        max={formData.end_date || ''}
                                        onChange={e => {
                                            const selectedDate = e.target.value;
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const todayStr = today.toISOString().split('T')[0];
                                            
                                            // Si la date sélectionnée est inférieure à aujourd'hui, utiliser la date du jour
                                            const finalDate = selectedDate && selectedDate < todayStr ? todayStr : selectedDate;
                                            
                                            setFormData({...formData, start_date: finalDate});
                                            
                                            // Réinitialiser l'erreur si on change la date de début
                                            if (dateError) {
                                                setDateError(null);
                                            }
                                            
                                            // Si on change start_date et qu'on a une end_date, vérifier la validité
                                            if (finalDate && formData.end_date && finalDate > formData.end_date) {
                                                setDateError("La fecha de inicio no puede ser posterior a la fecha final");
                                            }
                                        }} 
                                    />
                                </div>
                                <div className="flex items-end pb-0.5">
                                    <button 
                                        type="button"
                                        onClick={() => setShowEndDate(!showEndDate)}
                                        className={`px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                            showEndDate 
                                                ? 'bg-[#003B94] text-white border-[#003B94]' 
                                                : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                    >
                                        Hasta
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-[8px] font-bold uppercase tracking-wider ml-1 ${showEndDate ? 'text-gray-500' : 'text-gray-300'}`}>Hasta</label>
                                    <input 
                                        type="date" 
                                        disabled={!showEndDate}
                                        className={`w-full border rounded-xl py-2.5 px-3 font-bold text-xs outline-none transition-all ${
                                            showEndDate
                                                ? `bg-gray-50 text-[#001d4a] ${dateError || vigenciaWarning ? 'border-amber-500' : 'border-gray-200'} focus:border-[#003B94]`
                                                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                        }`}
                                        value={formData.end_date || ''} 
                                        min={formData.start_date || ''} 
                                        onChange={e => {
                                            if (!showEndDate) return;
                                            const selectedDate = e.target.value;
                                            setFormData({...formData, end_date: selectedDate});
                                            
                                            // Réinitialiser l'erreur si on change la date de fin
                                            if (dateError) {
                                                setDateError(null);
                                            }
                                            
                                            // Vérifier si la date de fin est antérieure à la date de début
                                            if (selectedDate && formData.start_date && selectedDate < formData.start_date) {
                                                setDateError("La fecha final no puede ser anterior a la fecha inicial");
                                                setVigenciaWarning(null);
                                                return;
                                            }
                                            
                                            // Vérifier si la date est inférieure au lendemain
                                            if (selectedDate) {
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const tomorrow = new Date(today);
                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                
                                                const selected = new Date(selectedDate);
                                                selected.setHours(0, 0, 0, 0);
                                                
                                                if (selected < tomorrow) {
                                                    setVigenciaWarning("⚠️ La fecha de vigencia es anterior o igual a mañana. El mensaje expirará pronto.");
                                                } else {
                                                    setVigenciaWarning(null);
                                                }
                                            } else {
                                                setVigenciaWarning(null);
                                            }
                                        }} 
                                    />
                                </div>
                            </div>
                        </div>
                        {dateError && <span className="text-[8px] text-red-500 font-bold block flex items-center gap-1"><AlertTriangle size={10} /> {dateError}</span>}
                        {vigenciaWarning && !dateError && <span className="text-[8px] text-amber-600 font-bold block flex items-center gap-1 bg-amber-50 p-2 rounded-lg border border-amber-200"><AlertTriangle size={10} /> {vigenciaWarning}</span>}

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
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => toggleTarget('ALL')}
                                    className={`flex-1 aspect-square rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
                                        formData.target_ids?.includes('ALL') 
                                            ? 'bg-[#003B94] border-[#003B94] text-white shadow-sm' 
                                            : 'bg-white border-gray-200 text-gray-500 hover:border-[#003B94]/30'
                                    }`}
                                >
                                    <Globe size={14} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Todos</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleShowConsulados}
                                    className={`flex-1 aspect-square rounded-lg border transition-all flex flex-col items-center justify-center gap-1 ${
                                        showConsulados 
                                            ? 'bg-[#003B94] text-white border-[#003B94] shadow-sm' 
                                            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                    <MapPin size={14} />
                                    <span className="text-[8px] font-black uppercase tracking-widest">Consulados</span>
                                </button>
                            </div>
                            
                            {showConsulados && (
                                <div className="space-y-1">
                                    {filteredConsuladosSelection.map(c => {
                                        const isSelected = formData.target_ids?.includes(c.id) && !formData.target_ids?.includes('ALL');
                                        return ( <div key={c.id} onClick={() => toggleTarget(c.id)} className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${isSelected ? 'bg-white border-[#003B94] text-[#003B94] shadow-sm ring-1 ring-[#003B94]/20' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}> <span className="text-[9px] font-bold uppercase truncate max-w-[180px]">{c.name}</span> {isSelected && <Check size={10} strokeWidth={3} />} </div> );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-[#001d4a] via-[#003B94] to-[#001d4a] border-t border-[#003B94]/30 flex justify-between items-center shrink-0 shadow-[0_-10px_40px_rgba(0,29,74,0.3)] z-20 relative">
                    <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest hidden md:block">* Campos obligatorios</span>
                    <div className="flex gap-3 w-full md:w-auto justify-end">
                        <button onClick={() => setIsModalOpen(false)} disabled={isSending} className="px-5 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors shadow-sm">Cancelar</button>
                        <button onClick={requestSave} disabled={!isFormValid || !!dateError || isSending} className="bg-[#FCB131] text-[#001d4a] px-6 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-[#FFD23F] transition-all transform hover:translate-y-[-2px] disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed">
                            {isSending ? <Loader2 size={14} className="animate-spin" /> : showSuccess ? <Check size={14} /> : <Send size={14} />}
                            {isSending ? 'Enviando...' : showSuccess ? 'Enviado' : editingId ? 'Actualizar' : 'Publicar'}
                        </button>
                    </div>
                </div>
             </div>
        </div>,
        document.body
      )}

      {showSaveConfirm && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/80 backdrop-blur-lg animate-in fade-in duration-300" >
              <div className="relative w-full max-w-lg bg-white rounded-3xl p-8 md:p-10 shadow-2xl text-center border border-white/20 overflow-hidden animate-in zoom-in-95 z-[2001] transform transition-all">
                  {/* Background gradient decoration */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FCB131]/5 via-transparent to-[#003B94]/5 opacity-50"></div>
                  
                  {/* Animated icon container */}
                  <div className="relative z-10 mb-6">
                      <div className="w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-[#FCB131]/20 to-[#FCB131]/10 rounded-3xl flex items-center justify-center mx-auto shadow-lg border border-[#FCB131]/20 animate-pulse">
                          <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-[#FCB131] to-[#FFD23F] rounded-2xl flex items-center justify-center shadow-inner">
                              <Send size={32} className="text-[#001d4a] animate-bounce" />
                          </div>
                      </div>
                  </div>
                  
                  <div className="relative z-10">
                      <h2 className="oswald text-3xl md:text-4xl font-black text-[#001d4a] uppercase mb-3 tracking-tighter">
                          {editingId ? '¿Actualizar Mensaje?' : '¿Publicar Mensaje?'}
                      </h2>
                      <p className="text-[#003B94]/80 font-bold mb-2 text-xs leading-relaxed uppercase tracking-wider">
                          {editingId ? 'Se actualizará el mensaje en el sistema.' : 'Se publicará el mensaje y estará visible para los destinatarios seleccionados.'}
                      </p>
                      
                      {/* Info box */}
                      <div className="mt-6 mb-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
                          <div className="flex items-start gap-3 text-left">
                              <div className="bg-[#003B94]/10 p-2 rounded-lg shrink-0">
                                  <Globe size={16} className="text-[#003B94]" />
                              </div>
                              <div className="flex-1">
                                  <p className="text-[10px] font-black text-[#003B94] uppercase tracking-wider mb-1">Destinatarios</p>
                                  <p className="text-xs font-bold text-gray-700">{formData.target_consulado_name || 'Todos'}</p>
                              </div>
                          </div>
                          {vigenciaWarning && (
                              <div className="mt-3 pt-3 border-t border-amber-200">
                                  <p className="text-[9px] text-amber-700 font-bold flex items-center gap-2">
                                      <AlertTriangle size={12} className="shrink-0" />
                                      {vigenciaWarning.replace('⚠️ ', '')}
                                  </p>
                              </div>
                          )}
                      </div>
                      
                      <div className="flex gap-3">
                          <button 
                              onClick={() => {
                                  setShowSaveConfirm(false);
                                  setVigenciaWarning(null);
                                  // Rouvrir la fenêtre d'édition
                                  setIsModalOpen(true);
                              }} 
                              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-widest hover:from-slate-200 hover:to-slate-100 transition-all shadow-md border border-slate-200"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={executeSave} 
                              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-br from-[#003B94] to-[#001d4a] text-white uppercase text-[10px] font-black tracking-widest shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all transform"
                          >
                              {editingId ? 'Actualizar' : 'Publicar'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showSuccess && (
          <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-[#001d4a]/90 backdrop-blur-xl animate-in fade-in duration-300" >
              <div className="relative w-full max-w-md bg-white rounded-3xl p-8 md:p-10 shadow-2xl text-center border border-white/20 overflow-hidden animate-in zoom-in-95 z-[2101] transform transition-all">
                  {/* Animated success background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 opacity-60"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#FCB131]/10 to-transparent"></div>
                  
                  {/* Animated success icon */}
                  <div className="relative z-10 mb-6">
                      <div className="w-28 h-28 md:w-32 md:h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce border-4 border-white">
                          <CheckCircle2 size={48} className="text-white drop-shadow-lg" strokeWidth={3} />
                      </div>
                  </div>
                  
                  <div className="relative z-10">
                      <h2 className="oswald text-4xl md:text-5xl font-black text-[#001d4a] uppercase mb-3 tracking-tighter animate-in slide-in-from-bottom-4">
                          ¡Mensaje {lastEditingId ? 'Actualizado' : 'Publicado'}!
                      </h2>
                      <p className="text-[#003B94]/80 font-bold mb-6 text-xs leading-relaxed uppercase tracking-wider">
                          El mensaje ha sido {lastEditingId ? 'actualizado' : 'publicado'} exitosamente en el sistema.
                      </p>
                      
                      {/* Success details */}
                      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                          <div className="flex items-center justify-center gap-2 text-green-700">
                              <CheckCircle2 size={16} className="text-green-600" />
                              <p className="text-[10px] font-black uppercase tracking-wider">
                                  Visible para: {formData.target_consulado_name || 'Todos'}
                              </p>
                          </div>
                      </div>
                      
                      <button 
                          onClick={() => {
                              setShowSuccess(false);
                              setIsModalOpen(false);
                              setEditingId(null);
                              setLastEditingId(null);
                              setFormData({ 
                                  title: '', body: '', type: 'INSTITUCIONAL', 
                                  target_ids: ['ALL'], target_consulado_id: 'ALL', target_consulado_name: 'Todos',
                                  start_date: '', end_date: ''
                              });
                              setVigenciaWarning(null);
                              setDateError(null);
                          }} 
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-[#003B94] to-[#001d4a] text-white uppercase text-[10px] font-black tracking-widest shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all transform"
                      >
                          Cerrar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Mensajes;
