
import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Bell, Trash2, ArrowRightLeft, Mail, AlertCircle, Filter, Search, CheckCircle2, RotateCcw, MessageSquare, Ticket, UserPlus, Lock } from 'lucide-react';
import { dataService } from '../services/dataService';
import { AppNotification, UserSession, Mensaje } from '../types';

export const NotificationsPage = ({ user }: { user: UserSession }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [activeTab, setActiveTab] = useState<'notifications' | 'mensajes'>('notifications');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
      const load = () => {
          setNotifications(dataService.getNotificationsForUser(user));
          // Charger les messages actifs
          const allMensajes = dataService.getActiveMensajes();
          // Filtrer selon le rôle de l'utilisateur
          const userRole = (user.role || '').toUpperCase();
          if (userRole === 'SUPERADMIN' || userRole === 'ADMIN') {
              setMensajes(allMensajes);
          } else {
              // Pour les autres rôles, filtrer par consulado
              setMensajes(allMensajes.filter(m => 
                  m.target_consulado_id === 'ALL' || 
                  m.target_consulado_id === user.consulado_id
              ));
          }
      };
      load();
      const unsubscribe = dataService.subscribe(load);
      return () => unsubscribe();
  }, [user]);

  const handleDelete = async (id: string) => {
      try {
          await dataService.deleteNotification(id);
          setNotifications(prev => prev.filter(n => n.id !== id));
      } catch (error: any) {
          console.error('Error deleting notification:', error);
          alert('Error al eliminar la notificación');
      }
  };
  
  const handleMarkAsRead = async (id: string) => {
      try {
          await dataService.markNotificationAsRead(id);
          setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
      } catch (error: any) {
          console.error('Error marking notification as read:', error);
      }
  };
  
  const handleMarkAllAsRead = async () => {
      try {
          const unreadNotifications = notifications.filter(n => !n.read);
          await Promise.all(unreadNotifications.map(n => dataService.markNotificationAsRead(n.id)));
          setNotifications(prev => prev.map(n => ({...n, read: true})));
      } catch (error: any) {
          console.error('Error marking all notifications as read:', error);
      }
  };

  const filteredNotifications = useMemo(() => {
      return notifications.filter(n => {
          const matchType = filterType === 'ALL' || n.type === filterType;
          const matchSearch = searchQuery === '' || 
                              n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              n.message.toLowerCase().includes(searchQuery.toLowerCase());
          return matchType && matchSearch;
      }).sort((a, b) => {
          // Trier par : non lues en premier, puis par date décroissante
          if (a.read !== b.read) return a.read ? 1 : -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [notifications, filterType, searchQuery]);

  const filteredMensajes = useMemo(() => {
      return mensajes.filter(m => {
          const matchSearch = searchQuery === '' || 
                              m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              m.body.toLowerCase().includes(searchQuery.toLowerCase());
          return matchSearch;
      }).sort((a, b) => {
          // Messages URGENTE en premier, puis par date décroissante
          if (a.type === 'URGENTE' && b.type !== 'URGENTE') return -1;
          if (a.type !== 'URGENTE' && b.type === 'URGENTE') return 1;
          return b.created_at - a.created_at;
      });
  }, [mensajes, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        {/* Header */}
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                <Bell size={200} className="text-white" />
            </div>
            <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                    <Bell size={28} className="text-[#FCB131]" />
                </div>
                <div>
                    <h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Centro de Notificaciones</h1>
                    <p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Historial y Alertas</p>
                </div>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-[#003B94]/10">
            <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 py-3 px-6 rounded-lg text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'notifications'
                        ? 'bg-[#003B94] text-white shadow-lg'
                        : 'bg-gray-50 text-gray-400 hover:text-[#001d4a] hover:bg-gray-100'
                }`}
            >
                <Bell size={16} />
                Notificaciones
                {notifications.filter(n => !n.read).length > 0 && (
                    <span className="bg-[#FCB131] text-[#001d4a] text-[10px] font-black px-2 py-0.5 rounded-full">
                        {notifications.filter(n => !n.read).length}
                    </span>
                )}
            </button>
            <button
                onClick={() => setActiveTab('mensajes')}
                className={`flex-1 py-3 px-6 rounded-lg text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    activeTab === 'mensajes'
                        ? 'bg-[#003B94] text-white shadow-lg'
                        : 'bg-gray-50 text-gray-400 hover:text-[#001d4a] hover:bg-gray-100'
                }`}
            >
                <MessageSquare size={16} />
                Mensajes
                {mensajes.filter(m => m.type === 'URGENTE').length > 0 && (
                    <span className="bg-[#FCB131] text-[#001d4a] text-[10px] font-black px-2 py-0.5 rounded-full">
                        {mensajes.filter(m => m.type === 'URGENTE').length}
                    </span>
                )}
            </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex flex-col md:flex-row gap-4 items-center justify-between">
            {activeTab === 'notifications' && (
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
                    {['ALL', 'TRANSFER', 'MESSAGE', 'HABILITACION', 'SOCIO', 'SYSTEM', 'ALERT'].map(type => (
                        <button 
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                filterType === type 
                                ? 'bg-[#003B94] text-white shadow' 
                                : 'bg-gray-50 text-gray-400 hover:text-[#001d4a] hover:bg-gray-100'
                            }`}
                        >
                            {type === 'ALL' ? 'Todas' : 
                             type === 'TRANSFER' ? 'Transferencias' : 
                             type === 'MESSAGE' ? 'Mensajes' :
                             type === 'HABILITACION' ? 'Habilitaciones' :
                             type === 'SOCIO' ? 'Socios' :
                             type === 'ALERT' ? 'Alertas' : 'Sistema'}
                        </button>
                    ))}
                </div>
            )}
            {activeTab === 'mensajes' && (
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {filteredMensajes.length} mensaje{filteredMensajes.length !== 1 ? 's' : ''} activo{filteredMensajes.length !== 1 ? 's' : ''}
                </div>
            )}
            {activeTab === 'notifications' && notifications.filter(n => !n.read).length > 0 && (
                <button
                    onClick={handleMarkAllAsRead}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 whitespace-nowrap"
                >
                    <CheckCircle2 size={12} /> Marcar todas como leídas
                </button>
            )}
            <div className="relative group w-full md:w-64">
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="w-full bg-gray-50 border border-transparent rounded-lg py-2 pl-9 pr-4 outline-none text-xs font-bold text-[#001d4a] transition-all focus:bg-white focus:border-[#003B94]/30"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            </div>
        </div>

        {/* List - Notifications */}
        {activeTab === 'notifications' && (
            <div className="space-y-3">
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map(notif => (
                        <GlassCard key={notif.id} className={`p-4 bg-white border group transition-all relative ${notif.read ? 'border-gray-100 opacity-80 hover:opacity-100' : 'border-l-4 border-l-[#FCB131] shadow-md'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl shrink-0 ${
                                    notif.type === 'TRANSFER' ? 'bg-amber-50 text-amber-600' :
                                    notif.type === 'ALERT' ? 'bg-red-50 text-red-600' :
                                    notif.type === 'MESSAGE' ? 'bg-purple-50 text-purple-600' :
                                    notif.type === 'HABILITACION' ? 'bg-emerald-50 text-emerald-600' :
                                    notif.type === 'SOCIO' ? 'bg-cyan-50 text-cyan-600' :
                                    'bg-blue-50 text-blue-600'
                                }`}>
                                    {notif.type === 'TRANSFER' ? <ArrowRightLeft size={20} /> : 
                                     notif.type === 'ALERT' ? <AlertCircle size={20} /> : 
                                     notif.type === 'MESSAGE' ? <MessageSquare size={20} /> :
                                     notif.type === 'HABILITACION' ? <Ticket size={20} /> :
                                     notif.type === 'SOCIO' ? <UserPlus size={20} /> :
                                     <Mail size={20} />}
                                </div>
                                
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`text-sm font-black uppercase ${notif.read ? 'text-gray-500' : 'text-[#001d4a]'}`}>
                                            {notif.title}
                                        </h4>
                                        <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                                            {notif.date}
                                            {notif.read && <CheckCircle2 size={12} className="text-emerald-500" />}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        {notif.message}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 self-center ml-2">
                                    {!notif.read && (
                                        <button 
                                            onClick={() => handleMarkAsRead(notif.id)}
                                            className="p-2 text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                            title="Marcar como leída"
                                        >
                                            <CheckCircle2 size={16} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDelete(notif.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Eliminar permanentemente"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </GlassCard>
                    ))
                ) : (
                    <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                        <Bell size={48} className="mx-auto mb-4 text-gray-200" />
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                            No hay notificaciones {filterType !== 'ALL' ? 'en esta categoría' : ''}
                        </p>
                        {filterType !== 'ALL' && (
                            <button onClick={() => setFilterType('ALL')} className="mt-4 text-[#003B94] text-[9px] font-bold uppercase hover:underline flex items-center justify-center gap-1">
                                <RotateCcw size={10} /> Ver todas
                            </button>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* List - Mensajes */}
        {activeTab === 'mensajes' && (
            <div className="space-y-3">
                {filteredMensajes.length > 0 ? (
                    filteredMensajes.map(msg => {
                        const isUrgent = msg.type === 'URGENTE';
                        const isAutomatic = msg.is_automatic === true;
                        
                        return (
                            <div 
                                key={msg.id} 
                                className={`p-5 rounded-xl transition-all relative overflow-hidden ${
                                    isUrgent 
                                        ? 'bg-gradient-to-br from-[#001d4a] via-[#002d6a] to-[#001d4a] border-2 border-[#FCB131]/30 shadow-lg' 
                                        : 'bg-white border border-gray-100 shadow-sm hover:shadow-md'
                                }`}
                            >
                                {/* Badge automatique */}
                                {isAutomatic && (
                                    <div className="absolute top-3 right-3">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                                            isUrgent ? 'bg-[#FCB131]/20 text-[#FCB131]' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                            🤖 Automático
                                        </span>
                                    </div>
                                )}
                                
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl shrink-0 ${
                                        isUrgent 
                                            ? 'bg-[#FCB131]/20 text-[#FCB131]' 
                                            : msg.type === 'CONSULAR' 
                                                ? 'bg-purple-50 text-purple-600' 
                                                : 'bg-blue-50 text-blue-600'
                                    }`}>
                                        {isUrgent ? <AlertCircle size={24} /> : <MessageSquare size={24} />}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                                                isUrgent 
                                                    ? 'bg-[#FCB131] text-[#001d4a]' 
                                                    : msg.type === 'CONSULAR' 
                                                        ? 'bg-purple-100 text-purple-700' 
                                                        : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {msg.type}
                                            </span>
                                            {isUrgent && (
                                                <Lock size={12} className="text-[#FCB131]/60" title="Mensaje importante - No eliminable" />
                                            )}
                                        </div>
                                        
                                        <h4 className={`text-base font-black uppercase mb-2 ${
                                            isUrgent ? 'text-white' : 'text-[#001d4a]'
                                        }`}>
                                            {msg.title}
                                        </h4>
                                        
                                        <p className={`text-sm leading-relaxed whitespace-pre-line ${
                                            isUrgent ? 'text-white/80' : 'text-gray-600'
                                        }`}>
                                            {msg.body}
                                        </p>
                                        
                                        <div className={`flex items-center gap-4 mt-4 text-[10px] font-bold uppercase tracking-widest ${
                                            isUrgent ? 'text-[#FCB131]/70' : 'text-gray-400'
                                        }`}>
                                            <span>📅 {msg.date}</span>
                                            {msg.start_date && msg.end_date && (
                                                <span>⏰ Activo: {msg.start_date} → {msg.end_date}</span>
                                            )}
                                            <span>🎯 {msg.target_consulado_name}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed border-gray-200">
                        <MessageSquare size={48} className="mx-auto mb-4 text-gray-200" />
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                            No hay mensajes activos
                        </p>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default NotificationsPage;
