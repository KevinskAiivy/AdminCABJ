
import React, { useState, useEffect, useCallback, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { PageTransition } from './components/PageTransition';
import { UserSession } from './types';
import { dataService } from './services/dataService';
import { BocaLogoSVG } from './constants';
import { Loader2, AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from './lib/supabase';

// Error Boundary pour capturer les erreurs
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-6">
          <div className="bg-white rounded-xl p-8 max-w-2xl shadow-xl border-2 border-red-200">
            <AlertTriangle className="mx-auto mb-4 text-red-600" size={48} />
            <h2 className="text-2xl font-black text-red-800 mb-4 text-center">Erreur de chargement</h2>
            <p className="text-sm text-gray-600 mb-4">
              Une erreur est survenue lors du chargement de la page.
            </p>
            <p className="text-xs text-red-500 mb-4 font-mono bg-red-50 p-3 rounded">
              {this.state.error?.message || 'Erreur inconnue'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = '#/dashboard';
              }}
              className="w-full bg-[#003B94] text-white px-6 py-3 rounded-xl font-black uppercase text-sm hover:bg-[#001d4a] transition-all"
            >
              Retour au Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- LAZY LOADING DES PAGES (Optimisation Performance) ---
const Login = lazy(() => import('./pages/Login.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const Consulados = lazy(() => import('./pages/Consulados.tsx'));
const Socios = lazy(() => import('./pages/Socios.tsx').then(module => ({ default: module.Socios || module.default })));
const Habilitaciones = lazy(() => import('./pages/Habilitaciones.tsx'));
const HistorialHabilitaciones = lazy(() => import('./pages/admin/HistorialHabilitaciones.tsx'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.tsx'));

// Admin Sub-routes Lazy
const Futbol = lazy(() => import('./pages/admin/Futbol.tsx'));
const Agenda = lazy(() => import('./pages/admin/Agenda.tsx'));
const Mensajes = lazy(() => import('./pages/admin/Mensajes.tsx'));
const Accesos = lazy(() => import('./pages/admin/Accesos.tsx'));
const Usuarios = lazy(() => import('./pages/admin/Usuarios.tsx'));
const Configuracion = lazy(() => import('./pages/admin/Configuracion.tsx'));
const Database = lazy(() => import('./pages/Database.tsx'));
const TestLogosTablette = lazy(() => import('./pages/TestLogosTablette.tsx').then(module => ({ default: module.TestLogosTablette })));

// President Pages Lazy
const DashboardPresident = lazy(() => import('./pages/president/DashboardPresident.tsx'));
const MiConsulado = lazy(() => import('./pages/president/MiConsulado.tsx'));
const HabilitacionesPresident = lazy(() => import('./pages/president/HabilitacionesPresident.tsx'));
const SolicitudesDeHabilitaciones = lazy(() => import('./pages/president/SolicitudesDeHabilitaciones.tsx'));
const SociosPresident = lazy(() => import('./pages/president/SociosPresident.tsx'));

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

const FullScreenLoader = ({ message }: { message?: string }) => {
    const settings = dataService.getAppSettings();
    const logoUrl = settings.loginLogoUrl || settings.logoUrl;
    
    return (
        <div className="min-h-screen bg-[#001d4a] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            <div className="relative z-10 flex flex-col items-center">
                {/* Logo */}
                <div className="relative mb-8 animate-pulse">
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

// Écran d'erreur de connexion à la base de données
const ConnectionErrorScreen = ({ onRetry, errorMessage }: { onRetry: () => void; errorMessage?: string }) => {
    const [isRetrying, setIsRetrying] = useState(false);
    
    const handleRetry = async () => {
        setIsRetrying(true);
        await onRetry();
        setIsRetrying(false);
    };
    
    return (
        <div className="min-h-screen bg-[#001d4a] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-[#FCB131]/10 rounded-full blur-[120px]"></div>
            </div>
            
            <div className="relative z-10 flex flex-col items-center max-w-md">
                {/* Logo */}
                <div className="relative mb-6">
                    <BocaLogoSVG className="w-24 h-24 relative z-10 opacity-50" />
                </div>
                
                {/* Icon */}
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border-2 border-red-500/50">
                    <WifiOff size={40} className="text-red-400" />
                </div>
                
                {/* Title */}
                <h2 className="oswald text-2xl font-black text-white uppercase tracking-widest mb-4">
                    Error de Conexión
                </h2>
                
                {/* Message */}
                <p className="text-white/70 text-sm mb-2 leading-relaxed">
                    No se pudo establecer conexión con la base de datos.
                </p>
                <p className="text-white/50 text-xs mb-6 leading-relaxed">
                    Verifique su conexión a internet e intente nuevamente.
                </p>
                
                {/* Error details */}
                {errorMessage && (
                    <div className="w-full bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                        <p className="text-red-300 text-[10px] font-mono break-all">
                            {errorMessage}
                        </p>
                    </div>
                )}
                
                {/* Retry button */}
                <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className={`flex items-center gap-3 px-8 py-4 rounded-xl font-black uppercase text-sm tracking-widest transition-all ${
                        isRetrying 
                            ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                            : 'bg-[#FCB131] text-[#001d4a] hover:bg-[#FFD23F] hover:shadow-[0_0_30px_rgba(252,177,49,0.4)]'
                    }`}
                >
                    <RefreshCw size={18} className={isRetrying ? 'animate-spin' : ''} />
                    {isRetrying ? 'Conectando...' : 'Reintentar Conexión'}
                </button>
                
                {/* Help text */}
                <p className="text-white/30 text-[10px] mt-8 uppercase tracking-widest">
                    Si el problema persiste, contacte al administrador
                </p>
            </div>
        </div>
    );
};

export const App: React.FC = () => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Fonction pour tester la connexion à la base de données
  const testDatabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔌 Test de connexion à la base de données...');
      
      // Test simple: essayer de récupérer une ligne de la table users avec timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout: La connexion a pris trop de temps')), 10000)
      );
      
      const queryPromise = supabase
        .from('users')
        .select('id')
        .limit(1);
      
      const { error } = await Promise.race([queryPromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('❌ Erreur de connexion BDD:', error);
        return { success: false, error: error.message || 'Erreur de connexion à la base de données' };
      }
      
      console.log('✅ Connexion à la base de données établie');
      return { success: true };
    } catch (err: any) {
      console.error('❌ Exception lors du test de connexion:', err);
      return { success: false, error: err.message || 'Impossible de se connecter à la base de données' };
    }
  };

  // Fonction d'initialisation
  const initApp = useCallback(async () => {
    setLoading(true);
    setConnectionError(null);
    setIsDbConnected(false);
    
    try {
        // 0. Vérifier d'abord la connexion à la base de données
        const storedUser = localStorage.getItem('cabj_session');
        const isOfflineMode = storedUser ? JSON.parse(storedUser).name === 'Modo Offline' : false;
        
        if (!isOfflineMode) {
            setIsInitializing(true);
            
            const connectionTest = await testDatabaseConnection();
            if (!connectionTest.success) {
                setConnectionError(connectionTest.error || 'Erreur de connexion');
                setLoading(false);
                setIsInitializing(false);
                return;
            }
            
            setIsDbConnected(true);
        }
        
        // 1. Settings
        const settings = dataService.getAppSettings();
        if (settings) {
            if (settings.primaryColor) document.documentElement.style.setProperty('--boca-blue', settings.primaryColor);
            if (settings.secondaryColor) document.documentElement.style.setProperty('--boca-gold', settings.secondaryColor);
            
            // Mettre à jour le favicon si configuré
            if (settings.faviconUrl && settings.faviconUrl.length > 50) {
                const faviconLink = document.querySelector('#favicon-link') as HTMLLinkElement;
                if (faviconLink) {
                    // Déterminer le type de fichier depuis l'URL
                    const faviconUrl = settings.faviconUrl;
                    let mimeType = 'image/png';
                    if (faviconUrl.includes('data:image/svg')) mimeType = 'image/svg+xml';
                    else if (faviconUrl.includes('data:image/x-icon') || faviconUrl.includes('.ico')) mimeType = 'image/x-icon';
                    else if (faviconUrl.includes('data:image/jpeg') || faviconUrl.includes('.jpg') || faviconUrl.includes('.jpeg')) mimeType = 'image/jpeg';
                    
                    faviconLink.href = faviconUrl;
                    faviconLink.type = mimeType;
                    
                    // Mettre à jour aussi apple-touch-icon
                    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
                    if (appleTouchIcon) {
                        appleTouchIcon.href = faviconUrl;
                    }
                } else {
                    // Créer le lien favicon s'il n'existe pas
                    const link = document.createElement('link');
                    link.id = 'favicon-link';
                    link.rel = 'icon';
                    link.type = 'image/png';
                    link.href = settings.faviconUrl;
                    document.head.appendChild(link);
                }
            }
        }

        // 2. Always initialize data service (même sans utilisateur pour que le login fonctionne)
        console.log('🚀 Initialisation de l\'application...');
        
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
    } catch (error: any) {
        console.error('❌ Erreur lors de l\'initialisation de l\'application:', error);
        setConnectionError(error.message || 'Erreur lors de l\'initialisation');
    } finally {
        setLoading(false);
        setIsInitializing(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    initApp();
  }, [initApp]);

  // Mettre à jour le favicon quand les settings changent
  useEffect(() => {
    const updateFavicon = () => {
      const settings = dataService.getAppSettings();
      if (settings.faviconUrl && settings.faviconUrl.length > 50) {
        const faviconLink = document.querySelector('#favicon-link') as HTMLLinkElement;
        if (faviconLink) {
          // Déterminer le type de fichier depuis l'URL
          const faviconUrl = settings.faviconUrl;
          let mimeType = 'image/png';
          if (faviconUrl.includes('data:image/svg')) mimeType = 'image/svg+xml';
          else if (faviconUrl.includes('data:image/x-icon') || faviconUrl.includes('.ico')) mimeType = 'image/x-icon';
          else if (faviconUrl.includes('data:image/jpeg') || faviconUrl.includes('.jpg') || faviconUrl.includes('.jpeg')) mimeType = 'image/jpeg';
          
          faviconLink.href = faviconUrl;
          faviconLink.type = mimeType;
          
          // Mettre à jour aussi apple-touch-icon
          const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
          if (appleTouchIcon) {
            appleTouchIcon.href = faviconUrl;
          }
        } else {
          // Créer le lien favicon s'il n'existe pas
          const link = document.createElement('link');
          link.id = 'favicon-link';
          link.rel = 'icon';
          link.type = 'image/png';
          link.href = settings.faviconUrl;
          document.head.appendChild(link);
        }
      }
    };
    
    // Mettre à jour immédiatement
    updateFavicon();
    
    // Écouter les changements de settings
    const unsubscribe = dataService.subscribe(updateFavicon);
    return () => unsubscribe();
  }, []);

  // Persist Session
  useEffect(() => {
    if (!loading && user) {
      localStorage.setItem('cabj_session', JSON.stringify(user));
    }
  }, [user, loading]);
  
  // Supprimer l'ancienne vue simulée du localStorage si elle existe
  useEffect(() => {
    localStorage.removeItem('cabj_simulated_view');
  }, []);

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

  // Afficher l'écran d'erreur de connexion si la BDD n'est pas accessible
  if (connectionError && !isDbConnected) {
      return <ConnectionErrorScreen onRetry={initApp} errorMessage={connectionError} />;
  }

  // Afficher le loader seulement lors d'un chargement réel (initialisation des données)
  // Le loader ne s'affiche que si :
  // 1. loading est true (en cours de chargement)
  // 2. ET isInitializing est true (chargement réel des données depuis la base de données)
  // Cela garantit que le loader ne s'affiche que lors d'un chargement réel, pas lors de changements de page ou actions normales
  if (loading && isInitializing) {
      return <FullScreenLoader message={dataService.loadingMessage || "Inicializando..."} />;
  }

  if (!user) {
    return (
      <Suspense fallback={null}>
        <Login onLogin={(session) => setUser(session)} />
      </Suspense>
    );
  }

  const isSuperAdmin = user.role === 'SUPERADMIN';
  const isAdmin = user.role === 'ADMIN';
  
  // Les ADMIN et SUPERADMIN ont accès à la vue admin complète (habilitaciones, etc.)
  // La différence: les ADMIN n'ont pas accès à la section Sistema
  const shouldShowAdminView = isSuperAdmin || isAdmin;

  return (
    <HashRouter>
      <div className="min-h-screen bg-[#F0F4F8] text-[#001d4a]">
        <Navbar 
          onLogout={logout} 
          user={user}
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
                    <Route path="/socios" element={
                      <PageTransition>
                        <ErrorBoundary>
                          <Socios user={user} />
                        </ErrorBoundary>
                      </PageTransition>
                    } />
                    <Route path="/habilitaciones" element={<PageTransition><Habilitaciones /></PageTransition>} />
                    <Route path="/habilitaciones/historial" element={<PageTransition><HistorialHabilitaciones /></PageTransition>} />

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
                        <Route path="/test-logos" element={<PageTransition><TestLogosTablette /></PageTransition>} />
                      </>
                    )}
                    
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </>
                ) : (
                  <>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<PageTransition><DashboardPresident consulado_id={user.consulado_id || ''} /></PageTransition>} />
                    <Route path="/consulados" element={<PageTransition><MiConsulado consulado_id={user.consulado_id || ''} /></PageTransition>} />
                    <Route path="/socios" element={<PageTransition><SociosPresident consulado_id={user.consulado_id || ''} /></PageTransition>} />
                    <Route path="/habilitaciones" element={<PageTransition><HabilitacionesPresident consulado_id={user.consulado_id || ''} consuladoName={user.consulado_id ? dataService.getConsuladoById(user.consulado_id)?.name || '' : ''} /></PageTransition>} />
                    <Route path="/habilitaciones/solicitudes/:matchId" element={<PageTransition><SolicitudesDeHabilitaciones consulado_id={user.consulado_id || ''} consuladoName={user.consulado_id ? dataService.getConsuladoById(user.consulado_id)?.name || '' : ''} /></PageTransition>} />
                    
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
