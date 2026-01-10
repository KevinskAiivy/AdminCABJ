
import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Calendar, Mail, Cake, X, Bell, UserPlus, Trophy, Clock, MapPin, Star, ChevronRight, AlertTriangle, Ticket, Building2, Gift } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Match, Mensaje, Socio, AgendaEvent } from '../../types';
import { NextMatchCard } from '../../components/NextMatchCard';

// Notification Interface
interface Notification {
    id: string;
    type: 'MESSAGE' | 'HABILITACION' | 'TRANSFER' | 'NEW_SOCIO';
    title: string;
    date: string;
    read: boolean;
}

export const DashboardPresident = ({ consulado_id }: { consulado_id: string }) => {
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [birthdays, setBirthdays] = useState<Socio[]>([]);
  const [generalEvents, setGeneralEvents] = useState<AgendaEvent[]>([]);
  const [consulado, setConsulado] = useState(dataService.getConsuladoById(consulado_id));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewingMessage, setViewingMessage] = useState<Mensaje | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState<{ date: Date, birthdays: Socio[], agenda: AgendaEvent[] } | null>(null);

  // Subscribe to dataService updates
  useEffect(() => {
    const updateDashboardData = () => {
        const c = dataService.getConsuladoById(consulado_id);
        setConsulado(c);
        
        const allMsgs = dataService.getMensajes(consulado_id);
        setMessages(allMsgs.slice(0, 3));
        
        // Fetch Birthdays
        if (c) setBirthdays(dataService.getBirthdays(c.name, 7));
        
        // Fetch Agenda
        setGeneralEvents(dataService.getAgendaEvents());

        // Notifications (Transfers)
        const currentTransfers = dataService.getTransfers(consulado_id);
        const newNotifs: Notification[] = [];
        currentTransfers.incoming.filter(t => t.status === 'PENDING').forEach(t => {
            newNotifs.push({ id: `notif-tr-${t.id}`, type: 'TRANSFER', title: `Traslado: ${t.socio_name}`, date: t.request_date, read: false });
        });
        setNotifications(newNotifs);

        // Next Match Logic - Trouver le vrai prochain match (le plus proche dans le futur)
        const allMatches = dataService.getMatches();
        const now = new Date();
        
        const upcomingMatches = allMatches
            .map((m) => {
                if (!m.date || !m.hour) return null;
                
                let dateObj: Date;
                // Parser la date selon son format
                if (m.date.includes('/')) {
                    // Format DD/MM/YYYY
                    const [d, M, y] = m.date.split('/').map(Number);
                    const [h, min] = m.hour.split(':').map(Number);
                    dateObj = new Date(y, M - 1, d, h || 0, min || 0);
                } else if (m.date.includes('-')) {
                    // Format YYYY-MM-DD (DB) ou DD-MM-YYYY
                    const parts = m.date.split('-');
                    if (parts[0].length === 4) {
                        // Format YYYY-MM-DD
                        const [y, M, d] = parts.map(Number);
                        const [h, min] = m.hour.split(':').map(Number);
                        dateObj = new Date(y, M - 1, d, h || 0, min || 0);
                    } else {
                        // Format DD-MM-YYYY
                        const [d, M, y] = parts.map(Number);
                        const [h, min] = m.hour.split(':').map(Number);
                        dateObj = new Date(y, M - 1, d, h || 0, min || 0);
                    }
                } else {
                    return null;
                }
                
                return { ...m, dateObj };
            })
            .filter((m): m is any => m !== null && m.dateObj > now)
            .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
        
        setNextMatch(upcomingMatches.length > 0 ? upcomingMatches[0] : null);
    };

    updateDashboardData();
    const unsubscribe = dataService.subscribe(updateDashboardData);
    return () => unsubscribe();
  }, [consulado_id]);

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}`;
    const isoDateStr = date.toISOString().split('T')[0];
    
    // Filtrer les anniversaires pour cette date (comparer DD/MM uniquement, ignorer l'année)
    const dayBirthdays = birthdays.filter(b => {
        if (!b.birth_date || b.birth_date.trim() === '') return false;
        
        // Extraire le jour et le mois de birth_date
        let birthDay: string, birthMonth: string;
        if (b.birth_date.includes('/')) {
            // Format DD/MM/YYYY
            const parts = b.birth_date.split('/');
            birthDay = parts[0].padStart(2, '0');
            birthMonth = parts[1].padStart(2, '0');
        } else if (b.birth_date.includes('-')) {
            // Format YYYY-MM-DD ou DD-MM-YYYY
            const parts = b.birth_date.split('-');
            if (parts[0].length === 4) {
                // Format YYYY-MM-DD
                birthMonth = parts[1].padStart(2, '0');
                birthDay = parts[2].padStart(2, '0');
            } else {
                // Format DD-MM-YYYY
                birthDay = parts[0].padStart(2, '0');
                birthMonth = parts[1].padStart(2, '0');
            }
        } else {
            return false;
        }
        
        return `${birthDay}/${birthMonth}` === dateStr;
    });
    
    return {
        dayBirthdays,
        dayAgenda: generalEvents.filter(e => e.date === isoDateStr)
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 px-4 animate-boca-entrance">
        
        {/* MATCH DAY HERO SECTION */}
        {nextMatch ? (
            <NextMatchCard 
                match={nextMatch} 
                userTimezone={consulado?.timezone}
                userCountryCode={consulado?.country_code}
            />
        ) : (
            <div className="h-[200px] bg-[#001d4a] rounded-[2.5rem] flex flex-col items-center justify-center text-white/10 border border-white/5 shadow-xl">
                <Calendar size={32} className="mb-4 opacity-5" />
                <p className="oswald text-xl font-black uppercase tracking-widest">Sin partidos próximos</p>
            </div>
        )}

        {/* DASHBOARD CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Notifications */}
                {notifications.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <Bell size={18} className="text-[#FCB131]" />
                            <h3 className="oswald text-xl font-black text-[#001d4a] uppercase tracking-tight">Notificaciones</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {notifications.map(n => (
                                <GlassCard key={n.id} className="p-4 flex items-start gap-4 border-l-4 border-l-[#FCB131] bg-white group relative hover:shadow-lg">
                                    <button onClick={(e) => { e.stopPropagation(); setNotifications(prev => prev.filter(notif => notif.id !== n.id)); }} className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                                    <div className={`mt-1 p-2.5 rounded-xl shrink-0 ${n.type === 'MESSAGE' ? 'bg-blue-50 text-blue-600' : n.type === 'HABILITACION' ? 'bg-amber-50 text-amber-600' : n.type === 'TRANSFER' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                                        {n.type === 'MESSAGE' ? <Mail size={16}/> : n.type === 'HABILITACION' ? <Ticket size={16}/> : n.type === 'TRANSFER' ? <AlertTriangle size={16}/> : <UserPlus size={16}/>}
                                    </div>
                                    <div className="pr-4">
                                        <h4 className="font-bold text-[#001d4a] text-xs uppercase leading-tight mb-1">{n.title}</h4>
                                        <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1"><Clock size={10} /> {n.date}</span>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-2">
                        <Mail size={18} className="text-[#003B94]" />
                        <h3 className="oswald text-xl font-black text-[#001d4a] uppercase tracking-tight">Mensajes Oficiales</h3>
                    </div>
                    {messages.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                            {messages.map(msg => (
                                <GlassCard key={msg.id} onClick={() => setViewingMessage(msg)} className={`p-6 transition-all hover:shadow-xl cursor-pointer group relative overflow-hidden ${msg.type === 'URGENTE' ? 'bg-gradient-to-br from-white to-amber-50 border-l-4 border-l-[#FCB131]' : 'bg-white border-l-4 border-l-[#003B94]'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 ${msg.type === 'URGENTE' ? 'bg-[#FCB131] text-[#001d4a]' : 'bg-blue-50 text-blue-600'}`}>
                                            {msg.type === 'URGENTE' && <Star size={8} fill="currentColor" />}
                                            {msg.type === 'URGENTE' ? 'COMUNICADO CRÍTICO' : 'INSTITUCIONAL'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400">{msg.date}</span>
                                    </div>
                                    <h4 className="oswald text-xl font-black text-[#001d4a] uppercase mb-2 group-hover:text-[#003B94] transition-colors">{msg.title}</h4>
                                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{msg.body}</p>
                                    <div className="mt-4 flex items-center gap-1 text-[9px] font-black text-[#003B94] uppercase opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                                        Leer comunicado <ChevronRight size={10} />
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center bg-white rounded-[2rem] border border-dashed border-gray-200 text-gray-400">
                             <Mail size={32} className="mx-auto mb-4 opacity-10" />
                             <p className="text-xs font-bold uppercase tracking-[0.2em]">Sin mensajes activos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* WEEKLY AGENDA - PRESIDENT VIEW */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <Calendar size={18} className="text-[#003B94]" />
                    <h3 className="oswald text-xl font-black text-[#001d4a] uppercase tracking-tight">Agenda Semanal</h3>
                </div>
                <div className="space-y-3">
                    {next7Days.map((date, idx) => {
                        const { dayBirthdays, dayAgenda } = getEventsForDate(date);
                        const hasEvents = dayBirthdays.length > 0 || dayAgenda.length > 0;
                        const isMatchDay = nextMatch && new Date(nextMatch.date.split('/').reverse().join('-')).getDate() === date.getDate();
                        
                        return (
                            <GlassCard 
                                key={idx} 
                                onClick={() => hasEvents && setSelectedDayDetails({ date, birthdays: dayBirthdays, agenda: dayAgenda })}
                                className={`p-4 flex items-center gap-5 transition-all group border ${hasEvents ? 'cursor-pointer hover:shadow-lg hover:border-[#003B94]/20' : ''} ${isMatchDay ? 'border-[#FCB131] bg-amber-50/30' : 'border-transparent bg-white'}`}
                            >
                                <div className="flex flex-col items-center justify-center w-12 shrink-0 border-r border-gray-100 pr-5">
                                    <span className="text-[8px] font-black uppercase text-gray-400 mb-1">{date.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                                    <span className={`text-2xl font-black oswald leading-none ${isMatchDay ? 'text-[#FCB131]' : 'text-[#001d4a]'}`}>{date.getDate()}</span>
                                </div>
                                <div className="flex-1 space-y-1.5">
                                    {isMatchDay && (
                                        <div className="flex items-center justify-between bg-[#FCB131]/10 px-2 py-1.5 rounded-lg border border-[#FCB131]/20">
                                            <span className="text-[7px] font-black text-[#001d4a] uppercase">Partido</span>
                                            <Trophy size={10} className="text-[#001d4a]" />
                                        </div>
                                    )}
                                    {dayBirthdays.length > 0 && (
                                        <div className="flex items-center justify-between bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100">
                                            <span className="text-[7px] font-black text-[#001d4a] uppercase">Cumpleaños</span>
                                            <span className="text-[9px] font-bold text-blue-600">{dayBirthdays.length}</span>
                                        </div>
                                    )}
                                    {dayAgenda.length > 0 && (
                                        <div className="flex items-center justify-between bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">
                                            <span className="text-[7px] font-black text-[#001d4a] uppercase">Eventos</span>
                                            <span className="text-[9px] font-bold text-emerald-600">{dayAgenda.length}</span>
                                        </div>
                                    )}
                                    {!hasEvents && !isMatchDay && <span className="text-[9px] text-gray-300 uppercase font-medium tracking-widest italic block py-1">Agenda libre</span>}
                                </div>
                                {(hasEvents || isMatchDay) && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ChevronRight size={14} className="text-[#003B94]" />
                                    </div>
                                )}
                            </GlassCard>
                        );
                    })}
                </div>
            </div>
        </div>
        
        {/* Message Modal */}
        {viewingMessage && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#001d4a]/80 backdrop-blur-md animate-in fade-in duration-300" >
                <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-[0_50px_200px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95">
                    <div className="bg-[#003B94] p-4 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-xl"><Mail size={18} className="text-[#FCB131]" /></div>
                            <div>
                                <h2 className="oswald text-lg font-black uppercase tracking-tight leading-none mb-0.5">Comunicado Central</h2>
                                <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider">Emitido el {viewingMessage.date}</p>
                            </div>
                        </div>
                        <X onClick={() => setViewingMessage(null)} className="cursor-pointer opacity-40 hover:opacity-100 p-1.5 hover:bg-white/10 rounded-full transition-all shrink-0" size={20} />
                    </div>
                    <div className="p-5 overflow-y-auto custom-scrollbar max-h-[65vh] bg-white">
                        <div className="mb-4 pb-3 border-b border-gray-100">
                            <h3 className="oswald text-xl font-black text-[#001d4a] uppercase leading-tight">{viewingMessage.title}</h3>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap mb-5">
                            {viewingMessage.body}
                        </p>
                        <div className="flex justify-center pt-2">
                            <button onClick={() => setViewingMessage(null)} className="px-8 py-2.5 rounded-xl bg-[#001d4a] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#003B94] transition-all shadow-lg">Entendido</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Modal: Daily Details (Categorized Columns) */}
        {selectedDayDetails && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#001d4a]/80 backdrop-blur-md animate-in fade-in duration-300" >
                <div className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-[0_50px_200px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 max-h-[80vh]">
                    <div className="bg-[#003B94] p-6 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl"><Calendar size={24} className="text-[#FCB131]" /></div>
                            <div>
                                <h2 className="oswald text-2xl font-black uppercase tracking-tight leading-none mb-1">
                                    {selectedDayDetails.date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h2>
                                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Resumen del Día</p>
                            </div>
                        </div>
                        <X onClick={() => setSelectedDayDetails(null)} className="cursor-pointer opacity-40 hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all" size={32} />
                    </div>
                    
                    <div className="p-8 overflow-y-auto custom-scrollbar bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            
                            {/* Col 1: Institutional & Matches */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[#003B94] font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2">
                                    <Building2 size={16} /> Institucional & Eventos
                                </h4>
                                <div className="space-y-3">
                                    {/* Match handling handled by NextMatchCard logic mainly, but if we want it here: */}
                                    {nextMatch && new Date(nextMatch.date.split('/').reverse().join('-')).getDate() === selectedDayDetails.date.getDate() && (
                                        <div className="bg-[#001d4a] rounded-xl p-4 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={60} /></div>
                                            <div className="relative z-10">
                                                <span className="text-[#FCB131] text-[9px] font-black uppercase tracking-widest mb-1 block">Partido</span>
                                                <h3 className="oswald text-xl font-black uppercase leading-tight mb-2">vs {nextMatch.rival}</h3>
                                                <div className="flex items-center gap-3 text-[9px] font-bold text-white/60 uppercase">
                                                    <div className="flex items-center gap-1"><Clock size={10} className="text-[#FCB131]" /> {nextMatch.hour} HS</div>
                                                    <div className="flex items-center gap-1"><MapPin size={10} className="text-[#FCB131]" /> {nextMatch.venue}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {selectedDayDetails.agenda.filter(e => e.type === 'EVENTO' || e.type === 'ENCUENTRO' || e.type === 'INTERNACIONAL').map(evt => (
                                        <div key={evt.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                            <h5 className="font-bold text-[#001d4a] uppercase text-xs">{evt.title}</h5>
                                            <p className="text-[10px] text-gray-500 mt-1">{evt.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Col 2: Birthdays (Socios from Consulado + Generic Birthdays) */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-blue-500 font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2">
                                    <Cake size={16} /> Cumpleaños ({selectedDayDetails.birthdays.length})
                                </h4>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedDayDetails.birthdays.length > 0 ? selectedDayDetails.birthdays.map(socio => (
                                        <div key={socio.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black">
                                                {socio.first_name[0]}{socio.last_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-[#001d4a] uppercase">{socio.name}</p>
                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">{socio.category}</p>
                                            </div>
                                        </div>
                                    )) : <p className="text-[10px] text-gray-400 italic">No hay cumpleaños de socios.</p>}
                                    
                                    {/* Also show generic birthday events from agenda if any */}
                                    {selectedDayDetails.agenda.filter(e => e.type === 'CUMPLEAÑOS').map(evt => (
                                        <div key={evt.id} className="flex items-center gap-3 p-2 rounded-lg bg-blue-50/50">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Gift size={12}/></div>
                                            <p className="text-[10px] font-bold text-[#001d4a] uppercase">{evt.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Col 3: Efemérides & Ídolos */}
                            <div className="space-y-4">
                                <h4 className="flex items-center gap-2 text-[#FCB131] font-black uppercase text-sm tracking-widest border-b border-gray-100 pb-2">
                                    <Star size={16} /> Historia & Ídolos
                                </h4>
                                <div className="space-y-3">
                                    {selectedDayDetails.agenda.filter(e => e.type === 'IDOLO' || e.type === 'EFEMERIDE').length > 0 ? (
                                        selectedDayDetails.agenda.filter(e => e.type === 'IDOLO' || e.type === 'EFEMERIDE').map(evt => (
                                            <div key={evt.id} className="p-4 rounded-xl bg-[#FFFBEB] border border-[#FCB131]/20">
                                                <span className="text-[8px] font-black text-[#FCB131] uppercase tracking-widest bg-[#001d4a] px-2 py-0.5 rounded mb-2 inline-block">
                                                    {evt.type}
                                                </span>
                                                <h5 className="font-bold text-[#001d4a] uppercase text-xs">{evt.title}</h5>
                                                <p className="text-[10px] text-gray-600 mt-1">{evt.description}</p>
                                            </div>
                                        ))
                                    ) : <p className="text-[10px] text-gray-400 italic">Sin efemérides.</p>}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default DashboardPresident;
