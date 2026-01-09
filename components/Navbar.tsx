
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, MapPin, Ticket, Settings, ChevronDown, LogOut, MessageSquare, Database, Calendar, Sword, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { BocaLogoSVG } from '../constants';
import { UserSession } from '../types';
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

interface SimulatedView {
  active: boolean;
  consulado_id?: string;
}

export const Navbar = ({ 
  onLogout, 
  user, 
  simulatedView, 
  onSimulatedViewChange 
}: { 
  onLogout: () => void, 
  user: UserSession,
  simulatedView?: SimulatedView,
  onSimulatedViewChange?: (view: SimulatedView) => void
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isViewSelectorOpen, setIsViewSelectorOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const viewSelectorRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user.role === 'SUPERADMIN';
  const consulados = dataService.getConsulados();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAdminOpen(false);
      }
      if (viewSelectorRef.current && !viewSelectorRef.current.contains(event.target as Node)) {
        setIsViewSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setIsAdminOpen(false);
    setIsViewSelectorOpen(false);
  }, [location]);

  const handleToggleSimulatedView = () => {
    if (!onSimulatedViewChange) return;
    
    if (simulatedView?.active) {
      // Désactiver la vue simulée
      onSimulatedViewChange({ active: false });
      navigate('/dashboard');
    } else {
      // Activer la vue simulée avec le premier consulado disponible
      const firstConsulado = consulados.length > 0 ? consulados[0].id : undefined;
      onSimulatedViewChange({ active: true, consulado_id: firstConsulado });
      navigate('/dashboard');
    }
  };

  const handleSelectConsulado = (consuladoId: string) => {
    if (!onSimulatedViewChange) return;
    onSimulatedViewChange({ active: true, consulado_id: consuladoId });
    setIsViewSelectorOpen(false);
    navigate('/dashboard');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] px-4 pt-4">
      <nav className="max-w-7xl mx-auto bg-gradient-to-r from-[#000d24] via-[#001d4a] to-[#000d24] border border-white/10 rounded-2xl px-4 lg:px-6 py-3 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative">
        
        {/* Logo Section */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative group cursor-pointer">
             <div className="absolute inset-0 bg-[#FCB131] blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full"></div>
             <BocaLogoSVG className="w-10 h-10 drop-shadow-lg relative z-10 transform group-hover:scale-105 transition-transform" />
          </div>
          <div className="leading-tight hidden lg:block">
            <h1 className="text-white font-black text-sm oswald tracking-tighter uppercase">Consulados CABJ</h1>
            <p className="text-[#FCB131] text-[9px] font-black uppercase tracking-[0.2em]">
              {simulatedView?.active ? 'PRESIDENTE (Vista Simulada)' : user.role}
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
          
          {/* Admin Mega Menu Trigger - Seulement pour SUPERADMIN */}
          { user.role === 'SUPERADMIN' &&
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
          {/* Vue Simulée pour SUPERADMIN */}
          {isSuperAdmin && onSimulatedViewChange && (
            <div className="relative" ref={viewSelectorRef}>
              <button
                onClick={handleToggleSimulatedView}
                className={`p-2.5 rounded-xl transition-all border group ${
                  simulatedView?.active
                    ? 'bg-[#FCB131] text-[#001d4a] border-[#FCB131] shadow-[0_0_15px_rgba(252,177,49,0.4)]'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
                title={simulatedView?.active ? "Désactiver la vue simulée" : "Voir comme un président"}
              >
                {simulatedView?.active ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              
              {/* Sélecteur de consulado (visible quand la vue simulée est active) */}
              {simulatedView?.active && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-[#001d4a] border border-[#FCB131]/30 rounded-2xl p-2 shadow-[0_30px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl z-50">
                  <div className="px-3 py-2 bg-[#FCB131]/10 border-b border-white/5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-[#FCB131]">
                      Seleccionar Consulado
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 mt-2">
                    {consulados.map(consulado => (
                      <button
                        key={consulado.id}
                        onClick={() => handleSelectConsulado(consulado.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                          simulatedView.consulado_id === consulado.id
                            ? 'bg-[#FCB131] text-[#001d4a]'
                            : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {consulado.name}
                        {consulado.city && ` - ${consulado.city}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-white text-[9px] font-black uppercase tracking-widest">{user.name}</span>
            <span className="text-[#FCB131] text-[8px] font-black uppercase animate-pulse">
              {simulatedView?.active ? 'PRESIDENTE' : user.role}
            </span>
          </div>
          <button 
            onClick={onLogout}
            className="p-2.5 bg-white/5 rounded-xl text-white/60 hover:bg-red-500 hover:text-white hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all border border-white/10 group"
            title="Cerrar Sesión"
          >
            <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </nav>
    </div>
  );
};
