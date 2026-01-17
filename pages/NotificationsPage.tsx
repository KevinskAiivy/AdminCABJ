
import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Bell, Trash2, ArrowRightLeft, Mail, AlertCircle, Filter, Search, CheckCircle2, RotateCcw, MessageSquare, Ticket, UserPlus } from 'lucide-react';
import { dataService } from '../services/dataService';
import { AppNotification, UserSession } from '../types';

export const NotificationsPage = ({ user }: { user: UserSession }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
      const load = () => {
          setNotifications(dataService.getNotificationsForUser(user));
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

  // Les notifications sont uniquement pour les présidents et référents
  if (user.role !== 'PRESIDENTE' && user.role !== 'REFERENTE') {
      return (
          <div className="max-w-2xl mx-auto py-20 px-4 text-center">
              <div className="bg-white rounded-2xl p-12 shadow-lg border border-gray-100">
                  <Bell size={64} className="mx-auto mb-6 text-gray-300" />
                  <h1 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-4">Acceso Restringido</h1>
                  <p className="text-gray-500 text-sm mb-6">
                      El centro de notificaciones está disponible únicamente para Presidentes y Referentes de consulados.
                  </p>
                  <a href="#/" className="inline-block px-6 py-3 bg-[#003B94] text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-[#001d4a] transition-all">
                      Volver al Dashboard
                  </a>
              </div>
          </div>
      );
  }

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

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex flex-col md:flex-row gap-4 items-center justify-between">
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
            {notifications.filter(n => !n.read).length > 0 && (
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

        {/* List */}
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
    </div>
  );
};

export default NotificationsPage;
