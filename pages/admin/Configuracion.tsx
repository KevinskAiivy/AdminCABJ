
import React, { useState, useRef } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Palette, LayoutTemplate, Type, Save, RotateCcw, Upload, Image as ImageIcon, Smartphone, Monitor, Lock, Unlock, Shield, LogIn, MousePointer2, Loader2, HardDrive, Clock, Bell, Activity, CheckCircle2, AlertTriangle, Zap, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { AppSettings } from '../../types';

export const Configuracion = () => {
  const [settings, setSettings] = useState<AppSettings>(dataService.getAppSettings());
  const [activeTab, setActiveTab] = useState<'IDENTIDAD' | 'APARIENCIA' | 'SISTEMA' | 'ALMACENAMIENTO'>('IDENTIDAD');
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const matchLogoInputRef = useRef<HTMLInputElement>(null);
  const loginLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const transitionLogoInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'matchLogoUrl' | 'loginLogoUrl' | 'faviconUrl' | 'transitionLogoUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      // Check upload size limit defined in current settings
      const maxSize = (settings.maxUploadSize || 5) * 1024 * 1024;
      if (file.size > maxSize) {
          alert(`El archivo excede el límite configurado de ${settings.maxUploadSize}MB.`);
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const executeSave = () => {
    dataService.saveAppSettings(settings);
    // Force CSS variable update immediately
    document.documentElement.style.setProperty('--boca-blue', settings.primaryColor);
    document.documentElement.style.setProperty('--boca-gold', settings.secondaryColor);
    alert("Configuración guardada y aplicada correctamente.");
    setShowSaveConfirm(false);
  };

  const handleSave = () => {
    setShowSaveConfirm(true);
  };

  const handleResetColors = () => {
      setSettings(prev => ({ ...prev, primaryColor: '#003B94', secondaryColor: '#FCB131' }));
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all ${activeTab === id ? 'bg-white shadow-lg border-l-4 border-[#003B94] text-[#003B94]' : 'bg-transparent text-gray-400 hover:bg-white/50'}`}
      >
          <Icon size={18} />
          <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </button>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
      {/* Header */}
      <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
           <LayoutGrid size={300} className="text-white" />
        </div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="bg-white/10 p-4 rounded-xl border border-white/20">
            <LayoutTemplate size={28} className="text-[#FCB131]" />
          </div>
          <div>
            <h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Centro de Control</h1>
            <p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Configuración Maestra del Sistema</p>
          </div>
        </div>
        <button 
            onClick={handleSave} 
            className="relative z-10 bg-[#FCB131] text-[#001d4a] px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-[#FFD23F] transition-all transform hover:-translate-y-1"
        >
            <Save size={16} /> Guardar Cambios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1 space-y-2">
              <TabButton id="IDENTIDAD" label="Identidad & Logos" icon={Type} />
              <TabButton id="APARIENCIA" label="Apariencia & UI" icon={Palette} />
              <TabButton id="SISTEMA" label="Sistema & Seguridad" icon={Shield} />
              <TabButton id="ALMACENAMIENTO" label="Datos & Límites" icon={HardDrive} />
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
              <GlassCard className="bg-white p-8 min-h-[600px]">
                  
                  {activeTab === 'IDENTIDAD' && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                          <h2 className="text-[#003B94] font-black uppercase text-xl border-b border-gray-100 pb-4 mb-6">Marca & Logotipos</h2>
                          
                          {/* Text Fields */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-4">
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Nombre de la Aplicación</label>
                                      <input 
                                        type="text" 
                                        value={settings.appName} 
                                        onChange={(e) => handleChange('appName', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 font-bold text-sm text-[#001d4a] outline-none focus:border-[#003B94] transition-all"
                                      />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Subtítulo / Descripción</label>
                                      <input 
                                        type="text" 
                                        value={settings.appDescription} 
                                        onChange={(e) => handleChange('appDescription', e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 font-bold text-sm text-[#001d4a] outline-none focus:border-[#003B94] transition-all"
                                      />
                                  </div>
                              </div>
                          </div>

                          {/* Logos Section */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-gray-100">
                              
                              {[
                                { label: 'Logo Menú General', ref: logoInputRef, field: 'logoUrl', icon: ImageIcon, description: 'Logo visible dans la barre de navigation' },
                                { label: 'Logo Login', ref: loginLogoInputRef, field: 'loginLogoUrl', icon: LogIn, description: 'Logo visible sur la page de connexion (utilise le logo du menu si non défini)' },
                                { label: 'Escudo Deportivo', ref: matchLogoInputRef, field: 'matchLogoUrl', icon: Shield },
                                { label: 'Favicon', ref: faviconInputRef, field: 'faviconUrl', icon: MousePointer2 },
                                { label: 'Logo Carga', ref: transitionLogoInputRef, field: 'transitionLogoUrl', icon: Loader2 }
                              ].map((item: any) => (
                                <div key={item.field} className="space-y-2">
                                    <div>
                                        <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest flex items-center gap-2">
                                            <item.icon size={12}/> {item.label}
                                        </label>
                                        {item.description && (
                                            <p className="text-[7px] text-gray-400 mt-0.5 italic">{item.description}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#003B94]/30 transition-all h-40 group relative overflow-hidden">
                                        <div className="w-14 h-14 mb-3 relative flex items-center justify-center">
                                            {settings[item.field as keyof AppSettings] ? (
                                                <img src={settings[item.field as keyof AppSettings] as string} alt={item.label} className="w-full h-full object-contain drop-shadow-md" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-gray-400 font-bold text-[8px]">SVG Default</div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => item.ref.current?.click()}
                                            className="bg-white border border-gray-200 text-[#001d4a] px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-[#001d4a] hover:text-white transition-all flex items-center gap-2"
                                        >
                                            <Upload size={10} /> Subir
                                        </button>
                                        <input type="file" ref={item.ref} className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, item.field)} />
                                    </div>
                                </div>
                              ))}
                          </div>

                          {/* Taille des Logos Section */}
                          <div className="pt-8 border-t border-gray-100 mt-8">
                              <h3 className="text-[#003B94] font-black uppercase text-sm border-b border-gray-100 pb-3 mb-6">Taille d'Affichage des Logos</h3>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {[
                                      { label: 'Logo Menu', field: 'logoMenuSize', icon: ImageIcon, description: 'Taille du logo dans la barre de navigation (px)', min: 20, max: 100, default: 40 },
                                      { label: 'Logo Login', field: 'logoLoginSize', icon: LogIn, description: 'Taille du logo sur la page de connexion (px)', min: 40, max: 200, default: 96 },
                                      { label: 'Logo Match', field: 'logoMatchSize', icon: Shield, description: 'Taille du logo de match (px)', min: 60, max: 200, default: 128 },
                                      { label: 'Logo Équipe Adverse', field: 'logoRivalSize', icon: ImageIcon, description: 'Taille du logo de l\'équipe adverse (px)', min: 60, max: 200, default: 128 }
                                  ].map((item: any) => (
                                      <div key={item.field} className="space-y-3">
                                          <div className="flex items-center gap-2">
                                              <item.icon size={14} className="text-[#003B94]"/>
                                              <label className="text-[9px] font-black text-[#003B94]/60 uppercase tracking-widest">
                                                  {item.label}
                                              </label>
                                          </div>
                                          <p className="text-[7px] text-gray-400 italic">{item.description}</p>
                                          
                                          <div className="flex items-center gap-4">
                                              <input
                                                  type="range"
                                                  min={item.min}
                                                  max={item.max}
                                                  step="4"
                                                  value={settings[item.field as keyof AppSettings] as number || item.default}
                                                  onChange={(e) => handleChange(item.field, parseInt(e.target.value))}
                                                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#003B94]"
                                              />
                                              <div className="flex items-center gap-2 min-w-[80px]">
                                                  <input
                                                      type="number"
                                                      min={item.min}
                                                      max={item.max}
                                                      value={settings[item.field as keyof AppSettings] as number || item.default}
                                                      onChange={(e) => {
                                                          const val = parseInt(e.target.value);
                                                          if (val >= item.min && val <= item.max) {
                                                              handleChange(item.field, val);
                                                          }
                                                      }}
                                                      className="w-16 bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] text-center"
                                                  />
                                                  <span className="text-[8px] font-black text-gray-400 uppercase">px</span>
                                              </div>
                                          </div>
                                          
                                          {/* Preview */}
                                          <div className="flex items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                                              <div 
                                                  className="bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
                                                  style={{ 
                                                      width: `${Math.min((settings[item.field as keyof AppSettings] as number || item.default) * 0.5, 80)}px`, 
                                                      height: `${Math.min((settings[item.field as keyof AppSettings] as number || item.default) * 0.5, 80)}px` 
                                                  }}
                                              >
                                                  <div className="w-8 h-8 bg-[#003B94]/20 rounded"></div>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'APARIENCIA' && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                              <h2 className="text-[#003B94] font-black uppercase text-xl">Estilo & Interfaz</h2>
                              <button onClick={handleResetColors} className="text-[9px] font-bold text-gray-400 uppercase hover:text-[#003B94] flex items-center gap-1">
                                  <RotateCcw size={12} /> Restaurar Default
                              </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                              <div className="space-y-6">
                                  {/* Color Pickers */}
                                  <div className="space-y-4">
                                      <div className="space-y-2">
                                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Color Primario</label>
                                          <div className="flex items-center gap-3">
                                              <input type="color" value={settings.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 bg-transparent"/>
                                              <input type="text" value={settings.primaryColor} onChange={(e) => handleChange('primaryColor', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 font-mono text-xs font-bold text-[#001d4a] w-28 uppercase"/>
                                          </div>
                                      </div>
                                      <div className="space-y-2">
                                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Color Secundario</label>
                                          <div className="flex items-center gap-3">
                                              <input type="color" value={settings.secondaryColor} onChange={(e) => handleChange('secondaryColor', e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0 bg-transparent"/>
                                              <input type="text" value={settings.secondaryColor} onChange={(e) => handleChange('secondaryColor', e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 font-mono text-xs font-bold text-[#001d4a] w-28 uppercase"/>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Toggles */}
                                  <div className="space-y-4 pt-4 border-t border-gray-100">
                                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                          <div className="flex items-center gap-3">
                                              <div className="p-2 bg-white rounded-lg text-[#003B94]"><Zap size={16}/></div>
                                              <div><span className="block text-[10px] font-black text-[#001d4a] uppercase">Animaciones</span><span className="block text-[8px] text-gray-400">Efectos de entrada y transiciones</span></div>
                                          </div>
                                          <label className="relative inline-flex items-center cursor-pointer">
                                              <input type="checkbox" className="sr-only peer" checked={settings.enableAnimations} onChange={e => handleChange('enableAnimations', e.target.checked)} />
                                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#003B94]"></div>
                                          </label>
                                      </div>
                                      
                                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                          <div className="flex items-center gap-3">
                                              <div className="p-2 bg-white rounded-lg text-[#003B94]"><LayoutGrid size={16}/></div>
                                              <div><span className="block text-[10px] font-black text-[#001d4a] uppercase">Modo Compacto</span><span className="block text-[8px] text-gray-400">Listas y tablas más densas</span></div>
                                          </div>
                                          <label className="relative inline-flex items-center cursor-pointer">
                                              <input type="checkbox" className="sr-only peer" checked={settings.compactMode} onChange={e => handleChange('compactMode', e.target.checked)} />
                                              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#003B94]"></div>
                                          </label>
                                      </div>
                                  </div>
                              </div>

                              {/* Live Preview Card */}
                              <div className="p-6 rounded-2xl shadow-xl flex flex-col justify-between h-48" style={{ background: settings.primaryColor }}>
                                  <div className="flex justify-between items-start">
                                      <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm border border-white/10"></div>
                                      <div className="bg-white/10 px-3 py-1 rounded-full text-white text-[9px] font-black uppercase tracking-widest backdrop-blur-sm">Live Preview</div>
                                  </div>
                                  <div>
                                      <h3 className="oswald text-3xl font-black text-white uppercase tracking-tight">Vista Previa</h3>
                                      <p style={{ color: settings.secondaryColor }} className="font-black uppercase text-xs tracking-[0.4em] mt-1">Color Acento</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'SISTEMA' && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                          <h2 className="text-[#003B94] font-black uppercase text-xl border-b border-gray-100 pb-4 mb-6">Seguridad & Sistema</h2>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Maintenance Mode */}
                              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                                  <div className="p-3 bg-red-100 rounded-xl text-red-600"><Lock size={24} /></div>
                                  <div className="flex-1">
                                      <h3 className="text-red-700 font-bold text-sm uppercase mb-1">Modo Mantenimiento</h3>
                                      <p className="text-red-600/70 text-xs leading-relaxed mb-4">
                                          Bloquea el acceso a usuarios no administradores.
                                      </p>
                                      <div className="flex items-center gap-3">
                                          <button onClick={() => handleChange('isMaintenanceMode', !settings.isMaintenanceMode)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.isMaintenanceMode ? 'bg-red-500' : 'bg-gray-300'}`}>
                                              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.isMaintenanceMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                          </button>
                                          <span className="text-[10px] font-black uppercase tracking-widest text-red-700">{settings.isMaintenanceMode ? 'ACTIVADO' : 'DESACTIVADO'}</span>
                                      </div>
                                  </div>
                              </div>

                              {/* Notifications Toggle */}
                              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
                                  <div className="p-3 bg-blue-100 rounded-xl text-blue-600"><Bell size={24} /></div>
                                  <div className="flex-1">
                                      <h3 className="text-blue-700 font-bold text-sm uppercase mb-1">Notificaciones Globales</h3>
                                      <p className="text-blue-600/70 text-xs leading-relaxed mb-4">
                                          Habilitar/Deshabilitar alertas para todos los usuarios.
                                      </p>
                                      <div className="flex items-center gap-3">
                                          <button onClick={() => handleChange('enableNotifications', !settings.enableNotifications)} className={`relative w-12 h-6 rounded-full transition-colors ${settings.enableNotifications ? 'bg-blue-600' : 'bg-gray-300'}`}>
                                              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.enableNotifications ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                          </button>
                                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">{settings.enableNotifications ? 'HABILITADO' : 'DESHABILITADO'}</span>
                                      </div>
                                  </div>
                              </div>

                              {/* Session Timeout */}
                              <div className="col-span-1 lg:col-span-2 bg-gray-50 border border-gray-200 rounded-2xl p-6 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                      <div className="p-3 bg-white border border-gray-200 rounded-xl text-gray-500"><Clock size={24}/></div>
                                      <div>
                                          <h3 className="text-[#001d4a] font-bold text-sm uppercase mb-1">Timeout de Sesión</h3>
                                          <p className="text-gray-500 text-xs">Cierre de sesión automático por inactividad.</p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <input 
                                        type="number" 
                                        min="5" 
                                        max="120"
                                        value={settings.sessionTimeout} 
                                        onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                                        className="w-20 bg-white border border-gray-200 rounded-xl py-2 px-3 font-bold text-center text-[#001d4a] outline-none focus:border-[#003B94]"
                                      />
                                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Minutos</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'ALMACENAMIENTO' && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                          <h2 className="text-[#003B94] font-black uppercase text-xl border-b border-gray-100 pb-4 mb-6">Límites & Almacenamiento</h2>
                          
                          {/* Upload Size Slider */}
                          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                              <div className="flex items-center gap-4 mb-6">
                                  <div className="p-3 bg-[#003B94]/10 rounded-xl text-[#003B94]"><HardDrive size={24} /></div>
                                  <div>
                                      <h3 className="text-[#001d4a] font-bold text-sm uppercase mb-1">Límite de Subida (Imágenes)</h3>
                                      <p className="text-gray-500 text-xs">Tamaño máximo permitido para Logos y Banners.</p>
                                  </div>
                                  <div className="ml-auto text-right">
                                      <span className="text-3xl font-black text-[#003B94] oswald">{settings.maxUploadSize} <span className="text-sm">MB</span></span>
                                  </div>
                              </div>
                              
                              <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1"
                                value={settings.maxUploadSize} 
                                onChange={(e) => handleChange('maxUploadSize', parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#003B94]"
                              />
                              <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  <span>1 MB (Min)</span>
                                  <span>5 MB (Default)</span>
                                  <span>10 MB (Max)</span>
                              </div>

                              <div className="mt-6 flex items-start gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100 text-amber-800">
                                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                  <p className="text-xs font-medium leading-relaxed">
                                      <strong>Atención:</strong> Aumentar el límite puede saturar rápidamente el almacenamiento local del navegador (LocalStorage ~5-10MB). 
                                      Se recomienda mantener un límite bajo o utilizar una base de datos externa (Supabase) para almacenar imágenes pesadas.
                                  </p>
                              </div>
                          </div>
                      </div>
                  )}

              </GlassCard>
          </div>
      </div>

      {showSaveConfirm && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/60 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
              <div className="relative w-full max-w-md bg-white rounded-[2rem] p-10 shadow-[0_50px_150px_rgba(0,29,74,0.3)] text-center border border-white animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-[#FCB131]/10 text-[#FCB131] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle2 size={40} /></div>
                  <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter">¿Guardar Cambios?</h2>
                  <p className="text-[#003B94]/70 font-bold mb-10 text-[10px] leading-relaxed uppercase tracking-widest">Se guardará la configuración del sistema.</p>
                  <div className="flex gap-4">
                      <button onClick={() => setShowSaveConfirm(false)} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 uppercase text-[9px] font-black tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                      <button onClick={executeSave} className="flex-1 py-4 rounded-xl bg-[#003B94] text-white uppercase text-[9px] font-black tracking-widest shadow-2xl hover:opacity-90 transition-all">Confirmar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Configuracion;
