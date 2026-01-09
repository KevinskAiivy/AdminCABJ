
import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Ticket, Clock, CheckCircle2, XCircle, Calendar, MapPin, X, UserCheck, UserX, Filter, Timer, Archive, Home, Plane } from 'lucide-react';
import { Match, Solicitud, Socio } from '../types';
import { dataService } from '../services/dataService';

interface ProcessedMatch extends Match {
  status: 'OPEN' | 'SCHEDULED' | 'CLOSED';
  activeRequests: number;
}

const parseDate = (d: string, h: string) => {
  if (!d) return new Date(0);
  let day, month, year;
  
  if (d.includes('/')) {
      [day, month, year] = d.split('/').map(Number);
  } else if (d.includes('-')) {
      [year, month, day] = d.split('-').map(Number);
  } else {
      return new Date(0);
  }

  const [hours, minutes] = (h || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0);
};

const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '--/--/----';
    if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }
    return dateStr;
};

export const Habilitaciones = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [allSocios, setAllSocios] = useState<Socio[]>([]);
  const [now, setNow] = useState(new Date());
  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [requests, setRequests] = useState<Solicitud[]>([]);

  useEffect(() => {
    const load = () => {
        setMatches(dataService.getMatches());
        setAllSocios(dataService.getSocios());
    };
    load();
    const unsub = dataService.subscribe(load);
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => { unsub(); clearInterval(clock); };
  }, []);

  const processedMatches = useMemo<ProcessedMatch[]>(() => {
    return matches
      .filter(m => !m.is_suspended && m.apertura_date && m.cierre_date)
      .filter(m => m.is_home || m.is_neutral)
      .map(m => {
          const ap = parseDate(m.apertura_date, m.apertura_hour);
          const ci = parseDate(m.cierre_date, m.cierre_hour);
          
          let status: 'OPEN' | 'SCHEDULED' | 'CLOSED' = 'CLOSED';
          if (now >= ap && now <= ci) status = 'OPEN';
          else if (now < ap) status = 'SCHEDULED';
          
          return { ...m, status, activeRequests: dataService.getSolicitudes(m.id).length };
      })
      .sort((a, b) => {
          const priority = { 'OPEN': 0, 'SCHEDULED': 1, 'CLOSED': 2 };
          if (priority[a.status] !== priority[b.status]) return priority[a.status] - priority[b.status];
          return parseDate(a.date, a.hour).getTime() - parseDate(b.date, b.hour).getTime();
      });
  }, [matches, now]);

  const handleOpenMatch = (match: ProcessedMatch) => {
    setRequests(dataService.getSolicitudes(match.id));
    setSelectedMatch(match);
  };

  const handleStatusChange = async (reqId: string, status: any) => {
    await dataService.updateSolicitudStatus(reqId, status);
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status } : r));
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'OPEN': return (
              <span className="bg-[#FCB131] text-[#001d4a] px-3 py-1 rounded text-[9px] font-black uppercase animate-pulse flex items-center gap-1 shadow-lg">
                  <Ticket size={12} strokeWidth={3} /> ABIERTO
              </span>
          );
          case 'SCHEDULED': return (
              <span className="bg-blue-100 text-[#003B94] px-3 py-1 rounded text-[9px] font-black uppercase flex items-center gap-1 border border-blue-200">
                  <Timer size={12} strokeWidth={3} /> PROGRAMADO
              </span>
          );
          case 'CLOSED': return (
              <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded text-[9px] font-black uppercase flex items-center gap-1 border border-gray-200">
                  <Archive size={12} strokeWidth={3} /> CERRADO
              </span>
          );
          default: return null;
      }
  };

  const getContainerStyle = (status: string) => {
      if (status === 'OPEN') return 'bg-gradient-to-br from-[#001d4a] to-[#003B94] text-white border-[#FCB131]/30 shadow-[0_10px_30px_rgba(0,59,148,0.3)]';
      if (status === 'SCHEDULED') return 'bg-white border-blue-100 opacity-90 shadow-sm';
      return 'bg-gray-50 border-gray-200 opacity-60 grayscale-[0.5] hover:grayscale-0 transition-all';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 animate-boca-entrance pb-20">
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5 relative z-10">
            <div className="bg-white/10 p-4 rounded-lg shadow-lg">
              <Ticket size={28} className="text-[#FCB131]" />
            </div>
            <div>
              <h1 className="oswald text-3xl font-black text-white uppercase tracking-tight">Gestión de Habilitaciones</h1>
              <p className="text-[#FCB131] text-[10px] font-black uppercase tracking-[0.4em] mt-1">Control de Acceso al Estadio</p>
            </div>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2">
            <Clock size={14} className="text-[#FCB131]" />
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedMatches.map(match => {
                const isDark = match.status === 'OPEN';
                return (
                <GlassCard key={match.id} className={`p-6 border flex flex-col relative overflow-hidden ${getContainerStyle(match.status)}`}>
                    
                    <div className={`absolute top-0 right-0 p-2 rounded-bl-xl ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                        {match.is_home ? <Home size={14} className={isDark ? 'text-[#FCB131]' : 'text-[#003B94]'} /> : <Plane size={14} className={isDark ? 'text-[#FCB131]' : 'text-[#003B94]'} />}
                    </div>

                    <div className="flex justify-between items-start mb-4 pr-8">
                        {getStatusBadge(match.status)}
                    </div>
                    
                    <div className="mb-6">
                        <p className={`text-[9px] font-bold uppercase mb-1 ${isDark ? 'text-white/60' : 'text-gray-400'}`}>{match.competition}</p>
                        <h3 className={`oswald text-2xl font-black uppercase leading-tight ${isDark ? 'text-white' : 'text-[#001d4a]'}`}>vs {match.rival}</h3>
                        <div className={`flex items-center gap-2 mt-2 text-[10px] font-bold ${isDark ? 'text-white/80' : 'text-[#003B94]'}`}>
                            <Calendar size={12} /> {formatDateDisplay(match.date)} {match.hour}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className={`text-center p-2 rounded-lg border flex flex-col items-center justify-center ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                            <span className={`text-[7px] font-black uppercase block mb-1 ${isDark ? 'text-white/60' : 'text-gray-400'}`}>Apertura</span>
                            <div className="flex flex-col items-center leading-tight">
                                <span className={`text-xs font-black ${isDark ? 'text-[#FCB131]' : 'text-[#003B94]'}`}>{formatDateDisplay(match.apertura_date)}</span>
                                <span className={`text-[9px] font-bold ${isDark ? 'text-white/80' : 'text-[#001d4a]/70'}`}>{match.apertura_hour} HS</span>
                            </div>
                        </div>
                        <div className={`text-center p-2 rounded-lg border flex flex-col items-center justify-center ${isDark ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                            <span className={`text-[7px] font-black uppercase block mb-1 ${isDark ? 'text-white/60' : 'text-gray-400'}`}>Cierre</span>
                            <div className="flex flex-col items-center leading-tight">
                                <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-[#001d4a]'}`}>{formatDateDisplay(match.cierre_date)}</span>
                                <span className={`text-[9px] font-bold ${isDark ? 'text-white/60' : 'text-[#001d4a]/60'}`}>{match.cierre_hour} HS</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-white/50' : 'text-gray-400'}`}>Solicitudes</span>
                            <span className={`text-lg font-black oswald ${isDark ? 'text-white' : 'text-[#001d4a]'}`}>{match.activeRequests}</span>
                        </div>
                        <button 
                            onClick={() => handleOpenMatch(match)} 
                            className={`w-full py-3 rounded-xl font-black uppercase text-xs shadow-lg transition-all flex items-center justify-center gap-2
                                ${match.status === 'OPEN' 
                                    ? 'bg-[#FCB131] text-[#001d4a] hover:bg-white' 
                                    : 'bg-[#001d4a] text-white hover:bg-[#003B94]'}`}
                        >
                            {match.status === 'OPEN' ? 'Gestionar en Vivo' : 'Ver Solicitudes'}
                        </button>
                    </div>
                </GlassCard>
            )})}
            
            {processedMatches.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <Ticket size={48} className="mx-auto mb-4 text-gray-200" />
                    <p className="oswald text-xl font-black text-gray-300 uppercase tracking-widest">No hay habilitaciones activas</p>
                    <p className="text-gray-400 text-xs mt-2">Los partidos de visitante no requieren habilitación.</p>
                </div>
            )}
        </div>

        {selectedMatch && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
                <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/60 max-h-[80vh] animate-in zoom-in-95 duration-200">
                    <div className="liquid-glass-dark p-5 text-white flex justify-between items-center shrink-0">
                        <div>
                            <h2 className="oswald text-xl font-black uppercase">Solicitudes: vs {selectedMatch.rival}</h2>
                            <p className="text-[10px] font-bold text-[#FCB131] uppercase tracking-widest">
                                {selectedMatch.status === 'OPEN' ? 'Ventana Abierta' : 'Ventana Cerrada/Programada'}
                            </p>
                        </div>
                        <X onClick={() => setSelectedMatch(null)} className="cursor-pointer opacity-60 hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all" />
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
                        {requests.length > 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                                        <tr>
                                            <th className="p-4">Socio</th>
                                            <th className="p-4">Consulado</th>
                                            <th className="p-4">Estado</th>
                                            <th className="p-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {requests.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-black text-[#001d4a] uppercase text-xs">{req.socio_name}</p>
                                                    <p className="text-[9px] text-gray-400 font-mono">DNI: {req.socio_dni}</p>
                                                </td>
                                                <td className="p-4 text-[10px] font-bold text-[#003B94] uppercase">{req.consulado}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                                                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                                        'bg-amber-100 text-amber-600'
                                                    }`}>
                                                        {req.status === 'APPROVED' ? 'Aprobada' : req.status === 'REJECTED' ? 'Rechazada' : 'Pendiente'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleStatusChange(req.id, 'APPROVED')} className={`p-2 rounded-lg transition-all ${req.status === 'APPROVED' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600'}`} title="Aprobar"><UserCheck size={14}/></button>
                                                        <button onClick={() => handleStatusChange(req.id, 'REJECTED')} className={`p-2 rounded-lg transition-all ${req.status === 'REJECTED' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'}`} title="Rechazar"><UserX size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                <UserCheck size={48} className="mb-3 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest">No hay solicitudes registradas</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Habilitaciones;
