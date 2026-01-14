
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, Ticket, Settings, ChevronDown, LogOut, MessageSquare, Database, Calendar, Sword, Shield, Lock, Bell, ArrowRightLeft, AlertCircle, Mail, CheckCircle2, X } from 'lucide-react';
import { BocaLogoSVG } from '../constants';
import { UserSession, AppNotification } from '../types';
import { dataService } from '../services/dataService';

const NavItem = ({ to, icon: Icon, label, isActive }: any) => (
  <Link
    to={to}
    className={`nav-item-hover-effect flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 relative group transform hover:-translate-y-0.5 ${
      isActive 
        ? 'bg-[#FCB131] text-[#001d4a] font-black shadow-[0_0_20px_rgba(252,177,49,0.4)]' 
        : 'text-white/80 hover:text-white hover:bg-white/10'
    }`}
  >
    <Icon size={16} className={`relative z-10 ${isActive ? 'stroke-[2.5px]' : ''}`} />
    <span className="uppercase text-[10px] font-black tracking-widest relative z-10">{label}</span>
  </Link>
);

export const Navbar = ({ 
  onLogout, 
  user
}: { 
  onLogout: () => void, 
  user: UserSession
}) => {
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string>(dataService.getAssetUrl('navbar_logo_main'));
  const [logoError, setLogoError] = useState(false);
  const [logoSize, setLogoSize] = useState<number>(40);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  
  // Charger les notifications
  useEffect(() => {
    const loadNotifications = () => {
      const userNotifications = dataService.getNotificationsForUser(user);
      setNotifications(userNotifications);
    };
    loadNotifications();
    const unsubscribe = dataService.subscribe(loadNotifications);
    return () => unsubscribe();
  }, [user]);
  
  // Compter les notifications non lues
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);
  
  // Obtenir les dernières notifications (5 non lues + 3 lues max)
  const recentNotifications = useMemo(() => {
    const unread = notifications.filter(n => !n.read).slice(0, 5);
    const read = notifications.filter(n => n.read).slice(0, 3);
    return [...unread, ...read].slice(0, 8);
  }, [notifications]);

  // S'abonner aux changements de assets pour mettre à jour le logo
  useEffect(() => {
    const updateLogo = () => {
      const navbarAsset = dataService.getAssetByKey('navbar_logo_main');
      if (navbarAsset) {
        setLogoUrl(dataService.getAssetUrl('navbar_logo_main'));
        setLogoSize(navbarAsset.display_size || 40);
        setLogoError(false); // Réinitialiser l'erreur quand les assets changent
      }
    };
    updateLogo();
    const unsubscribe = dataService.subscribe(updateLogo);
    return () => unsubscribe();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAdminOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setIsAdminOpen(false);
    setIsNotificationsOpen(false);
  }, [location]);
  
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await dataService.markNotificationAsRead(notificationId);
      // Recharger les notifications
      const userNotifications = dataService.getNotificationsForUser(user);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await dataService.deleteNotification(notificationId);
      // Recharger les notifications
      const userNotifications = dataService.getNotificationsForUser(user);
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4">
      <nav className="max-w-7xl mx-auto bg-gradient-to-r from-[#000d24] via-[#001d4a] to-[#000d24] border border-white/10 rounded-2xl px-4 lg:px-6 py-3 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative">
        
        {/* Logo Section */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative group cursor-pointer">
             <div className="absolute inset-0 bg-[#FCB131] blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full"></div>
             {!logoError ? (
               <img 
                 src={logoUrl} 
                 alt="Logo" 
                 style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                 className="drop-shadow-lg relative z-10 transform group-hover:scale-105 transition-transform object-contain"
                 onError={() => {
                   // Si l'image ne charge pas, utiliser le logo SVG par défaut
                   setLogoError(true);
                 }}
               />
             ) : (
               <BocaLogoSVG style={{ width: `${logoSize}px`, height: `${logoSize}px` }} className="drop-shadow-lg relative z-10 transform group-hover:scale-105 transition-transform" />
             )}
          </div>
          <div className="leading-tight hidden lg:block">
            <h1 className="text-white font-black text-sm oswald tracking-tighter uppercase">Consulados CABJ</h1>
            <p className="text-[#FCB131] text-[9px] font-black uppercase tracking-[0.2em]">
              {user.role}
            </p>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 flex items-center justify-center gap-1 mx-2 lg:mx-6">
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-2xl border border-white/5 backdrop-blur-sm">
              <NavItem to="/" icon={LayoutDashboard} label="Dashboard" isActive={location.pathname === '/' || location.pathname === '/dashboard'} />
              <NavItem to="/consulados" icon={MapPin} label="Consulados" isActive={location.pathname === '/consulados'} />
              <NavItem to="/socios" icon={Users} label="Socios" isActive={location.pathname === '/socios'} />
              <NavItem to="/habilitaciones" icon={Ticket} label="Habilitaciones" isActive={location.pathname === '/habilitaciones'} />
          </div>
          
          {/* Admin Mega Menu Trigger - Pour SUPERADMIN et ADMIN */}
          { (user.role === 'SUPERADMIN' || user.role === 'ADMIN') &&
            <div className="relative ml-2" ref={dropdownRef}>
                <button
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 relative group border transform hover:-translate-y-0.5 ${
                    location.pathname.startsWith('/admin') || isAdminOpen
                    ? 'bg-[#FCB131] text-[#001d4a] border-[#FCB131] font-black shadow-[0_0_20px_rgba(252,177,49,0.3)]'
                    : 'bg-transparent text-white/90 border-white/10 hover:border-white/30 hover:bg-white/5'
                }`}
                >
                <Settings size={16} className={`relative z-10 ${isAdminOpen ? 'animate-spin-slow' : ''}`} />
                <span className="uppercase text-[10px] font-black tracking-widest relative z-10">Admin</span>
                <ChevronDown size={12} className={`relative z-10 transition-transform duration-300 ${isAdminOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Improved Dropdown */}
                {isAdminOpen && (
                    <div className="absolute top-full right-0 mt-3 w-64 bg-[#001d4a] border border-[#FCB131]/30 rounded-2xl p-1.5 shadow-[0_30px_80px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-2xl z-50 overflow-hidden ring-1 ring-white/10">
                    <div className="bg-black/20 rounded-xl overflow-hidden">
                        {/* Section: Operational */}
                        <div className="px-4 py-2 bg-[#FCB131]/10 border-b border-white/5 flex items-center gap-2">
                            <Sword size={10} className="text-[#FCB131]" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-[#FCB131]">Gestión Deportiva</span>
                        </div>
                        <div className="p-1 space-y-0.5">
                            <Link to="/admin/futbol" className="flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-all group">
                                <div className="p-1.5 rounded-md bg-[#003B94]/50 group-hover:bg-[#FCB131] group-hover:text-[#001d4a] transition-colors"><Sword size={12}/></div> Fútbol
                            </Link>
                            <Link to="/admin/agenda" className="flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-all group">
                                <div className="p-1.5 rounded-md bg-[#003B94]/50 group-hover:bg-[#FCB131] group-hover:text-[#001d4a] transition-colors"><Calendar size={12}/></div> Agenda
                            </Link>
                            <Link to="/admin/mensajes" className="flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-all group">
                                <div className="p-1.5 rounded-md bg-[#003B94]/50 group-hover:bg-[#FCB131] group-hover:text-[#001d4a] transition-colors"><MessageSquare size={12}/></div> Mensajes
                            </Link>
                        </div>

                        {/* Section: System - Seulement pour SUPERADMIN */}
                        {user.role === 'SUPERADMIN' && (
                          <>
                        <div className="px-4 py-2 bg-white/5 border-y border-white/5 flex items-center gap-2 mt-1">
                            <Shield size={10} className="text-blue-400" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-blue-200">Sistema</span>
                        </div>
                        <div className="p-1 space-y-0.5">
                            <Link to="/admin/usuarios" className="flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-all group">
                                <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Users size={12}/></div> Usuarios
                            </Link>
                            <Link to="/admin/accesos" className="flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-all group">
                                <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Lock size={12}/></div> Permisos
                            </Link>
                            <Link to="/admin/configuracion" className="flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:bg-white/10 hover:text-white rounded-lg transition-all group">
                                <div className="p-1.5 rounded-md bg-white/5 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Settings size={12}/></div> Configuración
                            </Link>
                            <Link to="/admin/database" className="flex items-center gap-3 px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-red-300 hover:bg-red-500/10 hover:text-red-200 rounded-lg transition-all group">
                                <div className="p-1.5 rounded-md bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white transition-colors"><Database size={12}/></div> Database
                            </Link>
                        </div>
                          </>
                        )}
                    </div>
                    </div>
                )}
            </div>
          }
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-white/10">
          {/* Notifications Bell */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`p-2.5 rounded-xl transition-all border relative group ${
                isNotificationsOpen || location.pathname === '/notificaciones'
                  ? 'bg-[#FCB131] text-[#001d4a] border-[#FCB131] shadow-[0_0_15px_rgba(252,177,49,0.4)]'
                  : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
              title="Notificaciones"
            >
              <Bell size={18} className={`relative z-10 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#001d4a] shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute top-full right-0 mt-3 w-96 bg-[#001d4a] border border-[#FCB131]/30 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50 overflow-hidden ring-1 ring-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 bg-gradient-to-r from-[#003B94] to-[#001d4a] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-[#FCB131]" />
                    <h3 className="text-white text-xs font-black uppercase tracking-widest">Notificaciones</h3>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[8px] font-black rounded-full px-2 py-0.5">
                        {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <Link
                    to="/notificaciones"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-[#FCB131] text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Ver todas →
                  </Link>
                </div>
                
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {recentNotifications.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {recentNotifications.map(notif => (
                        <div
                          key={notif.id}
                          className={`p-4 hover:bg-white/5 transition-all relative group ${
                            !notif.read ? 'bg-[#003B94]/10 border-l-2 border-l-[#FCB131]' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg shrink-0 ${
                              notif.type === 'TRANSFER' ? 'bg-amber-500/20 text-amber-300' :
                              notif.type === 'ALERT' ? 'bg-red-500/20 text-red-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {notif.type === 'TRANSFER' ? <ArrowRightLeft size={14} /> :
                               notif.type === 'ALERT' ? <AlertCircle size={14} /> :
                               <Mail size={14} />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className={`text-[10px] font-black uppercase tracking-widest ${!notif.read ? 'text-white' : 'text-white/70'}`}>
                                  {notif.title}
                                </h4>
                                {!notif.read && (
                                  <span className="bg-red-500 rounded-full w-2 h-2 shrink-0 mt-1.5"></span>
                                )}
                              </div>
                              <p className="text-[9px] text-white/60 leading-relaxed mb-2 line-clamp-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] text-white/40 font-bold">
                                  {new Date(notif.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div className="flex items-center gap-1">
                                  {!notif.read && (
                                    <button
                                      onClick={() => handleMarkAsRead(notif.id)}
                                      className="p-1 text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                                      title="Marcar como leída"
                                    >
                                      <CheckCircle2 size={12} />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteNotification(notif.id)}
                                    className="p-1 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
                                    title="Eliminar"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Bell size={32} className="mx-auto mb-3 text-white/20" />
                      <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">
                        No hay notificaciones
                      </p>
                    </div>
                  )}
                </div>
                
                {recentNotifications.length > 0 && (
                  <div className="p-3 bg-black/20 border-t border-white/5">
                    <Link
                      to="/notificaciones"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="block text-center text-[#FCB131] text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Ver todas las notificaciones →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-white text-[9px] font-black uppercase tracking-widest">{user.name}</span>
            <span className="text-[#FCB131] text-[8px] font-black uppercase animate-pulse">
              {user.role}
            </span>
          </div>
          <button 
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="p-2.5 bg-white/5 rounded-xl text-white/60 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all duration-300 border border-white/10 group relative overflow-hidden"
            title="Cerrar Sesión"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-500/0 to-red-600/0 group-hover:from-red-600/20 group-hover:via-red-500/30 group-hover:to-red-600/20 transition-all duration-300"></div>
            <LogOut 
              size={18} 
              className="relative z-10 group-hover:rotate-[-20deg] group-hover:scale-110 transition-all duration-300 ease-in-out" 
            />
          </button>
        </div>
      </nav>

      {/* Modal de confirmation de déconnexion */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#001d4a] border-2 border-red-500/30 rounded-2xl p-8 shadow-[0_50px_100px_rgba(239,68,68,0.3)] text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/50 animate-pulse">
              <LogOut size={40} className="text-red-400 rotate-[-20deg]" />
            </div>
            <h2 className="oswald text-2xl font-black text-white uppercase mb-3 tracking-tighter">
              ¿Cerrar Sesión?
            </h2>
            <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-8 leading-relaxed">
              ¿Está seguro que desea cerrar su sesión?<br/>
              Será redirigido a la página de inicio de sesión.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 text-white/80 font-black uppercase text-[9px] tracking-widest hover:bg-white/20 hover:text-white transition-all border border-white/20"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  onLogout();
                }}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-red-600 hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                <LogOut size={14} className="group-hover:rotate-[-20deg] transition-transform duration-300" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
