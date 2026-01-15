
import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { CustomSelect } from '../../components/CustomSelect';
import { Building2, MapPin, Globe, Users, Edit2, Save, Upload, Image as ImageIcon, UserCircle, Crown, Briefcase, FileText, Wallet, UserCheck, Newspaper, Gift, Plane, CheckCircle2, Trash2, Map, Navigation } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Consulado, Socio } from '../../types';
import { getConsuladoLogoUrl } from '../../lib/supabase';
import { uploadFileWithTracking } from '../../lib/uploadHelper';

export const MiConsulado = ({ consulado_id }: { consulado_id: string }) => {
  const [consulado, setConsulado] = useState<Consulado | null>(null);
  const [formData, setFormData] = useState<Partial<Consulado>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'ubicacion' | 'directiva'>('info');
  const [socios, setSocios] = useState<Socio[]>([]);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const c = dataService.getConsuladoById(consulado_id);
    if (c) {
      setConsulado(c);
      setFormData(c);
    }
    // Charger les socios du consulado
    const allSocios = dataService.getSocios(consulado_id);
    setSocios(allSocios);
    
    // S'abonner aux mises à jour
    const unsubscribe = dataService.subscribe(() => {
      const updatedConsulado = dataService.getConsuladoById(consulado_id);
      if (updatedConsulado) {
        setConsulado(updatedConsulado);
        setFormData(updatedConsulado);
      }
      const updatedSocios = dataService.getSocios(consulado_id);
      setSocios(updatedSocios);
    });
    
    return () => unsubscribe();
  }, [consulado_id]);
  
  // Options pour les membres de la commission directrice (socios du consulado)
  const boardCandidates = useMemo(() => {
    return socios.map(s => ({
      value: s.name || `${s.first_name} ${s.last_name}`,
      label: `${s.last_name.toUpperCase()}, ${s.first_name} (${s.numero_socio || s.dni || s.id})`
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [socios]);

  // Query pour Google Maps - calculée à partir de l'adresse, ville ou pays
  const mapQuery = useMemo(() => {
    if (formData.address && formData.address.trim()) {
      return `${formData.address}, ${formData.city || ''}, ${formData.country || ''}`;
    } else if (formData.city && formData.city.trim()) {
      return `${formData.city}, ${formData.country || ''}`;
    } else if (formData.country && formData.country.trim()) {
      return formData.country;
    }
    return 'Argentina';
  }, [formData.address, formData.city, formData.country]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      // Check dynamic size limit from settings
      const limitMB = dataService.getAppSettings().maxUploadSize || 5;
      const limitBytes = limitMB * 1024 * 1024;

      if (file.size > limitBytes) {
          alert(`La imagen es demasiado pesada (Máx ${limitMB}MB). Por favor, comprímala antes de subir.`);
          e.target.value = '';
          return;
      }

      // Stocker le fichier pour l'upload
      if (field === 'logo') {
        setSelectedLogoFile(file);
      } else {
        setSelectedBannerFile(file);
      }

      // Afficher un aperçu local
      const reader = new FileReader();
      reader.onload = (event) => {
          if (event.target?.result) {
              setFormData(prev => ({ ...prev, [field]: event.target!.result as string }));
          }
      };
      reader.onerror = () => {
          alert("Error al leer el archivo. Intente nuevamente.");
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };
  
  const handleRemoveImage = (field: 'logo' | 'banner') => {
    setFormData(prev => ({ ...prev, [field]: '' }));
    if (field === 'logo') {
      setSelectedLogoFile(null);
    } else {
      setSelectedBannerFile(null);
    }
  };

  const handleSave = async () => {
      if (!consulado) return;
      
      setIsSaving(true);
      
      try {
          let logoUrl = formData.logo || '';
          let bannerUrl = formData.banner || '';
          
          // Ne pas sauvegarder les data URLs si pas de fichier
          if (logoUrl.startsWith('data:') && !selectedLogoFile) {
              logoUrl = consulado.logo || '';
          }
          if (bannerUrl.startsWith('data:') && !selectedBannerFile) {
              bannerUrl = consulado.banner || '';
          }
          
          // Upload du logo si fichier sélectionné
          if (selectedLogoFile) {
              const result = await uploadFileWithTracking({
                  bucket: 'Logo',
                  folder: 'consulados',
                  entityType: 'consulado',
                  entityId: consulado.id,
                  fieldName: 'logo',
                  file: selectedLogoFile
              });
              if (result.success) {
                  logoUrl = result.publicUrl || result.filePath || '';
              } else {
                  console.warn('Error upload logo:', result.error);
              }
          }
          
          // Upload de la bannière si fichier sélectionné
          if (selectedBannerFile) {
              const result = await uploadFileWithTracking({
                  bucket: 'Logo',
                  folder: 'consulados',
                  entityType: 'consulado',
                  entityId: consulado.id,
                  fieldName: 'banner',
                  file: selectedBannerFile
              });
              if (result.success) {
                  bannerUrl = result.publicUrl || result.filePath || '';
              } else {
                  console.warn('Error upload banner:', result.error);
              }
          }
          
          await dataService.updateConsulado({ 
              ...consulado, 
              ...formData,
              logo: logoUrl,
              banner: bannerUrl
          } as Consulado);
          
          setSelectedLogoFile(null);
          setSelectedBannerFile(null);
          setIsEditing(false);
          alert('Cambios guardados correctamente.');
      } catch (error: any) {
          alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
      } finally {
          setIsSaving(false);
      }
  };

  if (!consulado) return <div>Cargando...</div>;

  // Obtenir l'URL du logo pour l'affichage
  const displayLogoUrl = consulado?.logo ? getConsuladoLogoUrl(consulado.logo) : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        {/* Header - avec logo du consulado si disponible */}
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                {displayLogoUrl ? (
                    <img src={displayLogoUrl} alt="" className="w-[300px] h-[300px] object-contain opacity-30" />
                ) : (
                    <Building2 size={300} className="text-white" />
                )}
            </div>
            <div className="flex items-center gap-5 relative z-10">
                {/* Logo sans fond, plus grand */}
                <div className="w-20 h-20 flex items-center justify-center shrink-0">
                    {displayLogoUrl ? (
                        <img src={displayLogoUrl} alt={consulado?.name} className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(252,177,49,0.5)]" />
                    ) : (
                        <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                            <Building2 size={40} className="text-[#FCB131]" />
                        </div>
                    )}
                </div>
                <div>
                    <h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">{consulado?.name || 'Mi Consulado'}</h1>
                    <p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Gestión de Perfil Oficial</p>
                </div>
            </div>
            {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="relative z-10 bg-white/10 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-all flex items-center gap-2 border border-white/10">
                    <Edit2 size={14} /> Editar Perfil
                </button>
            ) : (
                <div className="flex gap-3 relative z-10">
                    <button onClick={() => { setIsEditing(false); setSelectedLogoFile(null); setSelectedBannerFile(null); }} className="bg-white/10 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-all border border-white/10">Cancelar</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-[#FCB131] text-[#001d4a] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#FFD23F] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-[#001d4a] border-t-transparent rounded-full animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={14} /> Guardar
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>

        {/* Tabs */}
        <div className="liquid-glass rounded-xl shadow-lg border border-white/20 overflow-hidden backdrop-blur-xl bg-gradient-to-br from-white/40 via-white/30 to-white/20">
            <div className="flex gap-2 p-2 overflow-x-auto">
                {[
                    { id: 'info', label: 'Información General', icon: Building2 },
                    { id: 'ubicacion', label: 'Mapa y Ubicación', icon: Map },
                    { id: 'directiva', label: 'Comisión Directiva', icon: Users }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as 'info' | 'ubicacion' | 'directiva')} 
                        className={`flex items-center gap-2 px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative rounded-lg backdrop-blur-sm whitespace-nowrap ${
                            activeTab === tab.id 
                                ? 'bg-gradient-to-br from-[#003B94]/90 to-[#001d4a]/90 text-white shadow-lg shadow-[#003B94]/30 border border-white/30' 
                                : 'text-gray-600 hover:text-[#003B94] hover:bg-white/40 border border-transparent hover:border-white/30'
                        }`}
                    >
                        <tab.icon size={14} className={activeTab === tab.id ? 'text-[#FCB131]' : 'text-gray-500'} /> 
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                        )}
                    </button>
                ))}
            </div>
        </div>

        {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <GlassCard className="p-8 bg-white border-[#003B94]/10 space-y-6">
                    <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2">Información General</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Nombre</label>
                            <input disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 font-bold text-xs text-gray-500" value={formData.name} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ciudad/País</label>
                            <input disabled className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 font-bold text-xs text-gray-500" value={`${formData.city}, ${formData.country}`} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Teléfono</label>
                            <input disabled={!isEditing} className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none transition-all ${isEditing ? 'bg-white border-gray-200 focus:border-[#003B94] text-[#001d4a]' : 'bg-gray-50 border-transparent text-gray-600'}`} value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+XX XXX XXX XXXX" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email Público</label>
                            <input disabled={!isEditing} className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none transition-all ${isEditing ? 'bg-white border-gray-200 focus:border-[#003B94] text-[#001d4a]' : 'bg-gray-50 border-transparent text-gray-600'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                </GlassCard>

                <GlassCard className="p-8 bg-white border-[#003B94]/10 space-y-6">
                    <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                        <ImageIcon size={16} className="text-[#003B94]" />
                        Imágenes del Consulado
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Logo */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon size={10} className="text-[#003B94]" />
                                Logo del Consulado (URL o Archivo)
                            </label>
                            {isEditing && (
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94]" 
                                    value={formData.logo?.startsWith('data:') ? '' : (formData.logo || '')} 
                                    onChange={e => {
                                        setFormData({...formData, logo: e.target.value});
                                        setSelectedLogoFile(null);
                                    }} 
                                    placeholder="https://ejemplo.com/logo.png"
                                />
                            )}
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-gray-100 rounded-full border-2 border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                                    {formData.logo ? (
                                        <img 
                                            src={formData.logo.startsWith('data:') ? formData.logo : getConsuladoLogoUrl(formData.logo)} 
                                            className="w-full h-full object-cover" 
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <ImageIcon size={24} className="text-gray-400" />
                                    )}
                                </div>
                                {isEditing && (
                                    <div className="flex flex-col gap-2 flex-1">
                                        <label className="bg-[#003B94] text-white px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-[#001d4a] transition-all flex items-center gap-2 justify-center">
                                            <Upload size={12} /> Subir Archivo
                                            <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo')} />
                                        </label>
                                        {formData.logo && (
                                            <button 
                                                onClick={() => handleRemoveImage('logo')} 
                                                className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2 justify-center"
                                            >
                                                <Trash2 size={12} /> Eliminar
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            {selectedLogoFile && (
                                <div className="text-[9px] text-green-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Archivo seleccionado: {selectedLogoFile.name}
                                </div>
                            )}
                        </div>
                        
                        {/* Banner */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <ImageIcon size={10} className="text-[#003B94]" />
                                Banner del Consulado (URL o Archivo)
                            </label>
                            {isEditing && (
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94]" 
                                    value={formData.banner?.startsWith('data:') ? '' : (formData.banner || '')} 
                                    onChange={e => {
                                        setFormData({...formData, banner: e.target.value});
                                        setSelectedBannerFile(null);
                                    }} 
                                    placeholder="https://ejemplo.com/banner.png"
                                />
                            )}
                            <div className="w-full h-32 bg-gray-100 rounded-xl border-2 border-gray-200 overflow-hidden relative group">
                                {formData.banner ? (
                                    <img 
                                        src={formData.banner.startsWith('data:') ? formData.banner : getConsuladoLogoUrl(formData.banner)} 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-gray-400"><ImageIcon size={32} /></div>
                                )}
                                {isEditing && (
                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <span className="bg-white text-[#001d4a] px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                            <Upload size={12} /> Subir
                                        </span>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'banner')} />
                                    </label>
                                )}
                            </div>
                            {isEditing && formData.banner && (
                                <button 
                                    onClick={() => handleRemoveImage('banner')} 
                                    className="bg-red-50 border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2"
                                >
                                    <Trash2 size={10} /> Eliminar Banner
                                </button>
                            )}
                            {selectedBannerFile && (
                                <div className="text-[9px] text-green-600 font-bold flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Archivo seleccionado: {selectedBannerFile.name}
                                </div>
                            )}
                        </div>
                    </div>
                </GlassCard>
            </div>

            <div className="space-y-6">
                <GlassCard className="p-6 bg-white border-[#003B94]/10 h-full">
                    <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2 mb-4">Redes Sociales</h3>
                    <div className="space-y-4">
                        {[
                            { key: 'social_instagram', label: 'Instagram' },
                            { key: 'social_facebook', label: 'Facebook' },
                            { key: 'social_x', label: 'X' },
                            { key: 'social_youtube', label: 'YouTube' },
                            { key: 'social_tiktok', label: 'TikTok' }
                        ].map(net => (
                            <div key={net.key} className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{net.label}</label>
                                <input 
                                    disabled={!isEditing} 
                                    className={`w-full border rounded-xl py-2.5 px-3 font-bold text-xs outline-none transition-all ${isEditing ? 'bg-white border-gray-200 focus:border-[#003B94] text-[#001d4a]' : 'bg-gray-50 border-transparent text-gray-600'}`} 
                                    placeholder="@usuario"
                                    value={(formData as any)[net.key] || ''}
                                    onChange={e => setFormData({...formData, [net.key]: e.target.value})}
                                />
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>
        </div>
        )}

        {activeTab === 'ubicacion' && (
            <div className="space-y-6">
                <GlassCard className="p-8 bg-white border-[#003B94]/10 space-y-6">
                    <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Map size={16} className="text-[#003B94]" />
                        Mapa y Ubicación
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Información de ubicación */}
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <MapPin size={10} /> Dirección Completa
                                </label>
                                <input 
                                    disabled={!isEditing} 
                                    className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none transition-all ${isEditing ? 'bg-white border-gray-200 focus:border-[#003B94] text-[#001d4a]' : 'bg-gray-50 border-transparent text-gray-600'}`} 
                                    value={formData.address || ''} 
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                    placeholder="Calle, Número, Ciudad, País"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ciudad</label>
                                    <input 
                                        disabled 
                                        className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 font-bold text-xs text-gray-500" 
                                        value={formData.city || ''} 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">País</label>
                                    <input 
                                        disabled 
                                        className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 font-bold text-xs text-gray-500" 
                                        value={formData.country || ''} 
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                    <Globe size={10} /> Zona Horaria
                                </label>
                                <input 
                                    disabled 
                                    className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 font-bold text-xs text-gray-500" 
                                    value={formData.timezone || 'No definida'} 
                                />
                            </div>
                            
                            {/* Coordenadas (si disponibles) */}
                            {(formData as any).latitude && (formData as any).longitude && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Navigation size={14} className="text-blue-600" />
                                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Coordenadas GPS</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="text-gray-500">Latitud:</span>
                                            <span className="font-bold text-[#001d4a] ml-2">{(formData as any).latitude}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Longitud:</span>
                                            <span className="font-bold text-[#001d4a] ml-2">{(formData as any).longitude}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Mapa Google Maps - toujours actif */}
                        <div className="space-y-4">
                            <div className="w-full h-72 rounded-xl overflow-hidden border-2 border-[#003B94]/20 shadow-lg">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(mapQuery)}&zoom=14`}
                                />
                            </div>
                            
                            {/* Bouton pour ouvrir dans Google Maps */}
                            <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-[#003B94] text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#001d4a] transition-all flex items-center justify-center gap-2"
                            >
                                <MapPin size={14} /> Abrir en Google Maps
                            </a>
                            
                            {/* Info adicional */}
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                                <p className="text-[10px] text-amber-700 font-bold">
                                    💡 Para modificar la ciudad, país o zona horaria, contacte a los administradores centrales.
                                </p>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>
        )}

        {activeTab === 'directiva' && (
            <div className="space-y-6">
                <GlassCard className="p-8 bg-white border-[#003B94]/10 space-y-6">
                    <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Users size={18} className="text-[#FCB131]" />
                        Comisión Directiva
                    </h3>
                    
                    <div className="space-y-6">
                        {/* Presidente y Referente */}
                        <div className="bg-gradient-to-br from-[#001d4a] to-[#003B94] p-6 rounded-xl border border-[#FCB131]/30">
                            <h4 className="text-white text-[9px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Crown size={14} className="text-[#FCB131]" />
                                Cargos Principales
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-white/70 uppercase tracking-widest flex items-center gap-1">
                                        <Crown size={10} /> Presidente
                                    </label>
                                    {isEditing ? (
                                        <CustomSelect
                                            value={formData.president || ''}
                                            onChange={(val) => setFormData({...formData, president: val})}
                                            options={[{value: '', label: 'Vacante'}, ...boardCandidates]}
                                            searchable
                                            placeholder="Seleccionar..."
                                            className="text-white"
                                        />
                                    ) : (
                                        <div className="bg-white/10 border border-white/20 rounded-lg py-2.5 px-3 text-xs font-bold text-white">
                                            {formData.president || 'Vacante'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-white/70 uppercase tracking-widest flex items-center gap-1">
                                        <UserCheck size={10} /> Referente
                                    </label>
                                    {isEditing ? (
                                        <CustomSelect
                                            value={formData.referente || ''}
                                            onChange={(val) => setFormData({...formData, referente: val})}
                                            options={[{value: '', label: 'Vacante'}, ...boardCandidates]}
                                            searchable
                                            placeholder="Seleccionar..."
                                            className="text-white"
                                        />
                                    ) : (
                                        <div className="bg-white/10 border border-white/20 rounded-lg py-2.5 px-3 text-xs font-bold text-white">
                                            {formData.referente || 'Vacante'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Comisión Directiva */}
                        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                            <h4 className="text-[#001d4a] text-[9px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Briefcase size={14} className="text-[#003B94]" />
                                Otros Cargos
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                        <UserCircle size={10} /> Vicepresidente
                                    </label>
                                    {isEditing ? (
                                        <CustomSelect
                                            value={formData.vice_president || ''}
                                            onChange={(val) => setFormData({...formData, vice_president: val})}
                                            options={[{value: '', label: 'Vacante'}, ...boardCandidates]}
                                            searchable
                                            placeholder="Seleccionar..."
                                        />
                                    ) : (
                                        <div className="bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs font-bold text-[#001d4a]">
                                            {formData.vice_president || 'Vacante'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                        <FileText size={10} /> Secretario
                                    </label>
                                    {isEditing ? (
                                        <CustomSelect
                                            value={formData.secretary || ''}
                                            onChange={(val) => setFormData({...formData, secretary: val})}
                                            options={[{value: '', label: 'Vacante'}, ...boardCandidates]}
                                            searchable
                                            placeholder="Seleccionar..."
                                        />
                                    ) : (
                                        <div className="bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs font-bold text-[#001d4a]">
                                            {formData.secretary || 'Vacante'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                        <Wallet size={10} /> Tesorero
                                    </label>
                                    {isEditing ? (
                                        <CustomSelect
                                            value={formData.treasurer || ''}
                                            onChange={(val) => setFormData({...formData, treasurer: val})}
                                            options={[{value: '', label: 'Vacante'}, ...boardCandidates]}
                                            searchable
                                            placeholder="Seleccionar..."
                                        />
                                    ) : (
                                        <div className="bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs font-bold text-[#001d4a]">
                                            {formData.treasurer || 'Vacante'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                        <Users size={10} /> Vocal
                                    </label>
                                    {isEditing ? (
                                        <CustomSelect
                                            value={formData.vocal || ''}
                                            onChange={(val) => setFormData({...formData, vocal: val})}
                                            options={[{value: '', label: 'Vacante'}, ...boardCandidates]}
                                            searchable
                                            placeholder="Seleccionar..."
                                        />
                                    ) : (
                                        <div className="bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs font-bold text-[#001d4a]">
                                            {formData.vocal || 'Vacante'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                        <UserCircle size={10} /> Secretaria de la Mujer
                                    </label>
                                    {isEditing ? (
                                        <CustomSelect
                                            value={(formData as any).secretaria_mujer || ''}
                                            onChange={(val) => setFormData({...formData, secretaria_mujer: val})}
                                            options={[{value: '', label: 'Vacante'}, ...boardCandidates]}
                                            searchable
                                            placeholder="Seleccionar..."
                                        />
                                    ) : (
                                        <div className="bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs font-bold text-[#001d4a]">
                                            {(formData as any).secretaria_mujer || 'Vacante'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                        <Newspaper size={10} /> Prensa
                                    </label>
                                    {isEditing ? (
                                        <CustomSelect
                                            value={(formData as any).prensa || ''}
                                            onChange={(val) => setFormData({...formData, prensa: val})}
                                            options={[{value: '', label: 'Vacante'}, ...boardCandidates]}
                                            searchable
                                            placeholder="Seleccionar..."
                                        />
                                    ) : (
                                        <div className="bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs font-bold text-[#001d4a]">
                                            {(formData as any).prensa || 'Vacante'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                        <Gift size={10} /> Beneficios Xeneizes
                                    </label>
                                    {isEditing ? (
                                        <CustomSelect
                                            value={(formData as any).beneficios_xeneizes || ''}
                                            onChange={(val) => setFormData({...formData, beneficios_xeneizes: val})}
                                            options={[{value: '', label: 'Vacante'}, ...boardCandidates]}
                                            searchable
                                            placeholder="Seleccionar..."
                                        />
                                    ) : (
                                        <div className="bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs font-bold text-[#001d4a]">
                                            {(formData as any).beneficios_xeneizes || 'Vacante'}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                                        <Plane size={10} /> Turismo
                                    </label>
                                    {isEditing ? (
                                        <CustomSelect
                                            value={(formData as any).turismo || ''}
                                            onChange={(val) => setFormData({...formData, turismo: val})}
                                            options={[{value: '', label: 'Vacante'}, ...boardCandidates]}
                                            searchable
                                            placeholder="Seleccionar..."
                                        />
                                    ) : (
                                        <div className="bg-white border border-gray-200 rounded-lg py-2.5 px-3 text-xs font-bold text-[#001d4a]">
                                            {(formData as any).turismo || 'Vacante'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>
        )}
    </div>
  );
};

export default MiConsulado;
