
import React, { useState } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { ShieldCheck, Lock, Check, X, Building2, Users, Ticket, Sword, Calendar, MessageSquare, Database, Info } from 'lucide-react';

interface Permission {
  module: string;
  icon: any;
  roles: {
    SUPERADMIN: boolean;
    ADMIN: boolean;
    PRESIDENTE: boolean;
    REFERENTE: boolean;
  };
}

const INITIAL_PERMISSIONS: Permission[] = [
  { module: 'Dashboard General', icon: ShieldCheck, roles: { SUPERADMIN: true, ADMIN: true, PRESIDENTE: true, REFERENTE: true } },
  { module: 'Gestión de Consulados', icon: Building2, roles: { SUPERADMIN: true, ADMIN: true, PRESIDENTE: false, REFERENTE: false } },
  { module: 'Padrón de Socios (Nacional)', icon: Users, roles: { SUPERADMIN: true, ADMIN: true, PRESIDENTE: false, REFERENTE: false } },
  { module: 'Habilitaciones Globales', icon: Ticket, roles: { SUPERADMIN: true, ADMIN: true, PRESIDENTE: false, REFERENTE: false } },
  { module: 'Configuración de Partidos', icon: Sword, roles: { SUPERADMIN: true, ADMIN: true, PRESIDENTE: false, REFERENTE: false } },
  { module: 'Agenda Institucional', icon: Calendar, roles: { SUPERADMIN: true, ADMIN: true, PRESIDENTE: false, REFERENTE: false } },
  { module: 'Envío de Mensajes', icon: MessageSquare, roles: { SUPERADMIN: true, ADMIN: true, PRESIDENTE: false, REFERENTE: false } },
  { module: 'Base de Datos (Raw)', icon: Database, roles: { SUPERADMIN: true, ADMIN: false, PRESIDENTE: false, REFERENTE: false } },
  { module: 'Mi Consulado (Edición)', icon: Building2, roles: { SUPERADMIN: true, ADMIN: false, PRESIDENTE: true, REFERENTE: true } },
  { module: 'Mis Socios (Local)', icon: Users, roles: { SUPERADMIN: true, ADMIN: false, PRESIDENTE: true, REFERENTE: true } },
  { module: 'Mis Habilitaciones', icon: Ticket, roles: { SUPERADMIN: true, ADMIN: false, PRESIDENTE: true, REFERENTE: true } },
];

const PermissionMatrix = () => {
    const [permissions, setPermissions] = useState<Permission[]>(INITIAL_PERMISSIONS);

    const togglePermission = (moduleIndex: number, role: keyof Permission['roles']) => {
        const newPerms = [...permissions];
        newPerms[moduleIndex].roles[role] = !newPerms[moduleIndex].roles[role];
        setPermissions(newPerms);
    };

    return (
        <>
            <div className="liquid-glass p-0 overflow-hidden shadow-2xl rounded-2xl">
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                    <tr className="border-b border-white/20">
                        <th className="py-6 px-8 text-[11px] font-black text-[#001d4a] uppercase tracking-widest min-w-[250px]">Módulo / Función</th>
                        {['SUPERADMIN', 'ADMIN', 'PRESIDENTE', 'REFERENTE'].map(role => (
                        <th key={role} className="py-6 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            role === 'SUPERADMIN' ? 'bg-yellow-500 text-white' :
                            role === 'ADMIN' ? 'bg-blue-600 text-white' :
                            role === 'PRESIDENTE' ? 'bg-[#003B94] text-white' :
                            'bg-sky-500 text-white'
                            }`}>
                            {role}
                            </span>
                        </th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {permissions.map((perm, idx) => (
                        <tr key={perm.module} className="group hover:bg-black/5 transition-colors border-b border-white/10 last:border-b-0">
                        <td className="py-5 px-8">
                            <div className="flex items-center gap-3">
                            <div className="p-2 bg-black/5 rounded-lg text-[#003B94] group-hover:bg-[#003B94] group-hover:text-white transition-colors">
                                <perm.icon size={16} />
                            </div>
                            <span className="text-sm font-bold text-[#001d4a] uppercase tracking-tight">{perm.module}</span>
                            </div>
                        </td>
                        {(['SUPERADMIN', 'ADMIN', 'PRESIDENTE', 'REFERENTE'] as const).map(role => (
                            <td key={role} className="py-5 px-4 text-center">
                            <button 
                                onClick={() => togglePermission(idx, role)}
                                disabled={role === 'SUPERADMIN' && perm.roles[role]}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all transform active:scale-95 ${
                                perm.roles[role] 
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                    : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                }`}
                            >
                                {perm.roles[role] ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}
                            </button>
                            </td>
                        ))}
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
             <div className="flex gap-4 p-6 bg-blue-50/50 liquid-glass border-blue-100 rounded-2xl items-start">
                <Info className="text-[#003B94] shrink-0" size={20} />
                <div>
                <h4 className="text-[#003B94] font-black uppercase text-[11px] tracking-widest mb-1">Nota del Sistema</h4>
                <p className="text-xs text-[#003B94]/70 leading-relaxed">
                    Las modificaciones en esta matriz tienen efecto inmediato sobre las rutas y menús visibles de los usuarios. 
                    El rol <strong>SUPERADMIN</strong> mantiene acceso forzado a todos los módulos críticos de base de datos y seguridad.
                </p>
                </div>
            </div>
        </>
    );
};

export const Accesos = () => {
    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        {/* Header */}
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
            <Lock size={300} className="text-white" />
            </div>
            <div className="flex items-center gap-5 relative z-10">
            <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                <ShieldCheck size={28} className="text-[#FCB131]" />
            </div>
            <div>
                <h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Matriz de Permisos</h1>
                <p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Roles y Funcionalidades</p>
            </div>
            </div>
        </div>
        
        {/* Content */}
        <PermissionMatrix />
        </div>
    );
};

export default Accesos;
