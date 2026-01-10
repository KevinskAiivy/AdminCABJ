
import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { CustomSelect } from '../../components/CustomSelect';
import { Building2, MapPin, Globe, Users, Edit2, Save, Upload, Image as ImageIcon, UserCircle, Crown, Briefcase, FileText, Wallet, UserCheck } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Consulado, Socio } from '../../types';

export const MiConsulado = ({ consulado_id }: { consulado_id: string }) => {
  const [consulado, setConsulado] = useState<Consulado | null>(null);
  const [formData, setFormData] = useState<Partial<Consulado>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'directiva'>('info');
  const [socios, setSocios] = useState<Socio[]>([]);

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

  const handleSave = async () => {
      if (consulado) {
          try {
              await dataService.updateConsulado({ ...consulado, ...formData } as Consulado);
              setIsEditing(false);
              alert('Cambios guardados correctamente.');
          } catch (error: any) {
              alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
          }
      }
  };

  if (!consulado) return <div>Cargando...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        {/* Header */}
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                <Building2 size={300} className="text-white" />
            </div>
            <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                    <Building2 size={28} className="text-[#FCB131]" />
                </div>
                <div>
                    <h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Mi Consulado</h1>
                    <p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Gestión de Perfil Oficial</p>
                </div>
            </div>
            {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="relative z-10 bg-white/10 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-all flex items-center gap-2 border border-white/10">
                    <Edit2 size={14} /> Editar Perfil
                </button>
            ) : (
                <div className="flex gap-3 relative z-10">
                    <button onClick={() => setIsEditing(false)} className="bg-white/10 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-all border border-white/10">Cancelar</button>
                    <button onClick={handleSave} className="bg-[#FCB131] text-[#001d4a] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-[#FFD23F] transition-all flex items-center gap-2">
                        <Save size={14} /> Guardar
                    </button>
                </div>
            )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-[#003B94]/10 overflow-hidden">
            <div className="flex border-b border-gray-200">
                {[
                    { id: 'info', label: 'Información General', icon: Building2 },
                    { id: 'directiva', label: 'Comisión Directiva', icon: Users }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as 'info' | 'directiva')} 
                        className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                            activeTab === tab.id 
                                ? 'text-[#003B94] border-b-2 border-[#003B94] bg-[#003B94]/5' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <tab.icon size={14} className={activeTab === tab.id ? 'text-[#FCB131]' : ''} /> 
                        {tab.label}
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
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Dirección</label>
                            <input disabled={!isEditing} className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none transition-all ${isEditing ? 'bg-white border-gray-200 focus:border-[#003B94] text-[#001d4a]' : 'bg-gray-50 border-transparent text-gray-600'}`} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email Público</label>
                            <input disabled={!isEditing} className={`w-full border rounded-xl py-3 px-4 font-bold text-xs outline-none transition-all ${isEditing ? 'bg-white border-gray-200 focus:border-[#003B94] text-[#001d4a]' : 'bg-gray-50 border-transparent text-gray-600'}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard className="p-8 bg-white border-[#003B94]/10 space-y-6">
                    <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2">Imágenes</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Logo</label>
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-gray-100 rounded-full border border-gray-200 flex items-center justify-center overflow-hidden">
                                    {formData.logo ? <img src={formData.logo} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-gray-400" />}
                                </div>
                                {isEditing && (
                                    <label className="bg-[#003B94]/10 text-[#003B94] px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-[#003B94] hover:text-white transition-all">
                                        Cambiar <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'logo')} />
                                    </label>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Banner</label>
                            <div className="w-full h-32 bg-gray-100 rounded-xl border border-gray-200 overflow-hidden relative group">
                                {formData.banner ? <img src={formData.banner} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-gray-400"><ImageIcon size={32} /></div>}
                                {isEditing && (
                                    <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <span className="bg-white text-[#001d4a] px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                            <Upload size={12} /> Subir
                                        </span>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'banner')} />
                                    </label>
                                )}
                            </div>
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
