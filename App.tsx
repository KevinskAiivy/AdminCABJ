
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

const FullScreenLoader = ({ message }: { message?: string }) => {
    const settings = dataService.getAppSettings();
    const logoUrl = settings.loginLogoUrl || settings.logoUrl;
    
    return (
        <div className="min-h-screen bg-[#001d4a] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#003B94]/30 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#FCB131]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '3s' }}></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
                {/* Logo */}
                <div className="relative mb-8 animate-pulse">
                    <div className="absolute inset-0 bg-[#FCB131] blur-[50px] opacity-20 rounded-full"></div>
                    {logoUrl && logoUrl.length > 50 ? (
                        <img 
                            src={logoUrl} 
                            alt="Logo" 
                            className="w-32 h-32 relative z-10 object-contain drop-shadow-2xl" 
                        />
                    ) : (
                        <BocaLogoSVG className="w-32 h-32 relative z-10" />
                    )}
                </div>
                
                {/* Title */}
                <h2 className="oswald text-2xl font-black text-white uppercase tracking-widest mb-4">
                    Cargando Sistema
                </h2>
                
                {/* Message */}
                {message && (
                    <p className="text-[#FCB131] font-bold text-xs uppercase tracking-[0.2em] mb-8">
                        {message}
                    </p>
                )}
                
                {/* Progress Bar */}
                <div className="w-64 max-w-[80vw] h-2 bg-white/10 rounded-full overflow-hidden shadow-inner relative">
                    <div 
                        className="h-full bg-[#FCB131] rounded-full"
                        style={{
                            width: '30%',
                            animation: 'progressBar 1.5s ease-in-out infinite',
                        }}
                    />
                </div>
            </div>
            
            {/* CSS Animation for Progress Bar */}
            <style>{`
                @keyframes progressBar {
                    0% {
                        transform: translateX(-100%);
                        width: 30%;
                    }
                    50% {
                        transform: translateX(0%);
                        width: 70%;
                    }
                    100% {
                        transform: translateX(100%);
                        width: 30%;
                    }
                }
            `}</style>
        </div>
    );
};

export const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  // Vue simulée pour SUPERADMIN (pour voir l'application comme un président)
  const [simulatedView, setSimulatedView] = useState<{ active: boolean; consulado_id?: string }>(() => {
    const saved = localStorage.getItem('cabj_simulated_view');
    return saved ? JSON.parse(saved) : { active: false };
  });

  // Initial Load
  useEffect(() => {
    const initApp = async () => {
        try {
            // 1. Settings
            const settings = dataService.getAppSettings();
            if (settings) {
                if (settings.primaryColor) document.documentElement.style.setProperty('--boca-blue', settings.primaryColor);
                if (settings.secondaryColor) document.documentElement.style.setProperty('--boca-gold', settings.secondaryColor);
            }

            // 2. Always initialize data service (même sans utilisateur pour que le login fonctionne)
            console.log('🚀 Initialisation de l\'application...');
            const storedUser = localStorage.getItem('cabj_session');
            const isOfflineMode = storedUser ? JSON.parse(storedUser).name === 'Modo Offline' : false;
            
            // Afficher le loader seulement si on charge vraiment des données (pas en mode offline)
            if (!isOfflineMode) {
                setIsInitializing(true);
            }
            
            await dataService.initializeData(isOfflineMode);
            console.log('✅ DataService initialisé');

            // 3. Auth Check - Restaurer la session si elle existe
            if (storedUser) {
              try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                console.log('✅ Session utilisateur restaurée:', parsedUser.name);
              } catch (error) {
                console.error("❌ Erreur lors de la restauration de la session:", error);
                localStorage.removeItem('cabj_session');
              }
            } else {
              console.log('ℹ️ Aucune session utilisateur trouvée - Affichage de la page de login');
            }
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de l\'application:', error);
        } finally {
            setLoading(false);
            setIsInitializing(false);
        }
    };
    initApp();
  }, []);

  // Persist Session
  useEffect(() => {
    if (!loading && user) {
      localStorage.setItem('cabj_session', JSON.stringify(user));
    }
  }, [user, loading]);

  // Persist Simulated View
  useEffect(() => {
    localStorage.setItem('cabj_simulated_view', JSON.stringify(simulatedView));
  }, [simulatedView]);

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

  // Afficher le loader seulement lors d'un chargement réel (initialisation des données)
  if (loading && isInitializing) {
      return <FullScreenLoader message={dataService.loadingMessage || "Inicializando..."} />;
  }

  if (!user) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <Login onLogin={(session) => setUser(session)} />
      </Suspense>
    );
  }

  const isSuperAdmin = user.role === 'SUPERADMIN';
  
  // Déterminer la vue à utiliser (simulée pour SUPERADMIN ou normale)
  const effectiveView = isSuperAdmin && simulatedView.active 
    ? { role: 'PRESIDENTE' as const, consulado_id: simulatedView.consulado_id || user.consulado_id }
    : { role: user.role, consulado_id: user.consulado_id };
  
  const consuladoName = effectiveView.consulado_id 
    ? dataService.getConsuladoById(effectiveView.consulado_id)?.name || 'Consulado' 
    : '';
  
  // Utiliser la vue simulée pour le routage si active
  // Le menu admin est réservé uniquement aux SUPERADMIN
  const shouldShowAdminView = isSuperAdmin && !simulatedView.active;

  return (
    <HashRouter>
      <div className="min-h-screen bg-[#F0F4F8] text-[#001d4a]">
        <Navbar 
          onLogout={logout} 
          user={user} 
          simulatedView={simulatedView}
          onSimulatedViewChange={setSimulatedView}
        />
        
        <main className="pt-28 pb-10">
          <Suspense fallback={<div className="h-[80vh] flex items-center justify-center"><Loader2 className="text-[#003B94] animate-spin" size={40} /></div>}>
            <Routes>
                <Route path="/notificaciones" element={<PageTransition><NotificationsPage user={user} /></PageTransition>} />
                
                {shouldShowAdminView ? (
                  <>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<PageTransition><Dashboard /></PageTransition>} />
                    <Route path="/consulados" element={<PageTransition><Consulados /></PageTransition>} />
                    <Route path="/socios" element={<PageTransition><Socios user={user} /></PageTransition>} />
                    <Route path="/habilitaciones" element={<PageTransition><Habilitaciones /></PageTransition>} />
                    
                    <Route path="/admin/futbol" element={<PageTransition><Futbol /></PageTransition>} />
                    <Route path="/admin/agenda" element={<PageTransition><Agenda /></PageTransition>} />
                    <Route path="/admin/mensajes" element={<PageTransition><Mensajes /></PageTransition>} />
                    
                    {/* Routes Sistema - Seulement pour SUPERADMIN */}
                    {isSuperAdmin && (
                      <>
                        <Route path="/admin/usuarios" element={<PageTransition><Usuarios /></PageTransition>} />
                        <Route path="/admin/accesos" element={<PageTransition><Accesos /></PageTransition>} />
                        <Route path="/admin/configuracion" element={<PageTransition><Configuracion /></PageTransition>} />
                        <Route path="/admin/database" element={<PageTransition><Database /></PageTransition>} />
                      </>
                    )}
                    
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </>
                ) : (
                  <>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<PageTransition><DashboardPresident consulado_id={effectiveView.consulado_id || ''} /></PageTransition>} />
                    <Route path="/consulados" element={<PageTransition><MiConsulado consulado_id={effectiveView.consulado_id || ''} /></PageTransition>} />
                    <Route path="/socios" element={<PageTransition><SociosPresident consulado_id={effectiveView.consulado_id || ''} /></PageTransition>} />
                    <Route path="/habilitaciones" element={<PageTransition><HabilitacionesPresident consulado_id={effectiveView.consulado_id || ''} consuladoName={consuladoName} /></PageTransition>} />
                    
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
