
import React, { useState, useMemo } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Users, Search, MapPin, CheckCircle2, AlertTriangle, UserX } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Socio } from '../../types';

export const SociosPresident = ({ consuladoId }: { consuladoId: string }) => {
  const [socios] = useState<Socio[]>(dataService.getSocios(consuladoId));
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSocios = useMemo(() => {
    return socios.filter(s => {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.dni.includes(q) || s.id.includes(q);
    });
  }, [socios, searchQuery]);

  const stats = useMemo(() => {
    let alDia = 0, deuda = 0;
    socios.forEach(s => {
        if (s.status === 'AL DÍA') alDia++;
        else deuda++;
    });
    return { total: socios.length, alDia, deuda };
  }, [socios]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        {/* Header */}
        <div className="bg-[#003B94] p-8 rounded-xl border border-white/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none"><Users size={300} className="text-white" /></div>
            <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-4 rounded-xl border border-white/20"><Users size={28} className="text-[#FCB131]" /></div>
                <div><h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Mis Socios</h1><p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Padrón Local</p></div>
            </div>
            <div className="relative z-10 flex gap-4">
                <GlassCard className="px-4 py-2 flex flex-col items-center bg-white/10 border-white/10 text-white">
                    <span className="text-xl font-black oswald">{stats.alDia}</span>
                    <span className="text-[8px] uppercase tracking-widest opacity-70">Al Día</span>
                </GlassCard>
                <GlassCard className="px-4 py-2 flex flex-col items-center bg-white/10 border-white/10 text-white">
                    <span className="text-xl font-black oswald">{stats.deuda}</span>
                    <span className="text-[8px] uppercase tracking-widest opacity-70">Irregular</span>
                </GlassCard>
            </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex items-center justify-between">
            <div className="relative group w-full max-w-md">
                <input type="text" placeholder="Buscar socio..." className="w-full bg-[#003B94]/5 border-transparent rounded-lg py-2.5 pl-10 pr-4 outline-none text-xs font-bold text-[#001d4a] transition-all focus:bg-white focus:ring-2 focus:ring-[#003B94]/10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#003B94]/30" size={16} />
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSocios.map(socio => (
                <GlassCard key={socio.id} className="p-5 flex items-start gap-4 bg-white border border-[#003B94]/10 hover:shadow-lg transition-all">
                    <div className={`w-12 h-12 rounded-full ${socio.avatarColor || 'bg-gray-300'} flex items-center justify-center text-white font-black text-sm shadow-md`}>
                        {socio.firstName[0]}{socio.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="oswald text-base font-bold text-[#001d4a] truncate leading-tight">{socio.lastName} {socio.firstName}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1.5">{socio.category} • {socio.dni}</p>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${socio.status === 'AL DÍA' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                            {socio.status}
                        </span>
                    </div>
                </GlassCard>
            ))}
        </div>
    </div>
  );
};

export default SociosPresident;
