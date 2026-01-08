
import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { User, Plus, Edit2, Trash2, Search, X, Save, AlertCircle, Fingerprint, Mail, KeyRound, Building2, AlertTriangle, Loader2 } from 'lucide-react';
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

  const [formData, setFormData] = useState<Partial<AppUser>>({
      username: '', password: '', email: '', fullName: '', role: 'PRESIDENTE', active: true, consuladoId: ''
  });

  // Dragging State
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

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
          setPosition({ x: 0, y: 0 });
      }
  }, [isModalOpen]);

  useEffect(() => {
      if (deletingUser) {
          setPosition({ x: 0, y: 0 });
      }
  }, [deletingUser]);

  // Drag Handlers
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging) return;
          setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
      };
      const handleMouseUp = () => setIsDragging(false);
      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, input, select')) return;
      setIsDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleCreate = () => {
      setEditingUser(null);
      setFormData({ username: '', password: '', email: '', fullName: '', role: 'PRESIDENTE', active: true, consuladoId: '' });
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

  const handleSave = async () => {
      setError(null);
      if (!formData.username || !formData.email || !formData.fullName) {
          setError("Complete todos los campos obligatorios");
          return;
      }
      if (!editingUser && !formData.password) {
          setError("La contraseña es obligatoria para nuevos usuarios");
          return;
      }

      setIsSaving(true);
      try {
          const payload = { ...formData } as AppUser;
          if (editingUser) {
              await dataService.updateUser(payload);
          } else {
              await dataService.addUser({ ...payload, id: crypto.randomUUID() });
          }
          setIsModalOpen(false);
      } catch (e: any) {
          setError(e.message || "Error al guardar usuario");
      } finally {
          setIsSaving(false);
      }
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.fullName.toLowerCase().includes(searchQuery.toLowerCase()));

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
                            {user.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="oswald text-lg font-black text-[#001d4a] uppercase truncate">{user.fullName}</h3>
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

        {/* EDIT/CREATE MODAL - CENTERED FIXED DRAGGABLE */}
        {isModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
                <div 
                    style={{ transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.2s' }}
                    className="pointer-events-auto relative w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/60 max-w-2xl animate-in zoom-in-95 duration-300 max-h-[90vh]"
                >
                    <div 
                        onMouseDown={handleDragStart}
                        className="liquid-glass-dark p-6 text-white flex items-center justify-between shrink-0 cursor-move select-none active:cursor-grabbing"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 p-3 rounded-2xl"><User size={24} className="text-[#FCB131]" /></div>
                            <div>
                                <h2 className="oswald text-xl font-black uppercase tracking-tight">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                                <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Gestión de Acceso</p>
                            </div>
                        </div>
                        <X onClick={() => setIsModalOpen(false)} className="cursor-pointer opacity-60 hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-colors" size={24} />
                    </div>

                    <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-white/50">
                        {error && (
                            <div className="flex items-center gap-2 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}
                        
                        <div className="space-y-4">
                            <h3 className="text-[#003B94] font-black uppercase text-[11px] tracking-widest border-b border-[#003B94]/10 pb-2 flex items-center gap-2">Credenciales de Acceso</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Usuario</label>
                                    <div className="relative"><input type="text" className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] transition-all" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /><Fingerprint size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /></div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Contraseña</label>
                                    <div className="relative"><input type="password" placeholder={editingUser ? 'Dejar en blanco para no cambiar' : ''} className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /><KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <h3 className="text-[#003B94] font-black uppercase text-[11px] tracking-widest border-b border-[#003B94]/10 pb-2 flex items-center gap-2">Asignación de Rol</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                                    <div className="relative"><input type="text" className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] transition-all" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} /><User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /></div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
                                    <div className="relative"><input type="email" className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /></div>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Rol de Acceso</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {['SUPERADMIN', 'ADMIN', 'PRESIDENTE', 'REFERENTE'].map(role => (
                                        <button key={role} onClick={() => setFormData({...formData, role: role as any})} className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${formData.role === role ? 'bg-[#003B94] text-white border-[#003B94] shadow-md' : 'bg-white text-gray-400 border-gray-200 hover:border-[#003B94]/30'}`}>
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {(formData.role === 'PRESIDENTE' || formData.role === 'REFERENTE') && (
                                <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Consulado Asignado</label>
                                    <div className="relative">
                                        <select className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] transition-all appearance-none cursor-pointer" value={formData.consuladoId} onChange={(e) => setFormData({...formData, consuladoId: e.target.value})}>
                                            <option value="">Seleccionar Consulado...</option>
                                            {consulados.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#003B94]"></div>
                                </label>
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#001d4a]">Usuario Activo</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-[#FCB131] border-t border-[#e5a02d] flex justify-end gap-3 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 relative">
                        <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest text-[#001d4a] bg-white border border-white/50 hover:bg-white/90 transition-colors shadow-sm">Cancelar</button>
                        <button onClick={handleSave} disabled={isSaving} className="bg-[#003B94] text-white px-6 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-[#001d4a] transition-all disabled:opacity-50">
                            {isSaving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />} Guardar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* DELETE MODAL - CENTERED FIXED DRAGGABLE */}
        {deletingUser && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 pointer-events-none">
                <div 
                    style={{ transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.2s' }}
                    className="pointer-events-auto relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-xl text-center border border-white animate-in zoom-in-95"
                >
                    <div onMouseDown={handleDragStart} className="cursor-move absolute inset-0 h-12 z-10" />
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner relative z-0"><AlertTriangle size={32} /></div>
                    <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter relative z-0">Eliminar Usuario</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6 relative z-0">¿Estás seguro de eliminar a <strong>{deletingUser.username}</strong>?</p>
                    
                    {deleteError && (
                        <div className="mb-4 bg-red-50 border border-red-100 p-3 rounded-xl text-[9px] font-bold text-red-600 animate-in fade-in relative z-0">
                            {deleteError}
                        </div>
                    )}

                    <div className="flex gap-3 relative z-0">
                        <button onClick={() => setDeletingUser(null)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200">Cancelar</button>
                        <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-500 text-white uppercase text-[10px] font-black tracking-widest shadow-lg hover:bg-red-600 transition-all">Eliminar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
