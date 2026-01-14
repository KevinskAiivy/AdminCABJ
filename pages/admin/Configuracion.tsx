
import React, { useState, useRef, useEffect } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Palette, LayoutTemplate, Type, Save, RotateCcw, Upload, Image as ImageIcon, Smartphone, Monitor, Lock, Unlock, Shield, LogIn, MousePointer2, Loader2, HardDrive, Clock, Bell, Activity, CheckCircle2, AlertTriangle, Zap, Eye, EyeOff, LayoutGrid, Ticket, MapPin, Building2, FolderOpen, Copy, ExternalLink, Trash2, RefreshCw, ChevronLeft } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { AppSettings } from '../../types';
import { supabase } from '../../lib/supabase';
import { MarcaLogotipos } from './MarcaLogotipos';

export const Configuracion = () => {
  const [settings, setSettings] = useState<AppSettings>(dataService.getAppSettings());
  const [activeTab, setActiveTab] = useState<'IDENTIDAD' | 'APARIENCIA' | 'SISTEMA' | 'ALMACENAMIENTO' | 'LOGOS_CONSULADOS'>('IDENTIDAD');
  const [storageImages, setStorageImages] = useState<any[]>([]);
  const [storageFolders, setStorageFolders] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [loadingImages, setLoadingImages] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const matchLogoInputRef = useRef<HTMLInputElement>(null);
  const loginLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const transitionLogoInputRef = useRef<HTMLInputElement>(null);
  const habilitacionesBackgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === 'LOGOS_CONSULADOS') {
      loadStorageImages();
    }
  }, [activeTab]);

  const loadStorageImages = async (folderPath: string = '') => {
    setLoadingImages(true);
    setCurrentFolder(folderPath);
    try {
      const { data: files, error } = await supabase.storage
        .from('Logo')
        .list(folderPath, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) throw error;

      if (files) {
        // Séparer les dossiers et les fichiers
        const folders = files.filter(file => file.id === null); // Les dossiers ont id === null
        const imageFiles = files.filter(file => 
          file.id !== null && file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
        );

        setStorageFolders(folders.map(folder => ({
          name: folder.name,
          path: folderPath ? `${folderPath}/${folder.name}` : folder.name
        })));

        const imagesWithUrls = imageFiles.map(file => {
          const fullPath = folderPath ? `${folderPath}/${file.name}` : file.name;
          const { data } = supabase.storage
            .from('Logo')
            .getPublicUrl(fullPath);
          
          return {
            ...file,
            bucket: 'logo',
            folder: folderPath || 'racine',
            folderPath: folderPath,
            fullPath: fullPath,
            publicUrl: data.publicUrl,
            size: file.metadata?.size || 0,
            created_at: file.created_at || new Date().toISOString()
          };
        });

        setStorageImages(imagesWithUrls);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      alert('Erreur lors du chargement des images');
    } finally {
      setLoadingImages(false);
    }
  };

  const handleChange = (field: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'matchLogoUrl' | 'loginLogoUrl' | 'faviconUrl' | 'transitionLogoUrl' | 'habilitacionesBackgroundImage') => {
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
        className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${activeTab === id ? 'bg-white shadow-lg border-b-4 border-[#003B94] text-[#003B94]' : 'bg-transparent text-gray-400 hover:bg-white/50'}`}
      >
          <Icon size={16} />
          <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{label}</span>
      </button>
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('URL copiée !');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const deleteImage = async (fullPath: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${fullPath}"?`)) return;
    
    try {
      const { error } = await supabase.storage
        .from('Logo')
        .remove([fullPath]);

      if (error) throw error;
      
      alert('Imagen eliminada con éxito');
      loadStorageImages();
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar la imagen');
    }
  };

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

      <div className="space-y-6">
          
          {/* Tabs horizontaux en haut */}
          <div className="bg-white/50 backdrop-blur-sm p-2 rounded-2xl shadow-sm">
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                  <TabButton id="IDENTIDAD" label="Identidad & Logos" icon={Type} />
                  <TabButton id="LOGOS_CONSULADOS" label="Imágenes y Logos" icon={Building2} />
                  <TabButton id="APARIENCIA" label="Apariencia & UI" icon={Palette} />
                  <TabButton id="SISTEMA" label="Sistema & Seguridad" icon={Shield} />
                  <TabButton id="ALMACENAMIENTO" label="Datos & Límites" icon={HardDrive} />
              </div>
          </div>

          {/* Content Area */}
          <div>
              <GlassCard className="bg-white p-8 min-h-[600px]">
                  
                  {activeTab === 'IDENTIDAD' && (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                          <MarcaLogotipos />
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
                                  
                                  {/* Image de fond pour Habilitaciones */}
                                  <div className="space-y-4 pt-4 border-t border-gray-100">
                                      <h3 className="text-[#003B94] font-black uppercase text-sm border-b border-gray-100 pb-2">Fond des Cartes Habilitaciones</h3>
                                      
                                      <div className="space-y-3">
                                          <div className="space-y-2">
                                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                  <Ticket size={12}/> Image de Fond
                                              </label>
                                              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#003B94]/30 transition-all h-32 group relative overflow-hidden">
                                                  <div className="w-12 h-12 mb-2 relative flex items-center justify-center">
                                                      {settings.habilitacionesBackgroundImage ? (
                                                          <img src={settings.habilitacionesBackgroundImage} alt="Fond Habilitaciones" className="w-full h-full object-cover rounded-lg drop-shadow-md" />
                                                      ) : (
                                                          <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 font-bold text-[8px]">Aucune image</div>
                                                      )}
                                                  </div>
                                                  <button 
                                                      onClick={() => habilitacionesBackgroundInputRef.current?.click()}
                                                      className="bg-white border border-gray-200 text-[#001d4a] px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-[#001d4a] hover:text-white transition-all flex items-center gap-2"
                                                  >
                                                      <Upload size={10} /> {settings.habilitacionesBackgroundImage ? 'Changer' : 'Choisir'}
                                                  </button>
                                                  <input type="file" ref={habilitacionesBackgroundInputRef} className="hidden" accept="image/*" onChange={(e) => handleLogoUpload(e, 'habilitacionesBackgroundImage')} />
                                              </div>
                                          </div>
                                          
                                          <div className="space-y-2">
                                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Opacité de l'Image</label>
                                              <div className="flex items-center gap-4">
                                                  <input
                                                      type="range"
                                                      min="0"
                                                      max="100"
                                                      step="5"
                                                      value={settings.habilitacionesBackgroundOpacity ?? 20}
                                                      onChange={(e) => handleChange('habilitacionesBackgroundOpacity', parseInt(e.target.value))}
                                                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#003B94]"
                                                  />
                                                  <div className="flex items-center gap-2 min-w-[80px]">
                                                      <input
                                                          type="number"
                                                          min="0"
                                                          max="100"
                                                          value={settings.habilitacionesBackgroundOpacity ?? 20}
                                                          onChange={(e) => {
                                                              const val = parseInt(e.target.value);
                                                              if (val >= 0 && val <= 100) {
                                                                  handleChange('habilitacionesBackgroundOpacity', val);
                                                              }
                                                          }}
                                                          className="w-16 bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] text-center"
                                                      />
                                                      <span className="text-[8px] font-black text-gray-400 uppercase">%</span>
                                                  </div>
                                              </div>
                                              {settings.habilitacionesBackgroundImage && (
                                                  <div className="flex items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                                                      <div 
                                                          className="bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden"
                                                          style={{ 
                                                              width: '100px', 
                                                              height: '60px',
                                                              backgroundImage: `url(${settings.habilitacionesBackgroundImage})`,
                                                              backgroundSize: 'cover',
                                                              backgroundPosition: 'center',
                                                              opacity: (settings.habilitacionesBackgroundOpacity ?? 20) / 100
                                                          }}
                                                      >
                                                          <div className="absolute inset-0 bg-gradient-to-br from-[#001d4a] to-[#003B94] opacity-30"></div>
                                                      </div>
                                                  </div>
                                              )}
                                          </div>
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

                  {activeTab === 'LOGOS_CONSULADOS' && (
                      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                              <div>
                                  <h2 className="text-[#003B94] font-black uppercase text-xl">Imágenes y Logos en Storage</h2>
                                  <p className="text-gray-500 text-xs mt-1">
                                      Bucket: <span className="font-bold">logo</span>
                                      {currentFolder && <span> / <span className="text-[#003B94] font-bold">{currentFolder}</span></span>}
                                  </p>
                              </div>
                              <div className="flex items-center gap-2">
                                  {currentFolder && (
                                      <button 
                                          onClick={() => {
                                              const parentFolder = currentFolder.split('/').slice(0, -1).join('/');
                                              loadStorageImages(parentFolder);
                                          }}
                                          className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-300 transition-all"
                                      >
                                          <ChevronLeft size={14} />
                                          Retour
                                      </button>
                                  )}
                                  <button 
                                      onClick={() => loadStorageImages(currentFolder)}
                                      disabled={loadingImages}
                                      className="flex items-center gap-2 bg-[#003B94] text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#001d4a] transition-all disabled:opacity-50"
                                  >
                                      <RefreshCw size={14} className={loadingImages ? 'animate-spin' : ''} />
                                      Actualizar
                                  </button>
                              </div>
                          </div>

                          {loadingImages ? (
                              <div className="flex flex-col items-center justify-center py-20">
                                  <Loader2 size={48} className="text-[#003B94] animate-spin mb-4" />
                                  <p className="text-gray-500 text-sm font-bold">Cargando imágenes...</p>
                              </div>
                          ) : (
                              <div>
                                  {/* Affichage des sous-dossiers */}
                                  {storageFolders.length > 0 && (
                                      <div className="mb-6">
                                          <h3 className="text-[#003B94] font-black uppercase text-sm mb-3 flex items-center gap-2">
                                              <FolderOpen size={16} />
                                              Dossiers ({storageFolders.length})
                                          </h3>
                                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                              {storageFolders.map(folder => (
                                                  <button
                                                      key={folder.path}
                                                      onClick={() => loadStorageImages(folder.path)}
                                                      className="bg-gradient-to-br from-[#003B94] to-[#001d4a] p-4 rounded-xl hover:scale-105 transition-transform shadow-lg group"
                                                  >
                                                      <FolderOpen size={32} className="text-[#FCB131] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                                                      <p className="text-white text-xs font-black uppercase truncate">{folder.name}</p>
                                                  </button>
                                              ))}
                                          </div>
                                      </div>
                                  )}

                                  {/* Affichage des images */}
                                  {storageImages.length > 0 && (
                                      <div>
                                          <div className="mb-4 flex items-center gap-2 text-[#003B94]">
                                              <ImageIcon size={18} />
                                              <span className="text-sm font-black">{storageImages.length} Imágenes</span>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                      {storageImages.map((image, index) => (
                                          <div key={`${image.fullPath}-${index}`} className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-[#003B94]/50 transition-all shadow-sm hover:shadow-lg group">
                                              {/* Image Preview */}
                                              <div className="relative h-48 bg-gray-50 flex items-center justify-center overflow-hidden">
                                                  <img 
                                                      src={image.publicUrl} 
                                                      alt={image.name}
                                                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                                      onError={(e) => {
                                                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage%3C/text%3E%3C/svg%3E';
                                                      }}
                                                  />
                                                  {/* Overlay avec actions */}
                                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                                      <button
                                                          onClick={() => window.open(image.publicUrl, '_blank')}
                                                          className="p-2 bg-white rounded-lg hover:bg-[#FCB131] transition-colors"
                                                          title="Ouvrir dans un nouvel onglet"
                                                      >
                                                          <ExternalLink size={16} className="text-[#003B94]" />
                                                      </button>
                                                      <button
                                                          onClick={() => copyToClipboard(image.publicUrl)}
                                                          className="p-2 bg-white rounded-lg hover:bg-[#FCB131] transition-colors"
                                                          title="Copier l'URL"
                                                      >
                                                          <Copy size={16} className="text-[#003B94]" />
                                                      </button>
                                                      <button
                                                          onClick={() => deleteImage(image.fullPath)}
                                                          className="p-2 bg-white rounded-lg hover:bg-red-500 transition-colors group/delete"
                                                          title="Eliminar"
                                                      >
                                                          <Trash2 size={16} className="text-red-500 group-hover/delete:text-white" />
                                                      </button>
                                                  </div>
                                              </div>

                                              {/* Info */}
                                              <div className="p-3 space-y-2">
                                                  <div className="flex items-start gap-2">
                                                      <FolderOpen size={14} className="text-[#003B94] shrink-0 mt-0.5" />
                                                      <div className="flex-1 min-w-0">
                                                          <p className="text-[10px] font-black text-[#003B94] uppercase truncate">{image.folder}</p>
                                                          <p className="text-[10px] font-bold text-gray-600 truncate" title={image.fullPath}>{image.name}</p>
                                                          <p className="text-[8px] text-gray-400 font-mono truncate mt-0.5" title={image.fullPath}>📁 {image.fullPath}</p>
                                                      </div>
                                                  </div>

                                                  <div className="flex items-center justify-between text-[8px] text-gray-400 font-bold pt-2 border-t border-gray-100">
                                                      <span>{formatFileSize(image.size)}</span>
                                                      <span>{new Date(image.created_at).toLocaleDateString()}</span>
                                                  </div>

                                                  {/* URL (cliquable pour copier) */}
                                                  <button
                                                      onClick={() => copyToClipboard(image.publicUrl)}
                                                      className="w-full bg-gray-50 hover:bg-[#003B94]/5 border border-gray-200 rounded-lg px-2 py-1.5 text-[9px] font-mono text-gray-600 truncate text-left transition-all"
                                                      title="Cliquer pour copier l'URL"
                                                  >
                                                      {image.publicUrl}
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                          </div>
                                      </div>
                                  )}

                              {/* Message si aucun contenu */}
                              {storageFolders.length === 0 && storageImages.length === 0 && (
                                  <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                      <FolderOpen size={64} className="text-gray-300 mx-auto mb-4" />
                                      <h3 className="text-[#001d4a] font-black text-lg uppercase mb-2">Dossier vide</h3>
                                      <p className="text-gray-500 text-sm mb-4">
                                          {currentFolder 
                                              ? `Le dossier "${currentFolder}" ne contient pas d'images`
                                              : "Il n'y a pas encore de fichiers dans ce bucket"
                                          }
                                      </p>
                                      {currentFolder && (
                                          <button 
                                              onClick={() => {
                                                  const parentFolder = currentFolder.split('/').slice(0, -1).join('/');
                                                  loadStorageImages(parentFolder);
                                              }}
                                              className="inline-flex items-center gap-2 bg-[#003B94] text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#001d4a] transition-all"
                                          >
                                              <ChevronLeft size={14} />
                                              Retour
                                          </button>
                                      )}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              )}

              </GlassCard>
          </div>
      </div>

      {showSaveConfirm && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/60 backdrop-blur-sm animate-in fade-in duration-300" style={{ height: '400px' }}>
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
