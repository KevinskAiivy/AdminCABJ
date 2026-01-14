import React, { useState, useEffect } from 'react';
import { BocaLogoSVG } from '../constants';
import { User, ArrowRight, ShieldCheck, Key, Loader2 } from 'lucide-react';
import { UserSession } from '../types';
import { dataService } from '../services/dataService';

export const Login = ({ onLogin }: { onLogin: (session: UserSession) => void }) => {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>(dataService.getAssetUrl('login_logo'));
  const [logoError, setLogoError] = useState(false);
  const [logoSize, setLogoSize] = useState<number>(96);

  // Charger le logo depuis app_assets
  useEffect(() => {
    const updateLogo = () => {
      const loginAsset = dataService.getAssetByKey('login_logo');
      if (loginAsset) {
        setLogoUrl(dataService.getAssetUrl('login_logo'));
        setLogoSize(loginAsset.display_size || 96);
        setLogoError(false);
      }
    };
    updateLogo();
    const unsubscribe = dataService.subscribe(updateLogo);
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!username || !password) {
        setError("Por favor complete todos los campos");
        return;
    }

    setLoading(true);
    setError(null);

    // Artificial delay for smooth UX transition
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        const userSession = await dataService.authenticateUser(username, password);
        if (userSession) {
            onLogin(userSession);
        } else {
            setError('Credenciales inválidas. Intente nuevamente.');
        }
    } catch (err) {
        setError('Error de conexión. Verifique su red.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#000d24]">
      
      {/* Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#003B94_0%,_#000d24_70%)] opacity-40"></div>
          {/* Animated Orbs */}
          <div className="absolute top-[-10%] left-[20%] w-[60vw] h-[60vw] bg-[#003B94] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[10%] w-[50vw] h-[50vw] bg-[#FCB131] rounded-full mix-blend-screen filter blur-[120px] opacity-10 animate-pulse" style={{ animationDuration: '4s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* Glass Card */}
        <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] overflow-hidden">
          
          {/* Header */}
          <div className="pt-12 pb-8 px-10 text-center relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FCB131] to-transparent opacity-50"></div>
            
            <div className="mb-6 relative inline-block group">
                <div className="absolute inset-0 bg-[#FCB131] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full"></div>
                {!logoError ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                    className="relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 object-contain"
                    onError={() => {
                      // Si l'image ne charge pas, utiliser le logo SVG par défaut
                      setLogoError(true);
                    }}
                  />
                ) : (
                  <BocaLogoSVG style={{ width: `${logoSize}px`, height: `${logoSize}px` }} className="relative z-10 drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500" />
                )}
            </div>
            
            <h1 className="oswald text-4xl font-black text-white tracking-tighter uppercase mb-2 drop-shadow-lg">
                Consulados <span className="text-[#FCB131]">CABJ</span>
            </h1>
            <p className="text-blue-200/60 font-bold text-[10px] uppercase tracking-[0.4em]">Sistema de Gestión Oficial</p>
          </div>

          {/* Form */}
          <div className="px-10 pb-12">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div className="group relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FCB131]/70 group-focus-within:text-[#FCB131] transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="USUARIO"
                    className="w-full bg-black/30 border border-white/5 text-white rounded-xl py-4 pl-12 pr-4 focus:bg-black/50 focus:border-[#FCB131]/50 focus:ring-1 focus:ring-[#FCB131]/50 outline-none transition-all placeholder:text-white/20 font-bold text-xs tracking-widest"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>

                <div className="group relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-[#FCB131]/70 group-focus-within:text-[#FCB131] transition-colors" size={18} />
                  <input
                    type="password"
                    placeholder="CONTRASEÑA"
                    className="w-full bg-black/30 border border-white/5 text-white rounded-xl py-4 pl-12 pr-4 focus:bg-black/50 focus:border-[#FCB131]/50 focus:ring-1 focus:ring-[#FCB131]/50 outline-none transition-all placeholder:text-white/20 font-bold text-xs tracking-widest"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                  <div className="flex items-center justify-center gap-2 text-red-300 bg-red-500/10 p-3 rounded-xl text-[10px] font-black uppercase tracking-wide border border-red-500/20 animate-in slide-in-from-top-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                      {error}
                  </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FCB131] hover:bg-[#FFD23F] text-[#001d4a] font-black py-4 rounded-xl shadow-[0_10px_40px_-10px_rgba(252,177,49,0.3)] hover:shadow-[0_15px_50px_-10px_rgba(252,177,49,0.5)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[11px] group relative overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <span className="relative z-10">Ingresar al Sistema</span>
                    <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-black/40 p-4 border-t border-white/5 flex items-center justify-center gap-3 backdrop-blur-md">
            <ShieldCheck size={12} className="text-[#FCB131]" />
            <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">Acceso Seguro • CABJ 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;