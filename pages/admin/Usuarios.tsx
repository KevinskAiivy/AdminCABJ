
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { User, Plus, Edit2, Trash2, Search, X, Save, AlertCircle, Fingerprint, Mail, KeyRound, Building2, AlertTriangle, Loader2, ChevronDown, Check, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { AppUser } from '../../types';

export const Usuarios = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<AppUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [consulados, setConsulados] = useState(dataService.getConsulados());
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<Partial<AppUser>>({
      username: '', password: '', email: '', full_name: '', role: 'PRESIDENTE', active: true, consulado_id: ''
  });

  useEffect(() => {
      const load = () => {
          setUsers(dataService.getUsers());
          setConsulados(dataService.getConsulados());
      };
      load();
      const unsub = dataService.subscribe(load);
      return () => unsub();
  }, []);

  useEffect(() => {
      if (isModalOpen) {
          setError(null);
          setShowPassword(false); // Réinitialiser l'affichage du mot de passe quand on ouvre/ferme la modale
      }
  }, [isModalOpen]);

  const handleCreate = () => {
      setEditingUser(null);
      setFormData({ username: '', password: '', email: '', full_name: '', role: 'PRESIDENTE', active: true, consulado_id: '' });
      setIsModalOpen(true);
  };

  const handleEdit = (user: AppUser) => {
      setEditingUser(user.id);
      setFormData({ ...user, password: '' }); // Don't show password
      setIsModalOpen(true);
  };

  const handleDelete = (user: AppUser) => {
      setDeleteError(null);
      setDeletingUser(user);
  };

  const confirmDelete = async () => {
      if (deletingUser) {
          try {
              await dataService.deleteUser(deletingUser.id);
              setDeletingUser(null);
          } catch (e: any) {
              setDeleteError(e.message || "No se pudo eliminar el usuario.");
          }
      }
  };

  const executeSave = async () => {
      setError(null);
      if ((editingUser && !formData.username) || !formData.email || !formData.full_name) {
          setError("Complete todos los campos obligatorios");
          setShowSaveConfirm(false);
          return;
      }
      if (!editingUser && !formData.password) {
          setError("La contraseña es obligatoria para nuevos usuarios");
          setShowSaveConfirm(false);
          return;
      }

      setIsSaving(true);
      try {
          const payload: AppUser = {
              id: editingUser || crypto.randomUUID(),
              username: formData.username || '',
              password: formData.password,
              email: formData.email || '',
              full_name: formData.full_name || '',
              role: formData.role || 'PRESIDENTE',
              consulado_id: formData.consulado_id || undefined,
              active: formData.active !== undefined ? formData.active : true,
              gender: formData.gender || undefined,
              last_login: formData.last_login || undefined,
              avatar: formData.avatar || undefined
          };
          if (editingUser) {
              await dataService.updateUser(payload);
          } else {
              await dataService.addUser(payload);
          }
          setIsModalOpen(false);
          setShowSaveConfirm(false);
      } catch (e: any) {
          setError(e.message || "Error al guardar usuario");
      } finally {
          setIsSaving(false);
      }
  };

  const handleSave = () => {
      if ((editingUser && !formData.username) || !formData.email || !formData.full_name) {
          setError("Complete todos los campos obligatorios");
          return;
      }
      if (!editingUser && !formData.password) {
          setError("La contraseña es obligatoria para nuevos usuarios");
          return;
      }
      setShowSaveConfirm(true);
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        {/* Harmonized Header */}
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none"><User size={300} className="text-white" /></div>
            
            <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-4 rounded-xl border border-white/20"><User size={28} className="text-[#FCB131]" /></div>
                <div><h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Gestión de Usuarios</h1><p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Control de Acceso</p></div>
            </div>

            <div className="relative z-10 flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                <div className="relative group w-full md:w-64">
                    <input type="text" placeholder="Buscar usuario..." className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 outline-none text-xs font-bold text-white placeholder:text-white/40 transition-all focus:bg-white focus:text-[#001d4a]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#001d4a]" size={16} />
                </div>
                <button onClick={handleCreate} className="bg-[#FCB131] text-[#001d4a] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-[#FFD23F] transition-all whitespace-nowrap ml-2"><Plus size={16} /> Nuevo</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(user => (
                <GlassCard key={user.id} className="p-5 bg-white border border-[#003B94]/10 group relative">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-[#003B94] font-black shadow-inner">
                            {user.full_name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="oswald text-lg font-black text-[#001d4a] uppercase truncate">{user.full_name}</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">{user.role}</p>
                            <div className="flex items-center gap-2 text-[9px] font-medium text-gray-500">
                                <span className={`w-2 h-2 rounded-full ${user.active ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                {user.active ? 'Activo' : 'Inactivo'}
                            </div>
                        </div>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => handleEdit(user)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit2 size={12}/></button>
                        <button onClick={() => handleDelete(user)} className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={12}/></button>
                    </div>
                </GlassCard>
            ))}
        </div>

        {isModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-2.5 pb-4 px-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto" style={{ height: '550px' }}>
                <div className="relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-white/60 max-w-[900px] animate-in zoom-in-95 duration-300 mx-auto" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
                    <div className="liquid-glass-dark p-3 text-white flex items-center justify-between shrink-0 w-[900px]" style={{ width: '900px' }}>
                        <div className="flex items-center gap-2.5">
                            <div className="bg-white/10 p-1.5 rounded-xl"><User size={18} className="text-[#FCB131]" /></div>
                            <div>
                                <h2 className="oswald text-base font-black uppercase tracking-tight">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                                <p className="text-white/50 text-[8px] font-bold uppercase tracking-widest">Gestión de Acceso</p>
                            </div>
                        </div>
                        <X onClick={() => setIsModalOpen(false)} className="cursor-pointer opacity-60 hover:opacity-100 p-1 hover:bg-white/10 rounded-full transition-colors" size={18} />
                    </div>

                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-white to-gray-50/50 min-h-0 overflow-x-hidden" style={{ width: '900px' }}>
                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 text-red-600 p-2.5 rounded-lg border border-red-200 text-[10px] font-bold animate-in fade-in slide-in-from-top-2 shadow-sm mb-4">
                                <AlertCircle size={12} className="text-red-500" /> 
                                <span>{error}</span>
                            </div>
                        )}
                        
                        {/* Layout en deux colonnes : sections principales à gauche, Permisos y Asignación à droite */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                            {/* Colonne de gauche : Información Personal et Credenciales */}
                            <div className="lg:col-span-2 space-y-3">
                                {/* Section: Información Personal */}
                                <div className="space-y-2.5">
                                    <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest border-b border-[#003B94]/20 pb-1.5 flex items-center gap-1.5">
                                        <User size={12} className="text-[#003B94]"/> Información Personal
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                Nombre Completo <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative group">
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-8 pr-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] focus:ring-1 focus:ring-[#003B94]/10 transition-all placeholder:text-gray-300" 
                                                    value={formData.full_name || ''} 
                                                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                                                    placeholder="Ej: Juan Pérez"
                                                />
                                                <User size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003B94] transition-colors" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                Email <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative group">
                                                <input 
                                                    type="email" 
                                                    className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-8 pr-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] focus:ring-1 focus:ring-[#003B94]/10 transition-all placeholder:text-gray-300" 
                                                    value={formData.email} 
                                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                                    placeholder="usuario@ejemplo.com"
                                                />
                                                <Mail size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003B94] transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Credenciales de Acceso */}
                                <div className="space-y-2.5 pt-3 border-t border-gray-200">
                                    <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest border-b border-[#003B94]/20 pb-1.5 flex items-center gap-1.5">
                                        <KeyRound size={12} className="text-[#003B94]"/> Credenciales de Acceso
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                Usuario {editingUser && <span className="text-red-500">*</span>}
                                            </label>
                                            <div className="relative group">
                                                <input 
                                                    type="text" 
                                                    className={`w-full bg-white border border-gray-200 rounded-lg py-2 pl-8 pr-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] focus:ring-1 focus:ring-[#003B94]/10 transition-all placeholder:text-gray-300 ${!editingUser ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                    value={formData.username} 
                                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                                    placeholder="nombre.usuario"
                                                    disabled={!editingUser}
                                                />
                                                <Fingerprint size={13} className={`absolute left-2 top-1/2 -translate-y-1/2 transition-colors ${!editingUser ? 'text-gray-300' : 'text-gray-400 group-focus-within:text-[#003B94]'}`} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-1">
                                                Contraseña {!editingUser && <span className="text-red-500">*</span>}
                                            </label>
                                            <div className="relative group">
                                                <input 
                                                    type={showPassword ? "text" : "password"} 
                                                    className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-8 pr-9 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] focus:ring-1 focus:ring-[#003B94]/10 transition-all placeholder:text-gray-300" 
                                                    value={formData.password} 
                                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                                    placeholder={editingUser ? 'Dejar vacío para mantener' : 'Mín. 6 caracteres'}
                                                />
                                                <KeyRound size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003B94] transition-colors pointer-events-none" />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#003B94] transition-colors rounded hover:bg-gray-100"
                                                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                                >
                                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Colonne de droite : Permisos y Asignación */}
                            <div className="lg:col-span-1">
                                <div className="space-y-2.5 pt-3 lg:pt-0 lg:border-t-0 border-t border-gray-200 lg:border-l lg:pl-4 lg:border-gray-200">
                                    <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest border-b border-[#003B94]/20 pb-1.5 flex items-center gap-1.5">
                                        <ShieldCheck size={12} className="text-[#003B94]"/> Permisos y Asignación
                                    </h3>
                                    
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest ml-1 block">
                                            Rol de Acceso <span className="text-red-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5">
                                            {[
                                                { value: 'SUPERADMIN', label: 'Super Admin', desc: 'Acceso total', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                                                { value: 'ADMIN', label: 'Admin', desc: 'Gestión completa', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                                                { value: 'PRESIDENTE', label: 'Presidente', desc: 'Consulado', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                                                { value: 'REFERENTE', label: 'Referente', desc: 'Consulado', color: 'bg-amber-50 border-amber-200 text-amber-700' }
                                            ].map(role => (
                                                <button 
                                                    key={role.value} 
                                                    onClick={() => setFormData({...formData, role: role.value as any})} 
                                                    className={`relative py-2 px-1.5 rounded-lg text-[7px] font-black uppercase tracking-widest border transition-all ${
                                                        formData.role === role.value 
                                                            ? `${role.color} border-current shadow-md` 
                                                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="font-black text-[8px] mb-0.5">{role.label}</div>
                                                    <div className="text-[6px] opacity-70">{role.desc}</div>
                                                    {formData.role === role.value && (
                                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#FCB131] rounded-full flex items-center justify-center">
                                                            <Check size={7} className="text-[#001d4a]" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {(formData.role === 'PRESIDENTE' || formData.role === 'REFERENTE') && (
                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                                            <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                                <Building2 size={10} className="text-blue-600"/> Consulado Asignado <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative group">
                                                <select 
                                                    className="w-full bg-white border border-blue-200 rounded-lg py-2 pl-8 pr-3 font-bold text-xs text-[#003B94] outline-none focus:border-[#003B94] focus:ring-1 focus:ring-[#003B94]/10 transition-all appearance-none cursor-pointer" 
                                                    value={formData.consulado_id || ''} 
                                                    onChange={(e) => setFormData({...formData, consulado_id: e.target.value})}
                                                >
                                                    <option value="">Seleccionar Consulado...</option>
                                                    {consulados.map(c => <option key={c.id} value={c.id}>{c.name} - {c.city}</option>)}
                                                </select>
                                                <Building2 size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#003B94] transition-colors pointer-events-none" />
                                                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-white p-2.5 rounded-lg border border-gray-200 hover:border-[#003B94]/30 transition-all">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${formData.active ? 'text-[#003B94]' : 'bg-gray-100 text-gray-400'}`} style={formData.active ? { backgroundColor: 'var(--boca-blue)' } : {}}>
                                                {formData.active ? <Check size={14} className="text-[#FCB131]" /> : <X size={14} />}
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black uppercase tracking-widest text-[#001d4a] cursor-pointer">
                                                    Usuario Activo
                                                </label>
                                                <p className="text-[7px] text-gray-400 mt-0.5">
                                                    {formData.active ? 'Puede acceder al sistema' : 'Acceso deshabilitado'}
                                                </p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer" 
                                                checked={formData.active} 
                                                onChange={e => setFormData({...formData, active: e.target.checked})} 
                                            />
                                            <div className="w-9 h-4.5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#003B94]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#003B94]"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 bg-[#FCB131] border-t border-[#e5a02d] flex justify-end gap-2 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 relative">
                        <button onClick={() => setIsModalOpen(false)} className="px-3.5 py-1.5 rounded-lg font-black uppercase text-[8px] tracking-widest text-[#001d4a] bg-white border border-white/50 hover:bg-white/90 transition-colors shadow-sm">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} className="bg-[#003B94] text-white px-4 py-1.5 rounded-lg font-black uppercase text-[8px] tracking-widest shadow-xl flex items-center gap-1.5 hover:bg-[#001d4a] transition-all disabled:opacity-50">
                            {isSaving ? <Loader2 size={11} className="animate-spin"/> : <Save size={11} />} Guardar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showSaveConfirm && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/60 backdrop-blur-sm animate-in fade-in duration-300" >
                <div className="relative w-full max-w-md bg-white rounded-[2rem] p-10 shadow-[0_50px_150px_rgba(0,29,74,0.3)] text-center border border-white animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-[#FCB131]/10 text-[#FCB131] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle2 size={40} /></div>
                    <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter">¿Guardar Cambios?</h2>
                    <p className="text-[#003B94]/70 font-bold mb-10 text-[10px] leading-relaxed uppercase tracking-widest">Se guardará la información del usuario en el sistema.</p>
                    <div className="flex gap-4">
                        <button onClick={() => setShowSaveConfirm(false)} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 uppercase text-[9px] font-black tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                        <button onClick={executeSave} className="flex-1 py-4 rounded-xl bg-[#003B94] text-white uppercase text-[9px] font-black tracking-widest shadow-2xl hover:opacity-90 transition-all">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        {deletingUser && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" >
                <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-xl text-center border border-white animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner"><AlertTriangle size={32} /></div>
                    <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter">Eliminar Usuario</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6">¿Estás seguro de eliminar a <strong>{deletingUser.username}</strong>?</p>
                    
                    {deleteError && (
                        <div className="mb-4 bg-red-50 border border-red-100 p-3 rounded-xl text-[9px] font-bold text-red-600 animate-in fade-in">
                            {deleteError}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button onClick={() => setDeletingUser(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200">Cancelar</button>
                        <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white uppercase text-[10px] font-black tracking-widest shadow-lg hover:bg-red-600 transition-all">Eliminar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Usuarios;
