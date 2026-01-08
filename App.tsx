
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { PageTransition } from './components/PageTransition';
import { UserSession } from './types';
import { dataService } from './services/dataService';
import { BocaLogoSVG } from './constants';
import { Loader2 } from 'lucide-react';

// --- LAZY LOADING DES PAGES (Optimisation Performance) ---
const Login = lazy(() => import('./pages/Login.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const Consulados = lazy(() => import('./pages/Consulados.tsx'));
const Socios = lazy(() => import('./pages/Socios.tsx'));
const Habilitaciones = lazy(() => import('./pages/Habilitaciones.tsx'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.tsx'));

// Admin Sub-routes Lazy
const Futbol = lazy(() => import('./pages/admin/Futbol.tsx'));
const Agenda = lazy(() => import('./pages/admin/Agenda.tsx'));
const Mensajes = lazy(() => import('./pages/admin/Mensajes.tsx'));
const Accesos = lazy(() => import('./pages/admin/Accesos.tsx'));
const Usuarios = lazy(() => import('./pages/admin/Usuarios.tsx'));
const Configuracion = lazy(() => import('./pages/admin/Configuracion.tsx'));
const Database = lazy(() => import('./pages/Database.tsx'));

// President Pages Lazy
const DashboardPresident = lazy(() => import('./pages/president/DashboardPresident.tsx'));
const MiConsulado = lazy(() => import('./pages/president/MiConsulado.tsx'));
const HabilitacionesPresident = lazy(() => import('./pages/president/HabilitacionesPresident.tsx'));
const SociosPresident = lazy(() => import('./pages/president/SociosPresident.tsx'));

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const FullScreenLoader = ({ message }: { message?: string }) => (
    <div className="min-h-screen bg-[#001d4a] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8 animate-pulse">
            <div className="absolute inset-0 bg-[#FCB131] blur-[50px] opacity-20 rounded-full"></div>
            <BocaLogoSVG className="w-32 h-32 relative z-10" />
        </div>
        <h2 className="oswald text-2xl font-black text-white uppercase tracking-widest mb-2">
            Cargando Sistema
        </h2>
        {message && <p className="text-[#FCB131] font-bold text-xs uppercase tracking-[0.2em] mb-8">{message}</p>}
        <Loader2 className="text-[#FCB131] animate-spin" size={32} />
    </div>
);

export const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial Load
  useEffect(() => {
    const initApp = async () => {
        // 1. Settings
        const settings = dataService.getAppSettings();
        if (settings) {
            if (settings.primaryColor) document.documentElement.style.setProperty('--boca-blue', settings.primaryColor);
            if (settings.secondaryColor) document.documentElement.style.setProperty('--boca-gold', settings.secondaryColor);
        }

        // 2. Auth Check
        const storedUser = localStorage.getItem('cabj_session');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            // Simulate Token Validation / Data Fetch
            await dataService.initializeData(parsedUser.name === 'Modo Offline');
            setUser(parsedUser);
          } catch (error) {
            console.error("Session Error:", error);
            localStorage.removeItem('cabj_session');
          }
        }
        setLoading(false);
    };
    initApp();
  }, []);

  // Persist Session
  useEffect(() => {
    if (!loading && user) {
      localStorage.setItem('cabj_session', JSON.stringify(user));
    }
  }, [user, loading]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('cabj_session');
    window.location.hash = '#/';
  }, []);

  // Inactivity Timer
  useEffect(() => {
    if (!user) return;
    let timer: number;
    const reset = () => { clearTimeout(timer); timer = window.setTimeout(logout, INACTIVITY_TIMEOUT); };
    window.addEventListener('mousemove', reset);
    window.addEventListener('click', reset);
    window.addEventListener('keydown', reset);
    reset();
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('click', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [user, logout]);

  if (loading) return <FullScreenLoader message="Inicializando..." />;

  if (!user) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <Login onLogin={(session) => setUser(session)} />
      </Suspense>
    );
  }

  const consuladoName = user.consuladoId ? dataService.getConsuladoById(user.consuladoId)?.name || 'Consulado' : '';
  const isSuperAdmin = user.role === 'SUPERADMIN';
  const isAdmin = user.role === 'ADMIN' || isSuperAdmin;

  return (
    <HashRouter>
      <div className="min-h-screen bg-[#F0F4F8] text-[#001d4a]">
        <Navbar onLogout={logout} user={user} />
        
        <main className="pt-28 pb-10">
          <Suspense fallback={<div className="h-[80vh] flex items-center justify-center"><Loader2 className="text-[#003B94] animate-spin" size={40} /></div>}>
            <Routes>
                <Route path="/notificaciones" element={<PageTransition><NotificationsPage user={user} /></PageTransition>} />
                
                {isAdmin ? (
                  <>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
                    <Route path="/consulados" element={<PageTransition><Consulados /></PageTransition>} />
                    <Route path="/socios" element={<PageTransition><Socios user={user} /></PageTransition>} />
                    <Route path="/habilitaciones" element={<PageTransition><Habilitaciones /></PageTransition>} />
                    
                    <Route path="/admin/futbol" element={<PageTransition><Futbol /></PageTransition>} />
                    <Route path="/admin/agenda" element={<PageTransition><Agenda /></PageTransition>} />
                    <Route path="/admin/mensajes" element={<PageTransition><Mensajes /></PageTransition>} />
                    <Route path="/admin/usuarios" element={<PageTransition><Usuarios /></PageTransition>} />
                    <Route path="/admin/accesos" element={<PageTransition><Accesos /></PageTransition>} />
                    <Route path="/admin/configuracion" element={<PageTransition><Configuracion /></PageTransition>} />
                    <Route path="/admin/database" element={<PageTransition><Database /></PageTransition>} />
                    
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </>
                ) : (
                  <>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<PageTransition><DashboardPresident consuladoId={user.consuladoId || ''} /></PageTransition>} />
                    <Route path="/consulados" element={<PageTransition><MiConsulado consuladoId={user.consuladoId || ''} /></PageTransition>} />
                    <Route path="/socios" element={<PageTransition><SociosPresident consuladoId={user.consuladoId || ''} /></PageTransition>} />
                    <Route path="/habilitaciones" element={<PageTransition><HabilitacionesPresident consuladoId={user.consuladoId || ''} consuladoName={consuladoName} /></PageTransition>} />
                    
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </>
                )}
            </Routes>
          </Suspense>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
